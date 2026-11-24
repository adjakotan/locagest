<?php

namespace Tests\Feature;

use App\Enums\Fund;
use App\Models\User;
use App\Notifications\PaymentDeclared;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

/** US 2.7 — F04, F49, F70–F83, R8, R18 */
class TenantSpaceTest extends LocaGestTestCase
{
    private function invitedTenant($owner): array
    {
        Mail::fake();
        $lease = $this->lease($owner, 50000);
        $lease->tenant->update(['email' => 'loc'.random_int(1, 99999).'@example.com']);
        $url = $this->actingAs($owner)->postJson("/api/tenants/{$lease->tenant_id}/invite")->assertOk()->json('url');
        $token = basename($url);

        return [$lease, $token];
    }

    public function test_invitation_creates_account_once(): void
    {
        $owner = $this->owner();
        [$lease, $token] = $this->invitedTenant($owner);

        $this->getJson("/api/invitations/$token")->assertOk()->assertJsonPath('full_name', $lease->tenant->full_name);
        $this->postJson("/api/invitations/$token/accept", ['password' => 'locataire1', 'password_confirmation' => 'locataire1'])
            ->assertCreated()->assertJsonPath('data.role', 'tenant');
        $this->assertNotNull($lease->tenant->fresh()->user_id);

        // Lien déjà utilisé
        $this->postJson("/api/invitations/$token/accept", ['password' => 'locataire1', 'password_confirmation' => 'locataire1'])->assertStatus(410);
        $this->getJson('/api/invitations/faux-jeton')->assertStatus(410);
    }

    public function test_tenant_sees_only_own_invoices_and_r8_receipts(): void
    {
        $owner = $this->owner();
        [$lease, $token] = $this->invitedTenant($owner);
        $this->postJson("/api/invitations/$token/accept", ['password' => 'locataire1', 'password_confirmation' => 'locataire1']);
        $tenantUser = User::where('role', 'tenant')->first();

        // Autre locataire, payé, avec quittance
        $other = $this->lease($owner, 40000);
        $otherInvoice = $other->invoices()->first();
        $receiptId = $this->actingAs($owner)->postJson("/api/invoices/{$otherInvoice->id}/payments", ['amount' => 40000, 'paid_at' => today()->toDateString(), 'method' => 'cash'])->json('data.id');

        $this->actingAs($tenantUser)->getJson('/api/me/invoices')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($tenantUser)->getJson('/api/me/leases')->assertOk()->assertJsonPath('balance_due', 50000);
        $this->actingAs($tenantUser)->getJson("/api/me/invoices/{$otherInvoice->id}")->assertForbidden();
        $this->actingAs($tenantUser)->get("/api/payments/$receiptId/receipt")->assertForbidden(); // R8
        $this->actingAs($tenantUser)->get("/api/invoices/{$otherInvoice->id}/pdf")->assertForbidden();
    }

    public function test_r18_declared_payment_stays_out_of_cash_until_confirmed(): void
    {
        Storage::fake('local');
        Notification::fake();
        $owner = $this->owner();
        [$lease, $token] = $this->invitedTenant($owner);
        $this->postJson("/api/invitations/$token/accept", ['password' => 'locataire1', 'password_confirmation' => 'locataire1']);
        $tenantUser = User::where('role', 'tenant')->first();
        $invoice = $lease->invoices()->first();
        $property = $lease->unit->property;

        $id = $this->actingAs($tenantUser)->post("/api/me/invoices/{$invoice->id}/payments", [
            'amount' => 50000, 'paid_at' => today()->toDateString(), 'method' => 'mobile_money', 'reference' => 'MP555',
            'proof' => UploadedFile::fake()->image('capture.jpg'),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.status', 'declared')->json('data.id');

        Notification::assertSentTo($owner, PaymentDeclared::class);
        $this->assertSame(0, $property->balance(Fund::Main));
        $this->assertSame(0, $invoice->fresh()->amount_paid);

        $this->actingAs($owner)->getJson('/api/payments')->assertJsonCount(1, 'data');
        $this->actingAs($owner)->get("/api/payments/$id/proof")->assertOk();
        $this->actingAs($owner)->postJson("/api/payments/$id/confirm")->assertOk()->assertJsonPath('data.status', 'confirmed');
        $this->assertSame(45000, $property->balance(Fund::Main));
        $this->assertSame('paid', $invoice->fresh()->status->value);
    }

    public function test_maintenance_request_flow(): void
    {
        $owner = $this->owner();
        [$lease, $token] = $this->invitedTenant($owner);
        $this->postJson("/api/invitations/$token/accept", ['password' => 'locataire1', 'password_confirmation' => 'locataire1']);
        $tenantUser = User::where('role', 'tenant')->first();

        $id = $this->actingAs($tenantUser)->postJson('/api/maintenance-requests', ['title' => 'Fuite d\'eau', 'description' => 'Sous l\'évier', 'priority' => 'urgent'])
            ->assertCreated()->assertJsonPath('data.unit.id', $lease->unit_id)->json('data.id');
        $this->actingAs($tenantUser)->patchJson("/api/maintenance-requests/$id", ['status' => 'resolved'])->assertForbidden();

        $this->actingAs($owner)->getJson('/api/maintenance-requests')->assertJsonCount(1, 'data');
        $this->actingAs($owner)->patchJson("/api/maintenance-requests/$id", ['status' => 'in_progress'])->assertOk()->assertJsonPath('data.status', 'in_progress');
        $this->actingAs($tenantUser)->getJson('/api/maintenance-requests')->assertJsonPath('data.0.status', 'in_progress');

        // F83 : le propriétaire signale un problème des parties communes
        $this->actingAs($owner)->postJson('/api/maintenance-requests', ['property_id' => $lease->unit->property_id, 'title' => 'Toiture', 'description' => 'Tôles arrachées'])->assertCreated();
    }
}

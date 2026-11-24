<?php

namespace Tests\Feature;

use App\Enums\Fund;
use App\Models\Invoice;
use App\Services\InvoiceGenerator;
use Carbon\CarbonImmutable;

/** US 2.1–2.5 — F40–F53, R3–R6, R13, R14 */
class InvoiceAndPaymentTest extends LocaGestTestCase
{
    public function test_r3_generate_twice_creates_no_duplicate(): void
    {
        $owner = $this->owner();
        $this->lease($owner);
        $this->lease($owner);

        $this->artisan('invoices:generate')->assertSuccessful();
        $this->artisan('invoices:generate')->assertSuccessful();
        $this->assertSame(2, Invoice::count()); // une par bail, déjà créée à la création du bail
        $this->artisan('invoices:generate', ['--month' => today()->addMonth()->format('Y-m')])->assertSuccessful();
        $this->artisan('invoices:generate', ['--month' => today()->addMonth()->format('Y-m')])->assertSuccessful();
        $this->assertSame(4, Invoice::count());
    }

    public function test_no_invoice_after_lease_end(): void
    {
        $owner = $this->owner();
        $lease = $this->lease($owner);
        $this->actingAs($owner)->postJson("/api/leases/{$lease->id}/end", ['end_date' => today()->toDateString(), 'deposit_returned' => 100000])->assertOk();
        $this->artisan('invoices:generate', ['--month' => today()->addMonth()->format('Y-m')]);
        $this->assertSame(1, Invoice::count());
    }

    public function test_invoice_numbers_are_unique_and_formatted(): void
    {
        $owner = $this->owner();
        $a = $this->lease($owner)->invoices()->first();
        $b = $this->lease($owner)->invoices()->first();
        $this->assertMatchesRegularExpression('/^F-\d{4}-\d{2}-\d{6}$/', $a->invoice_number);
        $this->assertNotEquals($a->invoice_number, $b->invoice_number);
    }

    public function test_r4_partial_then_full_payment_generates_one_receipt(): void
    {
        $owner = $this->owner();
        $invoice = $this->lease($owner, 50000)->invoices()->first();

        $this->actingAs($owner)->postJson("/api/invoices/{$invoice->id}/payments", ['amount' => 20000, 'paid_at' => today()->toDateString(), 'method' => 'cash'])
            ->assertCreated()->assertJsonPath('data.receipt_number', null);
        $this->assertSame('partial', $invoice->fresh()->status->value);
        $this->assertSame(30000, $invoice->fresh()->remaining());

        $res = $this->postJson("/api/invoices/{$invoice->id}/payments", ['amount' => 30000, 'paid_at' => today()->toDateString(), 'method' => 'mobile_money', 'reference' => 'MP123'])
            ->assertCreated();
        $this->assertSame('paid', $invoice->fresh()->status->value);
        $this->assertMatchesRegularExpression('/^Q-\d{4}-\d{6}$/', $res->json('data.receipt_number'));

        $this->get('/api/payments/'.$res->json('data.id').'/receipt')->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->get("/api/invoices/{$invoice->id}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
    }

    public function test_r5_payment_above_remaining_is_refused(): void
    {
        $owner = $this->owner();
        $invoice = $this->lease($owner, 50000)->invoices()->first();
        $this->actingAs($owner)->postJson("/api/invoices/{$invoice->id}/payments", ['amount' => 60000, 'paid_at' => today()->toDateString(), 'method' => 'cash'])
            ->assertUnprocessable()->assertJsonValidationErrors('amount');
        $this->assertSame(0, $invoice->fresh()->amount_paid);
    }

    public function test_r6_mark_late_sets_status_and_penalty(): void
    {
        $owner = $this->owner();
        $start = CarbonImmutable::today()->subMonth()->startOfMonth();
        $lease = $this->lease($owner, 50000, ['start_date' => $start->toDateString(), 'due_day' => 5, 'late_fee' => 2000]);
        [$invoice] = app(InvoiceGenerator::class)->generateForLease($lease, $start);

        $this->artisan('invoices:mark-late')->assertSuccessful();
        $this->artisan('invoices:mark-late')->assertSuccessful(); // la pénalité n'est ajoutée qu'une fois
        $invoice->refresh();
        $this->assertSame('late', $invoice->status->value);
        $this->assertSame(52000, $invoice->amount_due);

        $this->actingAs($owner)->getJson('/api/dashboard')->assertOk()->assertJsonPath('late_invoices.0.invoice_id', $invoice->id);
    }

    public function test_invoice_lines_and_corrections(): void
    {
        $owner = $this->owner();
        $invoice = $this->lease($owner, 50000)->invoices()->first();
        $this->actingAs($owner)->postJson("/api/invoices/{$invoice->id}/items", ['type' => 'water', 'label' => 'Eau octobre', 'amount' => 3000])
            ->assertOk()->assertJsonPath('data.amount_due', 53000);
        $this->postJson("/api/invoices/{$invoice->id}/items", ['type' => 'water', 'label' => 'Erreur', 'amount' => -1000])->assertUnprocessable();
        $this->postJson("/api/invoices/{$invoice->id}/items", ['type' => 'correction', 'label' => 'Correction eau', 'amount' => -1000])
            ->assertOk()->assertJsonPath('data.amount_due', 52000)->assertJsonCount(3, 'data.items');

        $this->postJson("/api/invoices/{$invoice->id}/payments", ['amount' => 52000, 'paid_at' => today()->toDateString(), 'method' => 'cash']);
        $this->postJson("/api/invoices/{$invoice->id}/items", ['type' => 'other', 'label' => 'Trop tard', 'amount' => 500])->assertUnprocessable();
    }

    public function test_r13_r14_reserve_split_and_cancellation(): void
    {
        $owner = $this->owner();
        $lease = $this->lease($owner, 50000); // réserve 10 %
        $invoice = $lease->invoices()->first();
        $property = $lease->unit->property;

        $id = $this->actingAs($owner)->postJson("/api/invoices/{$invoice->id}/payments", ['amount' => 50000, 'paid_at' => today()->toDateString(), 'method' => 'cash'])->json('data.id');
        $this->assertSame(5000, $property->balance(Fund::Reserve));
        $this->assertSame(45000, $property->balance(Fund::Main));

        $this->postJson("/api/payments/$id/cancel", [])->assertUnprocessable(); // motif obligatoire
        $this->postJson("/api/payments/$id/cancel", ['reason' => 'Saisie en double'])->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->assertSame(0, $property->balance(Fund::Reserve));
        $this->assertSame(0, $property->balance(Fund::Main));
        $this->assertSame(0, $invoice->fresh()->amount_paid);
        $this->assertDatabaseHas('payments', ['id' => $id, 'cancel_reason' => 'Saisie en double']); // RG09
    }

    public function test_owner_cannot_pay_another_owners_invoice(): void
    {
        $invoice = $this->lease($this->owner())->invoices()->first();
        $this->actingAs($this->owner())->postJson("/api/invoices/{$invoice->id}/payments", ['amount' => 1000, 'paid_at' => today()->toDateString(), 'method' => 'cash'])
            ->assertForbidden();
    }

    public function test_dashboard_figures(): void
    {
        $owner = $this->owner();
        $invoice = $this->lease($owner, 50000)->invoices()->first();
        $this->actingAs($owner)->postJson("/api/invoices/{$invoice->id}/payments", ['amount' => 20000, 'paid_at' => today()->toDateString(), 'method' => 'cash']);

        $this->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('billed', 50000)
            ->assertJsonPath('collected', 20000)
            ->assertJsonPath('outstanding', 30000)
            ->assertJsonPath('cash_main', 18000)
            ->assertJsonPath('cash_reserve', 2000)
            ->assertJsonPath('occupancy_rate', 100)
            ->assertJsonCount(12, 'chart');
    }
}

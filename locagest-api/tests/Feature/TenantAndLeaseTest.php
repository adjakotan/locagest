<?php

namespace Tests\Feature;

use App\Enums\Fund;

/** US 1.6, 1.7 — F20–F35, R2, R17 */
class TenantAndLeaseTest extends LocaGestTestCase
{
    public function test_tenant_creation_search_and_duplicate_phone(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner)->postJson('/api/tenants', ['full_name' => 'Aïcha Dossou', 'phone' => '+22996112233'])->assertCreated();
        $this->postJson('/api/tenants', ['full_name' => 'Autre', 'phone' => '+22996112233'])->assertUnprocessable()->assertJsonValidationErrors('phone');
        $this->getJson('/api/tenants?search=aïcha')->assertJsonCount(1, 'data');
        $this->getJson('/api/tenants?search=96112')->assertJsonCount(1, 'data');
    }

    public function test_lease_creation_prefills_rent_and_occupies_unit(): void
    {
        $owner = $this->owner();
        $unit = $this->unit($this->property($owner), 45000);
        $tenant = $this->tenant($owner);

        $this->actingAs($owner)->postJson('/api/leases', [
            'unit_id' => $unit->id, 'tenant_id' => $tenant->id, 'start_date' => today()->toDateString(), 'deposit_amount' => 90000, 'due_day' => 5,
        ])->assertCreated()->assertJsonPath('data.rent_amount', 45000);

        $this->assertSame('occupied', $unit->fresh()->status->value);
        $this->assertSame(1, $unit->leases()->first()->invoices()->count()); // facture du mois
    }

    public function test_due_day_must_be_between_1_and_28(): void
    {
        $owner = $this->owner();
        $unit = $this->unit($this->property($owner));
        $this->actingAs($owner)->postJson('/api/leases', [
            'unit_id' => $unit->id, 'tenant_id' => $this->tenant($owner)->id, 'start_date' => today()->toDateString(), 'due_day' => 31,
        ])->assertUnprocessable()->assertJsonValidationErrors('due_day');
    }

    public function test_r2_second_active_lease_is_refused(): void
    {
        $owner = $this->owner();
        $lease = $this->lease($owner);
        $this->actingAs($owner)->postJson('/api/leases', [
            'unit_id' => $lease->unit_id, 'tenant_id' => $this->tenant($owner)->id, 'start_date' => today()->toDateString(), 'due_day' => 5,
        ])->assertUnprocessable()->assertJsonValidationErrors('unit_id');
    }

    public function test_cannot_lease_another_owners_unit(): void
    {
        $a = $this->owner();
        $unitB = $this->unit($this->property($this->owner()));
        $this->actingAs($a)->postJson('/api/leases', [
            'unit_id' => $unitB->id, 'tenant_id' => $this->tenant($a)->id, 'start_date' => today()->toDateString(), 'due_day' => 5,
        ])->assertForbidden();
    }

    public function test_r17_ending_lease_frees_unit_and_retention_enters_main_fund(): void
    {
        $owner = $this->owner();
        $lease = $this->lease($owner); // caution 100 000

        $this->actingAs($owner)->postJson("/api/leases/{$lease->id}/end", [
            'end_date' => today()->toDateString(), 'deposit_returned' => 70000, 'deposit_deductions_note' => 'Porte cassée',
        ])->assertOk()->assertJsonPath('data.status', 'ended');

        $this->assertSame('vacant', $lease->unit->fresh()->status->value);
        $property = $lease->unit->property;
        $this->assertSame(30000, $property->balance(Fund::Main));
        $this->assertSame(0, $property->balance(Fund::Reserve));

        // L'historique reste visible
        $this->getJson("/api/units/{$lease->unit_id}")->assertJsonCount(1, 'data.leases');
    }
}

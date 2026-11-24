<?php

namespace Tests\Feature;

/** US 1.5 — F10–F16, R1, R7 */
class PropertyAndUnitTest extends LocaGestTestCase
{
    public function test_owner_manages_properties_and_units(): void
    {
        $owner = $this->owner();
        $id = $this->actingAs($owner)->postJson('/api/properties', ['name' => 'Immeuble A', 'address' => 'Rue 5', 'city' => 'Parakou'])
            ->assertCreated()->json('data.id');

        $this->postJson("/api/properties/$id/units", ['label' => 'Appt 1', 'type' => 'apartment', 'default_rent' => 90000])->assertCreated();
        $this->postJson("/api/properties/$id/units", ['label' => 'Appt 2', 'type' => 'apartment', 'default_rent' => -5])
            ->assertUnprocessable()->assertJsonValidationErrors('default_rent');

        $this->getJson("/api/properties/$id")->assertOk()->assertJsonPath('data.units_count', 1)->assertJsonPath('data.units.0.status', 'vacant');
        $this->putJson("/api/properties/$id", ['name' => 'Immeuble A bis', 'address' => 'Rue 5', 'city' => 'Parakou'])->assertOk();
        $this->getJson('/api/units?city=Parakou&status=vacant')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_r1_owner_cannot_open_another_owners_property(): void
    {
        $a = $this->owner();
        $b = $this->owner();
        $propertyB = $this->property($b);

        $this->actingAs($a)->getJson("/api/properties/{$propertyB->id}")->assertForbidden();
        $this->actingAs($a)->putJson("/api/properties/{$propertyB->id}", ['name' => 'x', 'address' => 'x', 'city' => 'x'])->assertForbidden();
        $this->actingAs($a)->getJson('/api/properties')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_f13_unit_with_active_lease_cannot_be_deleted(): void
    {
        $owner = $this->owner();
        $lease = $this->lease($owner);
        $this->actingAs($owner)->deleteJson("/api/units/{$lease->unit_id}")->assertUnprocessable();
    }

    public function test_r7_changing_default_rent_keeps_lease_rent(): void
    {
        $owner = $this->owner();
        $lease = $this->lease($owner, 50000);
        $this->actingAs($owner)->putJson("/api/units/{$lease->unit_id}", ['label' => 'Chambre', 'type' => 'room', 'default_rent' => 65000])->assertOk();
        $this->assertSame(50000, $lease->fresh()->rent_amount);
    }

    public function test_occupancy_rate(): void
    {
        $owner = $this->owner();
        $lease = $this->lease($owner);
        $this->unit($lease->unit->property);
        $this->actingAs($owner)->getJson('/api/properties')->assertJsonPath('data.0.occupancy_rate', 50);
    }
}

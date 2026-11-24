<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Lease;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Services\LeaseService;
use Database\Seeders\ExpenseCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

abstract class LocaGestTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ExpenseCategorySeeder::class);
    }

    protected function owner(array $attrs = []): User
    {
        return User::factory()->create(['role' => Role::Owner, 'account_type' => 'individual', ...$attrs]);
    }

    protected function property(User $owner, array $attrs = []): Property
    {
        return Property::create(['owner_id' => $owner->id, 'name' => 'Cour test', 'address' => 'Rue 1', 'city' => 'Cotonou', 'reserve_rate' => 10, ...$attrs]);
    }

    protected function unit(Property $property, int $rent = 50000): Unit
    {
        return $property->units()->create(['label' => 'Chambre '.random_int(1, 999), 'type' => 'room', 'default_rent' => $rent]);
    }

    protected function tenant(User $owner, array $attrs = []): Tenant
    {
        return $owner->tenants()->create(['full_name' => 'Locataire Test', 'phone' => '+229'.random_int(10000000, 99999999), ...$attrs]);
    }

    /** Bail commencé ce mois, échéance au 28 (la facture du mois n'est donc pas encore en retard). */
    protected function lease(User $owner, int $rent = 50000, array $attrs = []): Lease
    {
        $property = $this->property($owner);
        $unit = $this->unit($property, $rent);

        return app(LeaseService::class)->create([
            'unit_id' => $unit->id,
            'tenant_id' => $this->tenant($owner)->id,
            'start_date' => today()->startOfMonth()->toDateString(),
            'deposit_amount' => 100000,
            'due_day' => 28,
            ...$attrs,
        ]);
    }
}

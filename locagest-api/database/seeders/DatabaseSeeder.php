<?php

namespace Database\Seeders;

use App\Enums\PaymentMethod;
use App\Enums\Role;
use App\Models\Property;
use App\Models\User;
use App\Services\InvoiceGenerator;
use App\Services\LeaseService;
use App\Services\PaymentService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(ExpenseCategorySeeder::class);

        // Données de démonstration (mot de passe : password)
        $owner = User::create([
            'name' => 'Koffi Mensah', 'email' => 'proprietaire@locagest.test', 'phone' => '+229 97 00 00 01',
            'password' => 'password', 'role' => Role::Owner, 'account_type' => 'individual',
        ]);

        $cour = Property::create(['owner_id' => $owner->id, 'name' => 'Cour Akpakpa', 'address' => 'Rue 12.045', 'city' => 'Cotonou', 'neighborhood' => 'Akpakpa', 'reserve_rate' => 10]);
        $immeuble = Property::create(['owner_id' => $owner->id, 'name' => 'Immeuble Fidjrossè', 'address' => 'Route des pêches', 'city' => 'Cotonou', 'neighborhood' => 'Fidjrossè', 'reserve_rate' => 15]);

        $units = [];
        foreach ([['Chambre 1', 'room', 35000], ['Chambre 2', 'room', 35000], ['Chambre 3', 'room', 40000], ['Boutique', 'shop', 50000]] as [$l, $t, $r]) {
            $units[] = $cour->units()->create(['label' => $l, 'type' => $t, 'default_rent' => $r]);
        }
        foreach ([['Appartement A1', 'apartment', 120000], ['Appartement A2', 'apartment', 120000], ['Appartement B1', 'apartment', 150000]] as [$l, $t, $r]) {
            $units[] = $immeuble->units()->create(['label' => $l, 'type' => $t, 'default_rent' => $r]);
        }

        $tenants = collect([
            ['Aïcha Dossou', '+229 96 11 22 33', 'aicha@locagest.test'],
            ['Jean Hounkpatin', '+229 95 44 55 66', null],
            ['Mariam Sanni', '+229 97 77 88 99', null],
            ['Société Bénin Agro', '+229 21 30 40 50', null],
        ])->map(fn ($t) => $owner->tenants()->create(['full_name' => $t[0], 'phone' => $t[1], 'email' => $t[2]]));

        $leases = app(LeaseService::class);
        $start = CarbonImmutable::today()->subMonths(2)->startOfMonth();
        $l1 = $leases->create(['unit_id' => $units[0]->id, 'tenant_id' => $tenants[0]->id, 'start_date' => $start, 'deposit_amount' => 70000, 'due_day' => 5]);
        $l2 = $leases->create(['unit_id' => $units[2]->id, 'tenant_id' => $tenants[1]->id, 'start_date' => $start, 'deposit_amount' => 80000, 'due_day' => 5, 'late_fee' => 2000]);
        $l3 = $leases->create(['unit_id' => $units[4]->id, 'tenant_id' => $tenants[2]->id, 'start_date' => $start, 'deposit_amount' => 240000, 'due_day' => 10]);
        $l4 = $leases->create(['unit_id' => $units[3]->id, 'tenant_id' => $tenants[3]->id, 'start_date' => $start, 'deposit_amount' => 100000, 'due_day' => 1]);

        // Historique : factures des 2 mois précédents, la plupart payées.
        $gen = app(InvoiceGenerator::class);
        $pay = app(PaymentService::class);
        foreach ([2, 1] as $ago) {
            $m = CarbonImmutable::today()->subMonths($ago);
            foreach ([$l1, $l2, $l3, $l4] as $lease) {
                [$inv] = $gen->generateForLease($lease, $m);
                if ($lease->is($l2) && $ago === 1) {
                    $pay->record($inv, ['amount' => 15000, 'paid_at' => $m->setDay(6)->toDateString(), 'method' => PaymentMethod::Cash->value], $owner);

                    continue; // reste impayé → en retard
                }
                $pay->record($inv, ['amount' => $inv->amount_due, 'paid_at' => $m->setDay(4)->toDateString(), 'method' => PaymentMethod::MobileMoney->value, 'reference' => 'MP'.random_int(100000, 999999)], $owner);
            }
        }
        $gen->generateForMonth(CarbonImmutable::today());
        $gen->markLate();
    }
}

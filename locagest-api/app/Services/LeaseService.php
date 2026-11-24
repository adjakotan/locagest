<?php

namespace App\Services;

use App\Enums\Fund;
use App\Enums\LeaseStatus;
use App\Enums\MovementType;
use App\Enums\UnitStatus;
use App\Models\Lease;
use App\Models\Unit;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Baux : création (F30–F32, RG02, RG03) et clôture (F33, F35, RG19). */
class LeaseService
{
    public function __construct(
        private InvoiceGenerator $invoices,
        private CashService $cash,
    ) {}

    public function create(array $data): Lease
    {
        // Champs facultatifs non renseignés → valeurs par défaut (caution 0, pas de pénalité).
        $data = array_filter($data, fn ($v) => $v !== null);
        $lease = DB::transaction(function () use ($data) {
            // Verrou sur le logement : deux créations simultanées ne peuvent pas passer (RG02).
            $unit = Unit::whereKey($data['unit_id'])->lockForUpdate()->firstOrFail();
            if ($unit->hasActiveLease()) {
                throw ValidationException::withMessages([
                    'unit_id' => 'Ce logement a déjà un bail en cours. Clôturez-le avant d\'en créer un nouveau.',
                ]);
            }

            $lease = Lease::create([
                ...$data,
                // F31 / RG03 : loyer prérempli puis figé dans le bail.
                'rent_amount' => $data['rent_amount'] ?? $unit->default_rent,
                'status' => LeaseStatus::Active,
            ]);

            // F32 : le logement passe à « occupé ».
            $unit->update(['status' => UnitStatus::Occupied]);

            return $lease;
        });

        // Facture du mois en cours si le bail a déjà commencé (sinon invoices:generate s'en chargera).
        if ($lease->start_date->lte(today()->endOfMonth())) {
            $this->invoices->generateForLease($lease, CarbonImmutable::today());
        }

        return $lease->fresh(['unit.property', 'tenant']);
    }

    /** F33 / F35 / RG19 : clôture, restitution de la caution ; la part retenue entre dans la caisse principale. */
    public function end(Lease $lease, array $data, User $by): Lease
    {
        return DB::transaction(function () use ($lease, $data, $by) {
            $lease = Lease::whereKey($lease->id)->lockForUpdate()->firstOrFail();
            if (! $lease->isActive()) {
                throw ValidationException::withMessages(['lease' => 'Ce bail est déjà clôturé.']);
            }
            if ($lease->start_date->gt(CarbonImmutable::parse($data['end_date']))) {
                throw ValidationException::withMessages(['end_date' => 'La date de fin doit être postérieure à la date de début.']);
            }

            $returned = $data['deposit_returned'] ?? $lease->deposit_amount;
            if ($returned > $lease->deposit_amount) {
                throw ValidationException::withMessages(['deposit_returned' => 'Le montant restitué ne peut pas dépasser la caution ('.$lease->deposit_amount.' FCFA).']);
            }
            $retained = $lease->deposit_amount - $returned;
            if ($retained > 0 && empty($data['deposit_deductions_note'])) {
                throw ValidationException::withMessages(['deposit_deductions_note' => 'Indiquez le motif des retenues sur la caution.']);
            }

            $lease->update([
                'end_date' => $data['end_date'],
                'status' => LeaseStatus::Ended,
                'deposit_returned' => $returned,
                'deposit_deductions_note' => $data['deposit_deductions_note'] ?? null,
            ]);
            $lease->unit->update(['status' => UnitStatus::Vacant]);

            if ($retained > 0) {
                $this->cash->movement($lease->unit->property, Fund::Main, 'in', $retained, MovementType::DepositRetention, $by, [
                    'note' => 'Retenue sur caution — '.$lease->tenant->full_name.' : '.$data['deposit_deductions_note'],
                ]);
            }

            return $lease->fresh(['unit.property', 'tenant']);
        });
    }
}

<?php

namespace App\Services;

use App\Enums\Fund;
use App\Enums\MovementType;
use App\Models\FundMovement;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Caisse du bien (F100, F109, F110) : un livre de mouvements, deux compartiments.
 * Aucun solde ne peut devenir négatif (RG21, RG22).
 */
class CashService
{
    /** Verrouille le bien : sérialise toutes les sorties d'argent de sa caisse (§6.2, R21). */
    public function lock(Property $property): Property
    {
        return Property::whereKey($property->id)->lockForUpdate()->firstOrFail();
    }

    public function balances(Property $property): array
    {
        return [
            'main' => $property->balance(Fund::Main),
            'reserve' => $property->balance(Fund::Reserve),
        ];
    }

    public function movement(Property $property, Fund $fund, string $direction, int $amount, MovementType $type, User $by, array $extra = []): ?FundMovement
    {
        if ($amount <= 0) {
            return null;
        }

        return FundMovement::create(array_merge([
            'property_id' => $property->id,
            'fund' => $fund,
            'direction' => $direction,
            'amount' => $amount,
            'type' => $type,
            'recorded_by' => $by->id,
            'moved_at' => today()->toDateString(),
        ], $extra));
    }

    /** Sortie d'argent : à appeler dans une transaction, bien verrouillé. */
    public function withdrawFrom(Property $property, Fund $fund, int $amount, MovementType $type, User $by, array $extra = [], string $field = 'amount'): FundMovement
    {
        $available = $property->balance($fund);
        if ($amount > $available) {
            throw ValidationException::withMessages([
                $field => sprintf(
                    'Solde insuffisant dans la %s : %s FCFA disponibles, %s FCFA demandés.',
                    mb_strtolower($fund->label()),
                    number_format($available, 0, ',', ' '),
                    number_format($amount, 0, ',', ' ')
                ),
            ]);
        }

        return $this->movement($property, $fund, 'out', $amount, $type, $by, $extra);
    }

    /** F109 / RG22 : retrait du bénéfice, uniquement depuis la caisse principale. */
    public function ownerWithdrawal(Property $property, int $amount, User $by, ?string $note = null): FundMovement
    {
        return DB::transaction(function () use ($property, $amount, $by, $note) {
            $property = $this->lock($property);

            return $this->withdrawFrom($property, Fund::Main, $amount, MovementType::OwnerWithdrawal, $by, ['note' => $note]);
        });
    }

    /** F110 : transfert principale ↔ réserve (une sortie d'un côté, une entrée de l'autre). */
    public function transfer(Property $property, Fund $from, int $amount, User $by, ?string $note = null): void
    {
        DB::transaction(function () use ($property, $from, $amount, $by, $note) {
            $property = $this->lock($property);
            $to = $from === Fund::Main ? Fund::Reserve : Fund::Main;
            $this->withdrawFrom($property, $from, $amount, MovementType::Transfer, $by, ['note' => $note]);
            $this->movement($property, $to, 'in', $amount, MovementType::Transfer, $by, ['note' => $note]);
        });
    }
}

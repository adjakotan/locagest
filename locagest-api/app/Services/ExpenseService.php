<?php

namespace App\Services;

use App\Enums\ExpenseStatus;
use App\Enums\Fund;
use App\Enums\MovementType;
use App\Models\Expense;
use App\Models\FundMovement;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Dépenses (F102–F105, §6.2). Saisie par le propriétaire → validée immédiatement.
 * (Le circuit « en attente » des gestionnaires — F108, RG15 — arrive au sprint 3.)
 */
class ExpenseService
{
    public function __construct(private CashService $cash) {}

    public function record(Property $property, array $data, User $by): Expense
    {
        return DB::transaction(function () use ($property, $data, $by) {
            // Verrouiller la caisse du bien avant de contrôler le solde (RG21, R21).
            $property = $this->cash->lock($property);

            $expense = Expense::create([
                ...$data,
                'property_id' => $property->id,
                'rebill_mode' => 'none',
                'status' => ExpenseStatus::Approved,
                'recorded_by' => $by->id,
                'approved_by' => $by->id,
                'approved_at' => now(),
            ]);

            $this->cash->withdrawFrom($property, Fund::from($data['funded_from']), $expense->amount, MovementType::Expense, $by, [
                'expense_id' => $expense->id,
                'note' => $expense->description ?: $expense->category->name,
            ]);

            return $expense->load(['category', 'unit', 'property']);
        });
    }

    /** RG20 : annulation avec motif ; l'argent revient dans le compartiment qui avait payé. */
    public function cancel(Expense $expense, User $by, string $reason): Expense
    {
        return DB::transaction(function () use ($expense, $by, $reason) {
            $expense = Expense::whereKey($expense->id)->lockForUpdate()->firstOrFail();
            if ($expense->status === ExpenseStatus::Cancelled || $expense->status === ExpenseStatus::Rejected) {
                throw ValidationException::withMessages(['expense' => 'Cette dépense est déjà annulée.']);
            }

            if ($expense->status === ExpenseStatus::Approved) {
                $out = FundMovement::where('expense_id', $expense->id)->where('type', MovementType::Expense)->first();
                if ($out) {
                    $this->cash->movement($expense->property, $out->fund, 'in', $out->amount, MovementType::Reversal, $by, [
                        'expense_id' => $expense->id,
                        'note' => 'Annulation de la dépense — '.$reason,
                    ]);
                }
            }

            $expense->update(['status' => ExpenseStatus::Cancelled, 'cancel_reason' => $reason]);

            return $expense;
        });
    }
}

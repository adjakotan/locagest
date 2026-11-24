<?php

namespace Tests\Feature;

use App\Enums\Fund;
use App\Models\ExpenseCategory;

/** US 2.6 — F100–F110, R15, R20 */
class CashAndExpenseTest extends LocaGestTestCase
{
    private function fundedProperty($owner, int $rent = 50000)
    {
        $lease = $this->lease($owner, $rent);
        $invoice = $lease->invoices()->first();
        $this->actingAs($owner)->postJson("/api/invoices/{$invoice->id}/payments", ['amount' => $rent, 'paid_at' => today()->toDateString(), 'method' => 'cash'])->assertCreated();

        return $lease->unit->property; // principale = 90 %, réserve = 10 %
    }

    public function test_expense_reduces_balance(): void
    {
        $owner = $this->owner();
        $property = $this->fundedProperty($owner); // main 45 000
        $cat = ExpenseCategory::first();

        $id = $this->postJson('/api/expenses', [
            'property_id' => $property->id, 'category_id' => $cat->id, 'amount' => 20000,
            'spent_at' => today()->toDateString(), 'method' => 'cash', 'funded_from' => 'main', 'description' => 'Plomberie',
        ])->assertCreated()->assertJsonPath('data.status', 'approved')->json('data.id');
        $this->assertSame(25000, $property->balance(Fund::Main));

        $this->postJson("/api/expenses/$id/cancel", ['reason' => 'Erreur de saisie'])->assertOk();
        $this->assertSame(45000, $property->balance(Fund::Main));
    }

    public function test_r15_expense_above_balance_is_refused(): void
    {
        $owner = $this->owner();
        $property = $this->fundedProperty($owner, 30000); // main 27 000
        $this->postJson('/api/expenses', [
            'property_id' => $property->id, 'category_id' => ExpenseCategory::first()->id, 'amount' => 80000,
            'spent_at' => today()->toDateString(), 'method' => 'cash', 'funded_from' => 'main',
        ])->assertUnprocessable()->assertJsonValidationErrors('amount');
        $this->assertSame(27000, $property->balance(Fund::Main));
        $this->assertDatabaseCount('expenses', 0);
    }

    public function test_r20_withdrawal_above_main_balance_is_refused(): void
    {
        $owner = $this->owner();
        $property = $this->fundedProperty($owner); // main 45 000, réserve 5 000
        $this->postJson("/api/properties/{$property->id}/cash/withdrawals", ['amount' => 200000])->assertUnprocessable();
        // La réserve n'est jamais retirée : 45 000 maximum.
        $this->postJson("/api/properties/{$property->id}/cash/withdrawals", ['amount' => 46000])->assertUnprocessable();
        $this->postJson("/api/properties/{$property->id}/cash/withdrawals", ['amount' => 45000])->assertCreated()->assertJsonPath('balances.main', 0);
        $this->getJson("/api/properties/{$property->id}/cash")->assertOk()->assertJsonPath('balances.reserve', 5000);
    }

    public function test_transfer_between_funds(): void
    {
        $owner = $this->owner();
        $property = $this->fundedProperty($owner);
        $this->postJson("/api/properties/{$property->id}/cash/transfers", ['from' => 'main', 'amount' => 10000])
            ->assertCreated()->assertJsonPath('balances.main', 35000)->assertJsonPath('balances.reserve', 15000);
        $this->postJson("/api/properties/{$property->id}/cash/transfers", ['from' => 'reserve', 'amount' => 99999])->assertUnprocessable();
    }

    public function test_cannot_see_another_owners_cash(): void
    {
        $property = $this->property($this->owner());
        $this->actingAs($this->owner())->getJson("/api/properties/{$property->id}/cash")->assertForbidden();
    }
}

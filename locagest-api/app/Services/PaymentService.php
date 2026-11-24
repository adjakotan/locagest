<?php

namespace App\Services;

use App\Enums\Fund;
use App\Enums\InvoiceStatus;
use App\Enums\MovementType;
use App\Enums\PaymentStatus;
use App\Models\FundMovement;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Paiements hors ligne (F41–F44, F49) et confirmation en transaction (§6.1).
 */
class PaymentService
{
    public function __construct(
        private SequenceService $sequences,
        private CashService $cash,
    ) {}

    /** F41 : paiement saisi par le propriétaire → confirmé d'office. */
    public function record(Invoice $invoice, array $data, User $by): Payment
    {
        return DB::transaction(function () use ($invoice, $data, $by) {
            $payment = Payment::create([
                ...$data,
                'invoice_id' => $invoice->id,
                'status' => PaymentStatus::Declared,
                'declared_by_tenant' => false,
                'recorded_by' => $by->id,
            ]);

            return $this->confirm($payment, $by);
        });
    }

    /** F49 / RG17 : paiement déclaré par le locataire → reste « en attente ». */
    public function declare(Invoice $invoice, array $data, User $tenantUser): Payment
    {
        if ($invoice->status === InvoiceStatus::Paid) {
            throw ValidationException::withMessages(['amount' => 'Cette facture est déjà entièrement payée.']);
        }
        $pending = (int) $invoice->payments()->where('status', PaymentStatus::Declared)->sum('amount');
        if ($invoice->remaining() < $data['amount'] + $pending) {
            throw ValidationException::withMessages([
                'amount' => 'Le montant dépasse le reste à payer ('.number_format($invoice->remaining() - $pending, 0, ',', ' ').' FCFA).',
            ]);
        }

        return Payment::create([
            ...$data,
            'invoice_id' => $invoice->id,
            'status' => PaymentStatus::Declared,
            'declared_by_tenant' => true,
            'recorded_by' => $tenantUser->id,
        ]);
    }

    /** §6.1 : confirmation atomique d'un paiement. */
    public function confirm(Payment $payment, User $by): Payment
    {
        return DB::transaction(function () use ($payment, $by) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($payment->status !== PaymentStatus::Declared) {
                throw ValidationException::withMessages(['payment' => 'Ce paiement a déjà été traité.']);
            }

            // Verrouiller la facture pour éviter deux confirmations simultanées.
            $invoice = Invoice::whereKey($payment->invoice_id)->lockForUpdate()->firstOrFail();

            // RG07 / F43 : jamais plus que le reste dû.
            if ($payment->amount > $invoice->remaining()) {
                throw ValidationException::withMessages([
                    'amount' => 'Le montant ('.number_format($payment->amount, 0, ',', ' ').' FCFA) dépasse le reste dû de la facture ('.number_format($invoice->remaining(), 0, ',', ' ').' FCFA).',
                ]);
            }

            $invoice->amount_paid += $payment->amount;
            $invoice->status = $invoice->computeStatus();
            $invoice->save();

            $payment->status = PaymentStatus::Confirmed;
            $payment->confirmed_by = $by->id;
            $payment->confirmed_at = now();

            // RG08 : numéro de quittance attribué une seule fois, quand la facture est soldée.
            if ($invoice->status === InvoiceStatus::Paid) {
                $payment->receipt_number = $this->sequences->receiptNumber();
            }
            $payment->save();

            // RG18 : répartition réserve / caisse principale.
            $property = $invoice->lease->unit->property;
            $reserve = intdiv($payment->amount * $property->reserve_rate, 100);
            $main = $payment->amount - $reserve;
            $extra = ['payment_id' => $payment->id, 'note' => 'Facture '.$invoice->invoice_number];
            $this->cash->movement($property, Fund::Reserve, 'in', $reserve, MovementType::RentPayment, $by, $extra);
            $this->cash->movement($property, Fund::Main, 'in', $main, MovementType::RentPayment, $by, $extra);

            return $payment->fresh();
        });
    }

    /** F49 : refus d'un paiement déclaré. */
    public function reject(Payment $payment, User $by, ?string $reason): Payment
    {
        if ($payment->status !== PaymentStatus::Declared) {
            throw ValidationException::withMessages(['payment' => 'Seul un paiement en attente peut être refusé.']);
        }
        $payment->update([
            'status' => PaymentStatus::Rejected,
            'confirmed_by' => $by->id,
            'confirmed_at' => now(),
            'cancel_reason' => $reason,
        ]);

        return $payment;
    }

    /** F44 / RG09 / RG18 : annulation avec motif, mouvements inverses, sans suppression. */
    public function cancel(Payment $payment, User $by, string $reason): Payment
    {
        return DB::transaction(function () use ($payment, $by, $reason) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if (! in_array($payment->status, [PaymentStatus::Confirmed, PaymentStatus::Declared], true)) {
                throw ValidationException::withMessages(['payment' => 'Ce paiement est déjà annulé ou refusé.']);
            }

            if ($payment->status === PaymentStatus::Confirmed) {
                $invoice = Invoice::whereKey($payment->invoice_id)->lockForUpdate()->firstOrFail();
                $property = $this->cash->lock($invoice->lease->unit->property);

                // Mouvements inverses de ceux créés à la confirmation.
                $movements = FundMovement::where('payment_id', $payment->id)
                    ->where('type', MovementType::RentPayment)->get();
                foreach ($movements as $m) {
                    $this->cash->withdrawFrom($property, $m->fund, $m->amount, MovementType::Reversal, $by, [
                        'payment_id' => $payment->id,
                        'note' => 'Annulation du paiement — '.$reason,
                    ], 'payment');
                }

                $invoice->amount_paid -= $payment->amount;
                $invoice->status = $invoice->computeStatus();
                $invoice->save();
            }

            // Le numéro de quittance éventuel reste sur ce paiement : il n'est jamais réutilisé (RG08).
            $payment->update([
                'status' => PaymentStatus::Cancelled,
                'cancelled_at' => now(),
                'cancel_reason' => $reason,
            ]);

            return $payment;
        });
    }
}

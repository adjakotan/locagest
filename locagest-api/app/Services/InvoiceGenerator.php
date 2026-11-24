<?php

namespace App\Services;

use App\Enums\InvoiceItemType;
use App\Enums\InvoiceStatus;
use App\Enums\LeaseStatus;
use App\Models\Invoice;
use App\Models\Lease;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Génération des factures mensuelles (F40, §6 invoices:generate).
 * Idempotente : une seule facture par bail et par mois (RG05).
 */
class InvoiceGenerator
{
    public function __construct(private SequenceService $sequences) {}

    /** Génère les factures du mois pour tous les baux actifs. Retourne le nombre de factures créées. */
    public function generateForMonth(CarbonImmutable $month): int
    {
        $created = 0;
        Lease::query()
            ->where('status', LeaseStatus::Active)
            ->where('start_date', '<=', $month->endOfMonth()->toDateString())
            ->chunkById(200, function ($leases) use ($month, &$created) {
                foreach ($leases as $lease) {
                    [, $wasCreated] = $this->generateForLease($lease, $month);
                    $created += $wasCreated ? 1 : 0;
                }
            });

        return $created;
    }

    /**
     * Crée (ou retrouve) la facture d'un bail pour un mois.
     *
     * @return array{0: Invoice|null, 1: bool} [facture, créée maintenant ?]
     */
    public function generateForLease(Lease $lease, CarbonImmutable $month): array
    {
        $period = $month->startOfMonth();

        // RG11 : pas de facture après la fin du bail ; pas avant son début.
        if ($lease->end_date && $lease->end_date->lt($period)) {
            return [null, false];
        }
        if ($lease->start_date->gt($period->endOfMonth())) {
            return [null, false];
        }

        $existing = Invoice::where('lease_id', $lease->id)->whereDate('period', $period)->first();
        if ($existing) {
            return [$existing, false];
        }

        try {
            $invoice = DB::transaction(function () use ($lease, $period) {
                $invoice = Invoice::create([
                    'lease_id' => $lease->id,
                    'invoice_number' => $this->sequences->invoiceNumber($period),
                    'period' => $period->toDateString(),
                    'issued_at' => today()->toDateString(),
                    'due_date' => $period->setDay($lease->due_day)->toDateString(),
                    'amount_due' => 0,
                    'amount_paid' => 0,
                    'status' => InvoiceStatus::Pending,
                ]);
                // RG10 : le premier mois est dû en entier en V1.
                $invoice->items()->create([
                    'type' => InvoiceItemType::Rent,
                    'label' => 'Loyer — '.$period->locale('fr')->translatedFormat('F Y'),
                    'amount' => $lease->rent_amount,
                ]);
                $invoice->recalculate();

                return $invoice;
            });
        } catch (UniqueConstraintViolationException) {
            // Exécution concurrente : la facture existe déjà (RG05).
            return [Invoice::where('lease_id', $lease->id)->whereDate('period', $period)->first(), false];
        }

        return [$invoice, true];
    }

    /** §6 invoices:mark-late : passe en retard et ajoute la pénalité prévue au bail (une seule fois). */
    public function markLate(): int
    {
        $count = 0;
        Invoice::query()
            ->with('lease')
            ->whereIn('status', [InvoiceStatus::Pending, InvoiceStatus::Partial, InvoiceStatus::Late])
            ->whereDate('due_date', '<', today())
            ->chunkById(200, function ($invoices) use (&$count) {
                foreach ($invoices as $invoice) {
                    DB::transaction(function () use ($invoice, &$count) {
                        if ($invoice->lease->late_fee > 0
                            && ! $invoice->items()->where('type', InvoiceItemType::Penalty)->exists()) {
                            $invoice->items()->create([
                                'type' => InvoiceItemType::Penalty,
                                'label' => 'Pénalité de retard',
                                'amount' => $invoice->lease->late_fee,
                            ]);
                        }
                        $wasLate = $invoice->status === InvoiceStatus::Late;
                        $invoice->recalculate();
                        if (! $wasLate && $invoice->status === InvoiceStatus::Late) {
                            $count++;
                        }
                    });
                }
            });

        return $count;
    }
}

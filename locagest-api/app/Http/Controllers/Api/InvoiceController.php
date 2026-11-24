<?php

namespace App\Http\Controllers\Api;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceItemRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\Lease;
use App\Services\InvoiceGenerator;
use App\Services\PdfService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** F40, F45–F48 : factures. */
class InvoiceController extends Controller
{
    public function __construct(private InvoiceGenerator $generator) {}

    /** F45 : liste filtrable (mois AAAA-MM, bien, statut, locataire). */
    public function index(Request $request)
    {
        $invoices = Invoice::query()
            ->whereHas('lease.unit.property', fn ($q) => $q->visibleTo($request->user()))
            ->when($request->query('month'), fn ($q, $m) => $q->whereDate('period', CarbonImmutable::parse($m.'-01')->toDateString()))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('property'), fn ($q, $p) => $q->whereHas('lease.unit', fn ($q) => $q->where('property_id', $p)))
            ->when($request->query('tenant'), fn ($q, $t) => $q->whereHas('lease', fn ($q) => $q->where('tenant_id', $t)))
            ->when($request->query('lease'), fn ($q, $l) => $q->where('lease_id', $l))
            ->with(['lease.unit.property', 'lease.tenant'])
            ->orderByDesc('period')->orderBy('invoice_number')
            ->paginate($request->integer('per_page', 25));

        return InvoiceResource::collection($invoices);
    }

    /** US 2.1 : créer la facture d'un bail en cours pour un mois donné (RG05 : une seule par mois). */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lease_id' => ['required', 'integer', 'exists:leases,id'],
            'month' => ['required', 'date_format:Y-m'],
        ]);
        $lease = Lease::findOrFail($data['lease_id']);
        $this->authorize('update', $lease);
        if (! $lease->isActive()) {
            throw ValidationException::withMessages(['lease_id' => 'Une facture ne peut être créée que pour un bail en cours.']);
        }

        [$invoice, $created] = $this->generator->generateForLease($lease, CarbonImmutable::parse($data['month'].'-01'));
        if (! $invoice) {
            throw ValidationException::withMessages(['month' => 'Ce mois est en dehors de la période du bail.']);
        }
        if (! $created) {
            throw ValidationException::withMessages(['month' => 'La facture de ce mois existe déjà ('.$invoice->invoice_number.').']);
        }

        return (new InvoiceResource($invoice->load(['items', 'lease.unit.property', 'lease.tenant'])))->response()->setStatusCode(201);
    }

    /** Lance manuellement la génération du mois (même traitement que la commande planifiée). */
    public function generate(Request $request): JsonResponse
    {
        $month = CarbonImmutable::parse(($request->input('month') ?? now()->format('Y-m')).'-01');
        $count = 0;
        Lease::query()->where('status', 'active')
            ->whereHas('unit.property', fn ($q) => $q->visibleTo($request->user()))
            ->each(function (Lease $lease) use ($month, &$count) {
                [, $created] = $this->generator->generateForLease($lease, $month);
                $count += $created ? 1 : 0;
            });

        return response()->json(['message' => $count.' facture(s) créée(s).', 'created' => $count]);
    }

    public function show(Invoice $invoice): InvoiceResource
    {
        $this->authorize('view', $invoice);

        return new InvoiceResource($invoice->load(['items', 'lease.unit.property', 'lease.tenant', 'payments' => fn ($q) => $q->with('recorder')->latest(), 'receiptPayment']));
    }

    /** F47 / RG25 : ajout d'une ligne ; correction par une ligne négative, jamais par modification. */
    public function addItem(StoreInvoiceItemRequest $request, Invoice $invoice): InvoiceResource
    {
        $this->authorize('manage', $invoice);
        $data = $request->validated();

        DB::transaction(function () use ($invoice, $data) {
            $invoice = Invoice::whereKey($invoice->id)->lockForUpdate()->firstOrFail();
            if ($invoice->status === InvoiceStatus::Paid) {
                throw ValidationException::withMessages(['invoice' => 'Cette facture est entièrement payée : elle ne peut plus être modifiée.']);
            }
            if ($data['amount'] < 0 && $data['type'] !== 'correction') {
                throw ValidationException::withMessages(['amount' => 'Un montant négatif n\'est autorisé que pour une ligne de correction.']);
            }
            $newTotal = $invoice->amount_due + $data['amount'];
            if ($newTotal < $invoice->amount_paid || $newTotal < 0) {
                throw ValidationException::withMessages(['amount' => 'Le total de la facture ne peut pas devenir inférieur à ce qui a déjà été payé.']);
            }
            $invoice->items()->create($data);
            $invoice->recalculate();
        });

        return $this->show($invoice->fresh());
    }

    /** F48 : avis d'échéance PDF. */
    public function pdf(Invoice $invoice, PdfService $pdf)
    {
        $this->authorize('view', $invoice);

        return $pdf->invoice($invoice);
    }
}

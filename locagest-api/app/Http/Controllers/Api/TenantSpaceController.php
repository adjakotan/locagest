<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeclarePaymentRequest;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\LeaseResource;
use App\Http\Resources\PaymentResource;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\PaymentDeclared;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** F70–F73 : espace du locataire connecté (/api/me/...). */
class TenantSpaceController extends Controller
{
    private function tenant(Request $request): Tenant
    {
        $tenant = $request->user()->tenantProfile;
        abort_unless($tenant, 403, 'Aucune fiche locataire n\'est liée à ce compte.');

        return $tenant;
    }

    /** F70 / F72 : bail actif, anciens baux et solde dû. */
    public function leases(Request $request): JsonResponse
    {
        $tenant = $this->tenant($request);
        $leases = $tenant->leases()->with('unit.property.owner')->latest('start_date')->get();
        $active = $leases->firstWhere('status.value', 'active');

        return response()->json([
            'tenant' => ['id' => $tenant->id, 'full_name' => $tenant->full_name, 'phone' => $tenant->phone],
            'active_lease' => $active ? new LeaseResource($active) : null,
            'owner' => $active ? ['name' => $active->unit->property->owner->name, 'phone' => $active->unit->property->owner->phone] : null,
            'leases' => LeaseResource::collection($leases),
            'balance_due' => $tenant->balanceDue(),
        ]);
    }

    /** F70 / F71 : uniquement ses propres factures, avec le lien vers la quittance. */
    public function invoices(Request $request)
    {
        $invoices = $this->tenant($request)->invoices()
            ->with(['lease.unit.property', 'receiptPayment'])
            ->when($request->query('status'), fn ($q, $s) => $q->where('invoices.status', $s))
            ->orderByDesc('period')
            ->paginate($request->integer('per_page', 24));

        return InvoiceResource::collection($invoices);
    }

    public function invoice(Request $request, Invoice $invoice): InvoiceResource
    {
        $this->authorize('view', $invoice);

        return new InvoiceResource($invoice->load(['items', 'lease.unit.property', 'payments' => fn ($q) => $q->latest(), 'receiptPayment']));
    }

    /** F49 / F73 : déclaration d'un paiement avec preuve ; reste « en attente » (RG17). */
    public function declarePayment(DeclarePaymentRequest $request, Invoice $invoice, PaymentService $payments): JsonResponse
    {
        $this->authorize('declarePayment', $invoice);
        $data = $request->validated();
        unset($data['proof']);
        if ($request->hasFile('proof')) {
            $data['proof_path'] = $request->file('proof')->store('proofs', 'local');
        }

        $payment = $payments->declare($invoice, $data, $request->user());

        // F95 : notification du propriétaire.
        $owner = User::find($invoice->lease->unit->property->owner_id);
        $owner?->notify(new PaymentDeclared($payment));

        return (new PaymentResource($payment))->response()->setStatusCode(201);
    }

    /** F73 : suivi du statut de ses déclarations. */
    public function payments(Request $request)
    {
        $tenant = $this->tenant($request);

        return PaymentResource::collection(
            Payment::whereIn('invoice_id', $tenant->invoices()->select('invoices.id'))
                ->with('invoice')->latest()->paginate(30)
        );
    }
}

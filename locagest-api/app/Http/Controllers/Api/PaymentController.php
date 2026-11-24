<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\PaymentService;
use App\Services\PdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/** F41–F45, F49, F52 : paiements et quittances. */
class PaymentController extends Controller
{
    public function __construct(private PaymentService $payments) {}

    /** F45 : liste des paiements (par défaut, les paiements déclarés à confirmer). */
    public function index(Request $request)
    {
        $payments = Payment::query()
            ->whereHas('invoice.lease.unit.property', fn ($q) => $q->visibleTo($request->user()))
            ->where('status', $request->query('status', PaymentStatus::Declared->value))
            ->with(['invoice.lease.unit.property', 'invoice.lease.tenant', 'recorder'])
            ->latest()
            ->paginate($request->integer('per_page', 25));

        return PaymentResource::collection($payments);
    }

    /** F41 : paiement saisi par le propriétaire, confirmé d'office (§6.1). */
    public function store(StorePaymentRequest $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('manage', $invoice);
        $payment = $this->payments->record($invoice, $request->validated(), $request->user());

        return (new PaymentResource($payment->load('invoice')))->response()->setStatusCode(201);
    }

    public function confirm(Request $request, Payment $payment): PaymentResource
    {
        $this->authorize('manage', $payment);

        return new PaymentResource($this->payments->confirm($payment, $request->user())->load('invoice'));
    }

    public function reject(Request $request, Payment $payment): PaymentResource
    {
        $this->authorize('manage', $payment);
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);

        return new PaymentResource($this->payments->reject($payment, $request->user(), $data['reason'] ?? null));
    }

    /** F44 : annulation avec motif obligatoire. */
    public function cancel(Request $request, Payment $payment): PaymentResource
    {
        $this->authorize('manage', $payment);
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        return new PaymentResource($this->payments->cancel($payment, $request->user(), $data['reason']));
    }

    /** F52 / R8 : quittance PDF, protégée par la policy. */
    public function receipt(Payment $payment, PdfService $pdf)
    {
        $this->authorize('view', $payment);
        abort_if(! $payment->receipt_number || $payment->status !== PaymentStatus::Confirmed, 404, 'Aucune quittance pour ce paiement : la facture n\'est pas soldée.');

        return $pdf->receipt($payment);
    }

    /** Preuve fournie par le locataire (fichier servi après contrôle d'accès, §7). */
    public function proof(Payment $payment)
    {
        $this->authorize('view', $payment);
        abort_unless($payment->proof_path && Storage::disk('local')->exists($payment->proof_path), 404);

        return Storage::disk('local')->response($payment->proof_path);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTenantRequest;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\TenantResource;
use App\Mail\TenantInvitationMail;
use App\Models\Payment;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** F20–F22 : locataires ; F04 : invitation. */
class TenantController extends Controller
{
    private const BALANCE_SQL = '(select coalesce(sum(i.amount_due - i.amount_paid),0) from invoices i join leases l on l.id = i.lease_id where l.tenant_id = tenants.id and i.status != ?) as balance_due';

    /** F21 : recherche par nom ou téléphone. */
    public function index(Request $request)
    {
        $tenants = $request->user()->tenants()
            ->select('tenants.*')
            ->selectRaw(self::BALANCE_SQL, [InvoiceStatus::Paid->value])
            ->when($request->query('search'), fn ($q, $s) => $q->where(fn ($q) => $q->where('full_name', 'like', "%$s%")->orWhere('phone', 'like', "%$s%")))
            ->with('activeLease.unit.property')
            ->orderBy('full_name')
            ->paginate($request->integer('per_page', 20));

        return TenantResource::collection($tenants);
    }

    public function store(StoreTenantRequest $request): JsonResponse
    {
        $tenant = $request->user()->tenants()->create($request->validated());

        return (new TenantResource($tenant))->response()->setStatusCode(201);
    }

    /** F22 : fiche avec baux, factures, paiements, solde dû. */
    public function show(Tenant $tenant): JsonResponse
    {
        $this->authorize('view', $tenant);
        $tenant->load(['leases' => fn ($q) => $q->with('unit.property')->latest('start_date'), 'activeLease.unit.property']);
        $tenant->balance_due = $tenant->balanceDue();

        $invoices = $tenant->invoices()->with('lease.unit.property')->latest('period')->limit(24)->get();
        $payments = Payment::whereIn('invoice_id', $tenant->invoices()->select('invoices.id'))
            ->latest('paid_at')->limit(24)->get();

        return response()->json([
            'data' => new TenantResource($tenant),
            'invoices' => InvoiceResource::collection($invoices),
            'payments' => PaymentResource::collection($payments),
        ]);
    }

    public function update(StoreTenantRequest $request, Tenant $tenant): TenantResource
    {
        $this->authorize('update', $tenant);
        $tenant->update($request->validated());

        return new TenantResource($tenant);
    }

    /** F04 : invitation par e-mail ; lien à usage unique valable 7 jours. */
    public function invite(Tenant $tenant): JsonResponse
    {
        $this->authorize('update', $tenant);
        if ($tenant->user_id) {
            throw ValidationException::withMessages(['tenant' => 'Ce locataire a déjà un compte.']);
        }
        if (! $tenant->email) {
            throw ValidationException::withMessages(['email' => 'Renseignez l\'e-mail du locataire avant de l\'inviter.']);
        }

        $token = Str::random(48);
        DB::table('tenants')->where('id', $tenant->id)->update([
            'invitation_token' => hash('sha256', $token),
            'invitation_expires_at' => now()->addDays(7),
        ]);

        $url = rtrim(config('app.frontend_url'), '/').'/invitation/'.$token;
        Mail::to($tenant->email)->send(new TenantInvitationMail($tenant, $url));

        return response()->json(['message' => 'Invitation envoyée à '.$tenant->email.'.', 'url' => app()->isProduction() ? null : $url]);
    }
}

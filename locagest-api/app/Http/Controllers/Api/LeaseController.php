<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EndLeaseRequest;
use App\Http\Requests\StoreLeaseRequest;
use App\Http\Resources\LeaseResource;
use App\Models\Lease;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\LeaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** F30–F35 : baux. */
class LeaseController extends Controller
{
    public function __construct(private LeaseService $leases) {}

    public function index(Request $request)
    {
        $leases = Lease::query()
            ->whereHas('unit.property', fn ($q) => $q->visibleTo($request->user()))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('property'), fn ($q, $p) => $q->whereHas('unit', fn ($q) => $q->where('property_id', $p)))
            ->when($request->query('search'), fn ($q, $s) => $q->whereHas('tenant', fn ($q) => $q->where('full_name', 'like', "%$s%")))
            ->with(['unit.property', 'tenant'])
            ->latest('start_date')
            ->paginate($request->integer('per_page', 20));

        return LeaseResource::collection($leases);
    }

    public function store(StoreLeaseRequest $request): JsonResponse
    {
        $data = $request->validated();
        // RG01 : le logement et le locataire doivent appartenir au propriétaire connecté.
        $this->authorize('update', Unit::findOrFail($data['unit_id']));
        $this->authorize('view', Tenant::findOrFail($data['tenant_id']));

        $lease = $this->leases->create($data);

        return (new LeaseResource($lease))->response()->setStatusCode(201);
    }

    public function show(Lease $lease): LeaseResource
    {
        $this->authorize('view', $lease);

        return new LeaseResource($lease->load(['unit.property', 'tenant']));
    }

    /** F33 / F35 : clôture et restitution de la caution. */
    public function end(EndLeaseRequest $request, Lease $lease): LeaseResource
    {
        $this->authorize('update', $lease);

        return new LeaseResource($this->leases->end($lease, $request->validated(), $request->user()));
    }
}

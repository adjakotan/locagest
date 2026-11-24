<?php

namespace App\Http\Controllers\Api;

use App\Enums\MaintenanceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMaintenanceRequest;
use App\Http\Resources\MaintenanceRequestResource;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** F80–F83 : signalements (locataire, propriétaire). */
class MaintenanceRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MaintenanceRequest::query()->with(['property', 'unit', 'tenant', 'reporter']);

        if ($user->isTenant()) {
            $query->where('tenant_id', $user->tenantProfile?->id ?? 0);
        } else {
            $query->whereHas('property', fn ($q) => $q->visibleTo($user))
                ->when($request->query('property'), fn ($q, $p) => $q->where('property_id', $p));
        }

        $items = $query->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderByRaw("CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END")
            ->latest()
            ->paginate($request->integer('per_page', 25));

        return MaintenanceRequestResource::collection($items);
    }

    public function store(StoreMaintenanceRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if ($user->isTenant()) {
            // F80 : le locataire signale un problème dans le logement de son bail en cours.
            $lease = $user->tenantProfile?->activeLease;
            if (! $lease) {
                throw ValidationException::withMessages(['title' => 'Vous n\'avez pas de bail en cours.']);
            }
            $data['unit_id'] = $lease->unit_id;
            $data['property_id'] = $lease->unit->property_id;
            $data['tenant_id'] = $lease->tenant_id;
        } else {
            // F83 : le propriétaire crée un signalement (visite, parties communes).
            $property = Property::findOrFail($data['property_id']);
            $this->authorize('update', $property);
            if (! empty($data['unit_id'])) {
                $unit = Unit::findOrFail($data['unit_id']);
                if ($unit->property_id !== $property->id) {
                    throw ValidationException::withMessages(['unit_id' => 'Ce logement n\'appartient pas au bien choisi.']);
                }
                $data['tenant_id'] = $unit->activeLease?->tenant_id;
            }
        }

        unset($data['photo']);
        if ($request->hasFile('photo')) {
            $data['photo_path'] = $request->file('photo')->store('maintenance', 'local');
        }

        $item = MaintenanceRequest::create([...$data, 'reported_by' => $user->id, 'priority' => $data['priority'] ?? 'normal']);

        return (new MaintenanceRequestResource($item->load(['property', 'unit', 'tenant', 'reporter'])))->response()->setStatusCode(201);
    }

    public function show(MaintenanceRequest $maintenanceRequest): MaintenanceRequestResource
    {
        $this->authorize('view', $maintenanceRequest);

        return new MaintenanceRequestResource($maintenanceRequest->load(['property', 'unit', 'tenant', 'reporter']));
    }

    /** F81 : changement de statut. */
    public function update(Request $request, MaintenanceRequest $maintenanceRequest): MaintenanceRequestResource
    {
        $this->authorize('update', $maintenanceRequest);
        $data = $request->validate([
            'status' => ['required', Rule::enum(MaintenanceStatus::class)],
            'priority' => ['nullable', Rule::in(['low', 'normal', 'urgent'])],
        ]);
        $maintenanceRequest->update([
            ...$data,
            'resolved_at' => $data['status'] === 'resolved' ? now() : null,
        ]);

        return $this->show($maintenanceRequest);
    }

    public function photo(MaintenanceRequest $maintenanceRequest)
    {
        $this->authorize('view', $maintenanceRequest);
        abort_unless($maintenanceRequest->photo_path && Storage::disk('local')->exists($maintenanceRequest->photo_path), 404);

        return Storage::disk('local')->response($maintenanceRequest->photo_path);
    }
}

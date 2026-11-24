<?php

namespace App\Http\Controllers\Api;

use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePropertyRequest;
use App\Http\Resources\PropertyResource;
use App\Models\Lease;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** F10, F14 : biens. */
class PropertyController extends Controller
{
    public function index(Request $request)
    {
        $properties = Property::visibleTo($request->user())
            ->withCount(['units', 'units as occupied_units_count' => fn ($q) => $q->where('status', UnitStatus::Occupied)])
            ->when($request->query('search'), fn ($q, $s) => $q->where(fn ($q) => $q->where('name', 'like', "%$s%")->orWhere('city', 'like', "%$s%")->orWhere('neighborhood', 'like', "%$s%")))
            ->when($request->query('city'), fn ($q, $c) => $q->where('city', $c))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 20));

        return PropertyResource::collection($properties);
    }

    public function store(StorePropertyRequest $request): JsonResponse
    {
        $property = $request->user()->properties()->create(array_filter($request->validated(), fn ($v) => $v !== null));

        return (new PropertyResource($property->loadCount('units')))->response()->setStatusCode(201);
    }

    public function show(Property $property): PropertyResource
    {
        $this->authorize('view', $property);
        $property->loadCount(['units', 'units as occupied_units_count' => fn ($q) => $q->where('status', UnitStatus::Occupied)])
            ->load(['units' => fn ($q) => $q->orderBy('label')->with('activeLease.tenant')]);

        return new PropertyResource($property);
    }

    public function update(StorePropertyRequest $request, Property $property): PropertyResource
    {
        $this->authorize('update', $property);
        $property->update([...$request->validated(), 'reserve_rate' => $request->validated('reserve_rate') ?? $property->reserve_rate]);

        return new PropertyResource($property->loadCount('units'));
    }

    public function destroy(Property $property): JsonResponse
    {
        $this->authorize('delete', $property);
        // On ne perd jamais l'historique financier (§5.3) : un bien qui a eu des baux ou des mouvements de caisse est conservé.
        $hasHistory = Lease::whereIn('unit_id', $property->units()->select('id'))->exists()
            || $property->fundMovements()->exists() || $property->expenses()->exists();
        if ($hasHistory) {
            throw ValidationException::withMessages(['property' => 'Ce bien a un historique (baux, paiements ou dépenses) et ne peut pas être supprimé.']);
        }
        $property->delete();

        return response()->json(['message' => 'Bien supprimé.']);
    }

    /** Liste des villes du propriétaire (pour les filtres). */
    public function cities(Request $request): JsonResponse
    {
        return response()->json(['data' => Property::visibleTo($request->user())->distinct()->orderBy('city')->pluck('city')]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUnitRequest;
use App\Http\Resources\UnitResource;
use App\Models\Property;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** F11–F13, F16, F34 : logements. */
class UnitController extends Controller
{
    /** Logements d'un bien. */
    public function index(Property $property)
    {
        $this->authorize('view', $property);

        return UnitResource::collection($property->units()->with('activeLease.tenant')->orderBy('label')->get());
    }

    /** F16 : recherche et filtres sur tous les logements (ville, bien, statut, loyer). */
    public function search(Request $request)
    {
        $units = Unit::query()
            ->whereHas('property', fn ($q) => $q->visibleTo($request->user())
                ->when($request->query('city'), fn ($q, $c) => $q->where('city', $c)))
            ->when($request->query('property'), fn ($q, $p) => $q->where('property_id', $p))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('type'), fn ($q, $t) => $q->where('type', $t))
            ->when($request->query('rent_min'), fn ($q, $m) => $q->where('default_rent', '>=', (int) $m))
            ->when($request->query('rent_max'), fn ($q, $m) => $q->where('default_rent', '<=', (int) $m))
            ->when($request->query('search'), fn ($q, $s) => $q->where('label', 'like', "%$s%"))
            ->with(['property', 'activeLease.tenant'])
            ->orderBy('property_id')->orderBy('label')
            ->paginate($request->integer('per_page', 25));

        return UnitResource::collection($units);
    }

    public function store(StoreUnitRequest $request, Property $property): JsonResponse
    {
        $this->authorize('update', $property);
        $unit = $property->units()->create($request->validated());

        return (new UnitResource($unit))->response()->setStatusCode(201);
    }

    /** F34 : fiche du logement avec l'historique de ses baux. */
    public function show(Unit $unit): UnitResource
    {
        $this->authorize('view', $unit);

        return new UnitResource($unit->load(['property', 'activeLease.tenant', 'leases' => fn ($q) => $q->with('tenant')->latest('start_date')]));
    }

    /** RG03 : modifier le loyer par défaut n'affecte pas les baux existants. */
    public function update(StoreUnitRequest $request, Unit $unit): UnitResource
    {
        $this->authorize('update', $unit);
        $unit->update($request->validated());

        return new UnitResource($unit->load('property'));
    }

    /** F13 : interdit si bail actif ; et l'historique des anciens baux est conservé. */
    public function destroy(Unit $unit): JsonResponse
    {
        $this->authorize('delete', $unit);
        if ($unit->hasActiveLease()) {
            throw ValidationException::withMessages(['unit' => 'Ce logement a un bail en cours : il ne peut pas être supprimé.']);
        }
        if ($unit->leases()->exists()) {
            throw ValidationException::withMessages(['unit' => 'Ce logement a un historique de baux : il ne peut pas être supprimé.']);
        }
        $unit->delete();

        return response()->json(['message' => 'Logement supprimé.']);
    }
}

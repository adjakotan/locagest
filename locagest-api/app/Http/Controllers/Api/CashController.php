<?php

namespace App\Http\Controllers\Api;

use App\Enums\Fund;
use App\Http\Controllers\Controller;
use App\Http\Resources\FundMovementResource;
use App\Models\Property;
use App\Services\CashService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** F100, F109, F110 : caisse du bien. */
class CashController extends Controller
{
    public function __construct(private CashService $cash) {}

    public function show(Request $request, Property $property): JsonResponse
    {
        $this->authorize('view', $property);
        $movements = $property->fundMovements()
            ->when($request->query('fund'), fn ($q, $f) => $q->where('fund', $f))
            ->with('recorder')
            ->latest('moved_at')->latest('id')
            ->paginate($request->integer('per_page', 30));

        return response()->json([
            'property' => ['id' => $property->id, 'name' => $property->name, 'reserve_rate' => $property->reserve_rate],
            'balances' => $this->cash->balances($property),
            'movements' => FundMovementResource::collection($movements)->response()->getData(true),
        ]);
    }

    /** F109 / RG22 : retrait du bénéfice. */
    public function withdraw(Request $request, Property $property): JsonResponse
    {
        $this->authorize('update', $property);
        $data = $request->validate(['amount' => ['required', 'integer', 'min:1'], 'note' => ['nullable', 'string', 'max:255']]);
        $this->cash->ownerWithdrawal($property, $data['amount'], $request->user(), $data['note'] ?? null);

        return response()->json(['message' => 'Retrait enregistré.', 'balances' => $this->cash->balances($property)], 201);
    }

    /** F110 : transfert entre caisse principale et réserve. */
    public function transfer(Request $request, Property $property): JsonResponse
    {
        $this->authorize('update', $property);
        $data = $request->validate([
            'from' => ['required', Rule::enum(Fund::class)],
            'amount' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);
        $this->cash->transfer($property, Fund::from($data['from']), $data['amount'], $request->user(), $data['note'] ?? null);

        return response()->json(['message' => 'Transfert enregistré.', 'balances' => $this->cash->balances($property)], 201);
    }
}

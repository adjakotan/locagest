<?php

namespace App\Http\Controllers\Api;

use App\Enums\MaintenanceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExpenseRequest;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Unit;
use App\Services\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/** F102–F105, RG20 : dépenses. */
class ExpenseController extends Controller
{
    public function __construct(private ExpenseService $expenses) {}

    public function index(Request $request)
    {
        $expenses = Expense::query()
            ->whereHas('property', fn ($q) => $q->visibleTo($request->user()))
            ->when($request->query('property'), fn ($q, $p) => $q->where('property_id', $p))
            ->when($request->query('category'), fn ($q, $c) => $q->where('category_id', $c))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('month'), fn ($q, $m) => $q->where('spent_at', 'like', $m.'%'))
            ->with(['property', 'unit', 'category'])
            ->latest('spent_at')->latest('id')
            ->paginate($request->integer('per_page', 25));

        return ExpenseResource::collection($expenses);
    }

    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $data = $request->validated();
        $property = Property::findOrFail($data['property_id']);
        $this->authorize('update', $property);

        // Cohérence : logement, catégorie et signalement doivent appartenir à ce bien / ce propriétaire.
        if (! empty($data['unit_id']) && Unit::find($data['unit_id'])?->property_id !== $property->id) {
            throw ValidationException::withMessages(['unit_id' => 'Ce logement n\'appartient pas au bien choisi.']);
        }
        if (! ExpenseCategory::availableTo($request->user())->whereKey($data['category_id'])->exists()) {
            throw ValidationException::withMessages(['category_id' => 'Catégorie inconnue.']);
        }
        if (! empty($data['maintenance_request_id']) && MaintenanceRequest::find($data['maintenance_request_id'])?->property_id !== $property->id) {
            throw ValidationException::withMessages(['maintenance_request_id' => 'Ce signalement ne concerne pas le bien choisi.']);
        }

        unset($data['receipt']);
        if ($request->hasFile('receipt')) {
            $data['receipt_path'] = $request->file('receipt')->store('expenses', 'local');
        }

        $expense = $this->expenses->record($property, $data, $request->user());

        // F105 : la dépense liée à un signalement le passe à « résolu » si demandé.
        if ($expense->maintenance_request_id && $request->boolean('resolve_request')) {
            MaintenanceRequest::whereKey($expense->maintenance_request_id)->update(['status' => MaintenanceStatus::Resolved, 'resolved_at' => now()]);
        }

        return (new ExpenseResource($expense))->response()->setStatusCode(201);
    }

    public function show(Expense $expense): ExpenseResource
    {
        $this->authorize('view', $expense);

        return new ExpenseResource($expense->load(['property', 'unit', 'category']));
    }

    public function cancel(Request $request, Expense $expense): ExpenseResource
    {
        $this->authorize('cancel', $expense);
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        return new ExpenseResource($this->expenses->cancel($expense, $request->user(), $data['reason'])->load(['property', 'unit', 'category']));
    }

    public function receipt(Expense $expense)
    {
        $this->authorize('view', $expense);
        abort_unless($expense->receipt_path && Storage::disk('local')->exists($expense->receipt_path), 404);

        return Storage::disk('local')->response($expense->receipt_path);
    }

    /** F104 : catégories fournies + personnalisées. */
    public function categories(Request $request): JsonResponse
    {
        return response()->json(['data' => ExpenseCategory::availableTo($request->user())->orderByRaw('owner_id is not null')->orderBy('name')->get(['id', 'name', 'owner_id'])]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:100']]);
        $category = ExpenseCategory::create(['owner_id' => $request->user()->id, 'name' => $data['name']]);

        return response()->json(['data' => $category], 201);
    }
}

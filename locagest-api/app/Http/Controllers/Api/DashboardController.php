<?php

namespace App\Http\Controllers\Api;

use App\Enums\ExpenseStatus;
use App\Enums\Fund;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\FundMovement;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Unit;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** F60–F65 : tableau de bord du propriétaire (vue consolidée ou par bien). */
class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $month = CarbonImmutable::parse(($request->query('month') ?? now()->format('Y-m')).'-01');
        $propertyIds = Property::visibleTo($user)
            ->when($request->query('property'), fn ($q, $p) => $q->whereKey($p))
            ->pluck('id');

        $invoices = fn () => Invoice::whereHas('lease.unit', fn ($q) => $q->whereIn('property_id', $propertyIds));
        $payments = fn () => Payment::whereHas('invoice.lease.unit', fn ($q) => $q->whereIn('property_id', $propertyIds));
        $expenses = fn () => Expense::whereIn('property_id', $propertyIds)->where('status', ExpenseStatus::Approved);

        $collectedIn = fn (CarbonImmutable $m) => (int) $payments()->where('status', PaymentStatus::Confirmed)
            ->whereBetween('paid_at', [$m->startOfMonth()->toDateString(), $m->endOfMonth()->toDateString()])->sum('amount');
        $spentIn = fn (CarbonImmutable $m) => (int) $expenses()
            ->whereBetween('spent_at', [$m->startOfMonth()->toDateString(), $m->endOfMonth()->toDateString()])->sum('amount');

        // F60
        $billed = (int) $invoices()->whereDate('period', $month->toDateString())->sum('amount_due');
        $collected = $collectedIn($month);
        $outstanding = (int) $invoices()->where('status', '!=', InvoiceStatus::Paid)->selectRaw('COALESCE(SUM(amount_due - amount_paid),0) as s')->value('s');

        // F61
        $late = $invoices()->where('status', InvoiceStatus::Late)
            ->with(['lease.tenant', 'lease.unit.property'])
            ->orderBy('due_date')->limit(50)->get()
            ->map(fn (Invoice $i) => [
                'invoice_id' => $i->id,
                'invoice_number' => $i->invoice_number,
                'tenant' => $i->lease->tenant->full_name,
                'phone' => $i->lease->tenant->phone,
                'unit' => $i->lease->unit->label,
                'property' => $i->lease->unit->property->name,
                'remaining' => $i->remaining(),
                'days_late' => (int) $i->due_date->diffInDays(today()),
            ]);

        // F62
        $totalUnits = Unit::whereIn('property_id', $propertyIds)->count();
        $occupied = Unit::whereIn('property_id', $propertyIds)->where('status', UnitStatus::Occupied)->count();

        // F63 : 12 derniers mois
        $chart = collect(range(11, 0))->map(function ($i) use ($month, $collectedIn, $spentIn) {
            $m = $month->subMonths($i);

            return ['month' => $m->format('Y-m'), 'label' => ucfirst($m->locale('fr')->translatedFormat('M Y')), 'collected' => $collectedIn($m), 'expenses' => $spentIn($m)];
        })->values();

        // F64 : soldes de la caisse
        $balance = fn (Fund $fund) => (int) FundMovement::whereIn('property_id', $propertyIds)->where('fund', $fund)
            ->selectRaw("COALESCE(SUM(CASE WHEN direction='in' THEN amount ELSE -amount END),0) as b")->value('b');
        $spent = $spentIn($month);

        // F65 : vue par bien
        $byProperty = Property::whereIn('id', $propertyIds)
            ->withCount(['units', 'units as occupied_units_count' => fn ($q) => $q->where('status', UnitStatus::Occupied)])
            ->orderBy('name')->get()
            ->map(fn (Property $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'city' => $p->city,
                'units_count' => $p->units_count,
                'occupancy_rate' => $p->occupancyRate(),
                'main' => $p->balance(Fund::Main),
                'reserve' => $p->balance(Fund::Reserve),
            ]);

        return response()->json([
            'month' => $month->format('Y-m'),
            'month_label' => ucfirst($month->locale('fr')->translatedFormat('F Y')),
            'billed' => $billed,
            'collected' => $collected,
            'outstanding' => $outstanding,
            'late_invoices' => $late,
            'late_count' => $late->count(),
            'units_count' => $totalUnits,
            'occupied_count' => $occupied,
            'occupancy_rate' => $totalUnits ? (int) round($occupied * 100 / $totalUnits) : 0,
            'cash_main' => $balance(Fund::Main),
            'cash_reserve' => $balance(Fund::Reserve),
            'expenses_month' => $spent,
            'net_result_month' => $collected - $spent,
            'pending_payments_count' => $payments()->where('status', PaymentStatus::Declared)->count(),
            'chart' => $chart,
            'properties' => $byProperty,
        ]);
    }
}

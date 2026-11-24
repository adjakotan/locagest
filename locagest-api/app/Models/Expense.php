<?php

namespace App\Models;

use App\Enums\ExpenseStatus;
use App\Enums\Fund;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    protected $fillable = [
        'property_id', 'unit_id', 'maintenance_request_id', 'category_id', 'amount', 'spent_at',
        'method', 'supplier', 'description', 'receipt_path', 'funded_from', 'rebill_mode',
        'rebill_lease_id', 'status', 'recorded_by', 'approved_by', 'approved_at', 'cancel_reason',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'spent_at' => 'date',
            'method' => PaymentMethod::class,
            'funded_from' => Fund::class,
            'status' => ExpenseStatus::class,
            'approved_at' => 'datetime',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'category_id');
    }

    public function maintenanceRequest(): BelongsTo
    {
        return $this->belongsTo(MaintenanceRequest::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

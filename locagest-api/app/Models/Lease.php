<?php

namespace App\Models;

use App\Enums\LeaseStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lease extends Model
{
    use HasFactory;

    protected $fillable = [
        'unit_id', 'tenant_id', 'start_date', 'end_date', 'rent_amount', 'deposit_amount',
        'due_day', 'late_fee', 'status', 'deposit_returned', 'deposit_deductions_note',
    ];

    protected $attributes = ['status' => 'active', 'deposit_amount' => 0, 'late_fee' => 0];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'status' => LeaseStatus::class,
            'rent_amount' => 'integer',
            'deposit_amount' => 'integer',
            'deposit_returned' => 'integer',
            'due_day' => 'integer',
            'late_fee' => 'integer',
        ];
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function isActive(): bool
    {
        return $this->status === LeaseStatus::Active;
    }
}

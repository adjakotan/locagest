<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use App\Enums\LeaseStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = ['owner_id', 'user_id', 'full_name', 'phone', 'email', 'id_number', 'emergency_contact'];

    protected $hidden = ['invitation_token'];

    protected function casts(): array
    {
        return ['invitation_expires_at' => 'datetime'];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function leases(): HasMany
    {
        return $this->hasMany(Lease::class);
    }

    public function activeLease(): HasOne
    {
        return $this->hasOne(Lease::class)->where('status', LeaseStatus::Active)->latestOfMany();
    }

    public function invoices(): HasManyThrough
    {
        return $this->hasManyThrough(Invoice::class, Lease::class);
    }

    /** F22 / F72 : solde dû = total des factures non soldées − déjà payé. */
    public function balanceDue(): int
    {
        return (int) $this->invoices()
            ->where('invoices.status', '!=', InvoiceStatus::Paid)
            ->sum(\DB::raw('invoices.amount_due - invoices.amount_paid'));
    }
}

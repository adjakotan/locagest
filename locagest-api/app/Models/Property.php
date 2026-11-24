<?php

namespace App\Models;

use App\Enums\Fund;
use App\Enums\UnitStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Property extends Model
{
    use HasFactory;

    protected $fillable = ['owner_id', 'name', 'address', 'city', 'neighborhood', 'description', 'reserve_rate'];

    protected $attributes = ['reserve_rate' => 10];

    protected function casts(): array
    {
        return ['reserve_rate' => 'integer'];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }

    public function fundMovements(): HasMany
    {
        return $this->hasMany(FundMovement::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /** Biens visibles par l'utilisateur (RG01). */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $query->where('owner_id', $user->id);
    }

    /** F14 : taux d'occupation en % (entier). */
    public function occupancyRate(): int
    {
        $total = $this->units_count ?? $this->units()->count();
        if ($total === 0) {
            return 0;
        }
        $occupied = $this->occupied_units_count ?? $this->units()->where('status', UnitStatus::Occupied)->count();

        return (int) round($occupied * 100 / $total);
    }

    /** Solde d'un compartiment de la caisse = entrées − sorties (§5.3). */
    public function balance(Fund $fund): int
    {
        $row = $this->fundMovements()
            ->where('fund', $fund)
            ->selectRaw("COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END),0) - COALESCE(SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END),0) AS balance")
            ->first();

        return (int) ($row->balance ?? 0);
    }
}

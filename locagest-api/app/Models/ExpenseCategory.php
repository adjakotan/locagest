<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ExpenseCategory extends Model
{
    protected $fillable = ['owner_id', 'name'];

    /** Catégories fournies (owner_id null) + catégories personnalisées du propriétaire (F104). */
    public function scopeAvailableTo(Builder $query, User $user): Builder
    {
        return $query->where(fn ($q) => $q->whereNull('owner_id')->orWhere('owner_id', $user->id));
    }
}

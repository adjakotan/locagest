<?php

namespace App\Models;

use App\Enums\AccountType;
use App\Enums\Role;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'phone', 'password', 'role',
        'account_type', 'company_name', 'company_ifu', 'approval_threshold',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $attributes = ['role' => 'owner'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'account_type' => AccountType::class,
            'approval_threshold' => 'integer',
        ];
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class, 'owner_id');
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class, 'owner_id');
    }

    /** Fiche locataire liée à ce compte (rôle tenant). */
    public function tenantProfile(): HasOne
    {
        return $this->hasOne(Tenant::class, 'user_id');
    }

    public function isOwner(): bool
    {
        return $this->role === Role::Owner;
    }

    public function isTenant(): bool
    {
        return $this->role === Role::Tenant;
    }

    /**
     * RG01 : un propriétaire n'accède qu'à ses propres biens.
     * (Au sprint 3, les gestionnaires y accéderont via property_managers.)
     */
    public function canAccessProperty(Property $property): bool
    {
        return $this->isOwner() && $property->owner_id === $this->id;
    }
}

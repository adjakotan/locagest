<?php

namespace App\Policies;

use App\Models\Lease;
use App\Models\User;

class LeasePolicy
{
    public function view(User $user, Lease $lease): bool
    {
        return $user->canAccessProperty($lease->unit->property)
            || ($user->isTenant() && $lease->tenant->user_id === $user->id);
    }

    public function update(User $user, Lease $lease): bool
    {
        return $user->canAccessProperty($lease->unit->property);
    }
}

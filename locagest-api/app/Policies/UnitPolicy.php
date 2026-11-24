<?php

namespace App\Policies;

use App\Models\Unit;
use App\Models\User;

class UnitPolicy
{
    public function view(User $user, Unit $unit): bool
    {
        return $user->canAccessProperty($unit->property);
    }

    public function update(User $user, Unit $unit): bool
    {
        return $user->canAccessProperty($unit->property);
    }

    public function delete(User $user, Unit $unit): bool
    {
        return $user->canAccessProperty($unit->property);
    }
}

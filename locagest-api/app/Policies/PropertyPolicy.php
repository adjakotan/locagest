<?php

namespace App\Policies;

use App\Models\Property;
use App\Models\User;

/** RG01 / R1 : un propriétaire ne voit et ne modifie que ses biens. */
class PropertyPolicy
{
    public function view(User $user, Property $property): bool
    {
        return $user->canAccessProperty($property);
    }

    public function update(User $user, Property $property): bool
    {
        return $user->canAccessProperty($property);
    }

    public function delete(User $user, Property $property): bool
    {
        return $user->canAccessProperty($property);
    }
}

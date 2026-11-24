<?php

namespace App\Policies;

use App\Models\MaintenanceRequest;
use App\Models\User;

class MaintenanceRequestPolicy
{
    public function view(User $user, MaintenanceRequest $request): bool
    {
        return $user->canAccessProperty($request->property)
            || ($user->isTenant() && $request->tenant && $request->tenant->user_id === $user->id);
    }

    /** F81 : seul le propriétaire (et plus tard le gestionnaire) change le statut. */
    public function update(User $user, MaintenanceRequest $request): bool
    {
        return $user->canAccessProperty($request->property);
    }
}

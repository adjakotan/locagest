<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;

class PaymentPolicy
{
    public function manage(User $user, Payment $payment): bool
    {
        return $user->canAccessProperty($payment->invoice->lease->unit->property);
    }

    /** R8 : un locataire ne télécharge que ses propres quittances. */
    public function view(User $user, Payment $payment): bool
    {
        return $this->manage($user, $payment)
            || ($user->isTenant() && $payment->invoice->lease->tenant->user_id === $user->id);
    }
}

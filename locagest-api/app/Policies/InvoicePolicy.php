<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;

class InvoicePolicy
{
    /** Le propriétaire du bien, ou le locataire titulaire du bail. */
    public function view(User $user, Invoice $invoice): bool
    {
        return $user->canAccessProperty($invoice->lease->unit->property)
            || ($user->isTenant() && $invoice->lease->tenant->user_id === $user->id);
    }

    public function manage(User $user, Invoice $invoice): bool
    {
        return $user->canAccessProperty($invoice->lease->unit->property);
    }

    /** F49 : seul le locataire titulaire déclare un paiement. */
    public function declarePayment(User $user, Invoice $invoice): bool
    {
        return $user->isTenant() && $invoice->lease->tenant->user_id === $user->id;
    }
}

<?php

namespace App\Policies;

use App\Models\Expense;
use App\Models\User;

class ExpensePolicy
{
    public function view(User $user, Expense $expense): bool
    {
        return $user->canAccessProperty($expense->property);
    }

    public function cancel(User $user, Expense $expense): bool
    {
        return $user->canAccessProperty($expense->property);
    }
}

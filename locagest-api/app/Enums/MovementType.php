<?php

namespace App\Enums;

enum MovementType: string
{
    case RentPayment = 'rent_payment';
    case Expense = 'expense';
    case OwnerWithdrawal = 'owner_withdrawal';
    case Transfer = 'transfer';
    case DepositRetention = 'deposit_retention';
    case Reversal = 'reversal';

    public function label(): string
    {
        return match ($this) {
            self::RentPayment => 'Paiement de loyer',
            self::Expense => 'Dépense',
            self::OwnerWithdrawal => 'Retrait du propriétaire',
            self::Transfer => 'Transfert',
            self::DepositRetention => 'Retenue sur caution',
            self::Reversal => 'Annulation',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

<?php

namespace App\Enums;

enum InvoiceStatus: string
{
    case Pending = 'pending';
    case Partial = 'partial';
    case Paid = 'paid';
    case Late = 'late';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Partial => 'Partiellement payée',
            self::Paid => 'Payée',
            self::Late => 'En retard',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

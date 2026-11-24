<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Declared = 'declared';
    case Confirmed = 'confirmed';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Declared => 'En attente',
            self::Confirmed => 'Confirmé',
            self::Rejected => 'Refusé',
            self::Cancelled => 'Annulé',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

<?php

namespace App\Enums;

enum InvoiceItemType: string
{
    case Rent = 'rent';
    case Water = 'water';
    case Electricity = 'electricity';
    case Waste = 'waste';
    case SharedCharge = 'shared_charge';
    case Penalty = 'penalty';
    case Damage = 'damage';
    case Correction = 'correction';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Rent => 'Loyer',
            self::Water => 'Eau',
            self::Electricity => 'Électricité',
            self::Waste => 'Ordures',
            self::SharedCharge => 'Charges communes',
            self::Penalty => 'Pénalité de retard',
            self::Damage => 'Retenue pour dégâts',
            self::Correction => 'Correction',
            self::Other => 'Autre',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

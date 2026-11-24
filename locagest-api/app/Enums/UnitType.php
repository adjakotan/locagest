<?php

namespace App\Enums;

enum UnitType: string
{
    case Room = 'room';
    case Apartment = 'apartment';
    case House = 'house';
    case Shop = 'shop';

    public function label(): string
    {
        return match ($this) {
            self::Room => 'Chambre',
            self::Apartment => 'Appartement',
            self::House => 'Maison',
            self::Shop => 'Boutique',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

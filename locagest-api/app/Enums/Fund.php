<?php

namespace App\Enums;

enum Fund: string
{
    case Main = 'main';
    case Reserve = 'reserve';

    public function label(): string
    {
        return match ($this) {
            self::Main => 'Caisse principale',
            self::Reserve => 'Réserve',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

<?php

namespace App\Enums;

enum Role: string
{
    case Owner = 'owner';
    case Manager = 'manager';
    case Tenant = 'tenant';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Propriétaire',
            self::Manager => 'Gestionnaire',
            self::Tenant => 'Locataire',
            self::Admin => 'Administrateur',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

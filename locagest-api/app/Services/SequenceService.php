<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Numéros uniques et séquentiels (F40, F51, RG08) : un compteur par clé,
 * verrouillé pendant la transaction pour qu'aucun numéro ne soit attribué deux fois.
 */
class SequenceService
{
    public function next(string $key): int
    {
        return DB::transaction(function () use ($key) {
            DB::table('sequences')->insertOrIgnore(['key' => $key, 'value' => 0]);
            $row = DB::table('sequences')->where('key', $key)->lockForUpdate()->first();
            $value = $row->value + 1;
            DB::table('sequences')->where('key', $key)->update(['value' => $value]);

            return $value;
        });
    }

    /** Ex. F-2026-11-000123 */
    public function invoiceNumber(\DateTimeInterface $period): string
    {
        $ym = $period->format('Y-m');

        return sprintf('F-%s-%06d', $ym, $this->next("invoice:$ym"));
    }

    /** Ex. Q-2026-000123 */
    public function receiptNumber(?int $year = null): string
    {
        $year ??= (int) now()->format('Y');

        return sprintf('Q-%d-%06d', $year, $this->next("receipt:$year"));
    }
}

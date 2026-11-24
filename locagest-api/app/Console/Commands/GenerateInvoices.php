<?php

namespace App\Console\Commands;

use App\Services\InvoiceGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

/** §6 : exécutée chaque jour à 00:30 ; idempotente (R3). */
class GenerateInvoices extends Command
{
    protected $signature = 'invoices:generate {--month= : Mois au format AAAA-MM (par défaut : mois en cours)}';

    protected $description = 'Crée la facture du mois pour chaque bail actif (sans doublon)';

    public function handle(InvoiceGenerator $generator): int
    {
        $month = CarbonImmutable::parse(($this->option('month') ?? now()->format('Y-m')).'-01');
        $count = $generator->generateForMonth($month);
        $this->info("$count facture(s) créée(s) pour ".$month->format('m/Y').'.');

        return self::SUCCESS;
    }
}

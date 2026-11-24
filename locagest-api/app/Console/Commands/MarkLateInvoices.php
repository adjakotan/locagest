<?php

namespace App\Console\Commands;

use App\Services\InvoiceGenerator;
use Illuminate\Console\Command;

/** §6 : exécutée chaque jour à 01:00 (R6). */
class MarkLateInvoices extends Command
{
    protected $signature = 'invoices:mark-late';

    protected $description = 'Passe en retard les factures échues non soldées et ajoute la pénalité prévue au bail';

    public function handle(InvoiceGenerator $generator): int
    {
        $count = $generator->markLate();
        $this->info("$count facture(s) passée(s) en retard.");

        return self::SUCCESS;
    }
}

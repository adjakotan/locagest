<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/** Facture PDF (F48) et quittance PDF (F50, F52). */
class PdfService
{
    public function invoice(Invoice $invoice): Response
    {
        $invoice->load(['items', 'lease.tenant', 'lease.unit.property.owner', 'payments' => fn ($q) => $q->where('status', 'confirmed')]);

        return Pdf::loadView('pdf.invoice', ['invoice' => $invoice])
            ->download($invoice->invoice_number.'.pdf');
    }

    public function receipt(Payment $payment): Response
    {
        $invoice = $payment->invoice->load(['items', 'lease.tenant', 'lease.unit.property.owner', 'payments' => fn ($q) => $q->where('status', 'confirmed')->orderBy('paid_at')]);

        return Pdf::loadView('pdf.receipt', ['payment' => $payment, 'invoice' => $invoice])
            ->download($payment->receipt_number.'.pdf');
    }
}

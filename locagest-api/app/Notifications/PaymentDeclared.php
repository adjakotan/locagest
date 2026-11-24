<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** F95 : le propriétaire est prévenu qu'un locataire a déclaré un paiement. */
class PaymentDeclared extends Notification
{
    use Queueable;

    public function __construct(public Payment $payment) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $invoice = $this->payment->invoice;
        $amount = number_format($this->payment->amount, 0, ',', ' ');

        return (new MailMessage)
            ->subject('Paiement déclaré à confirmer — '.$invoice->invoice_number)
            ->greeting('Bonjour '.$notifiable->name.',')
            ->line($invoice->lease->tenant->full_name.' déclare avoir payé '.$amount.' FCFA ('.$this->payment->method->label().') pour la facture '.$invoice->invoice_number.'.')
            ->line('Ce paiement n\'entre dans votre caisse qu\'après votre confirmation.')
            ->action('Voir les paiements à confirmer', rtrim(config('app.frontend_url'), '/').'/owner/payments');
    }
}

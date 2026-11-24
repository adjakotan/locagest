<?php

namespace App\Mail;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class TenantInvitationMail extends Mailable
{
    use Queueable;

    public function __construct(public Tenant $tenant, public string $url) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Votre espace locataire LocaGest');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.tenant-invitation', with: [
            'name' => $this->tenant->full_name,
            'owner' => $this->tenant->owner->company_name ?: $this->tenant->owner->name,
            'url' => $this->url,
        ]);
    }
}

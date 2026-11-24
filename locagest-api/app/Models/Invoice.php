<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = ['lease_id', 'invoice_number', 'period', 'issued_at', 'due_date', 'amount_due', 'amount_paid', 'status'];

    protected function casts(): array
    {
        return [
            'period' => 'date',
            'issued_at' => 'date',
            'due_date' => 'date',
            'amount_due' => 'integer',
            'amount_paid' => 'integer',
            'status' => InvoiceStatus::class,
        ];
    }

    public function lease(): BelongsTo
    {
        return $this->belongsTo(Lease::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** Paiement qui a soldé la facture et porte le numéro de quittance (RG08). */
    public function receiptPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->whereNotNull('receipt_number')
            ->where('status', PaymentStatus::Confirmed);
    }

    public function remaining(): int
    {
        return max(0, $this->amount_due - $this->amount_paid);
    }

    /** RG06 : statut calculé à partir des montants et de l'échéance. */
    public function computeStatus(): InvoiceStatus
    {
        if ($this->amount_due > 0 && $this->amount_paid >= $this->amount_due) {
            return InvoiceStatus::Paid;
        }
        if ($this->due_date->lt(today())) {
            return InvoiceStatus::Late;
        }

        return $this->amount_paid > 0 ? InvoiceStatus::Partial : InvoiceStatus::Pending;
    }

    /** RG07 : le total est toujours la somme des lignes. */
    public function recalculate(): void
    {
        $this->amount_due = max(0, (int) $this->items()->sum('amount'));
        $this->status = $this->computeStatus();
        $this->save();
    }
}

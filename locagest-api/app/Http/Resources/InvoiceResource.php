<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'period' => $this->period->toDateString(),
            'period_label' => ucfirst($this->period->locale('fr')->translatedFormat('F Y')),
            'issued_at' => $this->issued_at->toDateString(),
            'due_date' => $this->due_date->toDateString(),
            'amount_due' => $this->amount_due,
            'amount_paid' => $this->amount_paid,
            'remaining' => $this->remaining(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'days_late' => $this->status->value === 'late' ? (int) $this->due_date->diffInDays(today()) : 0,
            'lease' => $this->whenLoaded('lease', fn () => new LeaseResource($this->lease)),
            'items' => InvoiceItemResource::collection($this->whenLoaded('items')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'receipt' => $this->whenLoaded('receiptPayment', fn () => $this->receiptPayment ? [
                'payment_id' => $this->receiptPayment->id,
                'receipt_number' => $this->receiptPayment->receipt_number,
            ] : null),
        ];
    }
}

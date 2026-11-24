<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_id' => $this->invoice_id,
            'invoice' => $this->whenLoaded('invoice', fn () => new InvoiceResource($this->invoice)),
            'amount' => $this->amount,
            'paid_at' => $this->paid_at->toDateString(),
            'method' => $this->method->value,
            'method_label' => $this->method->label(),
            'reference' => $this->reference,
            'has_proof' => $this->proof_path !== null,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'declared_by_tenant' => $this->declared_by_tenant,
            'receipt_number' => $this->receipt_number,
            'note' => $this->note,
            'cancel_reason' => $this->cancel_reason,
            'recorded_by' => $this->whenLoaded('recorder', fn () => $this->recorder->name),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

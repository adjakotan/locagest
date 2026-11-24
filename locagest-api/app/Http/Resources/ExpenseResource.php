<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'property' => $this->whenLoaded('property', fn () => ['id' => $this->property->id, 'name' => $this->property->name]),
            'unit' => $this->whenLoaded('unit', fn () => $this->unit ? ['id' => $this->unit->id, 'label' => $this->unit->label] : null),
            'category' => $this->whenLoaded('category', fn () => ['id' => $this->category->id, 'name' => $this->category->name]),
            'maintenance_request_id' => $this->maintenance_request_id,
            'amount' => $this->amount,
            'spent_at' => $this->spent_at->toDateString(),
            'method' => $this->method->value,
            'method_label' => $this->method->label(),
            'supplier' => $this->supplier,
            'description' => $this->description,
            'has_receipt' => $this->receipt_path !== null,
            'funded_from' => $this->funded_from->value,
            'funded_from_label' => $this->funded_from->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'cancel_reason' => $this->cancel_reason,
        ];
    }
}

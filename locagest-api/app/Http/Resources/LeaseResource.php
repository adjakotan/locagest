<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unit_id' => $this->unit_id,
            'tenant_id' => $this->tenant_id,
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'label' => $this->unit->label,
                'property' => $this->unit->relationLoaded('property') ? ['id' => $this->unit->property->id, 'name' => $this->unit->property->name] : null,
            ]),
            'tenant' => $this->whenLoaded('tenant', fn () => ['id' => $this->tenant->id, 'full_name' => $this->tenant->full_name, 'phone' => $this->tenant->phone]),
            'start_date' => $this->start_date->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'rent_amount' => $this->rent_amount,
            'deposit_amount' => $this->deposit_amount,
            'due_day' => $this->due_day,
            'late_fee' => $this->late_fee,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'deposit_returned' => $this->deposit_returned,
            'deposit_deductions_note' => $this->deposit_deductions_note,
        ];
    }
}

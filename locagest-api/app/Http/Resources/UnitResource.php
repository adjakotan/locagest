<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UnitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'property' => $this->whenLoaded('property', fn () => ['id' => $this->property->id, 'name' => $this->property->name, 'city' => $this->property->city]),
            'label' => $this->label,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'default_rent' => $this->default_rent,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'active_lease' => $this->whenLoaded('activeLease', fn () => $this->activeLease ? [
                'id' => $this->activeLease->id,
                'tenant' => $this->activeLease->relationLoaded('tenant') ? ['id' => $this->activeLease->tenant->id, 'full_name' => $this->activeLease->tenant->full_name] : null,
                'rent_amount' => $this->activeLease->rent_amount,
            ] : null),
            'leases' => LeaseResource::collection($this->whenLoaded('leases')),
        ];
    }
}

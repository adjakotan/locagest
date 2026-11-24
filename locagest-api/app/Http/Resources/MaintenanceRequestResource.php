<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaintenanceRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'property' => $this->whenLoaded('property', fn () => ['id' => $this->property->id, 'name' => $this->property->name]),
            'unit' => $this->whenLoaded('unit', fn () => $this->unit ? ['id' => $this->unit->id, 'label' => $this->unit->label] : null),
            'tenant' => $this->whenLoaded('tenant', fn () => $this->tenant ? ['id' => $this->tenant->id, 'full_name' => $this->tenant->full_name] : null),
            'title' => $this->title,
            'description' => $this->description,
            'has_photo' => $this->photo_path !== null,
            'priority' => $this->priority->value,
            'priority_label' => $this->priority->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'reported_by' => $this->whenLoaded('reporter', fn () => $this->reporter->name),
            'resolved_at' => $this->resolved_at?->toDateString(),
            'created_at' => $this->created_at->toDateString(),
        ];
    }
}

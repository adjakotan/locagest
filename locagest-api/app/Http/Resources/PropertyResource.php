<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PropertyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'city' => $this->city,
            'neighborhood' => $this->neighborhood,
            'description' => $this->description,
            'reserve_rate' => $this->reserve_rate,
            'units_count' => $this->whenCounted('units'),
            'occupied_units_count' => $this->when(isset($this->occupied_units_count), fn () => (int) $this->occupied_units_count),
            'occupancy_rate' => $this->when(isset($this->units_count), fn () => $this->occupancyRate()),
            'units' => UnitResource::collection($this->whenLoaded('units')),
            'created_at' => $this->created_at?->toDateString(),
        ];
    }
}

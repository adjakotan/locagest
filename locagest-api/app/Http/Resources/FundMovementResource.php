<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FundMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fund' => $this->fund->value,
            'fund_label' => $this->fund->label(),
            'direction' => $this->direction,
            'amount' => $this->amount,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'note' => $this->note,
            'moved_at' => $this->moved_at->toDateString(),
            'recorded_by' => $this->whenLoaded('recorder', fn () => $this->recorder->name),
        ];
    }
}

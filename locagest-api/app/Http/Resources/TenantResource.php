<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isOwner = $request->user()?->id === $this->owner_id;

        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            // Données personnelles : pièce d'identité visible uniquement par le propriétaire (§7).
            'id_number' => $this->when($isOwner, $this->id_number),
            'emergency_contact' => $this->emergency_contact,
            'has_account' => $this->user_id !== null,
            'invitation_pending' => $this->user_id === null && $this->invitation_expires_at?->isFuture() === true,
            'active_lease' => $this->whenLoaded('activeLease', fn () => $this->activeLease ? new LeaseResource($this->activeLease) : null),
            'leases' => LeaseResource::collection($this->whenLoaded('leases')),
            'balance_due' => $this->when(isset($this->balance_due), fn () => (int) $this->balance_due),
        ];
    }
}

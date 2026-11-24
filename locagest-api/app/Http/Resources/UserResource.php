<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role->value,
            'role_label' => $this->role->label(),
            'account_type' => $this->account_type?->value,
            'company_name' => $this->company_name,
            'company_ifu' => $this->company_ifu,
            'approval_threshold' => $this->approval_threshold,
        ];
    }
}

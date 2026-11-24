<?php

namespace App\Http\Requests;

use App\Enums\MaintenancePriority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // les droits sont vérifiés par les Policies
    }

    public function rules(): array
    {
        return [
            'property_id' => [$this->user()->isTenant() ? 'nullable' : 'required', 'integer', 'exists:properties,id'],
            'unit_id' => ['nullable', 'integer', 'exists:units,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:3000'],
            'priority' => ['nullable', Rule::enum(MaintenancePriority::class)],
            'photo' => ['nullable', 'image', 'max:5120'],
        ];
    }
}

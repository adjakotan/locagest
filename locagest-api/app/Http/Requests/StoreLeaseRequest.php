<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // les droits sont vérifiés par les Policies
    }

    public function rules(): array
    {
        return [
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'tenant_id' => ['required', 'integer', 'exists:tenants,id'],
            'start_date' => ['required', 'date'],
            'rent_amount' => ['nullable', 'integer', 'min:1'],
            'deposit_amount' => ['nullable', 'integer', 'min:0'],
            'due_day' => ['required', 'integer', 'between:1,28'],
            'late_fee' => ['nullable', 'integer', 'min:0'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EndLeaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // les droits sont vérifiés par les Policies
    }

    public function rules(): array
    {
        return [
            'end_date' => ['required', 'date'],
            'deposit_returned' => ['nullable', 'integer', 'min:0'],
            'deposit_deductions_note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}

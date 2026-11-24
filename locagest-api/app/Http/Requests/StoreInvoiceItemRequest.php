<?php

namespace App\Http\Requests;

use App\Enums\InvoiceItemType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvoiceItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // les droits sont vérifiés par les Policies
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(InvoiceItemType::class)],
            'label' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'integer', 'not_in:0'],
        ];
    }
}

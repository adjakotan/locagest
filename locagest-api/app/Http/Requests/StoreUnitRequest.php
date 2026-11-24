<?php

namespace App\Http\Requests;

use App\Enums\UnitType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // les droits sont vérifiés par les Policies
    }

    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::enum(UnitType::class)],
            'default_rent' => ['required', 'integer', 'min:1'],
        ];
    }
}

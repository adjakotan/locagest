<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;

/** F104 : catégories de dépenses fournies par défaut (owner_id = null). */
class ExpenseCategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach (['Réparation', 'Entretien', 'Eau / électricité des parties communes', 'Taxe foncière', 'Salaire du gardien', 'Assurance', 'Imprévu', 'Autre'] as $name) {
            ExpenseCategory::firstOrCreate(['owner_id' => null, 'name' => $name]);
        }
    }
}

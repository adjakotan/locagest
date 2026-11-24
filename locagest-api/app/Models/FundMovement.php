<?php

namespace App\Models;

use App\Enums\Fund;
use App\Enums\MovementType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FundMovement extends Model
{
    protected $fillable = ['property_id', 'fund', 'direction', 'amount', 'type', 'payment_id', 'expense_id', 'recorded_by', 'moved_at', 'note'];

    protected function casts(): array
    {
        return [
            'fund' => Fund::class,
            'type' => MovementType::class,
            'amount' => 'integer',
            'moved_at' => 'date',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

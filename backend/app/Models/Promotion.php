<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Promotion extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'description',
        'image_path',
        'cloudinary_public_id',
        'discount_type',
        'discount_value',
        'booking_starts_at',
        'booking_ends_at',
        'rental_start_date',
        'rental_end_date',
        'max_redemptions',
        'is_active',
        'featured',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'booking_starts_at' => 'datetime',
        'booking_ends_at' => 'datetime',
        'rental_start_date' => 'date',
        'rental_end_date' => 'date',
        'is_active' => 'boolean',
        'featured' => 'boolean',
    ];

    protected $appends = ['image_url'];

    public function items(): HasMany
    {
        return $this->hasMany(PromotionItem::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) {
            return null;
        }

        if (
            str_starts_with($this->image_path, 'https://') ||
            str_starts_with($this->image_path, 'http://')
        ) {
            return $this->image_path;
        }

        $path = ltrim(str_replace('\\', '/', $this->image_path), '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        return Storage::disk('public')->url($path);
    }
}

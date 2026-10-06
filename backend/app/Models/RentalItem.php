<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class RentalItem extends Model
{
    protected $fillable = [
        'rental_category_id',
        'name',
        'slug',
        'description',
        'base_price',
        'total_stock',
        'minimum_quantity',
        'maximum_quantity',
        'track_variants',
        'status',
        'image_path',
        'cloudinary_public_id',
        'is_active',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'track_variants' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected $appends = ['image_url'];

    public function category()
    {
        return $this->belongsTo(RentalCategory::class, 'rental_category_id');
    }

    public function variants()
    {
        return $this->hasMany(RentalItemVariant::class);
    }

    public function images()
    {
        return $this->hasMany(RentalItemImage::class)
            ->orderBy('sort_order')
            ->orderBy('id');
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

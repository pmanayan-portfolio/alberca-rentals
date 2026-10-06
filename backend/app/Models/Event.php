<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Event extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'description',
        'base_price',
        'duration_hours',
        'image_path',
        'cloudinary_public_id',
        'is_active',
        'featured',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'is_active' => 'boolean',
        'featured' => 'boolean',
    ];

    protected $appends = ['image_url'];

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

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
}

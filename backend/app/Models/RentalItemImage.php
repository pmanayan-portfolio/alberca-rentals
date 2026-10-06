<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class RentalItemImage extends Model
{
    protected $fillable = [
        'rental_item_id',
        'image_path',
        'cloudinary_public_id',
        'sort_order',
    ];

    protected $appends = ['image_url'];

    public function item()
    {
        return $this->belongsTo(RentalItem::class, 'rental_item_id');
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

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ShowcasePhoto extends Model
{
    protected $fillable = [
        'title',
        'caption',
        'image_path',
        'cloudinary_public_id',
        'event_date',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'event_date' => 'date:Y-m-d',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
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
}

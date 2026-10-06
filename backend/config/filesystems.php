<?php

return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost:8001'), '/') . '/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        // Kept available for package compatibility. Application uploads use
        // CloudinaryImageService so URL + public_id are always saved together.
        'cloudinary' => [
            'driver' => 'cloudinary',
            'key' => env('CLOUDINARY_API_KEY', env('CLOUDINARY_KEY')),
            'secret' => env('CLOUDINARY_API_SECRET', env('CLOUDINARY_SECRET')),
            'cloud' => env('CLOUDINARY_CLOUD_NAME'),
            'url' => env('CLOUDINARY_URL'),
            'secure' => env('CLOUDINARY_SECURE', true),
            'prefix' => env('CLOUDINARY_PREFIX'),
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],
];

<?php

return [
    'notification_url' => env('CLOUDINARY_NOTIFICATION_URL'),

    // CLOUDINARY_URL is preferred. The fallback also supports both the
    // CLOUDINARY_API_* names used by the Cloudinary dashboard and the older
    // CLOUDINARY_KEY / CLOUDINARY_SECRET names.
    'cloud_url' => env(
        'CLOUDINARY_URL',
        'cloudinary://'
            . env('CLOUDINARY_API_KEY', env('CLOUDINARY_KEY'))
            . ':'
            . env('CLOUDINARY_API_SECRET', env('CLOUDINARY_SECRET'))
            . '@'
            . env('CLOUDINARY_CLOUD_NAME')
    ),

    'upload_preset' => env('CLOUDINARY_UPLOAD_PRESET'),
    'upload_route' => env('CLOUDINARY_UPLOAD_ROUTE'),
    'upload_action' => env('CLOUDINARY_UPLOAD_ACTION'),
];

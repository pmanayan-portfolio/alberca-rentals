<?php

use App\Http\Controllers\Api\RentalCatalogController;
use Illuminate\Support\Facades\Route;

Route::get(
    '/booking-schedule/check',
    [RentalCatalogController::class, 'scheduleCheck']
);
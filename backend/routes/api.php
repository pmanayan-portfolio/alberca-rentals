<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\PublicCatalogController;
use App\Http\Controllers\Api\RentalBookingController;
use App\Http\Controllers\Api\RentalCatalogController;
use App\Http\Controllers\Api\ShowcaseController;
use App\Http\Controllers\Api\Owner\AvailabilityController as OwnerAvailabilityController;
use App\Http\Controllers\Api\Owner\BookingController as OwnerBookingController;
use App\Http\Controllers\Api\Owner\DashboardController;
use App\Http\Controllers\Api\Owner\EventController as OwnerEventController;
use App\Http\Controllers\Api\Owner\PromotionController as OwnerPromotionController;
use App\Http\Controllers\Api\Owner\RentalCategoryController as OwnerRentalCategoryController;
use App\Http\Controllers\Api\Owner\RentalItemController as OwnerRentalItemController;
use App\Http\Controllers\Api\Owner\ReportController;
use App\Http\Controllers\Api\Owner\ShowcasePhotoController as OwnerShowcasePhotoController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/events', [PublicCatalogController::class, 'events']);
Route::get('/events/{event}', [PublicCatalogController::class, 'event']);
Route::get('/rentals/categories', [RentalCatalogController::class, 'categories']);
Route::get('/rentals/items', [RentalCatalogController::class, 'items']);
Route::get('/rentals/availability', [RentalCatalogController::class, 'availability']);
Route::get('/promotions', [RentalCatalogController::class, 'promotions']);
Route::get('/promotions/{slug}', [RentalCatalogController::class, 'promotion']);
Route::get('/showcase', [ShowcaseController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/my-bookings', [BookingController::class, 'mine']);
    Route::post('/bookings/event/{event}', [BookingController::class, 'event']);
    Route::post('/bookings/custom-rental', [RentalBookingController::class, 'custom']);
    Route::post('/bookings/promotion/{promotion}', [RentalBookingController::class, 'promotion']);
    Route::post('/bookings/{booking}/cancel', [BookingController::class, 'cancel']);
    Route::post('/bookings/{booking}/reschedule', [BookingController::class, 'requestReschedule']);

    Route::middleware('manager')->prefix('owner')->group(function () {
        Route::get('/dashboard', DashboardController::class);
        Route::get('/bookings', [OwnerBookingController::class, 'index']);
        Route::patch('/bookings/{booking}/status', [OwnerBookingController::class, 'status']);
        Route::patch('/bookings/{booking}/rental-status', [OwnerBookingController::class, 'rentalStatus']);
        Route::post('/bookings/{booking}/reschedule/decision', [OwnerBookingController::class, 'rescheduleDecision']);

        Route::patch('/events/{event}/archive', [OwnerEventController::class, 'archive']);
        Route::apiResource('events', OwnerEventController::class)->except(['show']);

        Route::get('/availability-blocks', [OwnerAvailabilityController::class, 'index']);
        Route::post('/availability-blocks', [OwnerAvailabilityController::class, 'store']);
        Route::delete('/availability-blocks/{availability_block}', [OwnerAvailabilityController::class, 'destroy']);

        Route::apiResource('rental-categories', OwnerRentalCategoryController::class)->except(['show']);
        Route::apiResource('rental-items', OwnerRentalItemController::class)->except(['show']);
        Route::delete('/rental-items/{rental_item}/images/{image}', [OwnerRentalItemController::class, 'destroyImage']);

        Route::patch('/promotions/{promotion}/archive', [OwnerPromotionController::class, 'archive']);
        Route::apiResource('promotions', OwnerPromotionController::class)->except(['show']);

        Route::patch('/showcase-photos/{showcase_photo}/archive', [OwnerShowcasePhotoController::class, 'archive']);
        Route::apiResource('showcase-photos', OwnerShowcasePhotoController::class)->except(['show']);

        Route::get('/reports/summary', [ReportController::class, 'summary']);
        Route::get('/reports/bookings.csv', [ReportController::class, 'csv']);
    });
});

require __DIR__ . '/rentals.php';

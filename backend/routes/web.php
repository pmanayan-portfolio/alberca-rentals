<?php
use Illuminate\Support\Facades\Route;
Route::get('/', fn () => response()->json(['name' => 'Alberca Rentals | Gowns, Tables, Chairs & Party Supplies API', 'health' => '/up']));
Route::get('/up', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Alberca Rentals API',
    ], 200);
});
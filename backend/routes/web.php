<?php
use Illuminate\Support\Facades\Route;
Route::get('/', fn () => response()->json(['name' => 'Alberca Rentals | Gowns, Tables, Chairs & Party Supplies API', 'health' => '/up']));

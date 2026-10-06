<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShowcasePhoto;

class ShowcaseController extends Controller
{
    public function index()
    {
        return ShowcasePhoto::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderByDesc('event_date')
            ->latest('id')
            ->get();
    }
}

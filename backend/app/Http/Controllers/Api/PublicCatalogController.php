<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;use App\Models\Event;use Illuminate\Http\Request;
class PublicCatalogController extends Controller
{
 public function events(){return Event::where('is_active',true)->orderByDesc('featured')->latest()->get();}
 public function event(Event $event){abort_unless($event->is_active,404);return $event;}
}

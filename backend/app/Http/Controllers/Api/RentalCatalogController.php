<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AvailabilityBlock;
use App\Models\Promotion;
use App\Models\RentalCategory;
use App\Models\RentalItem;
use App\Services\RentalAvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\Request;


class RentalCatalogController extends Controller
{
 public function categories(){return RentalCategory::where('is_active',true)->orderBy('sort_order')->orderBy('name')->get();}
 public function items(){return RentalItem::with(['category','images','variants'=>fn($q)=>$q->where('is_active',true)])->where('is_active',true)->whereNotIn('status',['archived'])->orderBy('name')->get();}
 public function availability(Request $r,RentalAvailabilityService $svc){$d=$r->validate(['start_date'=>'required|date','end_date'=>'nullable|date|after_or_equal:start_date']);$start=$d['start_date'];$end=$d['end_date']??$start;$items=RentalItem::with(['category','images','variants'=>fn($q)=>$q->where('is_active',true)])->where('is_active',true)->where('status','available')->orderBy('name')->get();return $items->map(function($item)use($svc,$start,$end){$item->available_quantity=$svc->available($item,$start,$end);$item->variants->each(fn($v)=>$v->available_quantity=$svc->available($item,$start,$end,$v->id));return $item;});}
 public function promotions(){return Promotion::with(['items.item','items.variant'])->where('is_active',true)->where(function($q){$q->whereNull('booking_starts_at')->orWhere('booking_starts_at','<=',now());})->where(function($q){$q->whereNull('booking_ends_at')->orWhere('booking_ends_at','>=',now());})->orderByDesc('featured')->latest()->get()->map(fn($p)=>$this->decorate($p));}
 public function promotion(string $slug){$p=Promotion::with(['items.item','items.variant'])->where('slug',$slug)->where('is_active',true)->firstOrFail();return $this->decorate($p);}
 private function decorate(Promotion $p){$regular=$p->items->sum(function($line){$unit=(float)$line->item->base_price+(float)($line->variant?->price_adjustment??0);return $unit*$line->quantity;});$discount=$p->discount_type==='percent'?$regular*((float)$p->discount_value/100):min($regular,(float)$p->discount_value);$p->regular_total=round($regular,2);$p->promo_total=round(max(0,$regular-$discount),2);$p->discount_total=round($discount,2);return $p;}
public function scheduleCheck(Request $request)
{
    $data = $request->validate([
        'booking_date' => [
            'required',
            'date',
        ],

        'rental_end_date' => [
            'nullable',
            'date',
            'after_or_equal:booking_date',
        ],

        'start_time' => [
            'required',
            'date_format:H:i',
        ],

        'end_time' => [
            'required',
            'date_format:H:i',
        ],
    ]);

    $endDate =
        $data['rental_end_date']
        ?? $data['booking_date'];

    $startAt = Carbon::parse(
        $data['booking_date']
        . ' '
        . $data['start_time']
    );

    $endAt = Carbon::parse(
        $endDate
        . ' '
        . $data['end_time']
    );

    $block = AvailabilityBlock::query()
        ->where(
            'start_at',
            '<',
            $endAt
        )
        ->where(
            'end_at',
            '>',
            $startAt
        )
        ->first();

    if ($block) {
        return response()->json([
            'available' => false,

            'message' =>
                'The selected schedule is unavailable.',

            'reason' =>
                $block->reason,

            'blocked_start' =>
                $block->start_at,

            'blocked_end' =>
                $block->end_at,
        ]);
    }

    return response()->json([
        'available' => true,

        'message' =>
            'The selected schedule is available.',
    ]);
}

 }

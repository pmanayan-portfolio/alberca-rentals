<?php
namespace App\Services;
use App\Models\BookingRentalItem;
use App\Models\RentalItem;
use Carbon\CarbonInterface;
class RentalAvailabilityService
{
 private array $reserving=['pending','approved','confirmed','preparing','delivered'];
 public function reserved(int $itemId, ?int $variantId, string $start, string $end, ?int $ignoreBooking=null):int{
  $q=BookingRentalItem::query()->where('rental_item_id',$itemId)->whereHas('booking',function($b)use($start,$end,$ignoreBooking){$b->whereIn('status',$this->reserving)->whereDate('rental_start_date','<=',$end)->whereDate('rental_end_date','>=',$start);if($ignoreBooking)$b->whereKeyNot($ignoreBooking);});
  $variantId?$q->where('rental_item_variant_id',$variantId):$q->whereNull('rental_item_variant_id'); return (int)$q->sum('quantity');
 }
 public function available(RentalItem $item,string $start,string $end,?int $variantId=null):int{if($variantId){$v=$item->variants->firstWhere('id',$variantId);$stock=(int)($v?->stock_quantity??0);}else{$stock=(int)$item->total_stock;}return max(0,$stock-$this->reserved($item->id,$variantId,$start,$end));}
}

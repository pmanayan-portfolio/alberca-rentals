<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BookingRentalItem extends Model
{
 protected $fillable=['booking_id','rental_item_id','rental_item_variant_id','item_name_snapshot','variant_name_snapshot','quantity','unit_price','subtotal'];protected $casts=['unit_price'=>'decimal:2','subtotal'=>'decimal:2'];
 public function booking(){return $this->belongsTo(Booking::class);}public function item(){return $this->belongsTo(RentalItem::class,'rental_item_id');}public function variant(){return $this->belongsTo(RentalItemVariant::class,'rental_item_variant_id');}
}

<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class PromotionItem extends Model{protected $fillable=['promotion_id','rental_item_id','rental_item_variant_id','quantity'];public function promotion(){return $this->belongsTo(Promotion::class);}public function item(){return $this->belongsTo(RentalItem::class,'rental_item_id');}public function variant(){return $this->belongsTo(RentalItemVariant::class,'rental_item_variant_id');}}

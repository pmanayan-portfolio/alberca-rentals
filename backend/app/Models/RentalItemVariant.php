<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class RentalItemVariant extends Model{protected $fillable=['rental_item_id','name','sku','stock_quantity','price_adjustment','is_active'];protected $casts=['price_adjustment'=>'decimal:2','is_active'=>'boolean'];public function item(){return $this->belongsTo(RentalItem::class,'rental_item_id');}}

<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
class Booking extends Model
{
 protected $fillable=[
  'user_id','event_id','promotion_id','booking_type','customer_name','customer_email','customer_phone',
  'booking_date','start_time','end_time','rental_start_date','rental_end_date','delivery_method','address','latitude','longitude','notes',
  'status','rental_status','regular_subtotal','discount_total','final_total','promotion_title_snapshot',
  'reschedule_requested_date','reschedule_requested_start_time','reschedule_requested_end_time','reschedule_status'
 ];
 protected $casts=[
  'booking_date'=>'date','rental_start_date'=>'date','rental_end_date'=>'date','latitude'=>'decimal:7','longitude'=>'decimal:7',
  'regular_subtotal'=>'decimal:2','discount_total'=>'decimal:2','final_total'=>'decimal:2','reschedule_requested_date'=>'date'
 ];
 public function user():BelongsTo{return $this->belongsTo(User::class);} public function event():BelongsTo{return $this->belongsTo(Event::class);} public function promotion():BelongsTo{return $this->belongsTo(Promotion::class);} public function rentalItems():HasMany{return $this->hasMany(BookingRentalItem::class);} 
}

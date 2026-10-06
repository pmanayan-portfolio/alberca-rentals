<?php
namespace App\Http\Controllers\Api\Owner;use App\Http\Controllers\Controller;use App\Jobs\SendBookingTelegramNotification;use App\Models\Booking;use App\Services\GoogleMapsLinkService;use Illuminate\Http\Request;
class BookingController extends Controller
{
 public function index(GoogleMapsLinkService $maps){return Booking::with(['user','event','promotion','rentalItems'])->latest()->get()->each(fn($b)=>$b->directions_url=$maps->directions($b->address,$b->latitude,$b->longitude));}
 public function status(Request $r,Booking $booking){$d=$r->validate(['status'=>'required|in:pending,approved,confirmed,rejected,cancelled,completed']);$booking->update($d);SendBookingTelegramNotification::dispatch($booking->id,'BOOKING STATUS UPDATED');return $booking;}
 public function rentalStatus(Request $r,Booking $booking){$d=$r->validate(['rental_status'=>'required|in:reserved,preparing,delivered,returned,inspected,completed']);$booking->update($d);return $booking;}
 public function rescheduleDecision(Request $r,Booking $booking){$d=$r->validate(['decision'=>'required|in:approve,reject']);abort_unless($booking->reschedule_status==='pending',422,'No pending reschedule request.');if($d['decision']==='approve')$booking->update(['booking_date'=>$booking->reschedule_requested_date,'rental_start_date'=>$booking->reschedule_requested_date,'rental_end_date'=>$booking->reschedule_requested_date,'start_time'=>$booking->reschedule_requested_start_time,'end_time'=>$booking->reschedule_requested_end_time,'reschedule_status'=>'approved']);else $booking->update(['reschedule_status'=>'rejected']);SendBookingTelegramNotification::dispatch($booking->id,'RESCHEDULE DECISION');return $booking;}
}

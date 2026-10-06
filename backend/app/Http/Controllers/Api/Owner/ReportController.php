<?php
namespace App\Http\Controllers\Api\Owner;use App\Http\Controllers\Controller;use App\Models\Booking;use Symfony\Component\HttpFoundation\StreamedResponse;
class ReportController extends Controller
{
 public function summary(){return ['total_bookings'=>Booking::count(),'pending'=>Booking::where('status','pending')->count(),'cancelled'=>Booking::where('status','cancelled')->count(),'revenue'=>(float)Booking::whereNotIn('status',['cancelled','rejected'])->sum('final_total'),'custom_bookings'=>Booking::where('booking_type','custom')->count(),'promotion_bookings'=>Booking::where('booking_type','promotion')->count()];}
 public function csv():StreamedResponse{return response()->streamDownload(function(){ $out=fopen('php://output','w');fputcsv($out,['ID','Type','Customer','Email','Date','Status','Regular','Discount','Total']);Booking::orderBy('id')->chunk(200,function($rows)use($out){foreach($rows as $b)fputcsv($out,[$b->id,$b->booking_type,$b->customer_name,$b->customer_email,optional($b->booking_date)->format('Y-m-d'),$b->status,$b->regular_subtotal,$b->discount_total,$b->final_total]);});fclose($out);},'bookings.csv',['Content-Type'=>'text/csv']);}
}

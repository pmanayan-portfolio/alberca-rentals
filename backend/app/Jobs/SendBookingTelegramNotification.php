<?php
namespace App\Jobs;
use App\Models\Booking;
use App\Services\TelegramBookingNotifier;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
class SendBookingTelegramNotification implements ShouldQueue
{
 use Dispatchable,InteractsWithQueue,Queueable,SerializesModels;public function __construct(public int $bookingId,public string $headline='NEW BOOKING'){}public function handle(TelegramBookingNotifier $notifier):void{if($b=Booking::find($this->bookingId))$notifier->send($b,$this->headline);}
}

<?php

namespace App\Services;

use App\Models\Booking;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramBookingNotifier
{
    public function send(
        Booking $booking,
        string $headline = 'NEW BOOKING'
    ): void {
        if (!config('services.telegram.enabled')) {
            Log::info(
                'Telegram notification skipped: disabled.'
            );

            return;
        }

        $token = config(
            'services.telegram.bot_token'
        );

        $chatId = config(
            'services.telegram.chat_id'
        );

        if (!$token || !$chatId) {
            throw new \RuntimeException(
                'Telegram bot token or chat ID is missing.'
            );
        }

        $booking->loadMissing([
            'event',
            'promotion',
            'rentalItems',
        ]);

        $lines = $booking->rentalItems
            ->map(function ($item) {
                $text =
                    "• {$item->quantity} × "
                    . $item->item_name_snapshot;

                if (
                    $item->variant_name_snapshot
                ) {
                    $text .=
                        " - "
                        . $item
                            ->variant_name_snapshot;
                }

                return $text;
            })
            ->implode("\n");

        $text =
            "🔔 {$headline}\n\n"
            . "Customer: {$booking->customer_name}\n"
            . "Date: "
            . optional(
                $booking->booking_date
            )->format('M d, Y')
            . "\n"
            . "Type: "
            . strtoupper(
                $booking->booking_type
            )
            . "\n";

        if (
            $booking
                ->promotion_title_snapshot
        ) {
            $text .=
                "Offer: "
                . $booking
                    ->promotion_title_snapshot
                . "\n";
        }

        if ($booking->event) {
            $text .=
                "Experience: "
                . $booking->event->title
                . "\n";
        }

        if ($lines) {
            $text .=
                "\nRental Items:\n"
                . $lines
                . "\n";
        }

        $text .=
            "\nTotal: ₱"
            . number_format(
                (float)
                $booking->final_total,
                2
            )
            . "\nStatus: "
            . ucfirst(
                $booking->status
            );

        if ($booking->address) {
            $text .=
                "\nLocation: "
                . $booking->address;
        }

        if (
            $booking->latitude !== null
            &&
            $booking->longitude !== null
        ) {
            $mapsUrl =
                'https://www.google.com/maps/dir/?api=1&destination='
                . urlencode(
                    $booking->latitude
                    . ','
                    . $booking->longitude
                );

            $text .=
                "\nDirections: "
                . $mapsUrl;
        }

        $response = Http::timeout(15)
            ->post(
                "https://api.telegram.org/bot{$token}/sendMessage",
                [
                    'chat_id' => $chatId,
                    'text' => $text,
                    'disable_web_page_preview' => true,
                ]
            );

        /*
         * VERY IMPORTANT:
         * Telegram errors will now make
         * the queue job fail visibly.
         */
        $response->throw();

        Log::info(
            'Telegram booking notification sent.',
            [
                'booking_id' =>
                    $booking->id,
            ]
        );
    }
}
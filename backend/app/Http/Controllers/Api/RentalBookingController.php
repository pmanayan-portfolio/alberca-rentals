<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendBookingTelegramNotification;
use App\Models\AvailabilityBlock;
use App\Models\Booking;
use App\Models\Promotion;
use App\Models\RentalItem;
use App\Services\RentalAvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RentalBookingController extends Controller
{
    public function custom(
        Request $request,
        RentalAvailabilityService $availability
    ) {
        $base = $this->validateBase($request);

        $items = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.rental_item_id' => [
                'required',
                'integer',
                'exists:rental_items,id',
            ],
            'items.*.rental_item_variant_id' => [
                'nullable',
                'integer',
                'exists:rental_item_variants,id',
            ],
            'items.*.quantity' => [
                'required',
                'integer',
                'min:1',
            ],
        ]);

        $data = array_merge($base, $items);

        /*
        |--------------------------------------------------------------------------
        | OWNER AVAILABILITY CHECK
        |--------------------------------------------------------------------------
        |
        | Reject the booking before inventory processing when the selected
        | schedule overlaps an availability block created by the owner.
        |
        */
        $this->ensureScheduleOpen($data);

        return DB::transaction(function () use (
            $request,
            $data,
            $availability
        ) {
            $startDate = $data['booking_date'];

            $endDate =
                $data['rental_end_date']
                ?? $startDate;

            $lines = [];
            $regularTotal = 0;

            foreach ($data['items'] as $line) {
                $item = RentalItem::with('variants')
                    ->lockForUpdate()
                    ->findOrFail(
                        $line['rental_item_id']
                    );

                abort_unless(
                    $item->is_active
                    && $item->status === 'available',
                    422,
                    "{$item->name} is unavailable."
                );

                $variant = null;

                if (
                    $line['rental_item_variant_id']
                    ?? null
                ) {
                    $variant = $item->variants
                        ->firstWhere(
                            'id',
                            $line[
                                'rental_item_variant_id'
                            ]
                        );

                    abort_unless(
                        $variant
                        && $variant->is_active,
                        422,
                        'Variant unavailable.'
                    );
                }

                $availableQuantity =
                    $availability->available(
                        $item,
                        $startDate,
                        $endDate,
                        $variant?->id
                    );

                abort_if(
                    $line['quantity']
                    > $availableQuantity,
                    422,
                    "Only {$availableQuantity} {$item->name} available for those dates."
                );

                $unitPrice =
                    (float) $item->base_price
                    + (float) (
                        $variant?->price_adjustment
                        ?? 0
                    );

                $subtotal =
                    $unitPrice
                    * $line['quantity'];

                $regularTotal += $subtotal;

                $lines[] = [
                    $item,
                    $variant,
                    $line['quantity'],
                    $unitPrice,
                    $subtotal,
                ];
            }

            $booking = Booking::create([
                ...$this->bookingAttributes(
                    $request,
                    $data
                ),

                'user_id' =>
                    $request->user()->id,

                'booking_type' =>
                    'custom',

                'status' =>
                    'pending',

                'rental_status' =>
                    'reserved',

                'regular_subtotal' =>
                    $regularTotal,

                'discount_total' =>
                    0,

                'final_total' =>
                    $regularTotal,
            ]);

            foreach (
                $lines
                as [
                    $item,
                    $variant,
                    $quantity,
                    $unitPrice,
                    $subtotal
                ]
            ) {
                $booking->rentalItems()
                    ->create([
                        'rental_item_id' =>
                            $item->id,

                        'rental_item_variant_id' =>
                            $variant?->id,

                        'item_name_snapshot' =>
                            $item->name,

                        'variant_name_snapshot' =>
                            $variant?->name,

                        'quantity' =>
                            $quantity,

                        'unit_price' =>
                            $unitPrice,

                        'subtotal' =>
                            $subtotal,
                    ]);
            }

            SendBookingTelegramNotification::dispatch(
                $booking->id,
                'NEW CUSTOM RENTAL BOOKING'
            )->afterCommit();

            return response()->json(
                $booking->load(
                    'rentalItems'
                ),
                201
            );
        });
    }

    public function promotion(
        Request $request,
        Promotion $promotion,
        RentalAvailabilityService $availability
    ) {
        abort_unless(
            $promotion->is_active,
            404
        );

        abort_if(
            $promotion->booking_starts_at
            && now()->lt(
                $promotion->booking_starts_at
            ),
            422,
            'This offer is not open yet.'
        );

        abort_if(
            $promotion->booking_ends_at
            && now()->gt(
                $promotion->booking_ends_at
            ),
            422,
            'This offer has expired.'
        );

        if ($promotion->max_redemptions) {
            $used = Booking::where(
                'promotion_id',
                $promotion->id
            )
                ->whereNotIn(
                    'status',
                    [
                        'cancelled',
                        'rejected',
                    ]
                )
                ->count();

            abort_if(
                $used
                >= $promotion->max_redemptions,
                422,
                'This offer is sold out.'
            );
        }

        $data =
            $this->validateBase($request);

        /*
        |--------------------------------------------------------------------------
        | FIXED PROMOTION DATES
        |--------------------------------------------------------------------------
        */

        if ($promotion->rental_start_date) {
            $data['booking_date'] =
                $promotion
                    ->rental_start_date
                    ->toDateString();
        }

        if ($promotion->rental_end_date) {
            $data['rental_end_date'] =
                $promotion
                    ->rental_end_date
                    ->toDateString();
        }

        /*
        |--------------------------------------------------------------------------
        | OWNER AVAILABILITY CHECK
        |--------------------------------------------------------------------------
        */

        $this->ensureScheduleOpen($data);

        return DB::transaction(function () use (
            $request,
            $data,
            $promotion,
            $availability
        ) {
            $promotion->load([
                'items.item.variants',
                'items.variant',
            ]);

            $startDate =
                $data['booking_date'];

            $endDate =
                $data['rental_end_date']
                ?? $startDate;

            $regularTotal = 0;
            $rows = [];

            foreach (
                $promotion->items
                as $line
            ) {
                $item = $line->item;
                $variant = $line->variant;

                $availableQuantity =
                    $availability->available(
                        $item,
                        $startDate,
                        $endDate,
                        $variant?->id
                    );

                abort_if(
                    $line->quantity
                    > $availableQuantity,
                    422,
                    "The offer no longer has enough {$item->name} available."
                );

                $unitPrice =
                    (float) $item->base_price
                    + (float) (
                        $variant?->price_adjustment
                        ?? 0
                    );

                $subtotal =
                    $unitPrice
                    * $line->quantity;

                $regularTotal += $subtotal;

                $rows[] = [
                    $item,
                    $variant,
                    $line->quantity,
                    $unitPrice,
                    $subtotal,
                ];
            }

            if (
                $promotion->discount_type
                === 'percent'
            ) {
                $discount =
                    $regularTotal
                    * (
                        (float)
                        $promotion->discount_value
                        / 100
                    );
            } else {
                $discount = min(
                    $regularTotal,
                    (float)
                    $promotion->discount_value
                );
            }

            $booking = Booking::create([
                ...$this->bookingAttributes(
                    $request,
                    $data
                ),

                'user_id' =>
                    $request->user()->id,

                'promotion_id' =>
                    $promotion->id,

                'booking_type' =>
                    'promotion',

                'status' =>
                    'pending',

                'rental_status' =>
                    'reserved',

                'regular_subtotal' =>
                    $regularTotal,

                'discount_total' =>
                    $discount,

                'final_total' =>
                    max(
                        0,
                        $regularTotal
                        - $discount
                    ),

                'promotion_title_snapshot' =>
                    $promotion->title,
            ]);

            foreach (
                $rows
                as [
                    $item,
                    $variant,
                    $quantity,
                    $unitPrice,
                    $subtotal
                ]
            ) {
                $booking->rentalItems()
                    ->create([
                        'rental_item_id' =>
                            $item->id,

                        'rental_item_variant_id' =>
                            $variant?->id,

                        'item_name_snapshot' =>
                            $item->name,

                        'variant_name_snapshot' =>
                            $variant?->name,

                        'quantity' =>
                            $quantity,

                        'unit_price' =>
                            $unitPrice,

                        'subtotal' =>
                            $subtotal,
                    ]);
            }

            SendBookingTelegramNotification::dispatch(
                $booking->id,
                'NEW PROMOTION BOOKING'
            )->afterCommit();

            return response()->json(
                $booking->load([
                    'promotion',
                    'rentalItems',
                ]),
                201
            );
        });
    }

    private function validateBase(
        Request $request
    ): array {
        return $request->validate([
            'booking_date' => [
                'required',
                'date',
            ],

            'start_time' => [
                'required',
                'date_format:H:i',
            ],

            'end_time' => [
                'required',
                'date_format:H:i',
                'after:start_time',
            ],

            'rental_end_date' => [
                'nullable',
                'date',
                'after_or_equal:booking_date',
            ],

            'delivery_method' => [
                'nullable',
                'in:delivery,pickup',
            ],

            'customer_name' => [
                'required',
                'string',
                'max:120',
            ],

            'customer_email' => [
                'required',
                'email',
            ],

            'customer_phone' => [
                'required',
                'string',
                'max:40',
            ],

            'address' => [
                'nullable',
                'string',
                'max:500',
            ],

            'latitude' => [
                'nullable',
                'numeric',
            ],

            'longitude' => [
                'nullable',
                'numeric',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:2000',
            ],
        ]);
    }

    /**
     * Reject any rental or promotion booking
     * overlapping an owner availability block.
     */
    private function ensureScheduleOpen(
        array $data
    ): void {
        $startDate =
            $data['booking_date'];

        $endDate =
            $data['rental_end_date']
            ?? $startDate;

        $startAt = Carbon::parse(
            $startDate
            . ' '
            . $data['start_time']
        );

        $endAt = Carbon::parse(
            $endDate
            . ' '
            . $data['end_time']
        );

        $blocked =
            AvailabilityBlock::query()
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
                ->exists();

        abort_if(
            $blocked,
            422,
            'The owner is unavailable during the selected date or time. Please choose another schedule.'
        );
    }

    private function bookingAttributes(
        Request $request,
        array $data
    ): array {
        return collect($data)
            ->except('items')
            ->merge([
                'rental_start_date' =>
                    $data['booking_date'],

                'rental_end_date' =>
                    $data['rental_end_date']
                    ?? $data['booking_date'],
            ])
            ->all();
    }
}
<?php

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use App\Services\CloudinaryImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class PromotionController extends Controller
{
    public function __construct(
        private CloudinaryImageService $cloudinary
    ) {
    }

    public function index()
    {
        return Promotion::with(['items.item', 'items.variant'])
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $items = $data['items'];
        unset($data['items'], $data['image']);

        $upload = null;

        try {
            if ($request->hasFile('image')) {
                $upload = $this->cloudinary->upload(
                    $request->file('image'),
                    'alberca-rentals/promotions'
                );

                $data['image_path'] = $upload['url'];
                $data['cloudinary_public_id'] = $upload['public_id'];
            }

            $promotion = DB::transaction(function () use ($data, $items) {
                $promotion = Promotion::create($data);
                $this->sync($promotion, $items);

                return $promotion;
            });

            return response()->json(
                $promotion->load(['items.item', 'items.variant']),
                201
            );
        } catch (Throwable $exception) {
            $this->safeDeleteNewUpload($upload);
            throw $exception;
        }
    }

    public function update(Request $request, Promotion $promotion)
    {
        $data = $this->validatedData($request, $promotion);
        $items = $data['items'];
        unset($data['items'], $data['image']);

        $oldPath = $promotion->image_path;
        $oldPublicId = $promotion->cloudinary_public_id;
        $upload = null;

        try {
            if ($request->hasFile('image')) {
                $upload = $this->cloudinary->upload(
                    $request->file('image'),
                    'alberca-rentals/promotions'
                );

                $data['image_path'] = $upload['url'];
                $data['cloudinary_public_id'] = $upload['public_id'];
            }

            DB::transaction(function () use ($promotion, $data, $items) {
                $promotion->update($data);
                $this->sync($promotion, $items);
            });

            if ($upload) {
                $this->safeDeleteStoredImage($oldPath, $oldPublicId);
            }

            return $promotion->fresh()->load(['items.item', 'items.variant']);
        } catch (Throwable $exception) {
            $this->safeDeleteNewUpload($upload);
            throw $exception;
        }
    }

    public function archive(Promotion $promotion)
    {
        $promotion->update(['is_active' => false]);

        return $promotion->fresh()->load(['items.item', 'items.variant']);
    }

    public function destroy(Promotion $promotion)
    {
        abort_if(
            $promotion->is_active,
            422,
            'Archive this special offer before deleting it permanently.'
        );

        $this->cloudinary->deleteStoredImage(
            $promotion->image_path,
            $promotion->cloudinary_public_id
        );

        $promotion->delete();

        return response()->noContent();
    }

    private function validatedData(Request $request, ?Promotion $promotion = null): array
    {
        if (is_string($request->input('items'))) {
            $request->merge([
                'items' => json_decode($request->input('items'), true) ?: [],
            ]);
        }

        $request->merge([
            'is_active' => $request->has('is_active')
                ? $request->boolean('is_active')
                : true,
            'featured' => $request->has('featured')
                ? $request->boolean('featured')
                : false,
        ]);

        $data = $request->validate([
            'title' => 'required|string|max:160',
            'description' => 'nullable|string',
            'discount_type' => 'required|in:fixed,percent',
            'discount_value' => 'required|numeric|min:0',
            'booking_starts_at' => 'nullable|date',
            'booking_ends_at' => 'nullable|date|after:booking_starts_at',
            'rental_start_date' => 'nullable|date',
            'rental_end_date' => 'nullable|date|after_or_equal:rental_start_date',
            'max_redemptions' => 'nullable|integer|min:1',
            'is_active' => 'sometimes|boolean',
            'featured' => 'sometimes|boolean',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'items' => 'required|array|min:1',
            'items.*.rental_item_id' => 'required|exists:rental_items,id',
            'items.*.rental_item_variant_id' => 'nullable|exists:rental_item_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        if ($promotion && $promotion->title === $data['title']) {
            $data['slug'] = $promotion->slug;
        } else {
            $base = Str::slug($data['title']);
            $data['slug'] = $base . '-' . substr(md5($data['title'] . microtime(true)), 0, 5);
        }

        return $data;
    }

    private function sync(Promotion $promotion, array $items): void
    {
        $promotion->items()->delete();

        foreach ($items as $item) {
            $promotion->items()->create($item);
        }
    }

    private function safeDeleteStoredImage(?string $path, ?string $publicId): void
    {
        try {
            $this->cloudinary->deleteStoredImage($path, $publicId);
        } catch (Throwable $cleanupException) {
            // The database already points to the new image. Keep the new image
            // working even if old-asset cleanup temporarily fails.
            report($cleanupException);
        }
    }

    private function safeDeleteNewUpload(?array $upload): void
    {
        if (!$upload || empty($upload['public_id'])) {
            return;
        }

        try {
            $this->cloudinary->delete($upload['public_id']);
        } catch (Throwable $cleanupException) {
            report($cleanupException);
        }
    }
}

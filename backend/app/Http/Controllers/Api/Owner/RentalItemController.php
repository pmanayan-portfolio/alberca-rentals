<?php

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Models\RentalItem;
use App\Models\RentalItemImage;
use App\Services\CloudinaryImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class RentalItemController extends Controller
{
    public function __construct(
        private CloudinaryImageService $cloudinary
    ) {
    }

    /**
     * Get all rental items for the owner dashboard.
     */
    public function index()
    {
        return RentalItem::with([
            'category',
            'variants',
            'images',
        ])
            ->latest()
            ->get();
    }

    /**
     * Create a new rental item.
     */
    public function store(Request $request)
    {
        $data = $this->validatedData($request);

        $variants = $data['variants'] ?? [];

        unset(
            $data['variants'],
            $data['image'],
            $data['gallery_images']
        );

        /*
         * Upload images before writing to the database.
         *
         * If something later fails, we delete the newly uploaded
         * Cloudinary files so they are not left orphaned.
         */
        $mainUpload = null;
        $galleryUploads = [];

        try {
            if ($request->hasFile('image')) {
                $mainUpload = $this->cloudinary->upload(
                    $request->file('image'),
                    'alberca-rentals/rental-items/main'
                );

                $data['image_path'] = $mainUpload['url'];
                $data['cloudinary_public_id'] = $mainUpload['public_id'];
            }

            if ($request->hasFile('gallery_images')) {
                foreach ($request->file('gallery_images', []) as $file) {
                    $galleryUploads[] = $this->cloudinary->upload(
                        $file,
                        'alberca-rentals/rental-items/gallery'
                    );
                }
            }

            $item = DB::transaction(function () use (
                $data,
                $variants,
                $galleryUploads
            ) {
                $item = RentalItem::create($data);

                $this->syncVariants($item, $variants);

                $this->saveGalleryUploads(
                    $item,
                    $galleryUploads
                );

                return $item;
            });

            return response()->json(
                $item->fresh()->load([
                    'category',
                    'variants',
                    'images',
                ]),
                201
            );
        } catch (Throwable $exception) {
            /*
             * Database failed after Cloudinary succeeded.
             * Remove the new uploads.
             */
            if ($mainUpload) {
                $this->safeCloudinaryDelete(
                    $mainUpload['public_id'] ?? null
                );
            }

            foreach ($galleryUploads as $upload) {
                $this->safeCloudinaryDelete(
                    $upload['public_id'] ?? null
                );
            }

            throw $exception;
        }
    }

    /**
     * Update an existing rental item.
     */
    public function update(
        Request $request,
        RentalItem $rental_item
    ) {
        $data = $this->validatedData(
            $request,
            $rental_item
        );

        $variants = $data['variants'] ?? [];

        unset(
            $data['variants'],
            $data['image'],
            $data['gallery_images']
        );

        /*
         * Keep the old main image information.
         * We only delete the old image AFTER the database update succeeds.
         */
        $oldMainPath = $rental_item->image_path;
        $oldMainPublicId = $rental_item->cloudinary_public_id;

        $newMainUpload = null;
        $galleryUploads = [];

        try {
            if ($request->hasFile('image')) {
                $newMainUpload = $this->cloudinary->upload(
                    $request->file('image'),
                    'alberca-rentals/rental-items/main'
                );

                $data['image_path'] =
                    $newMainUpload['url'];

                $data['cloudinary_public_id'] =
                    $newMainUpload['public_id'];
            }

            if ($request->hasFile('gallery_images')) {
                foreach ($request->file('gallery_images', []) as $file) {
                    $galleryUploads[] = $this->cloudinary->upload(
                        $file,
                        'alberca-rentals/rental-items/gallery'
                    );
                }
            }

            DB::transaction(function () use (
                $rental_item,
                $data,
                $variants,
                $galleryUploads
            ) {
                $rental_item->update($data);

                $this->syncVariants(
                    $rental_item,
                    $variants
                );

                $this->saveGalleryUploads(
                    $rental_item,
                    $galleryUploads
                );
            });

            /*
             * Database update succeeded.
             *
             * We can now remove the previous main image.
             */
            if ($newMainUpload) {
                $this->safeDeleteStoredImage(
                    $oldMainPath,
                    $oldMainPublicId
                );
            }

            return $rental_item
                ->fresh()
                ->load([
                    'category',
                    'variants',
                    'images',
                ]);
        } catch (Throwable $exception) {
            /*
             * Something failed.
             *
             * Delete only the NEW files.
             * Leave the previous image untouched.
             */
            if ($newMainUpload) {
                $this->safeCloudinaryDelete(
                    $newMainUpload['public_id'] ?? null
                );
            }

            foreach ($galleryUploads as $upload) {
                $this->safeCloudinaryDelete(
                    $upload['public_id'] ?? null
                );
            }

            throw $exception;
        }
    }

    /**
     * Archive rental item.
     *
     * Do NOT delete its images because the owner may
     * reactivate/edit this item later.
     */
    public function destroy(RentalItem $rental_item)
    {
        $rental_item->update([
            'is_active' => false,
            'status' => 'archived',
        ]);

        return response()->noContent();
    }

    /**
     * Permanently delete one additional/gallery image.
     */
    public function destroyImage(
        RentalItem $rental_item,
        RentalItemImage $image
    ) {
        if (
            (int) $image->rental_item_id !==
            (int) $rental_item->id
        ) {
            abort(404);
        }

        /*
         * Delete Cloudinary/local file first.
         * Only delete the database row once the storage operation completes.
         */
        $this->cloudinary->deleteStoredImage(
            $image->image_path,
            $image->cloudinary_public_id
        );

        $image->delete();

        return response()->noContent();
    }

    /**
     * Validate rental item form.
     */
    private function validatedData(
        Request $request,
        ?RentalItem $item = null
    ): array {
        /*
         * FormData can send variants as JSON text.
         */
        if (is_string($request->input('variants'))) {
            $request->merge([
                'variants' =>
                    json_decode(
                        $request->input('variants'),
                        true
                    ) ?: [],
            ]);
        }

        $request->merge([
            'track_variants' =>
                $request->boolean('track_variants'),

            'is_active' =>
                $request->has('is_active')
                    ? $request->boolean('is_active')
                    : true,
        ]);

        $data = $request->validate([
            'rental_category_id' =>
                'required|exists:rental_categories,id',

            'name' =>
                'required|string|max:160',

            'description' =>
                'nullable|string',

            'base_price' =>
                'required|numeric|min:0',

            'total_stock' =>
                'required|integer|min:0',

            'minimum_quantity' =>
                'nullable|integer|min:1',

            'maximum_quantity' =>
                'nullable|integer|min:1',

            'track_variants' =>
                'sometimes|boolean',

            'status' =>
                'required|in:available,unavailable,maintenance,damaged,archived',

            'is_active' =>
                'sometimes|boolean',

            /*
             * Main image
             */
            'image' =>
                'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',

            /*
             * Additional slider/gallery images
             */
            'gallery_images' =>
                'nullable|array|max:8',

            'gallery_images.*' =>
                'image|mimes:jpg,jpeg,png,webp|max:5120',

            /*
             * Item variants
             */
            'variants' =>
                'nullable|array',

            'variants.*.name' =>
                'required_with:variants|string|max:100',

            'variants.*.sku' =>
                'nullable|string|max:100',

            'variants.*.stock_quantity' =>
                'required_with:variants|integer|min:0',

            'variants.*.price_adjustment' =>
                'nullable|numeric',
        ]);

        /*
         * Limit gallery to 12 total additional images.
         */
        if ($request->hasFile('gallery_images')) {
            $existingCount =
                $item?->images()->count() ?? 0;

            $incomingCount =
                count(
                    $request->file(
                        'gallery_images',
                        []
                    )
                );

            if (
                $existingCount +
                $incomingCount > 12
            ) {
                throw ValidationException::withMessages([
                    'gallery_images' =>
                        'A rental item can have up to 12 additional images.',
                ]);
            }
        }

        /*
         * Preserve existing slug if the name did not change.
         */
        $baseSlug = Str::slug($data['name']);

        $data['slug'] =
            $item &&
            $item->name === $data['name']
                ? $item->slug
                : $baseSlug . '-' .
                    substr(
                        md5(
                            $data['name'] .
                            microtime(true)
                        ),
                        0,
                        5
                    );

        return $data;
    }

    /**
     * Insert already-uploaded Cloudinary gallery images.
     */
    private function saveGalleryUploads(
        RentalItem $item,
        array $uploads
    ): void {
        if (empty($uploads)) {
            return;
        }

        $nextOrder =
            ((int) $item
                ->images()
                ->max('sort_order')) + 1;

        foreach ($uploads as $upload) {
            $item->images()->create([
                'image_path' =>
                    $upload['url'],

                'cloudinary_public_id' =>
                    $upload['public_id'],

                'sort_order' =>
                    $nextOrder++,
            ]);
        }
    }

    /**
     * Sync rental item variants.
     */
    private function syncVariants(
        RentalItem $item,
        array $variants
    ): void {
        if (!$item->track_variants) {
            $item->variants()->delete();

            return;
        }

        $item->variants()->delete();

        foreach ($variants as $variant) {
            $item->variants()->create([
                'name' =>
                    $variant['name'],

                'sku' =>
                    $variant['sku'] ?? null,

                'stock_quantity' =>
                    $variant['stock_quantity'],

                'price_adjustment' =>
                    $variant['price_adjustment'] ?? 0,

                'is_active' =>
                    true,
            ]);
        }
    }

    /**
     * Cleanup helper.
     *
     * Used when DB processing fails after a successful
     * Cloudinary upload.
     */
    private function safeDeleteStoredImage(
        ?string $path,
        ?string $publicId
    ): void {
        try {
            $this->cloudinary->deleteStoredImage($path, $publicId);
        } catch (Throwable $cleanupException) {
            // The database already points to the new image. Keep the new image
            // working even if old-asset cleanup temporarily fails.
            report($cleanupException);
        }
    }

    private function safeCloudinaryDelete(
        ?string $publicId
    ): void {
        if (!$publicId) {
            return;
        }

        try {
            $this->cloudinary->delete(
                $publicId
            );
        } catch (Throwable $exception) {
            /*
             * Don't replace the original database error
             * with a cleanup error.
             */
            report($exception);
        }
    }
}
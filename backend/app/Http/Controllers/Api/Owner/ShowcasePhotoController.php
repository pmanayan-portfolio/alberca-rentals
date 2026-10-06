<?php

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Models\ShowcasePhoto;
use App\Services\CloudinaryImageService;
use Illuminate\Http\Request;
use Throwable;

class ShowcasePhotoController extends Controller
{
    public function __construct(
        private CloudinaryImageService $cloudinary
    ) {
    }

    public function index()
    {
        return ShowcasePhoto::query()
            ->orderBy('sort_order')
            ->orderByDesc('event_date')
            ->latest('id')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        unset($data['image']);

        $upload = null;

        try {
            $upload = $this->cloudinary->upload(
                $request->file('image'),
                'alberca-rentals/event-gallery'
            );

            $data['image_path'] = $upload['url'];
            $data['cloudinary_public_id'] = $upload['public_id'];

            return response()->json(ShowcasePhoto::create($data), 201);
        } catch (Throwable $exception) {
            $this->safeDeleteNewUpload($upload);
            throw $exception;
        }
    }

    public function update(Request $request, ShowcasePhoto $showcase_photo)
    {
        $data = $this->validated($request, true);
        unset($data['image']);

        $oldPath = $showcase_photo->image_path;
        $oldPublicId = $showcase_photo->cloudinary_public_id;
        $upload = null;

        try {
            if ($request->hasFile('image')) {
                $upload = $this->cloudinary->upload(
                    $request->file('image'),
                    'alberca-rentals/event-gallery'
                );

                $data['image_path'] = $upload['url'];
                $data['cloudinary_public_id'] = $upload['public_id'];
            }

            $showcase_photo->update($data);

            if ($upload) {
                $this->safeDeleteStoredImage($oldPath, $oldPublicId);
            }

            return $showcase_photo->fresh();
        } catch (Throwable $exception) {
            $this->safeDeleteNewUpload($upload);
            throw $exception;
        }
    }

    public function archive(ShowcasePhoto $showcase_photo)
    {
        $showcase_photo->update(['is_active' => false]);

        return $showcase_photo->fresh();
    }

    public function destroy(ShowcasePhoto $showcase_photo)
    {
        abort_if(
            $showcase_photo->is_active,
            422,
            'Archive this gallery photo before deleting it permanently.'
        );

        $this->cloudinary->deleteStoredImage(
            $showcase_photo->image_path,
            $showcase_photo->cloudinary_public_id
        );

        $showcase_photo->delete();

        return response()->noContent();
    }

    private function validated(Request $request, bool $updating = false): array
    {
        $request->merge([
            'is_active' => $request->has('is_active')
                ? $request->boolean('is_active')
                : true,
        ]);

        return $request->validate([
            'title' => ['nullable', 'string', 'max:160'],
            'caption' => ['nullable', 'string', 'max:2000'],
            'event_date' => ['nullable', 'date'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'image' => [
                $updating ? 'nullable' : 'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:10240',
            ],
        ]);
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

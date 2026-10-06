<?php

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Services\CloudinaryImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Throwable;

class EventController extends Controller
{
    public function __construct(
        private CloudinaryImageService $cloudinary
    ) {
    }

    public function index()
    {
        return Event::latest()->get();
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        unset($data['image']);

        $upload = null;

        try {
            if ($request->hasFile('image')) {
                $upload = $this->cloudinary->upload(
                    $request->file('image'),
                    'alberca-rentals/experiences'
                );

                $data['image_path'] = $upload['url'];
                $data['cloudinary_public_id'] = $upload['public_id'];
            }

            return response()->json(Event::create($data), 201);
        } catch (Throwable $exception) {
            $this->safeDeleteNewUpload($upload);
            throw $exception;
        }
    }

    public function update(Request $request, Event $event)
    {
        $data = $this->validatedData($request, $event);
        unset($data['image']);

        $oldPath = $event->image_path;
        $oldPublicId = $event->cloudinary_public_id;
        $upload = null;

        try {
            if ($request->hasFile('image')) {
                $upload = $this->cloudinary->upload(
                    $request->file('image'),
                    'alberca-rentals/experiences'
                );

                $data['image_path'] = $upload['url'];
                $data['cloudinary_public_id'] = $upload['public_id'];
            }

            $event->update($data);

            if ($upload) {
                $this->safeDeleteStoredImage($oldPath, $oldPublicId);
            }

            return $event->fresh();
        } catch (Throwable $exception) {
            $this->safeDeleteNewUpload($upload);
            throw $exception;
        }
    }

    public function archive(Event $event)
    {
        $event->update(['is_active' => false]);

        return $event->fresh();
    }

    public function destroy(Event $event)
    {
        abort_if(
            $event->is_active,
            422,
            'Archive this experience before deleting it permanently.'
        );

        $this->cloudinary->deleteStoredImage(
            $event->image_path,
            $event->cloudinary_public_id
        );

        $event->delete();

        return response()->noContent();
    }

    private function validatedData(Request $request, ?Event $event = null): array
    {
        $request->merge([
            'is_active' => $request->has('is_active')
                ? $request->boolean('is_active')
                : true,
            'featured' => $request->has('featured')
                ? $request->boolean('featured')
                : false,
        ]);

        $data = $request->validate([
            'title' => 'required|string|max:150',
            'description' => 'nullable|string',
            'base_price' => 'required|numeric|min:0',
            'duration_hours' => 'nullable|integer|min:1|max:72',
            'is_active' => 'sometimes|boolean',
            'featured' => 'sometimes|boolean',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($event && $event->title === $data['title']) {
            $data['slug'] = $event->slug;
        } else {
            $data['slug'] = Str::slug($data['title'])
                . '-'
                . substr(md5($data['title'] . microtime(true)), 0, 6);
        }

        return $data;
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

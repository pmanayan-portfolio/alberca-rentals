<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class CloudinaryImageService
{
    private Cloudinary $cloudinary;

    public function __construct()
    {
        $cloudUrl = (string) config('cloudinary.cloud_url');

        if ($cloudUrl === '' || !str_starts_with($cloudUrl, 'cloudinary://')) {
            throw new RuntimeException(
                'Cloudinary is not configured. Set CLOUDINARY_URL in backend/.env.'
            );
        }

        $this->cloudinary = new Cloudinary($cloudUrl);
    }

    /**
     * Upload an image to Cloudinary and return the values stored by the app.
     *
     * @return array{url:string,public_id:string}
     */
    public function upload(
        UploadedFile|string $file,
        string $folder,
        array $options = []
    ): array {
        $source = $file instanceof UploadedFile
            ? $file->getRealPath()
            : $file;

        if (!$source || !is_file($source)) {
            throw new RuntimeException('The image file could not be read for upload.');
        }

        $result = $this->cloudinary
            ->uploadApi()
            ->upload($source, array_merge([
                'folder' => trim($folder, '/'),
                'resource_type' => 'image',
                'overwrite' => false,
            ], $options));

        $url = (string) ($result['secure_url'] ?? '');
        $publicId = (string) ($result['public_id'] ?? '');

        if ($url === '' || $publicId === '') {
            throw new RuntimeException('Cloudinary upload did not return a secure URL and public ID.');
        }

        return [
            'url' => $url,
            'public_id' => $publicId,
        ];
    }

    public function delete(?string $publicId): void
    {
        if (!$publicId) {
            return;
        }

        $this->cloudinary
            ->uploadApi()
            ->destroy($publicId, [
                'resource_type' => 'image',
                'invalidate' => true,
            ]);
    }

    /**
     * Delete a stored image while remaining backward compatible with images
     * created before Cloudinary was introduced.
     */
    public function deleteStoredImage(?string $path, ?string $publicId = null): void
    {
        if ($publicId) {
            $this->delete($publicId);
            return;
        }

        if (!$path || $this->isRemoteUrl($path)) {
            return;
        }

        $relativePath = $this->normalizeLocalStoragePath($path);

        if ($relativePath !== '') {
            Storage::disk('public')->delete($relativePath);
        }
    }

    public function isRemoteUrl(?string $path): bool
    {
        return is_string($path)
            && (str_starts_with($path, 'https://') || str_starts_with($path, 'http://'));
    }

    public function normalizeLocalStoragePath(string $path): string
    {
        $path = trim(str_replace('\\', '/', $path));

        if (str_starts_with($path, '/storage/')) {
            $path = substr($path, strlen('/storage/'));
        } elseif (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        return ltrim($path, '/');
    }

    /**
     * Best-effort public ID extraction for Cloudinary URLs that were already
     * saved before cloudinary_public_id was added to the database.
     */
    public function publicIdFromUrl(?string $url): ?string
    {
        if (!$url || !str_contains($url, 'res.cloudinary.com/') || !str_contains($url, '/upload/')) {
            return null;
        }

        $path = parse_url($url, PHP_URL_PATH);

        if (!is_string($path) || $path === '') {
            return null;
        }

        $uploadPosition = strpos($path, '/upload/');

        if ($uploadPosition === false) {
            return null;
        }

        $afterUpload = substr($path, $uploadPosition + strlen('/upload/'));
        $segments = array_values(array_filter(explode('/', trim($afterUpload, '/')), 'strlen'));

        if (!$segments) {
            return null;
        }

        // Cloudinary delivery URLs normally contain v1234567890 before the public ID.
        $versionIndex = null;
        foreach ($segments as $index => $segment) {
            if (preg_match('/^v\d+$/', $segment)) {
                $versionIndex = $index;
                break;
            }
        }

        if ($versionIndex !== null) {
            $segments = array_slice($segments, $versionIndex + 1);
        }

        if (!$segments) {
            return null;
        }

        $lastIndex = count($segments) - 1;
        $segments[$lastIndex] = pathinfo($segments[$lastIndex], PATHINFO_FILENAME);

        $publicId = implode('/', $segments);

        return $publicId !== '' ? rawurldecode($publicId) : null;
    }
}

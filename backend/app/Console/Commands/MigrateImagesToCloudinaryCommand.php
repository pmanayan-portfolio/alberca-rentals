<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Models\Promotion;
use App\Models\RentalItem;
use App\Models\RentalItemImage;
use App\Models\ShowcasePhoto;
use App\Services\CloudinaryImageService;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Throwable;

class MigrateImagesToCloudinaryCommand extends Command
{
    protected $signature = 'cloudinary:migrate-images
        {--dry-run : Show what would be migrated without uploading or updating the database}
        {--delete-local : Delete each local file after its Cloudinary upload and database update succeed}';

    protected $description = 'Move existing Alberca Rentals local images to Cloudinary and update their database records.';

    /**
     * @var array<int, array{model:class-string<Model>,folder:string,label:string}>
     */
    private array $targets = [
        [
            'model' => RentalItem::class,
            'folder' => 'alberca-rentals/rental-items/main',
            'label' => 'rental item main images',
        ],
        [
            'model' => RentalItemImage::class,
            'folder' => 'alberca-rentals/rental-items/gallery',
            'label' => 'rental item gallery images',
        ],
        [
            'model' => Promotion::class,
            'folder' => 'alberca-rentals/promotions',
            'label' => 'special offer images',
        ],
        [
            'model' => Event::class,
            'folder' => 'alberca-rentals/experiences',
            'label' => 'experience images',
        ],
        [
            'model' => ShowcasePhoto::class,
            'folder' => 'alberca-rentals/event-gallery',
            'label' => 'showcase/gallery images',
        ],
    ];

    public function handle(CloudinaryImageService $cloudinary): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $deleteLocal = (bool) $this->option('delete-local');

        if ($dryRun) {
            $this->warn('DRY RUN: no files will be uploaded and no database records will be changed.');
        }

        if ($deleteLocal) {
            $this->warn('Local files will be deleted only after each Cloudinary upload and database update succeeds.');
        }

        $stats = [
            'migrated' => 0,
            'backfilled' => 0,
            'skipped' => 0,
            'missing' => 0,
            'failed' => 0,
        ];

        foreach ($this->targets as $target) {
            $this->newLine();
            $this->info('Checking ' . $target['label'] . '...');

            /** @var class-string<Model> $modelClass */
            $modelClass = $target['model'];

            $modelClass::query()
                ->whereNotNull('image_path')
                ->orderBy('id')
                ->chunkById(100, function ($records) use (
                    $cloudinary,
                    $target,
                    $dryRun,
                    $deleteLocal,
                    &$stats
                ) {
                    foreach ($records as $record) {
                        $path = (string) $record->getAttribute('image_path');
                        $publicId = $record->getAttribute('cloudinary_public_id');

                        if ($publicId) {
                            $stats['skipped']++;
                            $this->line("  #{$record->getKey()} already has a Cloudinary public ID; skipped.");
                            continue;
                        }

                        if ($cloudinary->isRemoteUrl($path)) {
                            $derivedPublicId = $cloudinary->publicIdFromUrl($path);

                            if ($derivedPublicId) {
                                if (!$dryRun) {
                                    $record->forceFill([
                                        'cloudinary_public_id' => $derivedPublicId,
                                    ])->save();
                                }

                                $stats['backfilled']++;
                                $this->line("  #{$record->getKey()} Cloudinary URL found; public ID backfilled.");
                            } else {
                                $stats['skipped']++;
                                $this->warn("  #{$record->getKey()} is already a remote URL but its public ID could not be derived; skipped.");
                            }

                            continue;
                        }

                        $relativePath = $cloudinary->normalizeLocalStoragePath($path);

                        if ($relativePath === '' || !Storage::disk('public')->exists($relativePath)) {
                            $stats['missing']++;
                            $this->warn("  #{$record->getKey()} local file missing: {$relativePath}");
                            continue;
                        }

                        if ($dryRun) {
                            $stats['migrated']++;
                            $this->line("  #{$record->getKey()} would upload {$relativePath} -> {$target['folder']}");
                            continue;
                        }

                        try {
                            $localPath = Storage::disk('public')->path($relativePath);
                            $upload = $cloudinary->upload($localPath, $target['folder']);

                            $record->forceFill([
                                'image_path' => $upload['url'],
                                'cloudinary_public_id' => $upload['public_id'],
                            ])->save();

                            if ($deleteLocal) {
                                Storage::disk('public')->delete($relativePath);
                            }

                            $stats['migrated']++;
                            $this->line("  #{$record->getKey()} migrated successfully.");
                        } catch (Throwable $exception) {
                            $stats['failed']++;
                            $this->error("  #{$record->getKey()} failed: {$exception->getMessage()}");
                            report($exception);
                        }
                    }
                });
        }

        $this->newLine();
        $this->table(
            ['Result', 'Count'],
            [
                ['Migrated / would migrate', $stats['migrated']],
                ['Public IDs backfilled', $stats['backfilled']],
                ['Already complete / skipped', $stats['skipped']],
                ['Missing local files', $stats['missing']],
                ['Failed', $stats['failed']],
            ]
        );

        if ($stats['failed'] > 0) {
            $this->error('One or more images failed to migrate. Fix the reported errors and run the command again.');
            return self::FAILURE;
        }

        if ($stats['missing'] > 0) {
            $this->warn('Some database records point to local files that were not found. Other images were processed normally.');
        }

        $this->info($dryRun
            ? 'Dry run complete. Run again without --dry-run to perform the migration.'
            : 'Cloudinary image migration complete.');

        return self::SUCCESS;
    }
}

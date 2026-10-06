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

class CleanupLocalImagesCommand extends Command
{
    protected $signature = 'cloudinary:cleanup-local-images
        {--force : Delete local public image files without asking for confirmation}';

    protected $description = 'Delete legacy local public images after all database image records have been migrated to Cloudinary.';

    /** @var array<int, class-string<Model>> */
    private array $models = [
        RentalItem::class,
        RentalItemImage::class,
        Promotion::class,
        Event::class,
        ShowcasePhoto::class,
    ];

    public function handle(CloudinaryImageService $cloudinary): int
    {
        $remainingLocalReferences = 0;

        foreach ($this->models as $modelClass) {
            $modelClass::query()
                ->whereNotNull('image_path')
                ->select(['id', 'image_path'])
                ->orderBy('id')
                ->chunkById(100, function ($records) use ($cloudinary, &$remainingLocalReferences) {
                    foreach ($records as $record) {
                        $path = (string) $record->getAttribute('image_path');

                        if (!$cloudinary->isRemoteUrl($path)) {
                            $remainingLocalReferences++;
                            $this->warn(sprintf(
                                '%s #%s still references local image: %s',
                                class_basename($record),
                                $record->getKey(),
                                $path
                            ));
                        }
                    }
                });
        }

        if ($remainingLocalReferences > 0) {
            $this->error(
                "Cleanup stopped. {$remainingLocalReferences} database image record(s) still use local storage. " .
                'Run php artisan cloudinary:migrate-images first.'
            );

            return self::FAILURE;
        }

        $files = array_values(array_filter(
            Storage::disk('public')->allFiles(),
            fn (string $file) => basename($file) !== '.gitkeep'
        ));

        if (!$files) {
            $this->info('No legacy local public images remain.');
            return self::SUCCESS;
        }

        $this->line('Legacy local files ready for deletion: ' . count($files));

        if (!$this->option('force') && !$this->confirm('Delete these local public image files now?', false)) {
            $this->warn('Cleanup cancelled.');
            return self::SUCCESS;
        }

        Storage::disk('public')->delete($files);

        $this->info('Legacy local public images deleted. Cloudinary-backed database URLs were left unchanged.');

        return self::SUCCESS;
    }
}

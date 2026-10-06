# Cloudinary setup for Alberca Rentals

This build stores new rental, promotion, experience, and homepage-gallery images in Cloudinary instead of relying on Laravel's local `storage/app/public` folder.

## Environment variables

Add these values to `backend/.env` and to the backend hosting provider's environment-variable settings:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
CLOUDINARY_SECURE=true
```

Never commit the real `.env` file or API secret to GitHub.

## Database migration

The project includes a migration that adds `cloudinary_public_id` to:

- `rental_items`
- `rental_item_images`
- `promotions`
- `events`
- `showcase_photos`

Run:

```powershell
cd backend
php artisan migrate
php artisan optimize:clear
```

## Existing local images

Existing images from earlier builds can be moved to Cloudinary automatically.

Preview what will be migrated without changing anything:

```powershell
php artisan cloudinary:migrate-images --dry-run
```

Perform the migration while keeping local copies as a backup:

```powershell
php artisan cloudinary:migrate-images
```

The migration command is safe to run again. Records that already have a Cloudinary public ID are skipped. By default, local files are kept as a temporary backup.

After you verify the migrated Cloudinary images in the website, clean up old local files with:

```powershell
php artisan cloudinary:cleanup-local-images
```

The cleanup command refuses to delete anything while any database image record still points to local storage. Use `--force` only to skip the confirmation prompt after that safety check.

If you prefer to remove local files during the first live migration, `php artisan cloudinary:migrate-images --delete-local` is also supported.

## Cloudinary folders used by the application

```text
alberca-rentals/
├── rental-items/
│   ├── main/
│   └── gallery/
├── promotions/
├── experiences/
└── event-gallery/
```

## Upload/update/delete behavior

- New images upload directly to Cloudinary.
- The Cloudinary secure URL is stored in `image_path`.
- The Cloudinary public ID is stored in `cloudinary_public_id`.
- Replacing an image uploads the replacement first, saves the database change, then removes the old Cloudinary/local image.
- Permanently deleting an archived promotion, experience, or showcase photo also removes its Cloudinary image.
- Removing an additional rental-item gallery image also removes its Cloudinary image.
- Archived records keep their images because they may be reactivated later.
- Old local image paths remain readable until they are migrated, and their URLs use the backend `APP_URL` instead of the frontend origin.

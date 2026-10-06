# Cloudinary changes applied

This copy was updated so Alberca Rentals can use Cloudinary as persistent production image storage.

## Included changes

- Cloudinary upload service using the working Cloudinary PHP Upload API.
- Rental item main-image uploads to `alberca-rentals/rental-items/main`.
- Rental item additional/slider uploads to `alberca-rentals/rental-items/gallery`.
- Special Offer uploads to `alberca-rentals/promotions`.
- Experience uploads to `alberca-rentals/experiences`.
- Homepage Event Showcase/Gallery uploads to `alberca-rentals/event-gallery`.
- Cloudinary `public_id` saved alongside every Cloudinary URL.
- Safe image replacement: new upload/database save first, old image cleanup afterward.
- Permanent delete removes the Cloudinary asset for archived Offers, Experiences, and Gallery entries.
- Deleting an additional rental image also removes its Cloudinary asset.
- Backward-compatible local `/storage` image handling while old images are being migrated.
- Legacy local URLs now use Laravel `APP_URL`, so they still resolve when React is hosted separately on Vercel.
- Existing image migration command: `php artisan cloudinary:migrate-images`.
- Safe preview mode: `php artisan cloudinary:migrate-images --dry-run`.
- Local-image cleanup command: `php artisan cloudinary:cleanup-local-images`.
- Cloudinary environment placeholders added to `backend/.env.example`.
- Cloudinary configuration accepts the dashboard names `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`.
- Upload directories ignored for future Git commits because new runtime uploads live in Cloudinary.

## Run after replacing your project files

```powershell
cd backend
php artisan migrate
php artisan optimize:clear
php artisan cloudinary:migrate-images --dry-run
```

If the dry run lists the expected old images, run:

```powershell
php artisan cloudinary:migrate-images
```

Test Rental Items, Special Offers, Experiences, and Gallery in the website. Once all old images are visibly loading from `res.cloudinary.com`, optionally run:

```powershell
php artisan cloudinary:cleanup-local-images
```

See `CLOUDINARY_SETUP.md` for more detail.

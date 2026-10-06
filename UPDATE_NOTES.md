# Image & Homepage Showcase Update

This build adds the requested visual rental features without removing the existing booking, availability, Google Maps, promotions, reports, or Telegram workflows.

## 1. Rental item photos

The rental item backend already supported `image_path`; the owner Rental Items page now exposes it more clearly with:

- Item image file picker
- JPG/PNG/WebP validation
- Image preview before saving
- Image display on owner inventory cards
- Customer **View item image** modal in Custom Booking

Uploaded rental images are stored under:

`backend/storage/app/public/rentals`

## 2. Homepage rental catalog

The homepage reads `/api/rentals/items` and shows up to six active rental items with:

- Photo or branded placeholder
- Category
- Item name and description
- Starting price
- View image action
- Book action

## 3. Real celebrations gallery

A new `showcase_photos` table stores event venue/gallery photos.

Owner route:

`/owner/showcase`

The owner can upload:

- Photo
- Optional title
- Optional event date
- Optional caption
- Display order

Public API:

`GET /api/showcase`

The homepage displays the active photos in the **Real celebrations** section and opens them in a large image preview modal.

Uploaded showcase images are stored under:

`backend/storage/app/public/showcase`

## Required update commands

From the backend folder:

```powershell
php artisan migrate
php artisan storage:link
php artisan optimize:clear
```

Then restart the application processes.

## 2026-10-06 - Rental item editing + multi-image galleries

- Added an **Update** button to every rental item in the owner Rental Items page.
- Owner can edit category, name, description, price, stock, maximum quantity, status and variants/sizes.
- Owner can replace the **main/cover image** while updating an item.
- Added support for up to **12 additional gallery images per rental item**.
- Added thumbnail management for existing additional images, including individual removal.
- Added `rental_item_images` database table and `RentalItemImage` model.
- Public rental catalog and availability APIs now return gallery images.
- Homepage rental image popup now acts as an image slider with previous/next controls, image counter and thumbnails.
- Custom Booking item image popup now uses the same multi-image slider behavior.

### Required after updating

```powershell
cd backend
php artisan migrate
php artisan storage:link
php artisan optimize:clear
```

`storage:link` may report that the link already exists; that is fine.

## 2026-10-06 Owner management improvements

- Fixed Special Offers rental item selectors. The previous selector updated the item and cleared the variant with two batched state writes, causing the selected item to be overwritten. The selector now changes both values in one state update.
- Special Offers now support Update, Active/Archived labels, Archive, and permanent Delete for archived offers.
- Categories now support Update, description, display order, and active/hidden state.
- Event Showcase / Gallery now supports Update, Active/Archived labels, Archive, and permanent Delete for archived photos.
- Availability Blocks now have a Delete block action.
- Experiences now support Update (including image replacement), Active/Archived labels, Archive, and permanent Delete for archived experiences.
- Permanent delete is intentionally protected: promotions, gallery entries, and experiences must be archived first.

No new migration is required for this management update. Existing gallery and rental image migrations from the previous update are still required if they have not been run yet.

## 2026-10-07 - Cloudinary production image storage

- Added Cloudinary server-side uploads for rental item main images and additional slider images.
- Added Cloudinary uploads for Special Offers, Experiences, and Event Showcase/Gallery photos.
- Added `cloudinary_public_id` storage so replaced and permanently deleted images can also be removed from Cloudinary.
- Image replacement now uploads the new image before removing the previous one, reducing the risk of losing a working image if an update fails.
- Existing local `/storage` image paths remain supported during migration.
- Legacy local image URLs are now generated using Laravel's backend `APP_URL`, which works when React is deployed on a separate Vercel domain.
- Added `php artisan cloudinary:migrate-images` to migrate previously uploaded local images into Cloudinary.
- Added a `--dry-run` option and optional `--delete-local` migration mode.
- Added `php artisan cloudinary:cleanup-local-images` with a safety check that refuses cleanup while any database record still points to local storage.

See `CLOUDINARY_SETUP.md` for the exact setup and migration commands.

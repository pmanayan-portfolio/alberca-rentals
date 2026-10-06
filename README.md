# Alberca Rentals | Gowns, Tables, Chairs & Party Supplies — complete standalone project

A fresh Laravel 12 + React/Vite application for event/service bookings, rental inventory, limited-time promotions, custom bookings, owner management, Google Maps directions, and queued Telegram owner notifications.

## Ports used by this standalone copy
- React/Vite: `5174`
- Laravel API: `8001`
- PostgreSQL/Docker: `5434`

These ports let the older Gather project continue using 5173/8000/5433.

## Quick start (Windows PowerShell)
1. Open the project folder.
2. Run `./SETUP.ps1` once.
3. Create an owner: `cd backend; php artisan owner:create you@example.com --name="Store Owner"`
4. Put your Telegram bot token/chat ID in `backend/.env` and set `TELEGRAM_ENABLED=true`.
5. Run the three development processes shown in `RUN.md`.

See `INSTALL.md` for full instructions.

## New rental-photo and homepage showcase features
- Rental items can include an uploaded JPG/PNG/WebP image.
- Customers can open a larger **View item image** preview while building a custom booking.
- The homepage now includes a **What we rent** section populated from the rental catalog.
- The homepage now includes a **Real celebrations** gallery for photos taken at completed event venues.
- Store owners can upload and remove venue/event photos from **Owner → Gallery**.

### After updating an existing installation
From `backend` run:

```powershell
php artisan migrate
php artisan storage:link
php artisan optimize:clear
```

`storage:link` may report that the link already exists; that is fine.

Then restart Laravel, Vite, and the queue worker using `RUN.md`.
"# alberca-rentals" 
"# alberca-rentals" 

## Production image storage (Cloudinary)

The current build uses Cloudinary for all new uploaded images: rental main/gallery images, special offers, experiences, and real-event showcase photos. Existing local images can be migrated with:

```powershell
cd backend
php artisan cloudinary:migrate-images --dry-run
php artisan cloudinary:migrate-images
```

See `CLOUDINARY_SETUP.md` for setup, folders, environment variables, and cleanup behavior.

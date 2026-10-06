# Database structure
Core tables: users, sessions, events, availability_blocks, bookings, jobs, failed_jobs.
Rental tables: rental_categories, rental_items, rental_item_variants, booking_rental_items.
Promotion tables: promotions, promotion_items.

Rental availability is date-aware: quantities already reserved by overlapping active bookings are deducted from stock.

Showcase table: `showcase_photos` stores owner-uploaded event/venue photos for the public homepage gallery, including optional title, caption, event date, sort order, and active status.

Rental item images are stored in the existing `rental_items.image_path` column and served from Laravel's public storage disk.

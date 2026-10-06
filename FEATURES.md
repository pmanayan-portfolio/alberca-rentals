# Included functionality

## Customer
- Register / sign in / sign out
- Browse event experiences
- Browse the full rental item catalog directly on the homepage
- View rental item photos in a large preview before booking
- Browse real-event venue photos from previous customer setups
- Book an event experience
- Browse limited-time special offers
- Book a fixed promotional package with discount
- Build a custom rental booking at regular prices
- Choose tables, chairs, gowns/sizes, décor and other rental inventory
- Date-aware stock availability
- Delivery or pickup
- Current-location capture when browser permissions allow
- Manual venue/address fallback
- Google Maps preview
- View bookings
- Cancel bookings
- Request rescheduling

## Owner / manager
- Dashboard totals
- Booking management
- Booking approval/rejection/confirmation/cancellation/completion
- Rental workflow: reserved → preparing → delivered → returned → inspected → completed
- Google Maps directions to customer venue
- Approve/reject reschedule requests
- Calendar view
- Event/experience management with image uploads
- Availability blocking
- Rental categories
- Rental inventory with image upload and preview
- Event showcase/gallery photo management for homepage venue photos
- Variant/size inventory for gowns
- Rental status: available/unavailable/maintenance/damaged/archived
- Special offer builder with multiple rental items
- Fixed amount or percentage discounts
- Booking deadline and valid rental date/range
- Maximum promotion redemptions
- Reports summary and CSV export

## System
- Laravel 12 REST API
- React 19 + TypeScript + Vite + Tailwind CSS 4
- PostgreSQL 16 via Docker
- Laravel Sanctum session authentication
- Queued Telegram owner notifications
- Separate ports from the earlier project: 5174 / 8001 / 5434

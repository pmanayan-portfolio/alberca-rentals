# Run Alberca Rentals | Gowns, Tables, Chairs & Party Supplies

Keep Docker Desktop running.

## Terminal 1 — Laravel API
```powershell
cd backend
php artisan serve --host=0.0.0.0 --port=8001 --no-reload
```

## Terminal 2 — React frontend
```powershell
cd frontend
npm run dev -- --host 0.0.0.0 --port 5174
```

## Terminal 3 — Telegram/queue worker
```powershell
cd backend
php artisan queue:work -v
```

Open `http://localhost:5174` on the PC. For a phone on the same Wi-Fi, use the Network URL printed by Vite.

# Fresh installation

## Requirements
- PHP 8.2+ and Composer (Laravel Herd is fine)
- Node.js 20+
- Docker Desktop

## Automated setup
From PowerShell in this project root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\SETUP.ps1
```

The script:
- installs backend Composer dependencies
- creates `backend/.env`
- starts a new PostgreSQL container on port 5434
- generates a new Laravel APP_KEY
- runs all migrations and seeders
- installs frontend npm packages
- creates `frontend/.env`

## Telegram
Create/reuse a Telegram bot and set these in `backend/.env`:

```env
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=YOUR_TOKEN_ONLY
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
```

Then restart Laravel and the queue worker.

## LAN testing
The frontend proxy means phones only need the Vite address, e.g. `http://192.168.x.x:5174`.
Automatic browser GPS generally requires HTTPS on mobile; manual address entry remains available over LAN HTTP.

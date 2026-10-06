$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

Write-Host "[1/7] Starting PostgreSQL..." -ForegroundColor Cyan
Set-Location $Root
docker compose -p gather-rentals up -d

Write-Host "[2/7] Installing Laravel dependencies..." -ForegroundColor Cyan
Set-Location $Backend
composer install

if (!(Test-Path ".env")) { Copy-Item ".env.example" ".env" }

Write-Host "[3/7] Generating Laravel key..." -ForegroundColor Cyan
php artisan key:generate --force

Write-Host "[4/7] Waiting for PostgreSQL..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

Write-Host "[5/7] Migrating and seeding database..." -ForegroundColor Cyan
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link 2>$null

Write-Host "[6/7] Installing frontend packages..." -ForegroundColor Cyan
Set-Location $Frontend
npm install
if (!(Test-Path ".env")) { Copy-Item ".env.example" ".env" }

Write-Host "[7/7] Complete." -ForegroundColor Green
Write-Host "Create an owner next:" -ForegroundColor Yellow
Write-Host '  cd backend; php artisan owner:create owner@example.com --name="Store Owner"'
Write-Host "Then see RUN.md to start Laravel, Vite, and the queue worker."

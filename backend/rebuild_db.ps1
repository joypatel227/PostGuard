# PostGuard Database Rebuild Script (PowerShell)
# This script will wipe your local PostgreSQL database and rebuild it from scratch.

$ErrorActionPreference = "Stop"

Write-Host "--- Stopping any existing processes ---" -ForegroundColor Cyan
# (The user should manually stop the runserver if it's held by another terminal)

Write-Host "--- Dropping and Recreating Database: postguard_db ---" -ForegroundColor Yellow
# We use psql to drop and create. Assumes 'postgres' superuser or 'postguard_user' has permissions.
$env:PGPASSWORD = "1234"
& psql -U postgres -c "DROP DATABASE IF EXISTS postguard_db;"
& psql -U postgres -c "CREATE DATABASE postguard_db;"

Write-Host "--- Clearing Old Migrations ---" -ForegroundColor Yellow
Get-ChildItem -Path "*/migrations/*.py" -Exclude "__init__.py" | Remove-Item -Force
Get-ChildItem -Path "*/migrations/*.pyc" | Remove-Item -Force

Write-Host "--- Generating New Migrations ---" -ForegroundColor Cyan
python manage.py makemigrations accounts company attendance billing salary wallet supervisor

Write-Host "--- Applying Migrations ---" -ForegroundColor Cyan
python manage.py migrate

Write-Host "--- Seeding Initial Data (Lord, Admin, Supervisor) ---" -ForegroundColor Cyan
python seed_users.py

Write-Host "--- SUCCESS: Database Rebuilt ---" -ForegroundColor Green
Write-Host "You can now log in with: lord@gmail.com / qwerty123@" -ForegroundColor Green

@echo off
rem Start the BJCHI QA/QC dev server (php -S localhost:8000 -t public) and open the login page.
rem Double-click this file, or run it from the project root. Press Ctrl+C to stop.
chcp 65001 >nul
cd /d "%~dp0"

where php >nul 2>nul
if errorlevel 1 (
  echo PHP not found in PATH. Install PHP 8.3+ and add it to PATH, then run again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo WARNING: .env not found. Copy .env.example to .env and fill in the Supabase values.
)

start "" "http://localhost:8000/login.php"
php -S localhost:8000 -t public

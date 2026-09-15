@echo off
title Terionix MRIS — Startup
color 0A

echo.
echo  ============================================================
echo   TERIONIX  ^|  Material Recovery Intelligence System
echo   Starting application...
echo  ============================================================
echo.

REM ── Check Python ──────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python is not installed or not in PATH.
    echo  Please install Python 3.10+ from https://python.org
    echo  Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

echo  [1/3] Python found.

REM ── Install Python dependencies ───────────────────────────────
echo  [2/3] Installing Python dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt --quiet --disable-pip-version-check
if errorlevel 1 (
    echo  [ERROR] Failed to install dependencies.
    echo  Try running: pip install -r backend\requirements.txt
    pause
    exit /b 1
)

echo  [3/3] Dependencies ready.
echo.

REM ── Seed demo data (only if DB is empty) ─────────────────────
echo  Seeding demo data...
python seed_demo.py >nul 2>&1

echo.
echo  ============================================================
echo   App is starting at:  http://localhost:8000
echo   Opening browser in 3 seconds...
echo   Press Ctrl+C in this window to stop the server.
echo  ============================================================
echo.

REM ── Open browser after short delay ────────────────────────────
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8000"

REM ── Start FastAPI server ───────────────────────────────────────
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

pause

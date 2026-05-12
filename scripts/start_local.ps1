# ============================================================
# TreeSense AI — No-Docker Local Start Script (Windows)
# Runs frontend + FastAPI backend using Python only
# No Docker, No PostgreSQL, No Redis needed!
# Uses SQLite + mock MQTT
# Usage: Right-click -> Run with PowerShell
#    OR: powershell -ExecutionPolicy Bypass -File .\scripts\start_local.ps1
# ============================================================

$Root    = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend= Join-Path $Root "frontend"
$Venv    = Join-Path $Backend "venv"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  TreeSense AI - Local Start (No Docker)" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# ─── Step 1: Python check ─────────────────────────────────
Write-Host "[1/4] Checking Python..." -ForegroundColor Cyan
$pyver = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: Python not found. Install Python 3.11+ from python.org" -ForegroundColor Red
    pause; exit 1
}
Write-Host "      OK: $pyver" -ForegroundColor Green

# ─── Step 2: Setup virtualenv ─────────────────────────────
Write-Host "[2/4] Setting up virtual environment..." -ForegroundColor Cyan
if (-not (Test-Path $Venv)) {
    Write-Host "      Creating venv..." -ForegroundColor Yellow
    python -m venv $Venv
}

$activate = Join-Path $Venv "Scripts\Activate.ps1"
& $activate

Write-Host "      Installing minimal requirements..." -ForegroundColor Yellow
$reqFile = Join-Path $Backend "requirements_local.txt"
pip install -q -r $reqFile
Write-Host "      OK: Dependencies installed" -ForegroundColor Green

# ─── Step 3: Start FastAPI backend ────────────────────────
Write-Host "[3/4] Starting FastAPI backend (SQLite mode)..." -ForegroundColor Cyan

$backendCmd = "cd '$Backend'; .\venv\Scripts\Activate.ps1; " +
              "Set-Item Env:DATABASE_URL 'sqlite+aiosqlite:///./treesense.db'; " +
              "Set-Item Env:ENVIRONMENT 'development'; " +
              "uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "      OK: Backend -> http://127.0.0.1:8000" -ForegroundColor Green

# ─── Step 4: Start frontend ───────────────────────────────
Write-Host "[4/4] Starting frontend server..." -ForegroundColor Cyan

$frontendCmd = "cd '$Frontend'; python -m http.server 3001"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal
Start-Sleep -Seconds 2
Write-Host "      OK: Frontend -> http://localhost:3001" -ForegroundColor Green

# ─── Done ─────────────────────────────────────────────────
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  TreeSense AI is running!" -ForegroundColor Green
Write-Host ""
Write-Host "  Dashboard : http://localhost:3001" -ForegroundColor Cyan
Write-Host "  API Docs  : http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  API Base  : http://localhost:8000/api/v1" -ForegroundColor Cyan
Write-Host ""
Write-Host "  NOTE: Using SQLite + mock sensor data." -ForegroundColor Yellow
Write-Host "  Dashboard works fully in browser with" -ForegroundColor Yellow
Write-Host "  live simulated sensor readings." -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Open browser
Start-Sleep -Seconds 2
Start-Process "http://localhost:3001"

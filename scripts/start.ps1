# TreeSense AI — Local Dev Startup (No Docker)
# Usage: .\scripts\start.ps1  OR  double-click run.bat

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  TreeSense AI  -  Local Development Startup" -ForegroundColor Green
Write-Host "  AI-Driven IoT Framework for Tree Behaviour Analysis" -ForegroundColor Green
Write-Host "  Author: Prof. Anjit Raja R | RGU CII | 2026" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

$ProjectRoot  = Split-Path -Parent $PSScriptRoot
$BackendPath  = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"
$VenvActivate = Join-Path $BackendPath "venv\Scripts\Activate.ps1"
$VenvPython   = Join-Path $BackendPath "venv\Scripts\python.exe"

# ─── 1. Check Python ──────────────────────────────────────────
Write-Host "[1/4] Checking Python..." -ForegroundColor Cyan
$pyVer = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: Python not found. Install Python 3.9+ and re-run." -ForegroundColor Red
    pause; exit 1
}
Write-Host "      OK: $pyVer" -ForegroundColor Green

# ─── 2. Create / verify venv ──────────────────────────────────
Write-Host "[2/4] Checking virtual environment..." -ForegroundColor Cyan
if (-not (Test-Path $VenvActivate)) {
    Write-Host "      Creating venv..." -ForegroundColor Yellow
    python -m venv "$BackendPath\venv"
    Write-Host "      Installing dependencies from requirements_local.txt..." -ForegroundColor Yellow
    $reqFile = Join-Path $BackendPath "requirements_local.txt"
    if (-not (Test-Path $reqFile)) { $reqFile = Join-Path $BackendPath "requirements.txt" }
    & "$VenvPython" -m pip install --quiet --upgrade pip
    & "$VenvPython" -m pip install --quiet -r $reqFile
    Write-Host "      OK: venv ready" -ForegroundColor Green
} else {
    Write-Host "      OK: venv already exists" -ForegroundColor Green
}

# ─── 3. Start FastAPI backend in a new window ─────────────────
Write-Host "[3/4] Starting FastAPI backend (port 8000)..." -ForegroundColor Cyan
$backendCmd = "cd '$BackendPath'; .\venv\Scripts\Activate.ps1; " +
              "uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal
Write-Host "      OK: Backend window launched -> http://localhost:8000" -ForegroundColor Green
Start-Sleep -Seconds 2

# ─── 4. Start frontend HTTP server in a new window ────────────
Write-Host "[4/4] Starting frontend server (port 3001)..." -ForegroundColor Cyan
$frontendCmd = "cd '$FrontendPath'; python -m http.server 3001"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal
Write-Host "      OK: Frontend window launched -> http://localhost:3001" -ForegroundColor Green
Start-Sleep -Seconds 2

# ─── Done ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  TreeSense AI is running!" -ForegroundColor Green
Write-Host ""
Write-Host "  Login Page :  http://localhost:3001/login.html" -ForegroundColor Cyan
Write-Host "  Dashboard  :  http://localhost:3001/index.html" -ForegroundColor Cyan
Write-Host "  API Docs   :  http://localhost:8000/api/docs" -ForegroundColor Cyan
Write-Host "  Health     :  http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Admin  ->  username: admin      password: treesense@admin" -ForegroundColor Yellow
Write-Host "  User   ->  username: user       password: treesense@user" -ForegroundColor Yellow
Write-Host ""
Write-Host "  To stop: close the two PowerShell windows that opened." -ForegroundColor DarkGray
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

# Open browser automatically
Start-Sleep -Seconds 2
Start-Process "http://localhost:3001/login.html"

# Seonize Development Startup Script
# Run both frontend and backend dev servers

Write-Host "Starting Seonize Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend
Write-Host "Starting Backend (FastAPI) on port 8000..." -ForegroundColor Green
$backendPython = Join-Path $ScriptDir "seonize-backend\venv\Scripts\python.exe"
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\seonize-backend'; & '$backendPython' -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" -PassThru

Start-Sleep -Seconds 3

# Start Frontend  
Write-Host "Starting Frontend (Vite) on port 5173..." -ForegroundColor Green
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\seonize-frontend'; npm run dev -- --host 0.0.0.0" -PassThru

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Seonize Development Environment" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs: http://localhost:8000/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to stop all servers..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Cleanup
Stop-Process -Id $backendJob.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontendJob.Id -Force -ErrorAction SilentlyContinue
Write-Host "Servers stopped." -ForegroundColor Green

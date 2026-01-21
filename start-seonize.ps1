# Seonize Development Startup Script
# Run both frontend and backend dev servers

Write-Host "Starting Seonize Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting Backend (FastAPI) on port 8000..." -ForegroundColor Green
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\seonize-backend'; python -m uvicorn app.main:app --reload --port 8000" -PassThru

Start-Sleep -Seconds 2

# Start Frontend  
Write-Host "Starting Frontend (Vite) on port 5173..." -ForegroundColor Green
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\seonize-frontend'; npm run dev" -PassThru

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

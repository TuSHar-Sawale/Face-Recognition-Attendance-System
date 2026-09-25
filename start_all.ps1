# AuraFace Platform Launcher for PowerShell
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "               AuraFace AI Face Recognition Attendance Platform" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Python Face Recognition Service (Port 5001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\python-engine'; python server.py"

Start-Sleep -Seconds 3

Write-Host "Starting Node.js Express REST API (Port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\server'; npm start"

Start-Sleep -Seconds 3

Write-Host "Starting React + Vite Frontend (Port 3000)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\client'; npm run dev"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  Services launched!" -ForegroundColor White
Write-Host "  Web Dashboard: http://localhost:3000" -ForegroundColor Green
Write-Host "  API Server:    http://localhost:5000" -ForegroundColor Green
Write-Host "  Python Engine: http://localhost:5001" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan

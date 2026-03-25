# ERP Project Startup Script
# Run this in PowerShell as Administrator

Clear-Host
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🚀 ERP Project Startup" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Kill existing processes
Write-Host "🔄 Killing existing Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Navigate to project
$projectPath = "C:\Users\HP\OneDrive\Desktop\erp-project"
Set-Location $projectPath

Write-Host "✓ Project path: $projectPath" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📦 Starting Backend Server (Port 5000)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$projectPath\server"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing backend dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Start backend in background
Write-Host "▶️  Starting backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$projectPath\server'; npm run dev`"" -WindowStyle Normal

Start-Sleep -Seconds 5

# Start Frontend
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "⚛️  Starting Frontend Server (Port 5173)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$projectPath\erp-dashboard"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Start frontend in background
Write-Host "▶️  Starting frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$projectPath\erp-dashboard'; npm run dev`"" -WindowStyle Normal

Start-Sleep -Seconds 3

# Open browser
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ STARTUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Opening browser..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "📋 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. ✅ Backend should be running on http://localhost:5000" -ForegroundColor White
Write-Host "2. ✅ Frontend should be running on http://localhost:5173" -ForegroundColor White
Write-Host "3. 🔐 Login with admin@gmail.com" -ForegroundColor White
Write-Host "4. 📄 Navigate to Policy Center" -ForegroundColor White
Write-Host "5. 🔍 Open DevTools (F12) to check console for errors" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  DO NOT CLOSE THESE WINDOWS - servers run in background!" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 TIP: If you see 403 errors:" -ForegroundColor Cyan
Write-Host "   → Press F12" -ForegroundColor White
Write-Host "   → Go to Console" -ForegroundColor White
Write-Host "   → Run: JSON.parse(localStorage.getItem('erp_auth')).accessToken" -ForegroundColor White
Write-Host "   → If result is null/undefined, re-login" -ForegroundColor White
Write-Host ""

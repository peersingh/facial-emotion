Write-Host "Starting MEIP (Multimodal Emotion Intelligence Platform)..." -ForegroundColor Cyan

# Start Backend in a new terminal window
Start-Process powershell -ArgumentList "-NoExit -Command .\venv\Scripts\Activate.ps1; uvicorn backend.main:app --port 8080 --reload"
Write-Host "Launched Backend on port 8080..." -ForegroundColor Green

# Start Frontend in a new terminal window
Start-Process powershell -ArgumentList "-NoExit -Command cd frontend; npm run dev"
Write-Host "Launched Frontend on Vite server..." -ForegroundColor Green

Write-Host "Both systems are spinning up! Check the new windows." -ForegroundColor Yellow

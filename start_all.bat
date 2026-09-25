@echo off
TITLE AuraFace AI Attendance Platform Launcher
COLOR 0B

echo ==============================================================================
echo                AuraFace AI Face Recognition Attendance Platform
echo ==============================================================================
echo Starting Python Face Recognition Microservice (Port 5001)...
start "AuraFace Python Service [5001]" cmd /k "cd /d "%~dp0python-engine" && python server.py"

timeout /t 3 /nobreak > nul

echo Starting Node.js Express REST API Server (Port 5000)...
start "AuraFace Express API [5000]" cmd /k "cd /d "%~dp0server" && npm start"

timeout /t 3 /nobreak > nul

echo Starting React + Vite Web Dashboard & Live Kiosk (Port 3000)...
start "AuraFace React Client [3000]" cmd /k "cd /d "%~dp0client" && npm run dev"

echo ==============================================================================
echo  All three microservices launched in dedicated consoles!
echo  Web Dashboard: http://localhost:3000
echo  Node.js API:   http://localhost:5000
echo  Python Engine: http://localhost:5001
echo ==============================================================================
pause

@echo off
title Tech Vortex - AI Career Intelligence Server Launcher
echo ===================================================================
echo       TECH VORTEX - AI DRIVEN CAREER INTELLIGENCE PLATFORM
echo ===================================================================
echo [1/3] Checking environment...
cd /d "%~dp0\backend"

echo [2/3] Installing/verifying backend dependencies...
call npm install --silent

echo [3/3] Launching Node.js Express API & Static Server on Port 5000...
echo.
echo Server starting at: http://localhost:5000
echo You can also directly open index.html in the root folder anytime!
echo.
node server.js
pause

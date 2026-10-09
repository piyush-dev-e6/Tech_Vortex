@echo off
title Tech Vortex - AI Career Intelligence Server Launcher
echo ===================================================================
echo       TECH VORTEX - AI DRIVEN CAREER INTELLIGENCE PLATFORM
echo ===================================================================
echo [1/2] Checking Node.js environment...
cd /d "%~dp0\backend"

echo [2/2] Installing/verifying Node.js backend dependencies...
call npm install --silent

echo [3/3] Launching Node.js Express API & Static Server on Port 5000...
echo.
echo Server starting at: http://localhost:5000
echo The API-backed dashboard requires this server; do not open index.html directly.
echo PDF/DOCX resume parsing also requires Python packages from backend\requirements.txt.
echo.
node server.js
pause

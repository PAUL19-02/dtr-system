@echo off
echo ==========================================
echo    DTR System - Quick Start
echo ==========================================
echo.

REM Check if node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js found!
node --version
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting DTR Server...
echo ==========================================
echo Admin Panel: http://localhost:3000/admin.html
echo QR Scanner:   http://localhost:3000/attendance.html
echo ==========================================
echo.
echo Press Ctrl+C to stop the server
echo.

npm start

pause

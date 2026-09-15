@echo off
setlocal enabledelayedexpansion
title Wharton WInS - Deploy to Vercel
color 0b
cls

echo ======================================================================
echo          WHARTON WInS DASHBOARD - DIRECT VERCEL DEPLOYER
echo ======================================================================
echo.
echo Checking Vercel CLI login status...
call npx.cmd vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ACTION REQUIRED] Vercel CLI is not authenticated yet.
    echo Opening Vercel login in your default browser...
    echo Follow the prompt in your browser to authorize your account.
    echo.
    call npx.cmd vercel login
    echo.
    echo Rechecking login status...
    call npx.cmd vercel whoami
    if %errorlevel% neq 0 (
        echo [ERROR] Authentication failed or cancelled. Please try again.
        pause
        exit /b 1
    )
)

echo.
echo [SUCCESS] Authenticated to Vercel!
echo.
echo Choose deployment mode:
echo   [1] Full Stack Deployment (Backend API + Frontend)
echo   [2] Pure Frontend Deployment (Motora style - instant client build)
echo   [3] Open Vercel Project Dashboard in Browser
echo.
set /p choice="Enter your choice (1, 2, or 3): "

if "%choice%"=="1" (
    echo.
    echo ------------------------------------------------------------------
    echo Deploying Full Wharton WInS Stack to Vercel...
    echo ------------------------------------------------------------------
    call npx.cmd vercel --prod --yes
) else if "%choice%"=="2" (
    echo.
    echo ------------------------------------------------------------------
    echo Building and Deploying Pure Frontend (Motora style)...
    echo ------------------------------------------------------------------
    cd frontend
    call npm.cmd run build
    cd ..
    call npx.cmd vercel frontend/dist --prod --yes
) else (
    echo.
    echo Opening Vercel dashboard in browser...
    start https://vercel.com/dashboard
)

echo.
echo ======================================================================
echo Deployment process finished!
echo ======================================================================
pause

@echo off
title Wharton WInS - Deploy to Vercel
color 0b
echo ======================================================================
echo          WHARTON WInS DASHBOARD - VERCEL ONE-CLICK DEPLOYER
echo ======================================================================
echo.
echo Your GitHub repository is already 100% up-to-date at:
echo https://github.com/oArnav/wharton-wins-dashboard
echo.
echo Choose deployment method:
echo   [1] Deploy directly via Vercel CLI (interactive browser login)
echo   [2] Open Vercel Project import in web browser
echo.
set /p choice="Enter 1 or 2: "

if "%choice%"=="1" (
    echo.
    echo Running Vercel deployment...
    echo (If not logged in, follow the quick prompt in your browser)
    echo.
    npx.cmd vercel --prod
) else (
    echo.
    echo Opening Vercel in browser...
    start https://vercel.com/new
)

echo.
pause

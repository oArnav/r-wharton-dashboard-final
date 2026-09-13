@echo off
title Wharton WInS Dashboard - Public Live Server
echo ========================================================
echo Wharton Investment Simulator (WInS) Team Dashboard
echo Starting Production Server & Public Cloudflare Tunnel...
echo ========================================================
echo.

start "WInS Unified Server" cmd /k "cd backend && py main.py"
timeout /t 3 /nobreak >nul
start "WInS Public Cloudflare Tunnel" cmd /k ".git-bin\cloudflared.exe tunnel --url http://localhost:8000"

echo.
echo [LIVE] Unified Server and Cloudflare Tunnel launched!
echo Check the Cloudflare window for your live https://...trycloudflare.com link.
echo.
pause
start http://localhost:8000

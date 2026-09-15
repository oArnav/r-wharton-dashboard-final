@echo off
title Push Wharton WInS Dashboard to GitHub
color 0b
echo ======================================================================
echo          WHARTON WInS DASHBOARD - 1-CLICK GITHUB UPLOADER
echo ======================================================================
echo.
echo All project files (frontend, backend, api, Supabase schema) are clean,
echo fully built, and ready to push to a brand-new GitHub repository.
echo.
echo 1. Open: https://github.com/new
echo 2. Enter repository name (e.g. wharton-wins-final)
echo    (Leave "Add a README" and "Add .gitignore" UNCHECKED)
echo 3. Click "Create repository"
echo.
set /p REPO_INPUT="Enter your new Repo Name or Full URL: "

if "%REPO_INPUT%"=="" (
    echo [ERROR] No repository entered.
    pause
    exit /b
)

set REPO_URL=%REPO_INPUT%
echo %REPO_INPUT% | findstr /i "http github.com" >nul
if errorlevel 1 (
    set REPO_URL=https://github.com/oArnav/%REPO_INPUT%
)

echo.
echo [1/3] Setting remote origin to: %REPO_URL%
"%~dp0.git-bin\cmd\git.exe" remote remove origin 2>nul
"%~dp0.git-bin\cmd\git.exe" remote add origin %REPO_URL%

echo [2/3] Setting branch to main...
"%~dp0.git-bin\cmd\git.exe" branch -M main

echo [3/3] Pushing all files to GitHub...
"%~dp0.git-bin\cmd\git.exe" push -u origin main --force

echo.
if %ERRORLEVEL% equ 0 (
    echo ======================================================================
    echo [SUCCESS] Pushed to %REPO_URL%!
    echo ======================================================================
) else (
    echo ======================================================================
    echo [Push Notice] If prompted, sign in via browser to authorize GitHub.
    echo ======================================================================
)
echo.
pause

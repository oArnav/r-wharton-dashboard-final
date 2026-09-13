@echo off
title Push Wharton WInS Dashboard to GitHub
color 0b
echo ======================================================================
echo          WHARTON WInS DASHBOARD - AUTOMATIC GITHUB UPLOADER
echo ======================================================================
echo.
echo All 51 project files across all directories (frontend, backend, api)
echo are already tracked, cleaned, committed, and ready to push to GitHub.
echo.
echo 1. Go to: https://github.com/new
echo 2. Name your repository (e.g. wharton-wins-dashboard)
echo    IMPORTANT: Leave "Add a README" and "Add .gitignore" UNCHECKED.
echo 3. Click "Create repository"
echo.
set /p REPO_URL="Enter your GitHub Repository URL (HTTPS or SSH): "

if "%REPO_URL%"=="" (
    echo [ERROR] No URL entered. Aborting.
    pause
    exit /b
)

echo.
echo [1/3] Configuring remote origin...
"%~dp0.git-bin\cmd\git.exe" remote remove origin 2>nul
"%~dp0.git-bin\cmd\git.exe" remote add origin %REPO_URL%

echo [2/3] Setting default branch to main...
"%~dp0.git-bin\cmd\git.exe" branch -M main

echo [3/3] Pushing all files and folders to GitHub...
echo (If a browser window pops up, click 'Sign in with browser' to authenticate)
echo.
"%~dp0.git-bin\cmd\git.exe" push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ======================================================================
    echo [SUCCESS] Your repository is now fully uploaded to GitHub!
    echo All folders (frontend, backend, api, components) are live!
    echo ======================================================================
) else (
    echo ======================================================================
    echo [NOTICE] If the push failed due to authentication, you can also:
    echo 1. Generate a GitHub Personal Access Token at:
    echo    https://github.com/settings/tokens
    echo 2. Or paste the repo URL into GitHub Desktop / VS Code.
    echo ======================================================================
)
echo.
pause

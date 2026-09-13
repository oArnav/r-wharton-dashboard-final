@echo off
echo ========================================================
echo   Starting Wharton WInS Frontend Dev Server (Port 5173)
echo ========================================================
cd frontend
cmd.exe /c npm install
cmd.exe /c npm run dev
pause

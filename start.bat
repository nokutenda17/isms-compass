@echo off
echo Starting ISMS Compass...

start "Backend" cmd /k "cd /d C:\isms-compass\backend && set PYTHONIOENCODING=utf-8 && .venv\Scripts\activate.bat && python app.py"

timeout /t 3 /nobreak > nul

start "Frontend" cmd /k "cd /d C:\isms-compass\frontend && npm run dev"

timeout /t 4 /nobreak > nul

start http://localhost:5173
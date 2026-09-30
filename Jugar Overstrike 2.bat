@echo off
title Overstrike 2 - servidor local
cd /d "%~dp0prototipo"
echo.
echo   Overstrike 2 se esta abriendo en tu navegador...
echo   NO cierres esta ventana mientras juegas (cerrarla apaga el juego).
echo.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:3100"
python herramientas\servidor.py
pause

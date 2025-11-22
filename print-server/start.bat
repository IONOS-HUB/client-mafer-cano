@echo off
echo ========================================
echo   SERVIDOR DE IMPRESION TERMICA
echo ========================================
echo.
echo Iniciando servidor en puerto 3001...
echo.

cd /d "%~dp0"
node server.js

pause

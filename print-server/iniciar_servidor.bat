@echo off
title Servidor de Impresion - Mafer Cano
echo ==========================================
echo   INICIANDO SERVIDOR DE IMPRESION
echo ==========================================
echo.
cd /d "%~dp0"

:: Verificar si Node.js esta instalado
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit
)

:: Verificar e instalar dependencias
if not exist node_modules (
    echo [INFO] Primera vez iniciando. Instalando dependencias...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit
    )
)

:: Iniciar servidor
echo [INFO] Servidor listo. No cierres esta ventana.
echo.
call npm start
pause

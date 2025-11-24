@echo off
title Configurar Inicio Automatico
echo ==========================================
echo   CONFIGURANDO INICIO AUTOMATICO
echo ==========================================
echo.

set "SHORTCUT_NAME=ServidorImpresionMaferCano.lnk"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\%SHORTCUT_NAME%"
set "TARGET_PATH=%~dp0iniciar_servidor.bat"
set "WORKING_DIR=%~dp0"

echo 1. Verificando rutas...
echo    - Script a ejecutar: %TARGET_PATH%
echo    - Carpeta de inicio: %STARTUP_FOLDER%

echo.
echo 2. Creando acceso directo...

powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%');$s.TargetPath='%TARGET_PATH%';$s.WorkingDirectory='%WORKING_DIR%';$s.WindowStyle=7;$s.Save()"

if %errorlevel% equ 0 (
    echo.
    echo [EXITO] Configurado correctamente!
    echo El servidor de impresion se abrira minimizado cada vez que se encienda la PC.
) else (
    echo.
    echo [ERROR] No se pudo crear el acceso directo.
)

echo.
pause

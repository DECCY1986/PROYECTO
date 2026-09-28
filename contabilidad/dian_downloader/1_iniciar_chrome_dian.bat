@echo off
chcp 65001 > nul
title 1. Iniciar Chrome con Depurador DIAN
echo ===============================================================
echo  🚀 ABRIR CHROME MODO COMPATIBLE DIAN (Puerto 9222)
echo ===============================================================
echo.
echo Iniciando una ventana de Chrome con puerto de depuración 9222...
echo.

set DEBUG_DIR=%TEMP%\chrome_dian_debug
if not exist "%DEBUG_DIR%" mkdir "%DEBUG_DIR%"

REM Intentar ejecutar Chrome con user-data-dir separado para evitar conflictos con Chrome abierto
start "" "chrome.exe" --remote-debugging-port=9222 --user-data-dir="%DEBUG_DIR%" "https://catalogo-vpfe.dian.gov.co" 2>nul

if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%DEBUG_DIR%" "https://catalogo-vpfe.dian.gov.co"
    ) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%DEBUG_DIR%" "https://catalogo-vpfe.dian.gov.co"
    ) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
        start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%DEBUG_DIR%" "https://catalogo-vpfe.dian.gov.co"
    ) else (
        echo [ERROR] No se encontró Google Chrome en las rutas estándar.
        echo Asegúrate de tener instalado Google Chrome.
        pause
        exit /b
    )
)

echo.
echo ===============================================================
echo  ¡Chrome se ha abierto en una nueva ventana especial!
echo.
echo  PASOS A SEGUIR:
echo  1. En esa nueva ventana de Chrome, INICIA SESIÓN en la DIAN.
echo  2. Entra a la sección de Facturas Emitidas o Recibidas.
echo  3. Vuelve a esta carpeta y ejecuta "2_ejecutar_descarga.bat".
echo ===============================================================
echo.
pause

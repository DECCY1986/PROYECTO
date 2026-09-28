@echo off
chcp 65001 > nul
title 2. Ejecutar Descargador de Facturas DIAN
echo ===============================================================
echo  🚀 EJECUTANDO DESCARGA AUTOMÁTICA DE FACTURAS DIAN
echo ===============================================================
echo.

:: Cambiar al directorio donde se encuentra este archivo .bat
cd /d "%~dp0"

:: Verificar si Python está disponible en el sistema
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python no se encuentra instalado o no está agregado al PATH de Windows.
    echo Por favor instala Python o asegúrate de marcar la casilla "Add python.exe to PATH".
    echo.
    pause
    exit /b 1
)

echo Verificando e instalando dependencias requeridas...
python -m pip install -r requirements.txt --quiet

echo.
echo Iniciando Asistente de Descarga...
echo.
python dian_downloader.py

echo.
echo ===============================================================
echo  Proceso terminado. Presiona cualquier tecla para cerrar.
echo ===============================================================
pause

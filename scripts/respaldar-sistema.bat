@echo off
chcp 65001 >nul
title Respaldo de Base de Datos y Archivos - Sistema SST/SIHO
color 0e

echo =====================================================================
echo       RESPALDO DEL SISTEMA DE CRONOGRAMAS E INSPECCIONES SST
echo =====================================================================
echo.

set "DESTINO=C:\sistema-cronogramas\respaldos"
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "FECHA=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%%datetime:~10,2%"
set "CARPETA_RESPALDO=%DESTINO%\respaldo_%FECHA%"

mkdir "%CARPETA_RESPALDO%" 2>nul

echo Directorio de respaldo: %CARPETA_RESPALDO%
echo.

:: 1. Respaldo de PostgreSQL
echo [1/2] Exportando base de datos PostgreSQL...
where pg_dump >nul 2>&1
if %errorlevel% neq 0 (
    :: Intentar buscar en rutas estándar de PostgreSQL en Windows
    if exist "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" set "PATH=C:\Program Files\PostgreSQL\17\bin;%PATH%"
    if exist "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" set "PATH=C:\Program Files\PostgreSQL\16\bin;%PATH%"
)

set PGPASSWORD=1234
pg_dump -U postgres -h localhost -p 5432 -d cronogramas -F p -f "%CARPETA_RESPALDO%\cronogramas_dump.sql"
if %errorlevel% equ 0 (
    echo [OK] Base de datos respaldada en: %CARPETA_RESPALDO%\cronogramas_dump.sql
) else (
    echo [AVISO] pg_dump no pudo conectarse con contraseña por defecto o no está en PATH.
    echo Puedes exportar la base de datos visualmente desde pgAdmin 4:
    echo Clic derecho en la BD 'cronogramas' -^> Backup...
)
echo.

:: 2. Respaldo de Archivos (Fotos y Firmas)
echo [2/2] Respaldando fotos y firmas adjuntas...
if exist "C:\sistema-cronogramas\archivos" (
    powershell -Command "Compress-Archive -Path 'C:\sistema-cronogramas\archivos\*' -DestinationPath '%CARPETA_RESPALDO%\archivos_adjuntos.zip' -Force -ErrorAction SilentlyContinue"
    echo [OK] Archivos comprimidos en: %CARPETA_RESPALDO%\archivos_adjuntos.zip
) else (
    echo [INFO] No hay carpeta de archivos para respaldar.
)

echo.
echo =====================================================================
echo ¡Respaldo completado! Guardado en:
echo %CARPETA_RESPALDO%
echo =====================================================================
pause

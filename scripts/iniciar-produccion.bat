@echo off
chcp 65001 >nul
title Sistema de Cronogramas SST/SIHO - Servidor de Producción

echo =====================================================================
echo        SISTEMA DE CRONOGRAMAS SST/SIHO - CEVECONCA
echo                  Iniciando en Windows...
echo =====================================================================
echo.

cd /d "%~dp0\.."

:: Cargar variables por defecto si no existen en el entorno
if "%DATABASE_URL%"=="" set "DATABASE_URL=postgresql://postgres:1234@localhost:5432/cronogramas"
if "%SESSION_SECRET%"=="" set "SESSION_SECRET=ceveconca-sst-sistema-cronogramas-secreto-2026-produccion"
if "%TZ%"=="" set "TZ=America/Caracas"
if "%ARCHIVOS_DIR%"=="" set "ARCHIVOS_DIR=C:\sistema-cronogramas\archivos"
if "%COOKIE_INSEGURA%"=="" set "COOKIE_INSEGURA=1"

where bun >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Bun detectado. Iniciando servidor en modo producción...
    echo.
    echo Para detener el sistema, cierra esta ventana o presiona Ctrl + C.
    echo =====================================================================
    bun run start
) else (
    where npm >nul 2>&1
    if %errorlevel% equ 0 (
        echo [INFO] Bun no encontrado, usando Node.js / npm...
        echo.
        echo Para detener el sistema, cierra esta ventana o presiona Ctrl + C.
        echo =====================================================================
        npm run start
    ) else (
        echo [ERROR] No se encontró ni 'bun' ni 'node/npm' instalados en el sistema.
        echo Instala Bun o Node.js siguiendo la guía docs\DESPLIEGUE_WINDOWS.md.
        echo.
        pause
        exit /b 1
    )
)

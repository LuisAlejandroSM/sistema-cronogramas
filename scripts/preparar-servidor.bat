@echo off
chcp 65001 >nul
title Asistente de Instalación y Despliegue - Sistema SST/SIHO
color 0b

echo =====================================================================
echo    SISTEMA DE CRONOGRAMAS E INSPECCIONES SST/SIHO - CEVECONCA
echo           Asistente de Preparación y Despliegue en Servidor
echo =====================================================================
echo.

cd /d "%~dp0\.."

:: 1. Verificar Permisos de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Se recomienda ejecutar este asistente como Administrador.
    echo Si algunas tareas fallan, haz clic derecho sobre este archivo y
    echo selecciona "Ejecutar como administrador".
    echo.
)

:: 2. Preguntar Parámetros de Base de Datos
echo [1/6] Configuración de la Base de Datos PostgreSQL:
set /p DB_PASS="-> Ingrese la contraseña de PostgreSQL (usuario postgres) [ej: 1234]: "
if "%DB_PASS%"=="" set DB_PASS=1234

set /p DB_NAME="-> Ingrese el nombre de la base de datos [default: cronogramas]: "
if "%DB_NAME%"=="" set DB_NAME=cronogramas

set /p DB_PORT="-> Ingrese el puerto de PostgreSQL [default: 5432]: "
if "%DB_PORT%"=="" set DB_PORT=5432

set "DATABASE_URL=postgresql://postgres:%DB_PASS%@localhost:%DB_PORT%/%DB_NAME%"
echo.
echo URL configurada: postgresql://postgres:****@localhost:%DB_PORT%/%DB_NAME%
echo.

:: 3. Crear Carpeta de Archivos y Fotos
echo [2/6] Creando directorio para almacenamiento de fotos y firmas...
if not exist "C:\sistema-cronogramas\archivos" (
    mkdir "C:\sistema-cronogramas\archivos"
    echo [OK] Carpeta creada: C:\sistema-cronogramas\archivos
) else (
    echo [OK] La carpeta C:\sistema-cronogramas\archivos ya existe.
)
echo.

:: 4. Generar archivo .env.local seguro
echo [3/6] Creando archivo de configuración .env.local...
(
    echo DATABASE_URL="postgresql://postgres:%DB_PASS%@localhost:%DB_PORT%/%DB_NAME%"
    echo SESSION_SECRET="ceveconca-sst-sistema-cronogramas-secreto-2026-produccion"
    echo TZ="America/Caracas"
    echo ARCHIVOS_DIR="C:\\sistema-cronogramas\\archivos"
    echo COOKIE_INSEGURA="1"
) > .env.local
echo [OK] Archivo .env.local generado exitosamente.
echo.

:: 5. Verificar o Instalar Bun
echo [4/6] Verificando entorno de ejecución (Bun)...
where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Bun no está instalado. Descargando e instalando automáticamente...
    powershell -Command "irm bun.sh/install.ps1 | iex"
    set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
    where bun >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudo instalar Bun automáticamente.
        echo Por favor instale Bun manualmente abriendo PowerShell y ejecutando:
        echo powershell -c "irm bun.sh/install.ps1 | iex"
        pause
        exit /b 1
    )
)
echo [OK] Bun detectado correctamente.
echo.

:: 6. Instalar dependencias, compilar y cargar formularios
echo [5/6] Instalando librerías y compilando el sistema...
call bun install
if %errorlevel% neq 0 (
    echo [ERROR] Error durante bun install.
    pause
    exit /b 1
)

echo.
echo Compilando páginas del sistema (Next.js)...
call bun run build
if %errorlevel% neq 0 (
    echo [ERROR] Error durante la compilación.
    pause
    exit /b 1
)
echo.

:: 7. Cargar los 16 formularios a PostgreSQL
echo [6/6] Sincronizando los 16 formularios digitales con PostgreSQL...
call bun run db:cargar-formularios
echo.

:: 8. Habilitar regla de Firewall
echo Configurando puerto 3000 en el Firewall de Windows...
powershell -Command "if (-not (Get-NetFirewallRule -DisplayName 'Sistema SST Cronogramas' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName 'Sistema SST Cronogramas' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow }" >nul 2>&1
echo [OK] Firewall configurado.
echo.

echo =====================================================================
echo              ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!
echo =====================================================================
echo.
echo Para iniciar el servidor ahora mismo, ejecute:
echo   scripts\iniciar-produccion.bat
echo.
echo Para configurar el inicio automático como servicio de Windows, revise:
echo   docs\PLAN_DESPLIEGUE_IT.md
echo.
pause

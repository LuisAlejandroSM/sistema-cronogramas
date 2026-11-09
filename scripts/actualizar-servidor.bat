@echo off
chcp 65001 >nul
title Actualizar Sistema SST/SIHO
echo =====================================================================
echo    Actualizar Sistema de Cronogramas SST/SIHO desde GitHub
echo =====================================================================
echo.

cd /d "%~dp0\.."

echo [1/5] Descargando ultimos cambios de GitHub...
git pull
if errorlevel 1 (
    echo.
    echo [ERROR] Falló 'git pull'. Verifique la conexión a Internet o credenciales.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/5] Verificando dependencias de software...
call bun install

echo.
echo [3/5] Verificando migraciones de base de datos...
call bun run db:migrate 2>nul

echo.
echo [4/5] Sincronizando catálogo de formularios en base de datos...
call bun run db:cargar-formularios

echo.
echo [5/5] Recompilando la aplicación para producción...
call bun run build
if errorlevel 1 (
    echo.
    echo [ERROR] Error durante la compilación.
    pause
    exit /b 1
)

echo.
echo =====================================================================
echo    ¡Actualización completada con éxito!
echo    Para aplicar los cambios en el servidor en vivo:
echo    - Si corre por tarea de Windows: reinicie la tarea o la máquina.
echo    - Si corre por consola: cierre la ventana y ejecute iniciar-produccion.bat
echo =====================================================================
echo.
pause

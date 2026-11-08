@echo off
chcp 65001 >nul
title Configurar Inicio Automático del Servidor - Sistema SST/SIHO
color 0a

echo =====================================================================
echo    CONFIGURAR ARRANQUE AUTOMÁTICO EN WINDOWS (SISTEMA SST/SIHO)
echo =====================================================================
echo.
echo Este asistente permite que el servidor web se inicie automáticamente
echo sin necesidad de abrir la consola manualmente cada vez.
echo.

cd /d "%~dp0\.."

set "BAT_PATH=%~dp0iniciar-produccion.bat"

echo Seleccione la opción de inicio automático preferida:
echo.
echo  [1] Tarea Programada de Windows (Recomendada para Servidores)
echo      - Se ejecuta automáticamente al iniciar Windows.
echo      - No requiere sesión de usuario activa.
echo.
echo  [2] Carpeta Inicio de Windows (Startup)
echo      - Crea un acceso directo en la carpeta de inicio del usuario.
echo      - Se ejecuta cuando el usuario inicia sesión en Windows.
echo.
echo  [3] Eliminar tarea / Desactivar inicio automático
echo.

set /p OPCION="Ingrese una opción (1, 2 o 3): "

if "%OPCION%"=="1" goto TAREA_PROGRAMADA
if "%OPCION%"=="2" goto CARPETA_INICIO
if "%OPCION%"=="3" goto ELIMINAR_TODO
goto SALIR

:TAREA_PROGRAMADA
echo.
echo Registrando tarea programada en Windows...
powershell -Command "Unregister-ScheduledTask -TaskName 'SistemaCronogramasSST' -Confirm:$false -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "$action = New-ScheduledTaskAction -Execute '%BAT_PATH%'; $trigger = New-ScheduledTaskTrigger -AtLogOn; $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1); Register-ScheduledTask -TaskName 'SistemaCronogramasSST' -Action $action -Trigger $trigger -Settings $settings -Description 'Servidor Web Sistema de Cronogramas SST/SIHO' -RunLevel Highest"
if %errorlevel% equ 0 (
    echo.
    echo [OK] Tarea programada 'SistemaCronogramasSST' creada exitosamente.
    echo El sistema iniciará automáticamente al encender el equipo.
) else (
    echo.
    echo [ERROR] No se pudo crear la tarea programada. Asegúrese de ejecutar este archivo como Administrador.
)
pause
exit /b 0

:CARPETA_INICIO
echo.
echo Creando acceso directo en shell:startup...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Startup') + '\SistemaSST.lnk'); $s.TargetPath = '%BAT_PATH%'; $s.WorkingDirectory = '%~dp0..'; $s.Save()"
echo [OK] Acceso directo creado en la carpeta de inicio de Windows.
pause
exit /b 0

:ELIMINAR_TODO
echo.
echo Eliminando tarea programada y accesos directos...
powershell -Command "Unregister-ScheduledTask -TaskName 'SistemaCronogramasSST' -Confirm:$false -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "Remove-Item ([Environment]::GetFolderPath('Startup') + '\SistemaSST.lnk') -ErrorAction SilentlyContinue" >nul 2>&1
echo [OK] Inicio automático desactivado.
pause
exit /b 0

:SALIR
exit /b 0

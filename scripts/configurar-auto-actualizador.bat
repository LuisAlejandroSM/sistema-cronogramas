@echo off
chcp 65001 >nul
title Configurar Auto-Actualizador en Segundo Plano - Sistema SST/SIHO
color 0b

echo =====================================================================
echo    CONFIGURAR ACTUALIZACIÓN AUTOMÁTICA EN LA MÁQUINA VIRTUAL
echo =====================================================================
echo.
echo Este asistente programa una tarea en segundo plano en Windows que:
echo 1. Revisa GitHub cada 5 minutos de forma silenciosa.
echo 2. Si detecta un nuevo 'git push' hecho desde tu laptop:
echo    - Descarga los cambios (git pull).
echo    - Recompila la aplicación (bun run build).
echo    - Reinicia el servidor automáticamente.
echo.

set "SCRIPT_PS1=%~dp0auto-actualizar.ps1"

echo  [1] Activar Vigilante de Auto-Actualización (Cada 5 minutos)
echo  [2] Desactivar / Eliminar Vigilante de Auto-Actualización
echo  [3] Salir
echo.

set /p OPCION="Seleccione una opción (1, 2 o 3): "

if "%OPCION%"=="1" goto ACTIVAR
if "%OPCION%"=="2" goto DESACTIVAR
goto SALIR

:ACTIVAR
echo.
echo Creando tarea programada 'SistemaCronogramasAutoUpdate'...
powershell -Command "Unregister-ScheduledTask -TaskName 'SistemaCronogramasAutoUpdate' -Confirm:$false -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-ExecutionPolicy Bypass -WindowStyle Hidden -File \"\"%SCRIPT_PS1%\"\"'; $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5); $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew; Register-ScheduledTask -TaskName 'SistemaCronogramasAutoUpdate' -Action $action -Trigger $trigger -Settings $settings -Description 'Vigilante de actualizaciones automáticas desde GitHub' -RunLevel Highest"

if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo [OK] ¡Vigilante configurado exitosamente!
    echo.
    echo A partir de ahora, cada vez que hagas 'git commit' y 'git push'
    echo desde tu laptop, la máquina virtual lo detectará y se actualizará
    echo sola en menos de 5 minutos sin que tengas que tocar nada.
    echo =====================================================================
) else (
    echo.
    echo [ERROR] No se pudo crear la tarea. Ejecute este archivo como Administrador.
)
pause
exit /b 0

:DESACTIVAR
echo.
echo Eliminando tarea programada...
powershell -Command "Unregister-ScheduledTask -TaskName 'SistemaCronogramasAutoUpdate' -Confirm:$false -ErrorAction SilentlyContinue" >nul 2>&1
echo [OK] Vigilante de auto-actualización desactivado.
pause
exit /b 0

:SALIR
exit /b 0

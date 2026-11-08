@echo off
chcp 65001 >nul
title Habilitar Puerto en Firewall de Windows - Sistema Cronogramas

echo =====================================================================
echo    Habilitando Puerto 3000 en el Firewall de Windows para Wi-Fi
echo =====================================================================
echo.

:: Verificar si se ejecuta como Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Se requieren permisos de Administrador para modificar el Firewall.
    echo Solicitando permisos...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Creando regla de entrada en el Firewall para el puerto 3000 TCP...
powershell -NoProfile -Command "New-NetFirewallRule -DisplayName 'Sistema SST Cronogramas' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue"

if %errorlevel% equ 0 (
    echo.
    echo [EXITO] El puerto 3000 ha sido abierto correctamente en el Firewall.
    echo Los dispositivos conectados a tu red Wi-Fi podran acceder al sistema.
) else (
    echo.
    echo [ADVERTENCIA] Hubo un inconveniente al crear la regla. Verifica manualmente.
)

echo.
pause

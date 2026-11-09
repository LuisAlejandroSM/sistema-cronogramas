# =====================================================================
# SCRIPT DE AUTO-ACTUALIZACIÓN CONTINUA - SISTEMA CRONOGRAMAS SST/SIHO
# Revisa GitHub en segundo plano. Si detecta nuevos commits en tu laptop:
# 1. Descarga los cambios (git pull)
# 2. Instala dependencias si cambiaron (bun install)
# 3. Sincroniza formularios o migraciones en la BD si cambiaron
# 4. Recompila la aplicación para producción (bun run build)
# 5. Reinicia el servidor automáticamente sin intervención humana
# =====================================================================

$ErrorActionPreference = "Continue"

$Raiz = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Raiz

# 1. Comprobar conectividad y buscar cambios en GitHub
try {
    git fetch origin main --quiet 2>$null
    if ($LASTEXITCODE -ne 0) {
        # Si no hay internet o no responde GitHub, salir silenciosamente
        exit 0
    }
} catch {
    exit 0
}

$localCommit = (git rev-parse HEAD 2>$null).Trim()
$remoteCommit = (git rev-parse origin/main 2>$null).Trim()

if (-not $localCommit -or -not $remoteCommit -or $localCommit -eq $remoteCommit) {
    # No hay cambios pendientes
    exit 0
}

$Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
Write-Host "[$Timestamp] [AUTO-UPDATE] Nuevos cambios detectados en GitHub:"
Write-Host "  Commit local:  $localCommit"
Write-Host "  Commit remoto: $remoteCommit"

# 2. Descargar código nuevo
Write-Host "[$Timestamp] Descargando ultimos cambios de GitHub..."
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Falló git pull. No se puede actualizar."
    exit 1
}

# 3. Comprobar si package.json cambió
$archivosCambiados = git diff --name-only $localCommit $remoteCommit
if ($archivosCambiados -match "package.json") {
    Write-Host "[$Timestamp] Detectados cambios en package.json. Ejecutando bun install..."
    bun install
}

# 4. Si cambiaron formularios o esquemas, sincronizar en la base de datos
if ($archivosCambiados -match "formularios-migrados\.json" -or $archivosCambiados -match "cargar-formularios\.js") {
    Write-Host "[$Timestamp] Sincronizando catálogo de formularios en la base de datos..."
    bun run scripts/cargar-formularios.js
}

# 5. Recompilar Next.js para producción
Write-Host "[$Timestamp] Recompilando aplicación con bun run build..."
bun run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Falló la compilación de producción."
    exit 1
}

# 6. Reiniciar el servidor en producción
Write-Host "[$Timestamp] Reiniciando servicio web en Windows..."
$tareaExiste = Get-ScheduledTask -TaskName "SistemaCronogramasSST" -ErrorAction SilentlyContinue
if ($tareaExiste) {
    Stop-ScheduledTask -TaskName "SistemaCronogramasSST" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Start-ScheduledTask -TaskName "SistemaCronogramasSST"
    Write-Host "[$Timestamp] [EXITO] Tarea 'SistemaCronogramasSST' reiniciada con la nueva versión."
} else {
    # Si corre en modo proceso directo, reiniciar bun
    Get-Process -Name "bun" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "start" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Process -FilePath "bun" -ArgumentList "run start" -WorkingDirectory $Raiz -WindowStyle Minimized
    Write-Host "[$Timestamp] [EXITO] Proceso web reiniciado con la nueva versión."
}

Write-Host "[$Timestamp] ¡Actualización automática completada exitosamente!"
exit 0

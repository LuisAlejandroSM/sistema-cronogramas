# Instalación en Servidor Windows (Máquina Virtual) · Sistema de Cronogramas SST/SIHO

Guía paso a paso para desplegar el sistema de cronogramas en una Máquina Virtual con **Windows 10 Pro**, **Windows 11 Pro** o **Windows Server**, permitiendo el acceso en red local (Wi-Fi) desde celulares, tablets y computadoras de la empresa.

---

## 1. Requisitos Previos

| Componente | Especificación recomendada |
|---|---|
| **Sistema Operativo VM** | Windows 10 Pro (64 bits) o Windows 11 Pro |
| **Recursos de la VM** | 4 GB de memoria RAM, 2 vCPUs, 40-50 GB de disco dinámico |
| **Red de la VM** | **Adaptador Puente (Bridged)** conectado a tu tarjeta Wi-Fi o red local |
| **Base de Datos** | PostgreSQL **16** o **17** para Windows (instalador oficial EnterpriseDB con **pgAdmin 4**) |
| **Runtime de Ejecución** | Bun **1.4.0** (o Node.js LTS v22) |
| **Archivos a transferir a la VM** | La carpeta del proyecto completa (incluyendo `migracion/datos-iniciales.sql`) |

---

## 2. Configuración de Red en la Máquina Virtual (Crucial)

Para que otros dispositivos de la empresa (como los celulares de los inspectores) puedan abrir el sistema:

1. En la configuración de tu máquina virtual (VirtualBox o VMware):
   - Ve a la sección **Red (Network)**.
   - En *Conectado a:* cambia de **NAT** a **Adaptador Puente (Bridged Adapter)**.
   - En *Nombre:* selecciona el adaptador Wi-Fi de tu computadora física.
2. Al iniciar Windows en la VM, tu router Wi-Fi le asignará una dirección IP propia a la máquina virtual (por ejemplo: `192.168.1.45`), como si fuera otra computadora física conectada al Wi-Fi.

---

## 3. Instalación de PostgreSQL y pgAdmin 4 en Windows

1. **Descargar el instalador oficial:**
   - En el navegador de la VM entra a:  
     👉 [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
   - Haz clic en **"Download the installer"**.
   - Descarga la versión **16** o **17** para Windows x86-64.
2. **Ejecutar el instalador:**
   - Haz doble clic en el archivo `.exe` descargado y pulsa *Next*.
   - **Componentes:** Asegúrate de que estén marcados:
     - *PostgreSQL Server*
     - *pgAdmin 4* (la herramienta gráfica)
     - *Command Line Tools*
   - **Directorio de datos:** Déjalo por defecto y pulsa *Next*.
   - **Contraseña:** Escribe una contraseña para el usuario administrador `postgres` (ejemplo: `sst123`). **Anótala bien.**
   - **Puerto:** Déjalo en `5432` y pulsa *Next*.
   - **Configuración regional (Locale):** Déjalo en `[Default locale]` y finaliza la instalación.
3. Al terminar, si se abre una ventana llamada *Stack Builder*, puedes cerrarla (no hace falta instalar nada extra).

---

## 4. Crear la Base de Datos y Cargar Datos con pgAdmin 4

Usaremos la interfaz visual de **pgAdmin 4** sin necesidad de comandos de terminal:

1. Abre el menú Inicio de Windows y busca **pgAdmin 4**.
2. Al abrir por primera vez, te pedirá una contraseña maestra para proteger pgAdmin (puedes poner la misma `sst123`).
3. En el panel izquierdo, despliega:  
   *Servers* -> haz doble clic en *PostgreSQL 16* (o 17) -> introduce la contraseña `sst123`.
4. **Crear la base de datos:**
   - Haz clic derecho sobre **Databases** -> **Create** -> **Database...**
   - En la pestaña *General*, en el campo *Database*, escribe: `sst_inspecciones`
   - Haz clic en el botón **Save**.
5. **Cargar las tablas, los 34 formatos y el usuario administrador:**
   - Haz clic derecho sobre la base de datos recién creada: `sst_inspecciones`.
   - Selecciona **Query Tool** (se abrirá un editor de texto SQL a la derecha).
   - Haz clic en el icono de la carpetita arriba para abrir archivo (**Open File**) o simplemente arrastra el archivo:
     `C:\sistema-cronogramas\migracion\datos-iniciales.sql`
   - Una vez cargado el texto SQL en la pantalla, haz clic en el botón de **Play (Execute / F5)**.
   - En la parte inferior verás el mensaje: `Query returned successfully`.
   - ¡Listo! Tu base de datos ya contiene todas las tablas, los 34 formatos CVC-SST-FT-11 y el usuario administrador.

> [!TIP]
> **Si tenías una base de datos previa en Linux con datos que quieres conservar:**
> 1. En la máquina Linux ejecuta:
>    ```bash
>    pg_dump -U admin_sst -d sst_inspecciones > respaldo_empresa.sql
>    ```
> 2. Pasa ese archivo `respaldo_empresa.sql` a Windows por USB o carpeta compartida.
> 3. En pgAdmin 4 abre el Query Tool en `sst_inspecciones`, abre el archivo `respaldo_empresa.sql` y presiona **Play (F5)**.

---

## 5. Instalación de Bun (o Node.js) en Windows

1. Abre **PowerShell** en Windows (Inicio -> busca `PowerShell`).
2. Pega y ejecuta este comando para instalar Bun automáticamente:
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
3. Cierra esa ventana de PowerShell y ábrela de nuevo para que reconozca el comando.
4. Verifica que funcione ejecutando:
   ```powershell
   bun --version
   ```
   *(Debe mostrar `1.4.0` o superior).*

---

## 6. Ubicación del Proyecto y Carpetas

Recomendamos colocar el proyecto en una ruta limpia:

1. Crea la carpeta principal: `C:\sistema-cronogramas`
2. Copia el código de la aplicación dentro de: `C:\sistema-cronogramas\app`
3. Crea la carpeta donde se almacenarán las fotos y firmas de las inspecciones:
   - `C:\sistema-cronogramas\archivos`

---

## 7. Configuración de Variables de Entorno (`.env.local`)

Dentro de `C:\sistema-cronogramas\app`, crea un archivo llamado `.env.local` con el siguiente contenido (puedes crearlo con el Bloc de Notas):

```ini
# Conexión a PostgreSQL en Windows (con la contraseña que elegiste al instalar)
DATABASE_URL="postgresql://postgres:sst123@localhost:5432/sst_inspecciones"

# Clave de seguridad para las sesiones (puedes cambiarlo por cualquier texto largo aleatorio)
SESSION_SECRET="clave_secreta_sst_cronogramas_segura_2026_xYz987654321"

# Zona horaria para el cálculo de fechas y formularios del día
TZ="America/Caracas"

# Carpeta de fotos y firmas en el disco de Windows
ARCHIVOS_DIR="C:\\sistema-cronogramas\\archivos"

# OBLIGATORIO para red local sin certificado HTTPS (permite login por http://)
COOKIE_INSEGURA="1"
```

---

## 8. Compilar la Aplicación

Antes de iniciar el sistema por primera vez, debes compilarlo:

1. Abre PowerShell y entra a la carpeta del proyecto:
   ```powershell
   cd C:\sistema-cronogramas\app
   ```
2. Instala las dependencias y compila:
   ```powershell
   bun install
   bun run build
   ```
   *(Tardará entre 30 y 60 segundos y mostrará `✓ Compiled successfully`).*

---

## 9. Habilitar el Puerto en el Firewall de Windows

Para que el Firewall de Windows no bloquee las conexiones de los teléfonos o laptops que se conecten por Wi-Fi:

1. Abre **PowerShell como Administrador** (clic derecho en el menú Inicio -> *Windows PowerShell (Administrador)*).
2. Ejecuta este comando:
   ```powershell
   New-NetFirewallRule -DisplayName "Sistema SST Cronogramas" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```
*(También puedes usar el script `scripts\abrir-firewall.bat` incluido en el proyecto).*

---

## 10. Iniciar el Sistema en Modo Producción

En PowerShell dentro de `C:\sistema-cronogramas\app`, ejecuta:

```powershell
bun run start
```

Verás un mensaje que indica:
```text
▲ Next.js 16.4.4
- Local:        http://localhost:3000
- Network:      http://192.168.1.XX:3000
✓ Ready in 200ms
```

> **Atajo rápido:** Puedes hacer doble clic en el archivo `scripts\iniciar-produccion.bat` para encenderlo sin abrir la consola manualmente.

---

## 11. Cómo Probar el Acceso desde Celulares o PCs vía Wi-Fi

1. **Averigua la IP de tu Máquina Virtual:**
   En la VM abre PowerShell y escribe:
   ```powershell
   ipconfig
   ```
   Busca la línea **Dirección IPv4**. Supongamos que dice: `192.168.1.45`.
2. **Probar desde un teléfono o laptop:**
   - Conéctate a la misma red Wi-Fi.
   - Abre Chrome, Safari o cualquier navegador.
   - Escribe en la barra de direcciones:
     ```text
     http://192.168.1.45:3000
     ```
3. **Primer inicio de sesión:**
   - **Correo:** `admin@cronogramas.local`
   - **Contraseña:** `tAgDweU4kZU4` (o la contraseña del usuario administrador que creaste).
4. **Verificaciones:**
   - Entra a **Formatos** y confirma que se ven los 34 formatos.
   - Entra a **Inspectores** para registrar a los miembros del equipo.
   - Llena una inspección de prueba y sube una foto: confirma que la foto se guarde en `C:\sistema-cronogramas\archivos`.

---

## 12. Hacer que el Sistema Arranque Solo al Encender Windows

Si la máquina virtual se apaga o se reinicia, puedes configurar para que arranque automáticamente sin tener que hacer nada:

1. Presiona `Windows + R`, escribe `shell:startup` y presiona *Enter*.
2. Se abrirá la carpeta de inicio automático de Windows.
3. Haz clic derecho dentro de esa carpeta -> **Nuevo** -> **Acceso directo**.
4. En la ubicación, selecciona el archivo:  
   `C:\sistema-cronogramas\app\scripts\iniciar-produccion.bat`
5. ¡Listo! Cada vez que la VM inicie sesión, el sistema se encenderá automáticamente en segundo plano.

---

## 13. Para la Persona de TI: Asignar Dominio y HTTPS en el Futuro

Cuando el departamento de TI de la empresa decida publicar el sistema con un dominio propio (ejemplo: `cronogramas.empresa.com`) y certificado de seguridad (HTTPS):

1. **En la red de la empresa:** La persona de TI crea el registro DNS apuntando a la IP de la VM y configura el certificado SSL en su router, firewall o proxy corporativo (Nginx/Cloudflare).
2. **En tu archivo `.env.local`:**
   - Simplemente abre `.env.local` y borra o comenta la línea:
     ```ini
     # COOKIE_INSEGURA="1"
     ```
   - Reinicia la aplicación (`iniciar-produccion.bat`).
3. Con esto, el sistema pasa inmediatamente al modo de máxima seguridad con cookies cifradas HTTPS sin tocar una sola línea de código.

# Dossier Técnico y Guía de Despliegue para el Departamento de TI / Sistemas
## Sistema de Gestión de Cronogramas e Inspecciones SST/SIHO · CEVECONCA

---

### 1. Resumen Ejecutivo de la Solución

El **Sistema de Cronogramas e Inspecciones SST/SIHO** es una plataforma web desarrollada para la digitalización, planificación y control de inspecciones de seguridad laboral y salud ocupacional.

- **Frontend / Backend:** Next.js 16.4.4 (React 19 Server & Client Components) sobre entorno de ejecución **Bun 1.4+** (alta velocidad y bajo consumo de memoria) o **Node.js LTS (v20 o v22)**.
- **Motor de Base de Datos:** PostgreSQL 16 o 17 (ORM: Drizzle ORM).
- **Almacenamiento de Evidencias:** Sistema de archivos local del servidor (fotos comprimidas en formato JPEG y firmas digitales vectoriales en PNG).
- **Acceso:** Interfaz web responsive compatible con smartphones (Chrome/Safari en Android/iOS), tablets y computadoras de escritorio conectadas a la red local corporativa o VPN.

---

### 2. Especificaciones de Infraestructura y Red

| Parámetro | Requisito Mínimo | Recomendado |
|---|---|---|
| **Sistema Operativo** | Windows Server 2016/2019/2022 o Windows 10/11 Pro (64 bits) | Windows Server 2022 / Windows 11 Pro 64 bits |
| **CPU** | 2 vCPUs (x86_64) | 4 vCPUs |
| **Memoria RAM** | 4 GB | 8 GB |
| **Almacenamiento** | 40 GB de espacio libre en disco (SSD preferido) | 100 GB (para histórico de fotos de inspecciones) |
| **Direccionamiento IP** | IP estática o reserva DHCP en el segmento de red local | IP estática con nombre DNS local (ej. `sst.empresa.local`) |
| **Puertos de Red** | **Puerto 3000 TCP Entrante** (HTTP) | Puerto 80 / 443 si se coloca un Proxy Inverso (Nginx/IIS) |

---

### 3. Origen del Código para el Servidor (¿Qué carpeta usar?)

> [!IMPORTANT]
> **Use exclusivamente el repositorio oficial de GitHub.**  
> **Repositorio:** `https://github.com/LuisAlejandroSM/sistema-cronogramas.git` (Rama: `main`)

**¿Por qué NO copiar carpetas locales ni máquinas virtuales de prueba?**
1. Las carpetas de desarrollo locales o de máquinas virtuales contienen carpetas pesadas como `node_modules` y `.next`, que pesan entre **800 MB y 1.2 GB** y contienen cientos de miles de archivos temporales que ralentizan la copia y pueden generar conflictos de compilación en el servidor final.
2. Clonar desde GitHub garantiza una instalación 100% limpia, verificada, con todos los 16 formularios migrados y sin residuos temporales (la descarga pesa menos de **10 MB**).

#### Métodos para llevar el código al servidor:
- **Si el servidor tiene acceso a Internet (Recomendado):**
  ```powershell
  git clone https://github.com/LuisAlejandroSM/sistema-cronogramas.git C:\sistema-cronogramas\app
  ```
- **Si el servidor está en una red aislada sin Internet:**
  1. En una PC con Internet, entra a `https://github.com/LuisAlejandroSM/sistema-cronogramas`.
  2. Haz clic en el botón verde **Code** -> **Download ZIP**.
  3. Pasa ese archivo ZIP por USB al servidor y extráelo en: `C:\sistema-cronogramas\app`.

---

### 4. Estructura de Directorios Recomendada en el Servidor

```text
C:\sistema-cronogramas\
├── app\                   <-- Código fuente de la aplicación (Next.js / Bun)
├── archivos\              <-- Fotos y firmas subidas en las inspecciones
└── respaldos\             <-- Copias de seguridad automáticas (Base de datos + Fotos)
```

---

### 5. Proceso de Despliegue Paso a Paso

#### Paso 1: Instalación de PostgreSQL 16 o 17
1. Descargue el instalador oficial de PostgreSQL para Windows:  
   👉 [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Durante la instalación:
   - Mantenga los componentes predeterminados: *PostgreSQL Server*, *pgAdmin 4*, *Command Line Tools*.
   - Establezca la contraseña para el superusuario `postgres` (ejemplo: `1234` o la política de seguridad corporativa).
   - Mantenga el puerto predeterminado: `5432`.
   - Configuración regional: `[Default locale]`.

#### Paso 2: Creación e Inicialización de la Base de Datos
1. Abra **pgAdmin 4** desde el menú Inicio.
2. Conéctese al servidor local de PostgreSQL.
3. Cree una nueva base de datos llamada: `cronogramas`.
4. Haga clic derecho sobre la base de datos `cronogramas` -> **Query Tool**.
5. Abra y ejecute el script SQL maestro ubicado en:
   `C:\sistema-cronogramas\app\migracion\inicializar_completo.sql`
   *(Presione F5 para ejecutar).*
   
   Este script crea:
   - Esquema completo de tablas e índices relacionales.
   - Usuario Administrador por defecto (`admin@cronogramas.local` / `admin1234`).
   - Catálogo oficial CVC-SST-FT-11 con las 34 plantillas por rol.
   - Todos los **16 formularios digitales de inspección** listos y configurados.

#### Paso 3: Instalación de Bun Runtime (Motor de Ejecución)
Abra **PowerShell** y ejecute:
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```
*(Cierre y vuelva a abrir PowerShell para que reconozca el comando `bun`).*

#### Paso 4: Despliegue Automatizado
Dentro del proyecto se incluye un asistente que realiza la configuración, instalación de dependencias, compilación y apertura del Firewall en un solo paso:

1. Abra la carpeta `C:\sistema-cronogramas\app\scripts`.
2. Haga clic derecho en **`preparar-servidor.bat`** -> **Ejecutar como administrador**.
3. El asistente le solicitará:
   - Contraseña de PostgreSQL (usuario `postgres`).
   - Nombre de base de datos (por defecto: `cronogramas`).
4. El asistente automáticamente:
   - Genera el archivo de variables `.env.local` con codificación segura.
   - Crea el directorio `C:\sistema-cronogramas\archivos`.
   - Ejecuta `bun install` y `bun run build`.
   - Sincroniza los formularios (`bun run db:cargar-formularios`).
   - Crea la regla de entrada en el Firewall de Windows para el puerto `3000`.

---

### 6. Configuración de Variables de Entorno (`.env.local`)

El archivo se encuentra en `C:\sistema-cronogramas\app\.env.local`:

```ini
# Cadena de conexión a PostgreSQL
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/cronogramas"

# Clave criptográfica para firmas de tokens de sesión
SESSION_SECRET="ceveconca-sst-sistema-cronogramas-secreto-2026-produccion"

# Zona horaria oficial para registros de auditoría y fechas
TZ="America/Caracas"

# Directorio en disco para evidencias fotográficas y firmas
ARCHIVOS_DIR="C:\\sistema-cronogramas\\archivos"

# Permite inicio de sesión en red local HTTP sin SSL (Comentar si se usa HTTPS con proxy)
COOKIE_INSEGURA="1"
```

---

### 7. Arranque Automático 24/7 (Como Servicio de Windows)

Para garantizar que el sistema se inicie automáticamente tras un reinicio del servidor sin requerir que un operador inicie sesión en el escritorio:

Ejecute el script incluido:
`C:\sistema-cronogramas\app\scripts\configurar-inicio-automatico.bat`

Seleccione la **Opción 1 (Tarea Programada)**:
- Registra una tarea de sistema en el Programador de Tareas de Windows (`Task Scheduler`).
- Disparador: Al iniciar el sistema (`At Startup`).
- Privilegios: Máximos (`RunLevel Highest`).
- Reinicio automático si el proceso se detiene.

---

### 8. Política de Copias de Seguridad (Backups)

El sistema incluye un script automatizado para realizar respaldos en caliente:
`C:\sistema-cronogramas\app\scripts\respaldar-sistema.bat`

El script genera automáticamente:
1. Volcado SQL completo de la base de datos (`cronogramas_dump.sql`).
2. Archivo ZIP con todas las fotos y firmas subidas (`archivos_adjuntos.zip`).
3. Almacena el resultado en una carpeta con fecha y hora: `C:\sistema-cronogramas\respaldos\respaldo_YYYY-MM-DD_HHMM\`.

> [!TIP]
> **Automatización:** El departamento de TI puede programar una tarea diaria en el Programador de Tareas de Windows para ejecutar `respaldar-sistema.bat` todas las noches a las 11:00 PM.

---

### 9. Credenciales Iniciales del Sistema

- **URL de Acceso:** `http://<IP_DEL_SERVIDOR>:3000`
- **Usuario Administrador:** `admin@cronogramas.local`
- **Contraseña Inicial:** `admin1234`

*(Al ingresar como administrador, el departamento de Seguridad Laboral / SST podrá dar de alta a los inspectores, supervisores y paramédicos asignándoles su nombre de usuario sin requerir correo electrónico).*

---

### 10. Opciones Avanzadas: Configurar Dominio y HTTPS (SSL)

Si la empresa cuenta con un certificado SSL corporativo (o Let's Encrypt) y desea publicar el sistema bajo un subdominio (ej: `https://sst.ceveconca.com`):

1. **Proxy Inverso (Nginx o IIS):**
   - Configurar el proxy inverso escuchando en los puertos `80` (redirección a 443) y `443` (SSL).
   - Configurar proxy pass apuntando internamente a `http://localhost:3000`.
   - Habilitar cabeceras:
     - `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
     - `proxy_set_header X-Forwarded-Proto https;`
     - `proxy_set_header Host $host;`
2. **Ajuste en la aplicación:**
   - En `C:\sistema-cronogramas\app\.env.local`, comente o elimine la línea `COOKIE_INSEGURA="1"`.
   - Reinicie el servicio. El sistema operará en modo de máxima seguridad con cookies seguras (SameSite / Secure / HttpOnly).

# GUÍA MAESTRA Y CHECKLIST DE DESPLIEGUE EN SERVIDOR
## Sistema de Gestión de Cronogramas e Inspecciones SST/SIHO · CEVECONCA

Este documento contiene en un solo lugar **todo** lo que debes llevar, configurar y verificar para montar el sistema en la laptop/servidor de la empresa mañana sin cometer ningún error ni depender de imprevistos.

---

## 🗂️ FASE 0: PREPARACIÓN HOY (EN TU COMPUTADORA)

Prepara un **Pendrive (USB)** con dos carpetas principales:

### Carpeta 1: `Instaladores`
Descarga hoy estos tres archivos en tu pendrive:
1. **PostgreSQL 16 o 17 para Windows (x86-64):**
   - Enlace oficial: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/) (clic en *Download the installer*).
2. **Git para Windows (64-bit):**
   - Enlace oficial: [https://git-scm.com/download/win](https://git-scm.com/download/win).
3. **Node.js LTS (v20 o v22) instalador `.msi` de 64 bits:**
   - Enlace oficial: [https://nodejs.org/](https://nodejs.org/).
   - *(Vital por si la laptop de la empresa no tiene acceso a Internet y no se puede descargar Bun).*

### Carpeta 2: `Proyecto`
Lleva **dos copias** en el pendrive:
- **Copia A (Limpia - Recomendada):**  
  Descarga el archivo `.zip` directo desde tu repositorio de GitHub:  
  👉 [https://github.com/LuisAlejandroSM/sistema-cronogramas](https://github.com/LuisAlejandroSM/sistema-cronogramas) (Botón verde *Code* -> *Download ZIP*).
- **Copia B (Plan B 100% Offline con dependencias ya listas):**  
  Copia la carpeta de tu proyecto local que ya tiene `node_modules` y `.next` compilados. Si la laptop de la empresa no tiene Internet para hacer `bun install`, esta copia arrancará de inmediato sin necesitar conexión.

---

## 💻 FASE 1: PREPARACIÓN DE LA LAPTOP / SERVIDOR

Antes de instalar nada, haz estos 2 ajustes en Windows de la laptop:

1. **Evitar que la laptop se suspenda o apague al cerrar la tapa:**
   - Ve a: **Panel de Control** -> **Opciones de Energía**.
   - A la izquierda haz clic en: **"Elegir el comportamiento del cierre de la tapa"**.
   - En *"Al cerrar la tapa"* selecciona: **"No hacer nada"** (tanto con batería como con corriente).
   - En *"Suspender el equipo"*: selecciona **"Nunca"**.
   - *(Esto permite que la laptop funcione como un servidor 24/7 con la tapa cerrada).*

2. **Conexión a la Red y Dirección IP:**
   - Conecta la laptop por cable Ethernet o al Wi-Fi de la empresa.
   - Abre PowerShell y escribe `ipconfig`.
   - Anota la **Dirección IPv4** (ejemplo: `192.168.1.50`).
   - **Petición para el de TI:** Pídele que le asigne una **IP fija** o haga una **reserva de DHCP** en el router para esa laptop, de modo que la dirección IP nunca cambie al reiniciarse.

---

## ⚙️ FASE 2: INSTALACIÓN DEL SOFTWARE BASE

Instala en este orden:

1. **Instalar Git:**  
   Ejecuta el instalador de Git con las opciones por defecto (Next -> Next -> Install).
2. **Instalar PostgreSQL:**  
   - Ejecuta el instalador.
   - Deja marcados: *PostgreSQL Server*, *pgAdmin 4*, *Command Line Tools*.
   - **Contraseña:** Pon una sencilla que anotes bien (ejemplo: `1234` o la que indique TI).
   - **Puerto:** `5432`.
   - Finaliza la instalación.
3. **Instalar Bun (o Node.js):**  
   - Si la laptop tiene Internet, abre PowerShell y ejecuta:
     ```powershell
     powershell -c "irm bun.sh/install.ps1 | iex"
     ```
   - Si no tiene Internet, ejecuta el instalador `.msi` de Node.js que trajiste en el pendrive.

---

## 📁 FASE 3: UBICAR EL PROYECTO Y CARGAR LA BASE DE DATOS

1. **Copiar el Proyecto:**
   - En el disco local `C:\`, crea la carpeta: `C:\sistema-cronogramas`
   - Dentro de ella, coloca el código del sistema en: `C:\sistema-cronogramas\app`
   - *(O si la laptop tiene Internet y Git, simplemente abre PowerShell y corre:)*
     ```powershell
     git clone https://github.com/LuisAlejandroSM/sistema-cronogramas.git C:\sistema-cronogramas\app
     ```

2. **Inicializar la Base de Datos con pgAdmin 4:**
   - Abre **pgAdmin 4** desde el menú Inicio.
   - Introduce la contraseña maestra de pgAdmin e ingresa a tu servidor local.
   - Haz clic derecho sobre **Databases** -> **Create** -> **Database...**
   - Nombre de la base de datos: `cronogramas` (clic en *Save*).
   - Haz clic derecho sobre la base de datos `cronogramas` -> **Query Tool**.
   - Haz clic en el icono de abrir archivo (o presiona `Ctrl + O`) y selecciona el archivo:
     `C:\sistema-cronogramas\app\migracion\inicializar_completo.sql`
   - Presiona **F5** (o el botón de Play).
   - Verás el mensaje: `Query returned successfully`.
   - *(¡Listo! Esto crea todas las tablas, el usuario admin, el catálogo de 34 formatos y los 16 formularios digitales).*

---

## 🚀 FASE 4: EJECUTAR EL ASISTENTE AUTOMATIZADO

Ya dejamos un script que hace todo lo demás con un solo clic:

1. Entra en `C:\sistema-cronogramas\app\scripts`.
2. Haz clic derecho sobre **`preparar-servidor.bat`** -> **"Ejecutar como Administrador"**.
3. El asistente te preguntará:
   - Contraseña de PostgreSQL (escribe la que pusiste en el paso anterior, ej: `1234`).
   - Nombre de la BD (presiona *Enter* para aceptar `cronogramas`).
4. El script automáticamente:
   - Crea `C:\sistema-cronogramas\archivos` (para fotos y firmas).
   - Genera el archivo de variables `.env.local`.
   - Instala librerías y compila el proyecto Next.js.
   - Carga y valida los 16 formularios en PostgreSQL.
   - Habilita el puerto `3000` en el Firewall de Windows para que los teléfonos puedan entrar.

---

## 🔄 FASE 5: CONFIGURAR INICIO AUTOMÁTICO (24/7)

Para que el servidor arranque solo si la laptop se reinicia y nadie tenga que abrir una consola:

1. En la carpeta `scripts\`, haz doble clic sobre:
   **`configurar-inicio-automatico.bat`**
2. Presiona el número **`1`** (Tarea Programada de Windows).
3. ¡Listo! El sistema queda registrado como servicio en segundo plano que arranca con Windows.

---

## ✅ FASE 6: CHECKLIST DE VERIFICACIÓN (5 MINUTOS)

Haz estas 5 pruebas en orden para comprobar que todo está perfecto:

- [ ] **Prueba 1: En la misma laptop (Navegador local)**
  Abre Chrome o Edge y entra a: `http://localhost:3000`. Debe cargar la pantalla azul de login de Ceveconca.
- [ ] **Prueba 2: Inicio de sesión del Administrador**
  - **Usuario:** `admin@cronogramas.local`
  - **Contraseña:** `admin1234`
  - Comprueba que entras al Panel de Control (Dashboard).
- [ ] **Prueba 3: Comprobar los 16 Formularios**
  Entra a `http://localhost:3000/formularios` y verifica que aparezcan listados los 16 formularios migrados.
- [ ] **Prueba 4: Crear un Inspector de Prueba**
  - Ve a **Inspectores** (`/inspectores`).
  - Crea un usuario: por ejemplo Alias `inspector1`, Nombre `Juan Pérez`, Rol `Inspector SIHO`.
  - Verifica que solo te pida Nombre de Usuario (sin pedir correo).
- [ ] **Prueba 5: Prueba desde un Teléfono Celular vía Wi-Fi**
  - Conecta tu teléfono celular a la misma red Wi-Fi de la empresa.
  - Abre el navegador del teléfono y escribe la IP de la laptop:
    `http://192.168.X.X:3000` (la IP que anotaste en la Fase 1).
  - Inicia sesión con el inspector recién creado (`inspector1`).
  - Abre una inspección asignada, firma en la pantalla con el dedo, adjunta una foto de prueba y dale a **Enviar**.
  - En la laptop, revisa la carpeta `C:\sistema-cronogramas\archivos` y confirma que la foto y la firma se guardaron.

---

## 🛡️ FASE 7: PREGUNTAS FRECUENTES DEL ENCARGADO DE TI

Ten estas respuestas claras por si el de TI te pregunta:

| Pregunta del encargado de TI | Respuesta precisa |
|---|---|
| **"¿Por qué no usamos Apache o XAMPP?"** | *"El sistema no es PHP, está construido en Next.js (React moderno) y corre sobre Bun/Node.js en el puerto 3000. Ya lo dejamos configurado como tarea/servicio de Windows para que arranque en segundo plano sin consola. Si la empresa desea usar Apache o IIS, se puede configurar como Proxy Inverso apuntando a localhost:3000."* |
| **"¿Dónde se guardan las fotos de las inspecciones?"** | *"En disco en `C:\sistema-cronogramas\archivos`, optimizadas y comprimidas para no llenar el almacenamiento."* |
| **"¿Cómo se respaldan los datos?"** | *"Ya creamos el script `scripts\respaldar-sistema.bat`. Con un solo clic genera un archivo `.sql` de la base de datos y un `.zip` con todas las fotos en `C:\sistema-cronogramas\respaldos`."* |
| **"¿Se puede poner con dominio corporativo y HTTPS?"** | *"Sí, en `docs\PLAN_DESPLIEGUE_IT.md` sección 10 están los pasos para colocarle Nginx/IIS con certificado SSL sin tocar el código fuente."* |
| **"¿Cómo se actualiza el sistema en el futuro?"** | *"Solo entras a `C:\sistema-cronogramas\app` y ejecutas `git pull` y `bun run build`."* |

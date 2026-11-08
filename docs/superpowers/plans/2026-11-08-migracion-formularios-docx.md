# Plan de Implementación: Migración de Formularios Word (.docx) al Sistema SST/SIHO

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar los 15 documentos de inspección en formato `.docx` restantes al catálogo de formularios digitales del sistema, permitiendo que queden asignables a los inspectores correspondientes.

**Architecture:** Crear un script especializado en Python/Node que analice la estructura XML de cada documento Word (secciones, tablas de fluidos/mecánicas, verificaciones B/M/N/A y SI/NO, campos de texto, firmas y fotos), genere la estructura de campos JSONB compatible con `modules/formularios/campos.js`, asigne el rol y código respectivo, e inserte los formularios en PostgreSQL.

**Tech Stack:** Python (zipfile / xml.etree), Node.js / Bun, PostgreSQL (Drizzle / SQL), Next.js 16.

---

### Task 1: Extracción y Mapeo de Documentos .docx a JSONB

- [x] **Step 1:** Crear `scripts/analizar_docx.py` para inspeccionar la estructura interna, tablas y secciones de los 15 documentos `.docx`.
- [x] **Step 2:** Diseñar el conversor de tablas de verificación para estandarizar ítems con columnas `["B", "M", "N/A"]` o `["SI", "NO"]` según cada formato.
- [x] **Step 3:** Mapear cada formulario a su rol (`Inspector SIHO`, `Paramédico`, `Rescatista`) y su correspondiente `plantilla_id` de la tabla `plantillas_inspeccion`.
- [x] **Step 4:** Generar el archivo de datos estructurados `migracion/formularios_migrados.json` y `db/data/formularios-migrados.json`.

---

### Task 2: Inserción en la Base de Datos y Actualización del Catálogo

- [x] **Step 1:** Crear el script de carga `scripts/cargar-formularios.js` (ejecutable con `bun run db:cargar-formularios`) que inserte o actualice cada formulario en la tabla `formularios`.
- [x] **Step 2:** Actualizar el archivo `migracion/inicializar_completo.sql` para que incluya todos los formularios recién migrados, asegurando que nuevas instalaciones en otras VMs (como la de la empresa) tengan los formularios listos desde el primer día.

---

### Task 3: Verificación y Despliegue

- [x] **Step 1:** Ejecutar `scripts/cargar-formularios.js` / verificar validación con `normalizarCampos`.
- [ ] **Step 2:** Sincronizar cambios en GitHub (`git push origin main`) y correr `git pull` y `bun run db:cargar-formularios` en el servidor/VM.
- [ ] **Step 3:** Verificar en la interfaz web (`/formularios`) los 16 formularios disponibles y asignables.

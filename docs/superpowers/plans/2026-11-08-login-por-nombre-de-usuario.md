# Implementación: Registro e Inicio de Sesión por Nombre de Usuario

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que los nuevos usuarios se registren e inicien sesión únicamente con un nombre de usuario (alias), manteniendo el soporte de inicio de sesión por correo para el administrador existente.

**Architecture:** Aprovechar la columna existente `alias` (varchar 50, UNIQUE) en la tabla `usuarios` como el nombre de usuario. Modificar la acción de inicio de sesión para buscar por `lower(alias)` O `lower(correo)`, actualizar el formulario de login para admitir texto plano (no solo formato email) y actualizar la vista y Server Action de registro de inspectores para solicitar `usuario` en vez de `correo`.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM, PostgreSQL, Bun, Tailwind CSS.

---

### Task 1: Autenticación con soporte dual (Usuario o Correo)

**Files to modify:**
- `modules/auth/actions.js`
- `modules/auth/components/FormularioLogin.jsx`
- `app/login/page.jsx`

- [ ] **Step 1:** Modificar `modules/auth/actions.js` para leer `identificador` (o compatibilidad con `correo`/`usuario`) desde `formData`.
- [ ] **Step 2:** Actualizar la consulta Drizzle en `iniciarSesion` utilizando `or(eq(sql`lower(${usuarios.alias})`, idLimpio), eq(sql`lower(${usuarios.correo})`, idLimpio))`.
- [ ] **Step 3:** Actualizar `modules/auth/components/FormularioLogin.jsx` cambiando el campo a `type="text"`, `name="identificador"`, y etiqueta `"Usuario o correo"`.
- [ ] **Step 4:** Actualizar la descripción en `app/login/page.jsx` ("Ingrese con su usuario o correo y contraseña...").
- [ ] **Step 5:** Probar que el login siga funcionando para el admin con `admin@cronogramas.local` y `admin1234`.

---

### Task 2: Registro de Inspectores con Nombre de Usuario

**Files to modify:**
- `modules/usuarios/actions.js`
- `modules/usuarios/queries.js`
- `modules/usuarios/components/GestionInspectores.jsx`

- [ ] **Step 1:** Actualizar `modules/usuarios/queries.js` para incluir `alias: usuarios.alias` en la selección de inspectores.
- [ ] **Step 2:** Modificar `crearInspector` en `modules/usuarios/actions.js`:
  - Recibir `usuario` (nombre de usuario) en vez de requerir `correo`.
  - Validar que tenga mínimo 3 caracteres, sin espacios, alfanumérico con guiones/puntos (`/^[a-zA-Z0-9._-]+$/`).
  - Insertar `alias: usuario.toLowerCase()` y `correo: null` (o opcional).
  - Manejar el error de duplicado (código 23505) con el mensaje `"Ya existe un usuario con ese nombre de usuario."`.
- [ ] **Step 3:** Modificar `modules/usuarios/components/GestionInspectores.jsx`:
  - En el modal de registro: reemplazar el campo `Correo` por `Nombre de usuario *` (placeholder `ej. cperez`).
  - En la tarjeta de clave temporal `ClaveTemporal`: mostrar `Usuario: {datos.usuario}` y copiarlo al portapapeles.
  - En la tabla de inspectores: cambiar el encabezado de columna de `"Correo"` a `"Usuario"` y renderizar `u.alias || u.correo || "—"`.

---

### Task 3: Verificación Integral y Pruebas

- [ ] **Step 1:** Ejecutar una prueba automatizada con Bun para validar creación de usuario con alias y login por alias.
- [ ] **Step 2:** Ejecutar `bun run build` para garantizar que no existan errores de compilación ni tipos rotos.
- [ ] **Step 3:** Comprobar en el navegador el registro de un nuevo inspector y probar el login con su nuevo usuario y contraseña temporal.

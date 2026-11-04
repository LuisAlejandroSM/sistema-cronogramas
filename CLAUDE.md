# Directivas del Proyecto: Sistema de Cronogramas SST/SIHO

## Arquitectura y Estructura
- **Monolito Modular:**
  - La lógica de negocio se organiza por dominios en la carpeta `modules/` (`modules/cronogramas`, `modules/usuarios`, `modules/plantillas`).
  - Cada módulo encapsula sus propios Server Actions (`actions.js`), consultas de base de datos (`queries.js`) y componentes de interfaz (`components/`).
  - La carpeta `app/` se limita a definir las rutas y ensamblar los componentes de los módulos.
  - La persistencia e infraestructura global reside en `db/` (`schema.js`, `index.js`).

## Reglas de Código y Framework
- **full-output-enforcement:**
  - Prohibido utilizar comentarios de omisión o código truncado como `// resto del código continúa igual`. Entrega siempre los componentes y archivos completos.
- **react-nextjs-best-practices:**
  - Utiliza Server Components por defecto para vistas de lectura y carga de datos.
  - Reserva `'use client'` estrictamente para componentes interactivos (matriz de cronograma, celdas de registro P/E, toggles y filtros).
  - Mantén el código exclusivamente en JavaScript estándar (ES6+ / JSX). Prohibido utilizar TypeScript.
  - Asegura compatibilidad con el runtime y gestor de paquetes Bun.
  - Verifica las rutas de importación relativas o alias configurados para evitar errores de resolución de módulos.

## Base de Datos y Persistencia
- **Drizzle ORM & PostgreSQL:**
  - Conexión configurada en `db/index.js` mediante `drizzle-orm/node-postgres` sobre un pool de `pg`.
  - Leer siempre las credenciales desde `process.env.DATABASE_URL` (definida en `.env.local`).
  - Esquema declarado en `db/schema.js`.
  - Consultas y Server Actions deben utilizar sintaxis nativa de Drizzle (`db.select()`, `db.insert().onConflictDoUpdate()`).
  - En caso de consultas SQL en bruto con `sql`, usar siempre parámetros enlazados para evitar inyecciones SQL.

## Estándares de Diseño y UI
- **refactoring-ui & b2b-dashboard:**
  - Interfaz orientada a productividad operativa en campo y oficina técnica con Tailwind CSS.
  - Alta densidad de información controlada: matrices compactas pero legibles para cronogramas mensuales de 31 días.
  - Distinción visual clara entre filas de Planificación (P) y Ejecución (E).
  - Indicadores inmediatos de porcentaje de cumplimiento mensual y estados de guardado.
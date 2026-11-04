# Sistema de Cronogramas SST/SIHO · Ceveconca

Planificación y control de las inspecciones preventivas (formato **CVC-SST-FT-11**): cronogramas
mensuales P/E por rol e inspector, dashboard de cumplimiento y formularios digitales (listas de
verificación, fotos y firma) que se asignan solos desde el cronograma.

**Stack:** Next.js 16 · React 19 · Bun 1.4 · Drizzle ORM · PostgreSQL 18 · Tailwind CSS 4.

## Desarrollo local

```bash
cp .env.example .env.local      # completar DATABASE_URL y SESSION_SECRET
bun install
bun run db:migrate              # crea la estructura de la base de datos
bun run db:seed                 # catálogo de formatos (CVC-SST-FT-11)
bun run db:crear-admin          # primer administrador (ADMIN_* en .env.local)
bun dev                         # http://localhost:3000
```

## Comandos

| Comando | Para qué |
|---|---|
| `bun dev` | Servidor de desarrollo |
| `bun run build` / `bun run start` | Compilar y ejecutar en producción |
| `bun run lint` | Revisar el código |
| `bun run db:generate` | Crear una migración nueva después de cambiar `db/schema.js` |
| `bun run db:migrate` | Aplicar las migraciones pendientes |
| `bun run db:seed` | Cargar o actualizar el catálogo de formatos |
| `bun run db:crear-admin` | Crear o restablecer el administrador inicial |

## Estructura

- `app/` rutas de la aplicación.
- `modules/` lógica por dominio: `auth`, `cronogramas`, `dashboard`, `formularios`, `plantillas`, `usuarios`.
- `db/` esquema (`schema.js`), conexión y scripts de datos.
- `drizzle/` migraciones de la base de datos (versionadas).

## Instalación en servidor

Ver [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

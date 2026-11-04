import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL no está definida. Revisa el archivo .env.local en la raíz del proyecto."
  );
}

function crearPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  // Un cliente inactivo que pierde la conexión (p. ej. reinicio de PostgreSQL en WSL2)
  // emite 'error'. Sin este listener el proceso de Next.js se cae.
  pool.on("error", (err) => {
    console.error("[db] Error inesperado en un cliente inactivo del pool:", err.message);
  });

  return pool;
}

// En desarrollo, el HMR re-evalúa los módulos en cada cambio. Guardar el pool en
// globalThis evita abrir un pool nuevo (y agotar conexiones) en cada recarga.
const globalParaDb = globalThis;

const pool = globalParaDb.__sstPool ?? crearPool();

if (process.env.NODE_ENV !== "production") {
  globalParaDb.__sstPool = pool;
}

export const db = drizzle(pool, { schema });

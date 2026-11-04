// Siembra el catálogo oficial CVC-SST-FT-11 extraído del Excel (db/data/cvc-sst-ft-11.js).
// Solo crea el catálogo de formatos por rol. Los inspectores y sus cronogramas se crean
// desde la aplicación (/inspectores y el generador de cronogramas).
// Es idempotente: UPSERT por (rol, orden), se puede ejecutar varias veces sin duplicar datos.
// Uso: bun run db/seed.js

import { sql } from "drizzle-orm";
import { db } from "./index.js";
import { plantillasInspeccion } from "./schema.js";
import { PLANTILLAS_POR_ROL } from "./data/cvc-sst-ft-11.js";

async function sembrarPlantillas() {
  const filas = Object.entries(PLANTILLAS_POR_ROL).flatMap(([rol, items]) =>
    items.map((p) => ({
      rol,
      orden: p.orden,
      numero: p.numero,
      elementoNombre: p.elementoNombre,
      cantidadPlanificada: p.cantidadPlanificada,
      periodicidad: p.periodicidad,
      codigoFormato: p.codigoFormato,
      activo: true,
    }))
  );

  await db
    .insert(plantillasInspeccion)
    .values(filas)
    .onConflictDoUpdate({
      target: [plantillasInspeccion.rol, plantillasInspeccion.orden],
      set: {
        numero: sql`excluded.numero`,
        elementoNombre: sql`excluded.elemento_nombre`,
        cantidadPlanificada: sql`excluded.cantidad_planificada`,
        periodicidad: sql`excluded.periodicidad`,
        codigoFormato: sql`excluded.codigo_formato`,
        activo: true,
      },
    });
}

async function seed() {
  console.log("Sembrando catálogo CVC-SST-FT-11...");

  await sembrarPlantillas();
  for (const [rol, items] of Object.entries(PLANTILLAS_POR_ROL)) {
    console.log(`  Plantillas ${rol}: ${items.length}`);
  }

  console.log("¡Catálogo sembrado con éxito! Cree los inspectores en /inspectores.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error al sembrar:", err);
    process.exit(1);
  });

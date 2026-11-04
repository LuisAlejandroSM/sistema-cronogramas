import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ROL_GENERAL, ROLES_PLANTILLA } from "@/db/roles";
import { plantillasInspeccion } from "@/db/schema";

const columnas = {
  id: plantillasInspeccion.id,
  numero: plantillasInspeccion.numero,
  orden: plantillasInspeccion.orden,
  codigoFormato: plantillasInspeccion.codigoFormato,
  elementoNombre: plantillasInspeccion.elementoNombre,
  rol: plantillasInspeccion.rol,
  periodicidad: plantillasInspeccion.periodicidad,
  cantidadPlanificada: plantillasInspeccion.cantidadPlanificada,
  activo: plantillasInspeccion.activo,
};

// Orden de presentación de los roles en el catálogo completo (sigue ROLES_PLANTILLA).
// CASE con parámetros enlazados: CASE rol WHEN $1 THEN 0 WHEN $2 THEN 1 ... END
const ordenRol = sql`case ${plantillasInspeccion.rol} ${sql.join(
  ROLES_PLANTILLA.map((rol, i) => sql`when ${rol} then ${i}`),
  sql` `
)} else ${ROLES_PLANTILLA.length} end`;

/**
 * Catálogo de formatos activos.
 * - Con `rol`: formatos de ese rol + los marcados como "General" (comunes a todos).
 * - Sin `rol`: catálogo completo, ordenado por rol.
 */
export async function obtenerPlantillas({ rol = null } = {}) {
  const filtroRol = rol ? inArray(plantillasInspeccion.rol, [rol, ROL_GENERAL]) : undefined;
  return db
    .select(columnas)
    .from(plantillasInspeccion)
    .where(and(eq(plantillasInspeccion.activo, true), filtroRol))
    .orderBy(ordenRol, asc(plantillasInspeccion.orden));
}

// IDs de plantillas válidas para un rol (usado para validar el Server Action).
// Incluye las eliminadas: sus filas siguen visibles en los meses donde tienen registros.
export async function obtenerIdsPlantillasDeRol(rol) {
  const filas = await db
    .select({ id: plantillasInspeccion.id })
    .from(plantillasInspeccion)
    .where(inArray(plantillasInspeccion.rol, [rol, ROL_GENERAL]));
  return new Set(filas.map((f) => f.id));
}

/**
 * Agrega a la lista de formatos activos los eliminados (activo = false) que tienen registros
 * en los datos mostrados, para que el historial de ese mes siga visible y cuadre con los totales.
 * @param {object[]} plantillas formatos activos (obtenerPlantillas)
 * @param {{ plantillaId: string }[]} registros registros del mes que se muestra
 */
export async function completarConEliminadas(plantillas, registros) {
  const activos = new Set(plantillas.map((p) => p.id));
  const faltan = [...new Set(registros.map((r) => r.plantillaId))].filter((id) => !activos.has(id));
  if (faltan.length === 0) return plantillas;
  const eliminadas = await db
    .select(columnas)
    .from(plantillasInspeccion)
    .where(and(inArray(plantillasInspeccion.id, faltan), eq(plantillasInspeccion.activo, false)))
    .orderBy(ordenRol, asc(plantillasInspeccion.orden));
  return [...plantillas, ...eliminadas];
}

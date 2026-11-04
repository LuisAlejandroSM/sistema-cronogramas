import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ROLES_OPERATIVOS } from "@/db/roles";
import { registrosCronograma, usuarios } from "@/db/schema";

// Registros de la matriz de un inspector individual (vista editable).
export async function obtenerRegistrosUsuario({ usuarioId, mes, anio }) {
  return db
    .select({
      plantillaId: registrosCronograma.plantillaId,
      fecha: registrosCronograma.fecha,
      planificado: registrosCronograma.planificado,
      ejecutado: registrosCronograma.ejecutado,
      noEjecutado: registrosCronograma.noEjecutado,
      observacion: registrosCronograma.observacion,
    })
    .from(registrosCronograma)
    .where(
      and(
        eq(registrosCronograma.usuarioId, usuarioId),
        eq(registrosCronograma.mes, mes),
        eq(registrosCronograma.anio, anio)
      )
    );
}

/**
 * Registros consolidados (suma de todos los inspectores) por plantilla y día.
 * - Con `rol`: solo inspectores de ese rol.
 * - Sin `rol`: todos los roles operativos.
 * Devuelve la misma forma que obtenerRegistrosUsuario para reutilizar la matriz.
 */
export async function obtenerRegistrosConsolidados({ rol = null, mes, anio }) {
  const filtroRol = rol ? eq(usuarios.rol, rol) : inArray(usuarios.rol, ROLES_OPERATIVOS);

  return db
    .select({
      plantillaId: registrosCronograma.plantillaId,
      fecha: registrosCronograma.fecha,
      planificado: sql`coalesce(sum(${registrosCronograma.planificado}), 0)`.mapWith(Number),
      ejecutado: sql`coalesce(sum(${registrosCronograma.ejecutado}), 0)`.mapWith(Number),
      noEjecutado: sql`coalesce(sum(${registrosCronograma.noEjecutado}), 0)`.mapWith(Number),
    })
    .from(registrosCronograma)
    .innerJoin(usuarios, eq(usuarios.id, registrosCronograma.usuarioId))
    .where(
      and(
        eq(registrosCronograma.mes, mes),
        eq(registrosCronograma.anio, anio),
        eq(usuarios.activo, true),
        filtroRol
      )
    )
    .groupBy(registrosCronograma.plantillaId, registrosCronograma.fecha);
}

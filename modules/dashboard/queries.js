import "server-only";

import { and, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { ROLES_OPERATIVOS } from "@/db/roles";
import { plantillasInspeccion, registrosCronograma, usuarios } from "@/db/schema";

function filtroRol(rol) {
  return rol ? eq(usuarios.rol, rol) : inArray(usuarios.rol, ROLES_OPERATIVOS);
}

/**
 * Detalle de todos los registros del mes (una fila por inspector + formato + día),
 * con los datos del inspector y del formato. Base de todas las métricas del dashboard.
 * Con `usuarioId` se limita a un solo inspector (resumen de "Mi cronograma").
 */
export async function obtenerDetalleMes({ mes, anio, rol = null, usuarioId = null }) {
  return db
    .select({
      usuarioId: registrosCronograma.usuarioId,
      nombre: usuarios.nombre,
      rol: usuarios.rol,
      plantillaId: registrosCronograma.plantillaId,
      elemento: plantillasInspeccion.elementoNombre,
      codigo: plantillasInspeccion.codigoFormato,
      fecha: registrosCronograma.fecha,
      planificado: registrosCronograma.planificado,
      ejecutado: registrosCronograma.ejecutado,
      noEjecutado: registrosCronograma.noEjecutado,
      observacion: registrosCronograma.observacion,
      periodicidad: plantillasInspeccion.periodicidad,
      orden: plantillasInspeccion.orden,
    })
    .from(registrosCronograma)
    .innerJoin(usuarios, eq(usuarios.id, registrosCronograma.usuarioId))
    .innerJoin(plantillasInspeccion, eq(plantillasInspeccion.id, registrosCronograma.plantillaId))
    .where(
      and(
        eq(registrosCronograma.mes, mes),
        eq(registrosCronograma.anio, anio),
        eq(usuarios.activo, true),
        filtroRol(rol),
        usuarioId ? eq(registrosCronograma.usuarioId, usuarioId) : undefined
      )
    );
}

/** Últimas observaciones registradas por los inspectores en el mes (más recientes primero). */
export async function obtenerObservacionesRecientes({ mes, anio, rol = null, limite = 10 }) {
  return db
    .select({
      inspector: usuarios.nombre,
      elemento: plantillasInspeccion.elementoNombre,
      codigo: plantillasInspeccion.codigoFormato,
      fecha: registrosCronograma.fecha,
      ejecutado: registrosCronograma.ejecutado,
      noEjecutado: registrosCronograma.noEjecutado,
      observacion: registrosCronograma.observacion,
    })
    .from(registrosCronograma)
    .innerJoin(usuarios, eq(usuarios.id, registrosCronograma.usuarioId))
    .innerJoin(plantillasInspeccion, eq(plantillasInspeccion.id, registrosCronograma.plantillaId))
    .where(
      and(
        eq(registrosCronograma.mes, mes),
        eq(registrosCronograma.anio, anio),
        isNotNull(registrosCronograma.observacion),
        eq(usuarios.activo, true),
        filtroRol(rol)
      )
    )
    .orderBy(desc(registrosCronograma.actualizadoEn))
    .limit(limite);
}

/**
 * Totales de planificadas y ejecutadas para varios meses (tendencia).
 * @param {{ periodos: { mes: string, anio: number }[], rol?: string|null }} p
 */
export async function obtenerTotalesPorMes({ periodos, rol = null }) {
  if (periodos.length === 0) return [];
  return db
    .select({
      mes: registrosCronograma.mes,
      anio: registrosCronograma.anio,
      planificadas: sql`coalesce(sum(${registrosCronograma.planificado}), 0)`.mapWith(Number),
      ejecutadas: sql`coalesce(sum(${registrosCronograma.ejecutado}), 0)`.mapWith(Number),
    })
    .from(registrosCronograma)
    .innerJoin(usuarios, eq(usuarios.id, registrosCronograma.usuarioId))
    .where(
      and(
        or(
          ...periodos.map((p) =>
            and(eq(registrosCronograma.mes, p.mes), eq(registrosCronograma.anio, p.anio))
          )
        ),
        eq(usuarios.activo, true),
        filtroRol(rol)
      )
    )
    .groupBy(registrosCronograma.mes, registrosCronograma.anio);
}

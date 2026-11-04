import "server-only";

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { archivosFormulario, asignacionesFormulario, formularios, registrosCronograma, usuarios } from "@/db/schema";
import { borrarArchivo } from "./almacenamiento";
import { hoyISO } from "./fechas";

/**
 * Mantiene las asignaciones de origen "cronograma" alineadas con las "P" del cronograma.
 *
 * Regla: si un formulario activo está vinculado a un formato (plantillaId), cada "P" de ese
 * formato en el cronograma de un inspector activo del mismo rol, de HOY en adelante, tiene una
 * asignación del formulario con fecha límite ese día. Las asignaciones pendientes generadas así
 * se borran cuando dejan de corresponder (se quitó la P, se marcó "N", se desvinculó o archivó
 * el formulario, cambió el rol). Las ya enviadas nunca se tocan.
 *
 * Alcance opcional para no recorrer todo: { formularioId } o { usuarioId, mes, anio }.
 * @returns {Promise<{ creadas: number, eliminadas: number }>}
 */
export async function sincronizarAsignacionesCronograma({ formularioId = null, usuarioId = null, mes = null, anio = null, asignadoPor = null } = {}) {
  // 1. Pendientes automáticas que ya no corresponden.
  const actuales = await db
    .select({
      id: asignacionesFormulario.id,
      registroId: asignacionesFormulario.registroId,
      formularioActivo: formularios.activo,
      formularioPlantilla: formularios.plantillaId,
      formularioRol: formularios.rol,
      usuarioRol: usuarios.rol,
      registroPlantilla: registrosCronograma.plantillaId,
      planificado: registrosCronograma.planificado,
      noEjecutado: registrosCronograma.noEjecutado,
    })
    .from(asignacionesFormulario)
    .innerJoin(formularios, eq(formularios.id, asignacionesFormulario.formularioId))
    .innerJoin(usuarios, eq(usuarios.id, asignacionesFormulario.usuarioId))
    .leftJoin(registrosCronograma, eq(registrosCronograma.id, asignacionesFormulario.registroId))
    .where(
      and(
        eq(asignacionesFormulario.origen, "cronograma"),
        eq(asignacionesFormulario.estado, "pendiente"),
        formularioId ? eq(asignacionesFormulario.formularioId, formularioId) : undefined,
        usuarioId ? eq(asignacionesFormulario.usuarioId, usuarioId) : undefined
      )
    );

  const sobran = actuales
    .filter(
      (a) =>
        !a.registroId ||
        !a.formularioActivo ||
        a.formularioPlantilla !== a.registroPlantilla ||
        a.planificado !== 1 ||
        a.noEjecutado > 0 ||
        a.formularioRol !== a.usuarioRol
    )
    .map((a) => a.id);

  let eliminadas = 0;
  if (sobran.length > 0) {
    const fotos = await db
      .select({ ruta: archivosFormulario.ruta })
      .from(archivosFormulario)
      .where(inArray(archivosFormulario.asignacionId, sobran));
    const borradas = await db
      .delete(asignacionesFormulario)
      .where(and(inArray(asignacionesFormulario.id, sobran), eq(asignacionesFormulario.estado, "pendiente")))
      .returning({ id: asignacionesFormulario.id });
    eliminadas = borradas.length;
    await Promise.all(fotos.map((f) => borrarArchivo(f.ruta)));
  }

  // 2. "P" de hoy en adelante que aún no tienen su asignación.
  const faltan = await db
    .select({
      formularioId: formularios.id,
      usuarioId: registrosCronograma.usuarioId,
      registroId: registrosCronograma.id,
      fecha: registrosCronograma.fecha,
    })
    .from(registrosCronograma)
    .innerJoin(formularios, eq(formularios.plantillaId, registrosCronograma.plantillaId))
    .innerJoin(usuarios, eq(usuarios.id, registrosCronograma.usuarioId))
    .where(
      and(
        eq(registrosCronograma.planificado, 1),
        eq(registrosCronograma.noEjecutado, 0),
        gte(registrosCronograma.fecha, hoyISO()),
        eq(formularios.activo, true),
        eq(usuarios.activo, true),
        eq(usuarios.rol, formularios.rol),
        sql`not exists (select 1 from ${asignacionesFormulario} where ${asignacionesFormulario.registroId} = ${registrosCronograma.id})`,
        formularioId ? eq(formularios.id, formularioId) : undefined,
        usuarioId ? eq(registrosCronograma.usuarioId, usuarioId) : undefined,
        mes ? eq(registrosCronograma.mes, mes) : undefined,
        anio ? eq(registrosCronograma.anio, anio) : undefined
      )
    );

  let creadas = 0;
  for (let i = 0; i < faltan.length; i += 500) {
    const insertadas = await db
      .insert(asignacionesFormulario)
      .values(
        faltan.slice(i, i + 500).map((f) => ({
          formularioId: f.formularioId,
          usuarioId: f.usuarioId,
          registroId: f.registroId,
          fechaLimite: f.fecha,
          origen: "cronograma",
          asignadoPor,
        }))
      )
      .onConflictDoNothing()
      .returning({ id: asignacionesFormulario.id });
    creadas += insertadas.length;
  }

  if (creadas || eliminadas) {
    revalidatePath("/mis-formularios");
    revalidatePath("/formularios", "layout");
  }
  return { creadas, eliminadas };
}

/** Igual que la anterior, pero un error se registra y no interrumpe la acción que la llamó. */
export async function sincronizarSinInterrumpir(alcance) {
  try {
    return await sincronizarAsignacionesCronograma(alcance);
  } catch (error) {
    console.error("[formularios] No se pudieron sincronizar las asignaciones del cronograma:", error);
    return { creadas: 0, eliminadas: 0 };
  }
}

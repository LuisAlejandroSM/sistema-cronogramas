import "server-only";

import { and, asc, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  archivosFormulario,
  asignacionesFormulario,
  formularios,
  plantillasInspeccion,
  registrosCronograma,
  respuestasFormulario,
  usuarios,
} from "@/db/schema";
import { hoyISO } from "./fechas";

/** Formularios con conteo de preguntas y asignaciones (pantalla del administrador). */
export async function listarFormularios() {
  return db
    .select({
      id: formularios.id,
      titulo: formularios.titulo,
      descripcion: formularios.descripcion,
      codigo: formularios.codigo,
      rol: formularios.rol,
      formato: plantillasInspeccion.codigoFormato,
      formatoNombre: plantillasInspeccion.elementoNombre,
      activo: formularios.activo,
      campos: formularios.campos,
      actualizadoEn: formularios.actualizadoEn,
      pendientes: sql`count(${asignacionesFormulario.id}) filter (where ${asignacionesFormulario.estado} = 'pendiente')`.mapWith(Number),
      completadas: sql`count(${asignacionesFormulario.id}) filter (where ${asignacionesFormulario.estado} = 'completada')`.mapWith(Number),
    })
    .from(formularios)
    .leftJoin(asignacionesFormulario, eq(asignacionesFormulario.formularioId, formularios.id))
    .leftJoin(plantillasInspeccion, eq(plantillasInspeccion.id, formularios.plantillaId))
    .groupBy(formularios.id, plantillasInspeccion.id)
    .orderBy(desc(formularios.activo), desc(formularios.actualizadoEn));
}

export async function obtenerFormulario(id) {
  const [formulario] = await db.select().from(formularios).where(eq(formularios.id, id)).limit(1);
  return formulario ?? null;
}

/** Asignaciones de un formulario con el inspector y si ya respondió. */
export async function listarAsignacionesDeFormulario(formularioId) {
  return db
    .select({
      id: asignacionesFormulario.id,
      usuarioId: asignacionesFormulario.usuarioId,
      inspector: usuarios.nombre,
      rol: usuarios.rol,
      fechaLimite: asignacionesFormulario.fechaLimite,
      nota: asignacionesFormulario.nota,
      estado: asignacionesFormulario.estado,
      origen: asignacionesFormulario.origen,
      creadoEn: asignacionesFormulario.creadoEn,
      completadaEn: asignacionesFormulario.completadaEn,
    })
    .from(asignacionesFormulario)
    .innerJoin(usuarios, eq(usuarios.id, asignacionesFormulario.usuarioId))
    .where(eq(asignacionesFormulario.formularioId, formularioId))
    .orderBy(asc(asignacionesFormulario.estado), desc(asignacionesFormulario.creadoEn));
}

/** Respuestas enviadas de un formulario, más recientes primero (pestaña "Resultados"). */
export async function listarRespuestasDeFormulario(formularioId) {
  return db
    .select({
      asignacionId: respuestasFormulario.asignacionId,
      usuarioId: respuestasFormulario.usuarioId,
      inspector: usuarios.nombre,
      rol: usuarios.rol,
      enviadaEn: respuestasFormulario.enviadaEn,
      fechaLimite: asignacionesFormulario.fechaLimite,
      camposSnapshot: respuestasFormulario.camposSnapshot,
      respuestas: respuestasFormulario.respuestas,
    })
    .from(respuestasFormulario)
    .innerJoin(usuarios, eq(usuarios.id, respuestasFormulario.usuarioId))
    .innerJoin(asignacionesFormulario, eq(asignacionesFormulario.id, respuestasFormulario.asignacionId))
    .where(eq(respuestasFormulario.formularioId, formularioId))
    .orderBy(desc(respuestasFormulario.enviadaEn));
}

/** Formularios asignados a un inspector. Los pendientes de formularios archivados no se muestran. */
export async function listarMisAsignaciones(usuarioId) {
  return db
    .select({
      id: asignacionesFormulario.id,
      titulo: formularios.titulo,
      descripcion: formularios.descripcion,
      fechaLimite: asignacionesFormulario.fechaLimite,
      nota: asignacionesFormulario.nota,
      estado: asignacionesFormulario.estado,
      origen: asignacionesFormulario.origen,
      creadoEn: asignacionesFormulario.creadoEn,
      completadaEn: asignacionesFormulario.completadaEn,
      activo: formularios.activo,
    })
    .from(asignacionesFormulario)
    .innerJoin(formularios, eq(formularios.id, asignacionesFormulario.formularioId))
    .where(eq(asignacionesFormulario.usuarioId, usuarioId))
    .orderBy(asc(asignacionesFormulario.fechaLimite), desc(asignacionesFormulario.creadoEn));
}

/** Una asignación con su formulario, el inspector y la respuesta (si existe). */
export async function obtenerAsignacionCompleta(asignacionId) {
  const [fila] = await db
    .select({
      asignacion: asignacionesFormulario,
      formulario: formularios,
      inspector: { id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol },
    })
    .from(asignacionesFormulario)
    .innerJoin(formularios, eq(formularios.id, asignacionesFormulario.formularioId))
    .innerJoin(usuarios, eq(usuarios.id, asignacionesFormulario.usuarioId))
    .where(eq(asignacionesFormulario.id, asignacionId))
    .limit(1);
  if (!fila) return null;

  const [respuesta] = await db
    .select()
    .from(respuestasFormulario)
    .where(eq(respuestasFormulario.asignacionId, asignacionId))
    .limit(1);

  const fotos = await listarFotos(asignacionId);
  return { ...fila, respuesta: respuesta ?? null, fotos };
}

export async function listarFotos(asignacionId) {
  return db
    .select({ id: archivosFormulario.id, campoId: archivosFormulario.campoId })
    .from(archivosFormulario)
    .where(eq(archivosFormulario.asignacionId, asignacionId))
    .orderBy(asc(archivosFormulario.creadoEn));
}

/** Para servir una foto: el archivo y el dueño de la asignación (para verificar permisos). */
export async function obtenerArchivoConDueno(archivoId) {
  const [fila] = await db
    .select({
      ruta: archivosFormulario.ruta,
      tipoMime: archivosFormulario.tipoMime,
      usuarioId: asignacionesFormulario.usuarioId,
    })
    .from(archivosFormulario)
    .innerJoin(asignacionesFormulario, eq(asignacionesFormulario.id, archivosFormulario.asignacionId))
    .where(eq(archivosFormulario.id, archivoId))
    .limit(1);
  return fila ?? null;
}

/** Cantidad de formularios pendientes del inspector para hoy o atrasados (aviso en la barra). */
export async function contarPendientes(usuarioId) {
  const [fila] = await db
    .select({ n: sql`count(*)`.mapWith(Number) })
    .from(asignacionesFormulario)
    .innerJoin(formularios, eq(formularios.id, asignacionesFormulario.formularioId))
    .where(
      and(
        eq(asignacionesFormulario.usuarioId, usuarioId),
        eq(asignacionesFormulario.estado, "pendiente"),
        eq(formularios.activo, true),
        or(isNull(asignacionesFormulario.fechaLimite), lte(asignacionesFormulario.fechaLimite, hoyISO()))
      )
    );
  return fila?.n ?? 0;
}

/**
 * Formularios generados por el cronograma de un inspector en un mes, por celda
 * (clave "plantillaId|fecha"), para ofrecer "Llenar formulario" desde la matriz.
 */
export async function listarFormulariosDelCronograma({ usuarioId, mes, anio }) {
  return db
    .select({
      asignacionId: asignacionesFormulario.id,
      estado: asignacionesFormulario.estado,
      titulo: formularios.titulo,
      plantillaId: registrosCronograma.plantillaId,
      fecha: registrosCronograma.fecha,
    })
    .from(asignacionesFormulario)
    .innerJoin(registrosCronograma, eq(registrosCronograma.id, asignacionesFormulario.registroId))
    .innerJoin(formularios, eq(formularios.id, asignacionesFormulario.formularioId))
    .where(
      and(
        eq(asignacionesFormulario.usuarioId, usuarioId),
        eq(registrosCronograma.mes, mes),
        eq(registrosCronograma.anio, anio),
        eq(formularios.activo, true)
      )
    );
}

/** Formatos del catálogo ya vinculados a algún formulario (id del formato → título del formulario). */
export async function listarFormatosVinculados() {
  const filas = await db
    .select({ plantillaId: formularios.plantillaId, id: formularios.id, titulo: formularios.titulo })
    .from(formularios)
    .where(sql`${formularios.plantillaId} is not null`);
  return filas;
}

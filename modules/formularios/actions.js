"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ROL_GENERAL, ROLES_OPERATIVOS } from "@/db/roles";
import {
  archivosFormulario,
  asignacionesFormulario,
  formularios,
  plantillasInspeccion,
  registrosCronograma,
  respuestasFormulario,
  usuarios,
} from "@/db/schema";
import { autorizarAccion } from "@/modules/auth/dal";
import { borrarArchivo, guardarImagen } from "./almacenamiento";
import { maxArchivos, normalizarCampos, TIPOS_CON_ARCHIVO, validarRespuestas } from "./campos";
import { sincronizarSinInterrumpir } from "./sincronizacion";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function revalidar(formularioId) {
  revalidatePath("/formularios");
  // "layout" incluye las páginas editar, asignar y resultados del formulario.
  if (formularioId) revalidatePath(`/formularios/${formularioId}`, "layout");
  revalidatePath("/mis-formularios");
}

// ───────────────────────── Administrador ─────────────────────────

/**
 * Crea o actualiza un formulario (título, rol, formato vinculado, descripción y preguntas).
 * Con `plantillaId`, cada "P" de ese formato en el cronograma genera una asignación (ver sincronizacion.js).
 * @param {{ id?: string, titulo: string, rol: string, plantillaId?: string|null, descripcion?: string, campos: object[] }} entrada
 */
export async function guardarFormulario(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const titulo = String(entrada?.titulo ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const descripcion = String(entrada?.descripcion ?? "").trim().slice(0, 2000) || null;
  const encabezado = {
    codigo: String(entrada?.codigo ?? "").trim().toUpperCase().slice(0, 50) || null,
    emision: String(entrada?.emision ?? "").trim().slice(0, 30) || null,
    revision: String(entrada?.revision ?? "").trim().slice(0, 20) || null,
  };
  if (titulo.length < 3) return { success: false, error: "Escriba un título (mínimo 3 caracteres)." };
  // El rol decide a quién se puede asignar el formulario.
  const rol = String(entrada?.rol ?? "");
  if (!ROLES_OPERATIVOS.includes(rol)) {
    return { success: false, error: "Elija a qué rol va dirigido el formulario (Inspector SIHO, Paramédico o Rescatista)." };
  }

  const normalizados = normalizarCampos(entrada?.campos);
  if (!normalizados.ok) return { success: false, error: normalizados.error };

  // Formato del cronograma vinculado (opcional): debe ser del mismo rol o "General".
  const plantillaId = entrada?.plantillaId ? String(entrada.plantillaId) : null;
  if (plantillaId) {
    if (!UUID_RE.test(plantillaId)) return { success: false, error: "Formato del cronograma inválido." };
    const [plantilla] = await db
      .select({ rol: plantillasInspeccion.rol, activo: plantillasInspeccion.activo })
      .from(plantillasInspeccion)
      .where(eq(plantillasInspeccion.id, plantillaId))
      .limit(1);
    if (!plantilla?.activo) return { success: false, error: "El formato del cronograma no existe." };
    if (plantilla.rol !== rol && plantilla.rol !== ROL_GENERAL) {
      return { success: false, error: `Ese formato no pertenece al rol ${rol}.` };
    }
  }

  try {
    const id = entrada?.id ? String(entrada.id) : null;
    if (id) {
      if (!UUID_RE.test(id)) return { success: false, error: "Formulario inválido." };
      const actualizados = await db
        .update(formularios)
        .set({ titulo, rol, plantillaId, descripcion, ...encabezado, campos: normalizados.campos, actualizadoEn: new Date() })
        .where(eq(formularios.id, id))
        .returning({ id: formularios.id });
      if (actualizados.length === 0) return { success: false, error: "El formulario no existe." };
      const sincronizacion = await sincronizarSinInterrumpir({ formularioId: id, asignadoPor: auth.usuario.id });
      revalidar(id);
      return { success: true, id, asignacionesCreadas: sincronizacion.creadas };
    }

    const [creado] = await db
      .insert(formularios)
      .values({ titulo, rol, plantillaId, descripcion, ...encabezado, campos: normalizados.campos, creadoPor: auth.usuario.id })
      .returning({ id: formularios.id });
    const sincronizacion = await sincronizarSinInterrumpir({ formularioId: creado.id, asignadoPor: auth.usuario.id });
    revalidar(creado.id);
    return { success: true, id: creado.id, asignacionesCreadas: sincronizacion.creadas };
  } catch (error) {
    if ((error?.cause?.code ?? error?.code) === "23505") {
      return { success: false, error: "Ese formato del cronograma ya está vinculado a otro formulario." };
    }
    console.error("[formularios] Error al guardar formulario:", error);
    return { success: false, error: "No se pudo guardar el formulario." };
  }
}

/** Archiva (oculta a los inspectores) o reactiva un formulario. */
export async function cambiarEstadoFormulario(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };
  const id = String(entrada?.id ?? "");
  if (!UUID_RE.test(id)) return { success: false, error: "Formulario inválido." };

  await db
    .update(formularios)
    .set({ activo: entrada?.activo === true, actualizadoEn: new Date() })
    .where(eq(formularios.id, id));
  // Archivado: se quitan sus pendientes del cronograma; reactivado: se vuelven a crear.
  await sincronizarSinInterrumpir({ formularioId: id, asignadoPor: auth.usuario.id });
  revalidar(id);
  return { success: true };
}

/**
 * Elimina un formulario que nadie ha respondido (sus asignaciones pendientes y fotos se borran).
 * Si ya tiene respuestas, se debe archivar para conservarlas.
 */
export async function eliminarFormulario(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };
  const id = String(entrada?.id ?? "");
  if (!UUID_RE.test(id)) return { success: false, error: "Formulario inválido." };

  const [{ n }] = await db
    .select({ n: sql`count(*)`.mapWith(Number) })
    .from(respuestasFormulario)
    .where(eq(respuestasFormulario.formularioId, id));
  if (n > 0) return { success: false, error: "Ya tiene respuestas: archívelo en lugar de eliminarlo." };

  const fotos = await db
    .select({ ruta: archivosFormulario.ruta })
    .from(archivosFormulario)
    .innerJoin(asignacionesFormulario, eq(asignacionesFormulario.id, archivosFormulario.asignacionId))
    .where(eq(asignacionesFormulario.formularioId, id));
  const borrados = await db.delete(formularios).where(eq(formularios.id, id)).returning({ id: formularios.id });
  if (borrados.length === 0) return { success: false, error: "El formulario no existe." };
  await Promise.all(fotos.map((f) => borrarArchivo(f.ruta)));
  revalidar(id);
  return { success: true };
}

/**
 * Asigna un formulario a uno o varios inspectores. Solo se aceptan inspectores activos
 * del mismo rol del formulario (un formulario de Paramédico solo va a paramédicos, etc.).
 * @param {{ formularioId: string, usuarioIds: string[], fechaLimite?: string, nota?: string }} entrada
 */
export async function asignarFormulario(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const formularioId = String(entrada?.formularioId ?? "");
  const ids = [...new Set(Array.isArray(entrada?.usuarioIds) ? entrada.usuarioIds.map(String) : [])];
  const fechaLimite = entrada?.fechaLimite ? String(entrada.fechaLimite) : null;
  const nota = String(entrada?.nota ?? "").trim().slice(0, 300) || null;

  if (!UUID_RE.test(formularioId)) return { success: false, error: "Formulario inválido." };
  if (ids.length === 0) return { success: false, error: "Seleccione al menos un inspector." };
  if (ids.length > 200 || ids.some((id) => !UUID_RE.test(id))) return { success: false, error: "Inspectores inválidos." };
  if (fechaLimite && !FECHA_RE.test(fechaLimite)) return { success: false, error: "Fecha límite inválida." };

  try {
    const [formulario] = await db
      .select({ activo: formularios.activo, rol: formularios.rol })
      .from(formularios)
      .where(eq(formularios.id, formularioId));
    if (!formulario) return { success: false, error: "El formulario no existe." };
    if (!formulario.activo) return { success: false, error: "El formulario está archivado; reactívelo para asignarlo." };
    if (!ROLES_OPERATIVOS.includes(formulario.rol)) {
      return { success: false, error: "Primero elija en Editar a qué rol va dirigido el formulario." };
    }

    const validos = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(inArray(usuarios.id, ids), eq(usuarios.activo, true), eq(usuarios.rol, formulario.rol)));
    if (validos.length !== ids.length) {
      return { success: false, error: `Este formulario es solo para el rol ${formulario.rol}. Quite a los inspectores de otros roles.` };
    }

    await db.insert(asignacionesFormulario).values(
      validos.map((u) => ({ formularioId, usuarioId: u.id, fechaLimite, nota, asignadoPor: auth.usuario.id }))
    );
    revalidar(formularioId);
    return { success: true, asignadas: validos.length };
  } catch (error) {
    console.error("[formularios] Error al asignar:", error);
    return { success: false, error: "No se pudo asignar el formulario." };
  }
}

/** Quita una asignación que aún está pendiente (borra también sus fotos subidas). */
export async function quitarAsignacion(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };
  const id = String(entrada?.id ?? "");
  if (!UUID_RE.test(id)) return { success: false, error: "Asignación inválida." };

  const [actual] = await db
    .select({ origen: asignacionesFormulario.origen })
    .from(asignacionesFormulario)
    .where(eq(asignacionesFormulario.id, id))
    .limit(1);
  if (actual?.origen === "cronograma") {
    return { success: false, error: "Esta asignación viene del cronograma: quite la P de ese día para eliminarla." };
  }

  const fotos = await db.select({ ruta: archivosFormulario.ruta }).from(archivosFormulario).where(eq(archivosFormulario.asignacionId, id));
  const borradas = await db
    .delete(asignacionesFormulario)
    .where(and(eq(asignacionesFormulario.id, id), eq(asignacionesFormulario.estado, "pendiente")))
    .returning({ formularioId: asignacionesFormulario.formularioId });
  if (borradas.length === 0) return { success: false, error: "Solo se pueden quitar asignaciones pendientes." };

  await Promise.all(fotos.map((f) => borrarArchivo(f.ruta)));
  revalidar(borradas[0].formularioId);
  return { success: true };
}

// ───────────────────────── Inspector ─────────────────────────

// Asignación propia, pendiente y de un formulario activo; si no, devuelve un error.
async function asignacionEditable(asignacionId, usuarioId) {
  if (!UUID_RE.test(String(asignacionId))) return { error: "Asignación inválida." };
  const [fila] = await db
    .select({ asignacion: asignacionesFormulario, formulario: formularios })
    .from(asignacionesFormulario)
    .innerJoin(formularios, eq(formularios.id, asignacionesFormulario.formularioId))
    .where(and(eq(asignacionesFormulario.id, asignacionId), eq(asignacionesFormulario.usuarioId, usuarioId)))
    .limit(1);
  if (!fila) return { error: "Este formulario no está asignado a usted." };
  if (fila.asignacion.estado !== "pendiente") return { error: "Este formulario ya fue enviado." };
  if (!fila.formulario.activo) return { error: "Este formulario fue archivado por el administrador." };
  return fila;
}

/**
 * Sube UNA imagen (foto ya comprimida en el celular, o firma dibujada) para un campo de foto o firma.
 * FormData: asignacionId, campoId, archivo.
 */
export async function subirFoto(formData) {
  const auth = await autorizarAccion();
  if (auth.error) return { success: false, error: auth.error };

  const asignacionId = String(formData.get("asignacionId") ?? "");
  const campoId = String(formData.get("campoId") ?? "");
  const archivo = formData.get("archivo");

  const fila = await asignacionEditable(asignacionId, auth.usuario.id);
  if (fila.error) return { success: false, error: fila.error };

  const campo = fila.formulario.campos.find((c) => c.id === campoId && TIPOS_CON_ARCHIVO.includes(c.tipo));
  if (!campo) return { success: false, error: "Campo de foto inválido." };
  if (!archivo || typeof archivo.arrayBuffer !== "function") return { success: false, error: "No llegó la foto." };

  const [{ n }] = await db
    .select({ n: sql`count(*)`.mapWith(Number) })
    .from(archivosFormulario)
    .where(and(eq(archivosFormulario.asignacionId, asignacionId), eq(archivosFormulario.campoId, campoId)));
  if (n >= maxArchivos(campo)) {
    return {
      success: false,
      error: campo.tipo === "firma" ? "Ya hay una firma; bórrela para firmar de nuevo." : `Máximo ${campo.maxFotos} foto(s) en esta pregunta.`,
    };
  }

  const guardada = await guardarImagen(Buffer.from(await archivo.arrayBuffer()), asignacionId);
  if (!guardada.ok) return { success: false, error: guardada.error };

  try {
    const [registro] = await db
      .insert(archivosFormulario)
      .values({
        asignacionId,
        campoId,
        ruta: guardada.ruta,
        tipoMime: guardada.mime,
        tamano: guardada.tamano,
        subidoPor: auth.usuario.id,
      })
      .returning({ id: archivosFormulario.id });
    return { success: true, id: registro.id };
  } catch (error) {
    await borrarArchivo(guardada.ruta);
    console.error("[formularios] Error al registrar foto:", error);
    return { success: false, error: "No se pudo guardar la foto." };
  }
}

/** Elimina una foto subida mientras el formulario sigue pendiente. */
export async function eliminarFoto(entrada) {
  const auth = await autorizarAccion();
  if (auth.error) return { success: false, error: auth.error };
  const id = String(entrada?.id ?? "");
  if (!UUID_RE.test(id)) return { success: false, error: "Foto inválida." };

  const [foto] = await db.select().from(archivosFormulario).where(eq(archivosFormulario.id, id)).limit(1);
  if (!foto) return { success: false, error: "La foto no existe." };
  const fila = await asignacionEditable(foto.asignacionId, auth.usuario.id);
  if (fila.error) return { success: false, error: fila.error };

  await db.delete(archivosFormulario).where(eq(archivosFormulario.id, id));
  await borrarArchivo(foto.ruta);
  return { success: true };
}

/**
 * Envía las respuestas. Se validan contra el formulario; las fotos se toman de lo subido
 * en el servidor. Al enviarse, la asignación queda completada y ya no se puede editar.
 * @param {{ asignacionId: string, respuestas: Record<string, unknown> }} entrada
 */
export async function enviarRespuesta(entrada) {
  const auth = await autorizarAccion();
  if (auth.error) return { success: false, error: auth.error };

  const asignacionId = String(entrada?.asignacionId ?? "");
  const fila = await asignacionEditable(asignacionId, auth.usuario.id);
  if (fila.error) return { success: false, error: fila.error };

  const fotos = await db
    .select({ id: archivosFormulario.id, campoId: archivosFormulario.campoId })
    .from(archivosFormulario)
    .where(eq(archivosFormulario.asignacionId, asignacionId));
  const fotosPorCampo = fotos.reduce((acc, f) => {
    (acc[f.campoId] ??= []).push(f.id);
    return acc;
  }, {});

  const { campos } = fila.formulario;
  const validacion = validarRespuestas(campos, entrada?.respuestas, fotosPorCampo);
  if (!validacion.ok) {
    return { success: false, error: "Revise las preguntas marcadas.", errores: validacion.errores };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(respuestasFormulario).values({
        asignacionId,
        formularioId: fila.formulario.id,
        usuarioId: auth.usuario.id,
        camposSnapshot: campos,
        respuestas: validacion.valores,
      });
      await tx
        .update(asignacionesFormulario)
        .set({ estado: "completada", completadaEn: new Date() })
        .where(eq(asignacionesFormulario.id, asignacionId));
      // Formulario del cronograma: queda registrada la ejecución (E) de esa "P".
      if (fila.asignacion.registroId) {
        await tx
          .update(registrosCronograma)
          .set({
            ejecutado: sql`greatest(${registrosCronograma.ejecutado}, 1)`,
            noEjecutado: 0,
            actualizadoPor: auth.usuario.id,
            actualizadoEn: new Date(),
          })
          .where(eq(registrosCronograma.id, fila.asignacion.registroId));
      }
    });
    revalidar(fila.formulario.id);
    if (fila.asignacion.registroId) {
      revalidatePath("/mi-cronograma");
      revalidatePath("/");
      revalidatePath("/dashboard");
    }
    return { success: true };
  } catch (error) {
    if (error?.cause?.code === "23505" || error?.code === "23505") {
      return { success: false, error: "Este formulario ya fue enviado." };
    }
    console.error("[formularios] Error al enviar respuesta:", error);
    return { success: false, error: "No se pudo enviar. Intente de nuevo." };
  }
}

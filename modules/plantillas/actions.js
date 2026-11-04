"use server";

import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ROLES_OPERATIVOS } from "@/db/roles";
import { formularios, plantillasInspeccion, registrosCronograma } from "@/db/schema";
import { autorizarAccion } from "@/modules/auth/dal";
import { hoyISO } from "@/modules/formularios/fechas";
import { sincronizarSinInterrumpir } from "@/modules/formularios/sincronizacion";
import { PERIODICIDADES } from "./constants";

function texto(valor, maximo) {
  return String(valor ?? "").replace(/\s+/g, " ").trim().slice(0, maximo);
}

/**
 * Agrega una inspección (formato) al catálogo de un rol. Se ubica al final de la matriz.
 * @param {{ rol: string, elementoNombre: string, codigoFormato?: string, periodicidad: string, cantidadPlanificada: number }} entrada
 */
export async function crearPlantilla(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const rol = String(entrada?.rol ?? "");
  const elementoNombre = texto(entrada?.elementoNombre, 255).toUpperCase();
  const codigoFormato = texto(entrada?.codigoFormato, 50).toUpperCase() || "N/A";
  const periodicidad = String(entrada?.periodicidad ?? "");
  const cantidad = Number.parseInt(entrada?.cantidadPlanificada, 10);

  if (!ROLES_OPERATIVOS.includes(rol)) {
    return { success: false, error: "Rol inválido." };
  }
  if (elementoNombre.length < 3) {
    return { success: false, error: "Escriba el elemento a inspeccionar (mínimo 3 caracteres)." };
  }
  if (!PERIODICIDADES.includes(periodicidad)) {
    return { success: false, error: "Seleccione una periodicidad válida." };
  }
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999) {
    return { success: false, error: "La cantidad debe ser un número entre 1 y 999." };
  }

  // Dos intentos por si otra persona agrega una inspección del mismo rol al mismo tiempo
  // (choque en la clave única rol + orden).
  for (let intento = 0; intento < 2; intento++) {
    try {
      const [creada] = await db.transaction(async (tx) => {
        const [maximos] = await tx
          .select({
            orden: sql`coalesce(max(${plantillasInspeccion.orden}), 0)`.mapWith(Number),
            numero: sql`coalesce(max(${plantillasInspeccion.numero}), 0)`.mapWith(Number),
          })
          .from(plantillasInspeccion)
          .where(eq(plantillasInspeccion.rol, rol));

        return tx
          .insert(plantillasInspeccion)
          .values({
            rol,
            elementoNombre,
            codigoFormato,
            periodicidad,
            cantidadPlanificada: cantidad,
            orden: maximos.orden + 1,
            numero: maximos.numero + 1,
            activo: true,
          })
          .returning({ id: plantillasInspeccion.id, numero: plantillasInspeccion.numero });
      });

      revalidatePath("/");
      return { success: true, id: creada.id, numero: creada.numero };
    } catch (error) {
      const codigo = error?.cause?.code ?? error?.code;
      if (codigo === "23505" && intento === 0) continue;
      console.error("[plantillas] Error al crear inspección:", error);
      return { success: false, error: "No se pudo guardar la inspección." };
    }
  }
  return { success: false, error: "No se pudo guardar la inspección." };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Elimina una inspección (formato) del cronograma de su rol, sin perder el historial:
 * - deja de aparecer en el cronograma y en el generador (queda inactiva, no se borra);
 * - se borran sus "P" de hoy en adelante que no tienen nada registrado;
 * - lo ya ejecutado, las "N" y las observaciones se conservan (métricas y meses pasados);
 * - si un formulario estaba vinculado a ella, se desvincula y se quitan sus asignaciones pendientes.
 * @param {{ id: string }} entrada
 */
export async function eliminarPlantilla(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const id = String(entrada?.id ?? "");
  if (!UUID_RE.test(id)) return { success: false, error: "Inspección inválida." };

  try {
    const [plantilla] = await db
      .select({ activo: plantillasInspeccion.activo })
      .from(plantillasInspeccion)
      .where(eq(plantillasInspeccion.id, id))
      .limit(1);
    if (!plantilla) return { success: false, error: "La inspección no existe." };
    if (!plantilla.activo) return { success: false, error: "La inspección ya estaba eliminada." };

    const resultado = await db.transaction(async (tx) => {
      await tx.update(plantillasInspeccion).set({ activo: false }).where(eq(plantillasInspeccion.id, id));
      const pBorradas = await tx
        .delete(registrosCronograma)
        .where(
          and(
            eq(registrosCronograma.plantillaId, id),
            gte(registrosCronograma.fecha, hoyISO()),
            eq(registrosCronograma.ejecutado, 0),
            eq(registrosCronograma.noEjecutado, 0),
            isNull(registrosCronograma.observacion)
          )
        )
        .returning({ id: registrosCronograma.id });
      const desvinculados = await tx
        .update(formularios)
        .set({ plantillaId: null, actualizadoEn: new Date() })
        .where(eq(formularios.plantillaId, id))
        .returning({ id: formularios.id });
      return { pBorradas: pBorradas.length, desvinculados: desvinculados.map((f) => f.id) };
    });

    // Formularios que estaban vinculados: se quitan sus asignaciones pendientes del cronograma.
    for (const formularioId of resultado.desvinculados) {
      await sincronizarSinInterrumpir({ formularioId });
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/mi-cronograma");
    revalidatePath("/formularios", "layout");
    return { success: true, pBorradas: resultado.pBorradas, formulariosDesvinculados: resultado.desvinculados.length };
  } catch (error) {
    console.error("[plantillas] Error al eliminar inspección:", error);
    return { success: false, error: "No se pudo eliminar la inspección." };
  }
}

/**
 * Edita una inspección (formato) del catálogo: elemento, código, periodicidad y cantidad.
 * El rol no cambia. Las "P" ya planificadas no se modifican: la nueva periodicidad/cantidad
 * se aplica al generar o regenerar el cronograma.
 * @param {{ id: string, elementoNombre: string, codigoFormato?: string, periodicidad: string, cantidadPlanificada: number }} entrada
 */
export async function editarPlantilla(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const id = String(entrada?.id ?? "");
  const elementoNombre = texto(entrada?.elementoNombre, 255).toUpperCase();
  const codigoFormato = texto(entrada?.codigoFormato, 50).toUpperCase() || "N/A";
  const periodicidad = texto(entrada?.periodicidad, 120);
  const cantidad = Number.parseInt(entrada?.cantidadPlanificada, 10);

  if (!UUID_RE.test(id)) return { success: false, error: "Inspección inválida." };
  if (elementoNombre.length < 3) {
    return { success: false, error: "Escriba el elemento a inspeccionar (mínimo 3 caracteres)." };
  }
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999) {
    return { success: false, error: "La cantidad debe ser un número entre 1 y 999." };
  }

  try {
    const [actual] = await db
      .select({ activo: plantillasInspeccion.activo, periodicidad: plantillasInspeccion.periodicidad })
      .from(plantillasInspeccion)
      .where(eq(plantillasInspeccion.id, id))
      .limit(1);
    if (!actual?.activo) return { success: false, error: "La inspección no existe o fue eliminada." };
    // Se acepta una periodicidad de la lista o la que ya tenía (textos propios del Excel).
    if (!PERIODICIDADES.includes(periodicidad) && periodicidad !== actual.periodicidad) {
      return { success: false, error: "Seleccione una periodicidad válida." };
    }

    await db
      .update(plantillasInspeccion)
      .set({ elementoNombre, codigoFormato, periodicidad, cantidadPlanificada: cantidad })
      .where(eq(plantillasInspeccion.id, id));

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/mi-cronograma");
    revalidatePath("/formularios", "layout");
    return { success: true };
  } catch (error) {
    console.error("[plantillas] Error al editar inspección:", error);
    return { success: false, error: "No se pudo guardar la inspección." };
  }
}

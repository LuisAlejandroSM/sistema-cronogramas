"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  notificaciones,
  plantillasInspeccion,
  registrosCronograma,
  usuarios,
} from "@/db/schema";
import { autorizarAccion } from "@/modules/auth/dal";
import { diaDeFecha, diasEnMes, numeroMes } from "@/modules/cronogramas/constants";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidarNotificaciones() {
  revalidatePath("/notificaciones");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

/**
 * Registra una notificación para los administradores cuando un inspector
 * marca una inspección con "No se ejecutó (N)" en su cronograma.
 */
export async function notificarInspeccionNoEjecutada({
  inspectorId,
  registroId,
  plantillaId,
  fecha,
  mes,
  anio,
  dia,
  observacion,
}) {
  try {
    // Obtener detalles del inspector y de la plantilla
    const [inspector] = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol })
      .from(usuarios)
      .where(eq(usuarios.id, inspectorId))
      .limit(1);

    const [plantilla] = await db
      .select({
        id: plantillasInspeccion.id,
        elementoNombre: plantillasInspeccion.elementoNombre,
        codigoFormato: plantillasInspeccion.codigoFormato,
      })
      .from(plantillasInspeccion)
      .where(eq(plantillasInspeccion.id, plantillaId))
      .limit(1);

    const nombreInspector = inspector?.nombre ?? "Inspector";
    const elemento = plantilla?.elementoNombre ?? "Inspección programada";
    const codigo = plantilla?.codigoFormato ?? "";
    const obsLimpia = String(observacion ?? "").trim();

    const titulo = `Inspección no realizada: ${nombreInspector}`;
    const motivoTexto = obsLimpia ? ` Motivo: "${obsLimpia}"` : " (Sin motivo especificado).";
    const mensaje = `El inspector ${nombreInspector} (${inspector?.rol ?? "Operativo"}) reportó que NO ejecutó la inspección "${elemento}" [${codigo}] programada para el día ${dia} de ${mes} de ${anio}.${motivoTexto}`;

    // Si ya existía una notificación sin leer para este mismo registro, la actualizamos
    if (registroId) {
      const [existente] = await db
        .select({ id: notificaciones.id })
        .from(notificaciones)
        .where(
          and(
            eq(notificaciones.registroId, registroId),
            eq(notificaciones.tipo, "inspeccion_no_ejecutada"),
            eq(notificaciones.leida, false)
          )
        )
        .limit(1);

      if (existente) {
        await db
          .update(notificaciones)
          .set({
            titulo,
            mensaje,
            datos: {
              inspectorNombre: nombreInspector,
              inspectorRol: inspector?.rol,
              elementoNombre: elemento,
              codigoFormato: codigo,
              fecha,
              mes,
              anio,
              dia,
              observacion: obsLimpia || null,
            },
            creadoEn: new Date(),
          })
          .where(eq(notificaciones.id, existente.id));

        revalidarNotificaciones();
        return { success: true, id: existente.id };
      }
    }

    const [creada] = await db
      .insert(notificaciones)
      .values({
        tipo: "inspeccion_no_ejecutada",
        titulo,
        mensaje,
        inspectorId,
        registroId: registroId || null,
        datos: {
          inspectorNombre: nombreInspector,
          inspectorRol: inspector?.rol,
          elementoNombre: elemento,
          codigoFormato: codigo,
          fecha,
          mes,
          anio,
          dia,
          observacion: obsLimpia || null,
        },
      })
      .returning({ id: notificaciones.id });

    revalidarNotificaciones();
    return { success: true, id: creada.id };
  } catch (error) {
    console.error("[notificaciones] Error al notificar inspección no ejecutada:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Si un inspector luego subsana o ejecuta la inspección que estaba en "N",
 * se resuelve automáticamente la alerta previa.
 */
export async function resolverNotificacionInspeccion({ registroId }) {
  if (!registroId) return;
  try {
    await db
      .update(notificaciones)
      .set({ leida: true, leidaEn: new Date() })
      .where(
        and(
          eq(notificaciones.registroId, registroId),
          eq(notificaciones.leida, false)
        )
      );
    revalidarNotificaciones();
  } catch (error) {
    console.error("[notificaciones] Error al resolver alerta de inspección:", error.message);
  }
}

/**
 * Marca una notificación como leída por el administrador.
 */
export async function marcarNotificacionLeida(id) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const idLimpio = String(id ?? "");
  if (!UUID_RE.test(idLimpio)) return { success: false, error: "ID inválido." };

  try {
    await db
      .update(notificaciones)
      .set({ leida: true, leidaEn: new Date() })
      .where(eq(notificaciones.id, idLimpio));

    revalidarNotificaciones();
    return { success: true };
  } catch (error) {
    console.error("[notificaciones] Error al marcar como leída:", error);
    return { success: false, error: "No se pudo actualizar." };
  }
}

/**
 * Marca todas las notificaciones pendientes como leídas.
 */
export async function marcarTodasLeidas() {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  try {
    await db
      .update(notificaciones)
      .set({ leida: true, leidaEn: new Date() })
      .where(eq(notificaciones.leida, false));

    revalidarNotificaciones();
    return { success: true };
  } catch (error) {
    console.error("[notificaciones] Error al marcar todas como leídas:", error);
    return { success: false, error: "No se pudieron actualizar las notificaciones." };
  }
}

/**
 * Elimina una notificación.
 */
export async function eliminarNotificacion(id) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const idLimpio = String(id ?? "");
  if (!UUID_RE.test(idLimpio)) return { success: false, error: "ID inválido." };

  try {
    await db.delete(notificaciones).where(eq(notificaciones.id, idLimpio));
    revalidarNotificaciones();
    return { success: true };
  } catch (error) {
    console.error("[notificaciones] Error al eliminar notificación:", error);
    return { success: false, error: "No se pudo eliminar la notificación." };
  }
}

/**
 * Escanea inspecciones planificadas en días pasados del mes actual que no se han
 * realizado ni marcado con "N", generando una alerta de inspección vencida si aún
 * no ha sido notificada.
 */
export async function verificarInspeccionesVencidas() {
  try {
    const ahora = new Date();
    const hoyISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;

    // Buscar registros pasados con P > 0, E = 0, N = 0
    const vencidos = await db
      .select({
        registroId: registrosCronograma.id,
        fecha: registrosCronograma.fecha,
        mes: registrosCronograma.mes,
        anio: registrosCronograma.anio,
        usuarioId: registrosCronograma.usuarioId,
        plantillaId: registrosCronograma.plantillaId,
        inspectorNombre: usuarios.nombre,
        inspectorRol: usuarios.rol,
        elementoNombre: plantillasInspeccion.elementoNombre,
        codigoFormato: plantillasInspeccion.codigoFormato,
      })
      .from(registrosCronograma)
      .innerJoin(usuarios, eq(registrosCronograma.usuarioId, usuarios.id))
      .innerJoin(plantillasInspeccion, eq(registrosCronograma.plantillaId, plantillasInspeccion.id))
      .where(
        and(
          eq(registrosCronograma.planificado, 1),
          eq(registrosCronograma.ejecutado, 0),
          eq(registrosCronograma.noEjecutado, 0),
          sql`${registrosCronograma.fecha} < ${hoyISO}::date`
        )
      )
      .limit(100);

    if (vencidos.length === 0) return { generadas: 0 };

    let generadas = 0;
    for (const v of vencidos) {
      // Verificar si ya existe notificación para este registro
      const [existe] = await db
        .select({ id: notificaciones.id })
        .from(notificaciones)
        .where(
          and(
            eq(notificaciones.registroId, v.registroId),
            eq(notificaciones.tipo, "inspeccion_vencida")
          )
        )
        .limit(1);

      if (!existe) {
        const dia = diaDeFecha(v.fecha);
        await db.insert(notificaciones).values({
          tipo: "inspeccion_vencida",
          titulo: `Inspección vencida: ${v.inspectorNombre}`,
          mensaje: `La inspección "${v.elementoNombre}" [${v.codigoFormato}] asignada a ${v.inspectorNombre} para el día ${dia} de ${v.mes} venció sin ser ejecutada ni justificada.`,
          inspectorId: v.usuarioId,
          registroId: v.registroId,
          datos: {
            inspectorNombre: v.inspectorNombre,
            inspectorRol: v.inspectorRol,
            elementoNombre: v.elementoNombre,
            codigoFormato: v.codigoFormato,
            fecha: v.fecha,
            mes: v.mes,
            anio: v.anio,
            dia,
          },
        });
        generadas += 1;
      }
    }

    if (generadas > 0) revalidarNotificaciones();
    return { generadas };
  } catch (error) {
    console.error("[notificaciones] Error al verificar inspecciones vencidas:", error);
    return { generadas: 0, error: error.message };
  }
}

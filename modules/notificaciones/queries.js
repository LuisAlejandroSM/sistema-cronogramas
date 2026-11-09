import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notificaciones, usuarios } from "@/db/schema";

/**
 * Cuenta las notificaciones sin leer para administradores.
 * Usado en la barra lateral / menú principal para el indicador de campana.
 * @returns {Promise<number>}
 */
export async function contarNotificacionesNoLeidas() {
  try {
    const [resultado] = await db
      .select({ total: sql`count(*)`.mapWith(Number) })
      .from(notificaciones)
      .where(eq(notificaciones.leida, false));
    return resultado?.total ?? 0;
  } catch (error) {
    console.error("[notificaciones] Error al contar no leídas:", error.message);
    return 0;
  }
}

/**
 * Obtiene las notificaciones ordenadas cronológicamente (más recientes primero).
 * @param {{
 *   limite?: number,
 *   soloNoLeidas?: boolean,
 *   tipo?: string|null
 * }} opciones
 */
export async function obtenerNotificaciones({ limite = 50, soloNoLeidas = false, tipo = null } = {}) {
  try {
    const condiciones = [];
    if (soloNoLeidas) condiciones.push(eq(notificaciones.leida, false));
    if (tipo) condiciones.push(eq(notificaciones.tipo, tipo));

    const where = condiciones.length > 0 ? and(...condiciones) : undefined;

    const filas = await db
      .select({
        id: notificaciones.id,
        tipo: notificaciones.tipo,
        titulo: notificaciones.titulo,
        mensaje: notificaciones.mensaje,
        inspectorId: notificaciones.inspectorId,
        registroId: notificaciones.registroId,
        asignacionId: notificaciones.asignacionId,
        datos: notificaciones.datos,
        leida: notificaciones.leida,
        leidaEn: notificaciones.leidaEn,
        creadoEn: notificaciones.creadoEn,
        inspectorNombre: usuarios.nombre,
        inspectorRol: usuarios.rol,
      })
      .from(notificaciones)
      .leftJoin(usuarios, eq(notificaciones.inspectorId, usuarios.id))
      .where(where)
      .orderBy(desc(notificaciones.creadoEn))
      .limit(Math.min(limite, 200));

    return filas;
  } catch (error) {
    console.error("[notificaciones] Error al obtener lista:", error);
    return [];
  }
}

/**
 * Resumen de contadores para las pestañas de filtro en la vista de notificaciones.
 * @returns {Promise<{ total: number, noLeidas: number, noEjecutadas: number, vencidas: number }>}
 */
export async function obtenerEstadisticasNotificaciones() {
  try {
    const filas = await db
      .select({
        tipo: notificaciones.tipo,
        leida: notificaciones.leida,
      })
      .from(notificaciones);

    const stats = {
      total: filas.length,
      noLeidas: 0,
      noEjecutadas: 0,
      vencidas: 0,
    };

    for (const f of filas) {
      if (!f.leida) stats.noLeidas += 1;
      if (f.tipo === "inspeccion_no_ejecutada") stats.noEjecutadas += 1;
      if (f.tipo === "inspeccion_vencida") stats.vencidas += 1;
    }

    return stats;
  } catch (error) {
    console.error("[notificaciones] Error al calcular estadísticas:", error.message);
    return { total: 0, noLeidas: 0, noEjecutadas: 0, vencidas: 0 };
  }
}

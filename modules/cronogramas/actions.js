"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ROLES_OPERATIVOS } from "@/db/roles";
import { registrosCronograma } from "@/db/schema";
import { obtenerIdsPlantillasDeRol, obtenerPlantillas } from "@/modules/plantillas/queries";
import { autorizarAccion } from "@/modules/auth/dal";
import { obtenerUsuarioPorId } from "@/modules/usuarios/queries";
import { sincronizarSinInterrumpir } from "@/modules/formularios/sincronizacion";
import { MESES, construirFecha, diasEnMes, semanaDelMes } from "./constants";
import { planificarDias } from "./planificacion";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CELDAS = 5000;

function enteroNoNegativo(valor, maximo = 999) {
  const n = Number.parseInt(valor, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, maximo);
}

/**
 * Guarda en lote (UPSERT) las celdas modificadas de la matriz mensual de un inspector.
 * Cada celda representa las dos filas del formato para un día:
 *   - planificado: 1 si la fila superior tiene "P".
 *   - ejecutado: cantidad de inspecciones realizadas (fila inferior numérica).
 *   - noEjecutado: 1 si la fila inferior tiene "N".
 * @param {{
 *   usuarioId: string,
 *   mes: string,
 *   anio: number,
 *   celdas: { plantillaId: string, dia: number, planificado: number, ejecutado: number, noEjecutado: number }[]
 * }} entrada
 */
export async function guardarRegistrosCronograma(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const { usuarioId, mes, anio, celdas } = entrada ?? {};

  // Los Server Actions son endpoints públicos: validar todo lo que llega del cliente.
  if (!UUID_RE.test(String(usuarioId))) {
    return { success: false, error: "Usuario inválido." };
  }
  if (!MESES.includes(mes)) {
    return { success: false, error: "Mes inválido." };
  }
  const anioNum = Number.parseInt(anio, 10);
  if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) {
    return { success: false, error: "Año inválido." };
  }
  if (!Array.isArray(celdas) || celdas.length === 0) {
    return { success: true, guardados: 0 };
  }
  if (celdas.length > MAX_CELDAS) {
    return { success: false, error: "Demasiadas celdas en una sola operación." };
  }

  let idsValidos;
  try {
    const usuario = await obtenerUsuarioPorId(usuarioId);
    if (!usuario || !ROLES_OPERATIVOS.includes(usuario.rol)) {
      return { success: false, error: "El usuario no existe o no tiene cronograma individual." };
    }
    idsValidos = await obtenerIdsPlantillasDeRol(usuario.rol);
  } catch (error) {
    console.error("[cronogramas] Error validando usuario/plantillas:", error);
    return { success: false, error: "No se pudo conectar con la base de datos." };
  }

  const maxDia = diasEnMes(mes, anioNum);
  const porClave = new Map();

  for (const celda of celdas) {
    const dia = Number.parseInt(celda?.dia, 10);
    const plantillaId = String(celda?.plantillaId ?? "");
    if (!idsValidos.has(plantillaId)) continue;
    if (!Number.isInteger(dia) || dia < 1 || dia > maxDia) continue;

    const planificado = enteroNoNegativo(celda.planificado) > 0 ? 1 : 0;
    const noEjecutado = enteroNoNegativo(celda.noEjecutado) > 0 ? 1 : 0;
    // "N" y una cantidad ejecutada son excluyentes: si hay "N", la ejecución es 0.
    const ejecutado = noEjecutado ? 0 : enteroNoNegativo(celda.ejecutado);

    // Si llegan celdas repetidas gana la última (evita error de UPSERT duplicado).
    porClave.set(`${plantillaId}|${dia}`, {
      usuarioId,
      plantillaId,
      fecha: construirFecha(anioNum, mes, dia),
      mes,
      anio: anioNum,
      semanaMes: semanaDelMes(dia),
      planificado,
      ejecutado,
      noEjecutado,
      actualizadoPor: auth.usuario.id,
      actualizadoEn: new Date(),
    });
  }

  const valores = Array.from(porClave.values());
  if (valores.length === 0) {
    return { success: true, guardados: 0 };
  }

  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < valores.length; i += 500) {
        await tx
          .insert(registrosCronograma)
          .values(valores.slice(i, i + 500))
          .onConflictDoUpdate({
            target: [
              registrosCronograma.usuarioId,
              registrosCronograma.plantillaId,
              registrosCronograma.fecha,
            ],
            set: {
              planificado: sql`excluded.planificado`,
              ejecutado: sql`excluded.ejecutado`,
              noEjecutado: sql`excluded.no_ejecutado`,
              semanaMes: sql`excluded.semana_mes`,
              actualizadoPor: sql`excluded.actualizado_por`,
              actualizadoEn: sql`excluded.actualizado_en`,
            },
          });
      }
    });

    // Las P cambiaron: crear/quitar los formularios vinculados a esos formatos.
    await sincronizarSinInterrumpir({ usuarioId, mes, anio: anioNum, asignadoPor: auth.usuario.id });
    revalidatePath("/");
    return { success: true, guardados: valores.length };
  } catch (error) {
    console.error("[cronogramas] Error al guardar registros:", error);
    return { success: false, error: "No se pudo guardar en la base de datos." };
  }
}

/**
 * Genera la planificación ("P") del mes para un inspector a partir de los formatos asignados.
 * Reemplaza todas las P del mes de ese inspector; las ejecuciones ya registradas (cantidades
 * y "N") se conservan. Los días se calculan en el servidor según la periodicidad de cada formato.
 * @param {{
 *   usuarioId: string,
 *   mes: string,
 *   anio: number,
 *   asignaciones: { plantillaId: string, diaSemana: number }[]
 * }} entrada
 */
export async function generarCronograma(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const { usuarioId, mes, anio, asignaciones } = entrada ?? {};

  if (!UUID_RE.test(String(usuarioId))) {
    return { success: false, error: "Usuario inválido." };
  }
  if (!MESES.includes(mes)) {
    return { success: false, error: "Mes inválido." };
  }
  const anioNum = Number.parseInt(anio, 10);
  if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) {
    return { success: false, error: "Año inválido." };
  }
  if (!Array.isArray(asignaciones) || asignaciones.length > 500) {
    return { success: false, error: "Asignaciones inválidas." };
  }

  let plantillasPorId;
  try {
    const usuario = await obtenerUsuarioPorId(usuarioId);
    if (!usuario || !ROLES_OPERATIVOS.includes(usuario.rol)) {
      return { success: false, error: "El usuario no existe o no tiene cronograma individual." };
    }
    const plantillas = await obtenerPlantillas({ rol: usuario.rol });
    plantillasPorId = new Map(plantillas.map((p) => [p.id, p]));
  } catch (error) {
    console.error("[cronogramas] Error validando la generación:", error);
    return { success: false, error: "No se pudo conectar con la base de datos." };
  }

  const valores = [];
  const vistas = new Set();
  for (const a of asignaciones) {
    const plantilla = plantillasPorId.get(String(a?.plantillaId ?? ""));
    const diaSemana = Number.parseInt(a?.diaSemana, 10);
    if (!plantilla || vistas.has(plantilla.id)) continue;
    if (!Number.isInteger(diaSemana) || diaSemana < 1 || diaSemana > 5) continue;
    vistas.add(plantilla.id);

    const dias = planificarDias({
      periodicidad: plantilla.periodicidad,
      cantidadPlanificada: plantilla.cantidadPlanificada,
      diaSemana,
      mes,
      anio: anioNum,
    });

    for (const dia of dias) {
      valores.push({
        usuarioId,
        plantillaId: plantilla.id,
        fecha: construirFecha(anioNum, mes, dia),
        mes,
        anio: anioNum,
        semanaMes: semanaDelMes(dia),
        planificado: 1,
        ejecutado: 0,
        noEjecutado: 0,
      });
    }
  }

  const delMes = and(
    eq(registrosCronograma.usuarioId, usuarioId),
    eq(registrosCronograma.mes, mes),
    eq(registrosCronograma.anio, anioNum)
  );

  try {
    await db.transaction(async (tx) => {
      // 1. Quitar todas las P del mes (las ejecuciones se mantienen).
      await tx.update(registrosCronograma).set({ planificado: 0 }).where(delMes);

      // 2. Marcar las nuevas P sin tocar ejecutado / no_ejecutado de filas existentes.
      for (let i = 0; i < valores.length; i += 500) {
        await tx
          .insert(registrosCronograma)
          .values(valores.slice(i, i + 500))
          .onConflictDoUpdate({
            target: [
              registrosCronograma.usuarioId,
              registrosCronograma.plantillaId,
              registrosCronograma.fecha,
            ],
            set: { planificado: 1 },
          });
      }

      // 3. Limpiar filas que quedaron vacías (sin P, sin ejecución y sin N).
      await tx
        .delete(registrosCronograma)
        .where(
          and(
            delMes,
            eq(registrosCronograma.planificado, 0),
            eq(registrosCronograma.ejecutado, 0),
            eq(registrosCronograma.noEjecutado, 0)
          )
        );
    });

    const sincronizacion = await sincronizarSinInterrumpir({ usuarioId, mes, anio: anioNum, asignadoPor: auth.usuario.id });
    revalidatePath("/");
    return { success: true, planificadas: valores.length, formatos: vistas.size, formularios: sincronizacion.creadas };
  } catch (error) {
    console.error("[cronogramas] Error al generar el cronograma:", error);
    return { success: false, error: "No se pudo generar el cronograma." };
  }
}

const MAX_OBSERVACION = 1000;

/**
 * El inspector registra el resultado de UNA inspección asignada: cantidad ejecutada o "N",
 * más una observación/hallazgo. El usuario sale de la sesión (nunca del cliente) y solo se
 * actualizan filas propias que ya están planificadas (P). La P no se puede cambiar.
 * @param {{ plantillaId: string, mes: string, anio: number, dia: number, ejecutado: number, noEjecutado: boolean, observacion?: string }} entrada
 */
export async function registrarEjecucion(entrada) {
  const auth = await autorizarAccion();
  if (auth.error) return { success: false, error: auth.error };
  const { usuario } = auth;

  const plantillaId = String(entrada?.plantillaId ?? "");
  const mes = entrada?.mes;
  const anioNum = Number.parseInt(entrada?.anio, 10);
  const dia = Number.parseInt(entrada?.dia, 10);

  if (!UUID_RE.test(plantillaId)) return { success: false, error: "Inspección inválida." };
  if (!MESES.includes(mes)) return { success: false, error: "Mes inválido." };
  if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) {
    return { success: false, error: "Año inválido." };
  }
  if (!Number.isInteger(dia) || dia < 1 || dia > diasEnMes(mes, anioNum)) {
    return { success: false, error: "Día inválido." };
  }

  // No se puede registrar el resultado de un día que aún no llega.
  const ahora = new Date();
  const hoyISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
  if (construirFecha(anioNum, mes, dia) > hoyISO) {
    return { success: false, error: "No puede registrar una inspección de un día que aún no llega." };
  }

  const noEjecutado = entrada?.noEjecutado === true ? 1 : 0;
  const ejecutado = noEjecutado ? 0 : enteroNoNegativo(entrada?.ejecutado);
  const observacion = String(entrada?.observacion ?? "").trim().slice(0, MAX_OBSERVACION) || null;

  try {
    const actualizadas = await db
      .update(registrosCronograma)
      .set({ ejecutado, noEjecutado, observacion, actualizadoPor: usuario.id, actualizadoEn: new Date() })
      .where(
        and(
          eq(registrosCronograma.usuarioId, usuario.id),
          eq(registrosCronograma.plantillaId, plantillaId),
          eq(registrosCronograma.fecha, construirFecha(anioNum, mes, dia)),
          eq(registrosCronograma.planificado, 1)
        )
      )
      .returning({ id: registrosCronograma.id });

    if (actualizadas.length === 0) {
      return { success: false, error: "Esa inspección no está asignada a usted en ese día." };
    }

    // Una "N" anula el formulario pendiente que generó esa P.
    if (noEjecutado) await sincronizarSinInterrumpir({ usuarioId: usuario.id, mes, anio: anioNum });
    revalidatePath("/mi-cronograma");
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[cronogramas] Error al registrar ejecución:", error);
    return { success: false, error: "No se pudo guardar." };
  }
}

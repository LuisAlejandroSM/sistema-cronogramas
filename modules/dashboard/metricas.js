// Cálculo de métricas del dashboard. Funciones puras (sin acceso a BD).
//
// Definiciones (mismas reglas que el formato CVC-SST-FT-11):
//   P  = inspecciones planificadas (celdas con "P").
//   E  = inspecciones ejecutadas (suma de la fila inferior).
//   N  = inspecciones marcadas como no ejecutadas.
// "A la fecha" = solo días del mes hasta hoy (incluido). En meses pasados es el mes completo y
// en meses futuros no hay días transcurridos. Así un mes en curso no parece incumplido solo
// porque aún faltan días.

import { DIAS_SEMANA, MESES, diaDeFecha, diaDeLaSemana, diasEnMes, numeroMes } from "@/modules/cronogramas/constants";

// Umbrales de cumplimiento (iguales a los colores de la matriz).
export const UMBRAL_CUMPLE = 1;
export const UMBRAL_RIESGO = 0.7;

export function razon(numerador, denominador) {
  return denominador > 0 ? numerador / denominador : null;
}

/** @returns {"cumple"|"riesgo"|"critico"|"sin-datos"} */
export function estadoCumplimiento(valor) {
  if (valor === null || valor === undefined) return "sin-datos";
  if (valor >= UMBRAL_CUMPLE) return "cumple";
  if (valor >= UMBRAL_RIESGO) return "riesgo";
  return "critico";
}

// Último día del mes que ya transcurrió respecto a hoy (0 si el mes es futuro).
export function diaDeCorte(mes, anio, hoy) {
  const n = numeroMes(mes);
  const dias = diasEnMes(mes, anio);
  const actual = hoy.anio * 12 + hoy.mes;
  const objetivo = anio * 12 + n;
  if (objetivo < actual) return dias;
  if (objetivo > actual) return 0;
  return Math.min(hoy.dia, dias);
}

// Los `cantidad` meses que terminan en (mes, anio), del más antiguo al más reciente.
export function mesesAnteriores(mes, anio, cantidad) {
  const lista = [];
  let m = numeroMes(mes) - 1;
  let a = anio;
  for (let i = 0; i < cantidad; i++) {
    lista.unshift({ mes: MESES[m], anio: a });
    m -= 1;
    if (m < 0) {
      m = 11;
      a -= 1;
    }
  }
  return lista;
}

function acumular(mapa, clave, crear) {
  if (!mapa.has(clave)) mapa.set(clave, crear());
  return mapa.get(clave);
}

/**
 * Calcula todas las métricas del mes a partir del detalle de registros.
 * @param {Array} detalle filas de obtenerDetalleMes
 * @param {{ mes: string, anio: number, hoy: { dia: number, mes: number, anio: number } }} contexto
 */
export function calcularMetricas(detalle, { mes, anio, hoy }) {
  const totalDias = diasEnMes(mes, anio);
  const corte = diaDeCorte(mes, anio, hoy);
  const mesEnCurso = numeroMes(mes) === hoy.mes && anio === hoy.anio;

  const total = {
    planificadas: 0,
    ejecutadas: 0,
    noEjecutadas: 0,
    planificadasALaFecha: 0,
    ejecutadasALaFecha: 0,
    enFecha: 0,
    pendientes: 0,
    fueraDePlan: 0,
    restantes: 0,
    noEjecutadasALaFecha: 0,
  };
  const porDia = Array.from({ length: totalDias }, () => ({ p: 0, e: 0 }));
  const porDiaSemana = Object.fromEntries([1, 2, 3, 4, 5].map((d) => [d, { p: 0, e: 0 }]));
  const porInspector = new Map();
  const porRol = new Map();
  const porPlantilla = new Map();
  const pendientes = new Map();

  for (const r of detalle) {
    const dia = diaDeFecha(r.fecha);
    const p = r.planificado > 0 ? 1 : 0;
    const e = Number(r.ejecutado) || 0;
    const n = r.noEjecutado > 0 ? 1 : 0;
    const transcurrido = dia <= corte;

    const insp = acumular(porInspector, r.usuarioId, () => ({
      id: r.usuarioId,
      nombre: r.nombre,
      rol: r.rol,
      planificadas: 0,
      ejecutadas: 0,
      noEjecutadas: 0,
      pALaFecha: 0,
      eALaFecha: 0,
      pendientes: 0,
    }));
    const rol = acumular(porRol, r.rol, () => ({ rol: r.rol, pALaFecha: 0, eALaFecha: 0, planificadas: 0 }));
    const plantilla = acumular(porPlantilla, `${r.rol}|${r.plantillaId}`, () => ({
      id: r.plantillaId,
      elemento: r.elemento,
      codigo: r.codigo,
      rol: r.rol,
      pALaFecha: 0,
      eALaFecha: 0,
      noEjecutadas: 0,
    }));

    total.planificadas += p;
    total.ejecutadas += e;
    total.noEjecutadas += n;
    insp.planificadas += p;
    insp.ejecutadas += e;
    insp.noEjecutadas += n;
    rol.planificadas += p;
    plantilla.noEjecutadas += n;
    porDia[dia - 1].p += p;
    porDia[dia - 1].e += e;

    const dow = diaDeLaSemana(mes, anio, dia);
    if (porDiaSemana[dow]) {
      porDiaSemana[dow].p += p;
      porDiaSemana[dow].e += e;
    }

    if (e > 0 && !p) total.fueraDePlan += e;

    if (transcurrido) {
      total.planificadasALaFecha += p;
      total.ejecutadasALaFecha += e;
      insp.pALaFecha += p;
      insp.eALaFecha += e;
      rol.pALaFecha += p;
      rol.eALaFecha += e;
      plantilla.pALaFecha += p;
      plantilla.eALaFecha += e;
      if (p && e > 0) total.enFecha += 1;
      if (p && n) total.noEjecutadasALaFecha += 1;

      // Planificada en un día ya pasado sin cantidad ni "N": falta registrar el resultado.
      // En el mes en curso, lo planificado para hoy todavía no se considera vencido.
      const vencida = mesEnCurso ? dia < hoy.dia : true;
      if (p && e === 0 && !n && vencida) {
        total.pendientes += 1;
        insp.pendientes += 1;
        const pend = acumular(pendientes, `${r.usuarioId}|${r.plantillaId}`, () => ({
          inspector: r.nombre,
          elemento: r.elemento,
          codigo: r.codigo,
          dias: [],
        }));
        pend.dias.push(dia);
      }
    } else if (p) {
      total.restantes += 1;
    }
  }

  // Curva acumulada (burn-up): planificado en todo el mes, ejecutado solo hasta hoy.
  let accP = 0;
  let accE = 0;
  const acumulado = porDia.map((d, i) => {
    accP += d.p;
    accE += d.e;
    return { dia: i + 1, planificado: accP, ejecutado: i + 1 <= corte ? accE : null };
  });

  const inspectores = [...porInspector.values()]
    .map((i) => ({ ...i, efectividad: razon(i.eALaFecha, i.pALaFecha) }))
    .sort((a, b) => (b.efectividad ?? -1) - (a.efectividad ?? -1) || a.nombre.localeCompare(b.nombre));

  const roles = [...porRol.values()].map((r) => ({ ...r, efectividad: razon(r.eALaFecha, r.pALaFecha) }));

  const formatosCriticos = [...porPlantilla.values()]
    .filter((p) => p.pALaFecha > 0)
    .map((p) => ({ ...p, efectividad: razon(p.eALaFecha, p.pALaFecha) }))
    .sort((a, b) => a.efectividad - b.efectividad || b.pALaFecha - a.pALaFecha)
    .slice(0, 8);

  const listaPendientes = [...pendientes.values()]
    .map((p) => ({ ...p, cantidad: p.dias.length }))
    .sort((a, b) => b.cantidad - a.cantidad || a.inspector.localeCompare(b.inspector))
    .slice(0, 10);

  return {
    corte,
    totalDias,
    total: {
      ...total,
      efectividad: razon(total.ejecutadasALaFecha, total.planificadasALaFecha),
      cumplimientoEnFecha: razon(total.enFecha, total.planificadasALaFecha),
      inspectoresConPlan: [...porInspector.values()].filter((i) => i.planificadas > 0).length,
    },
    // Qué pasó con cada inspección planificada hasta hoy (las tres partes suman P a la fecha).
    resultadoPlan: {
      ejecutadas: total.enFecha,
      noEjecutadas: total.noEjecutadasALaFecha,
      sinRegistro: Math.max(0, total.planificadasALaFecha - total.enFecha - total.noEjecutadasALaFecha),
    },
    acumulado,
    cargaSemanal: [1, 2, 3, 4, 5].map((d) => ({ etiqueta: DIAS_SEMANA[d], ...porDiaSemana[d] })),
    inspectores,
    roles,
    formatosCriticos,
    pendientes: listaPendientes,
  };
}

// Constantes y utilidades puras del módulo de cronogramas.
// Sin dependencias de servidor: se pueden importar desde Server y Client Components.

import { ROL_INSPECTOR_SIHO, ROL_PARAMEDICO, ROL_RESCATISTA } from "@/db/roles";

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const ANIOS = [2025, 2026, 2027];

export const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

// Abreviaturas usadas en la fila de encabezado del formato (0 = domingo).
export const DIAS_SEMANA = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];

// Pestañas del cronograma (una por rol operativo). La primera es la vista por defecto.
export const VISTAS = [
  { clave: "inspector-siho", etiqueta: "Inspectores SIHO", rol: ROL_INSPECTOR_SIHO },
  { clave: "paramedicos", etiqueta: "Paramédicos", rol: ROL_PARAMEDICO },
  { clave: "rescatistas", etiqueta: "Rescatistas", rol: ROL_RESCATISTA },
];

export function vistaPorClave(clave) {
  return VISTAS.find((v) => v.clave === clave) ?? VISTAS[0];
}

export function vistaPorRol(rol) {
  return VISTAS.find((v) => v.rol === rol) ?? VISTAS[0];
}

// Número de mes (1-12) a partir del nombre. Devuelve 0 si el nombre no es válido.
export function numeroMes(mes) {
  return MESES.indexOf(mes) + 1;
}

// Cantidad real de días del mes (28-31).
export function diasEnMes(mes, anio) {
  const n = numeroMes(mes);
  if (!n) return 31;
  return new Date(Date.UTC(anio, n, 0)).getUTCDate();
}

// Día de la semana (0 = domingo) de un día del mes.
export function diaDeLaSemana(mes, anio, dia) {
  return new Date(Date.UTC(anio, numeroMes(mes) - 1, dia)).getUTCDay();
}

export function esFinDeSemana(mes, anio, dia) {
  const d = diaDeLaSemana(mes, anio, dia);
  return d === 0 || d === 6;
}

// Fecha ISO 'YYYY-MM-DD' para la columna `date` de PostgreSQL.
export function construirFecha(anio, mes, dia) {
  const mm = String(numeroMes(mes)).padStart(2, "0");
  const dd = String(dia).padStart(2, "0");
  return `${anio}-${mm}-${dd}`;
}

// Día del mes a partir de 'YYYY-MM-DD' (Drizzle devuelve `date` como string).
export function diaDeFecha(fecha) {
  if (fecha instanceof Date) return fecha.getUTCDate();
  return parseInt(String(fecha).slice(8, 10), 10);
}

export const SEMANAS = ["Semana 1", "Semana 2", "Semana 3", "Semana 4", "Semana 5"];

export function semanaDelMes(dia) {
  if (dia <= 7) return "Semana 1";
  if (dia <= 14) return "Semana 2";
  if (dia <= 21) return "Semana 3";
  if (dia <= 28) return "Semana 4";
  return "Semana 5";
}

// Efectividad igual que el Excel: IF(P > 0, E / P, 1).
export function efectividad(totalP, totalE) {
  return totalP > 0 ? totalE / totalP : 1;
}

// Normaliza los parámetros de la URL a valores válidos.
export function normalizarFiltros(searchParams, fechaReferencia) {
  const leer = (k) => {
    const v = searchParams?.[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const vista = vistaPorClave(leer("vista"));

  const mesParam = leer("mes");
  const mes = MESES.find((m) => m.toLowerCase() === String(mesParam ?? "").toLowerCase())
    ?? MESES[fechaReferencia.getMonth()];

  const anioNum = Number.parseInt(leer("anio"), 10);
  const anioActual = fechaReferencia.getFullYear();
  const anio = ANIOS.includes(anioNum)
    ? anioNum
    : ANIOS.includes(anioActual)
      ? anioActual
      : ANIOS[ANIOS.length - 1];

  const usuarioParam = leer("usuario");
  const usuarioId = /^[0-9a-f-]{36}$/i.test(String(usuarioParam ?? "")) ? usuarioParam : null;

  return { vista: vista.clave, rol: vista.rol, mes, anio, usuarioId };
}

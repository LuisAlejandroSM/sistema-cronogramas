// Reglas para generar automáticamente las "P" de un cronograma mensual.
// Funciones puras: se usan en el Server Action (fuente de verdad) y en la vista previa del cliente.

import { diaDeLaSemana, diasEnMes } from "./constants";

// Días hábiles que se pueden asignar a un formato (1 = lunes ... 5 = viernes).
export const DIAS_ASIGNABLES = [
  { valor: 1, etiqueta: "LUN" },
  { valor: 2, etiqueta: "MAR" },
  { valor: 3, etiqueta: "MIE" },
  { valor: 4, etiqueta: "JUE" },
  { valor: 5, etiqueta: "VIE" },
];

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

/**
 * Clasifica el texto libre de "Periodicidad" del formato.
 * @returns {"diaria"|"interdiaria"|"semanal"|"quincenal"|"primera-quincena"|"mensual"}
 */
export function tipoPeriodicidad(periodicidad) {
  const p = normalizar(periodicidad);
  if (p.includes("INTERDIARI")) return "interdiaria";
  if (p.includes("DIARI")) return "diaria";
  if (p.includes("PRIMERA QUINCENA")) return "primera-quincena";
  if (p.includes("QUINCENAL")) return "quincenal";
  if (p.includes("SEMANAL")) return "semanal";
  return "mensual";
}

// Indica si el día de la semana elegido influye en el resultado.
export function usaDiaDeSemana(periodicidad) {
  const tipo = tipoPeriodicidad(periodicidad);
  return tipo !== "diaria" && tipo !== "interdiaria";
}

export const DESCRIPCION_REGLA = {
  diaria: "Todos los días hábiles",
  interdiaria: "Un día hábil sí y otro no",
  semanal: "Una vez por semana, hasta la cantidad indicada",
  quincenal: "Una vez en cada quincena",
  "primera-quincena": "Una vez por semana dentro de los días 1 al 15",
  mensual: "Una vez al mes",
};

// Días hábiles (LUN-VIE) del mes.
export function diasHabiles(mes, anio) {
  const dias = [];
  for (let d = 1; d <= diasEnMes(mes, anio); d++) {
    const dow = diaDeLaSemana(mes, anio, d);
    if (dow >= 1 && dow <= 5) dias.push(d);
  }
  return dias;
}

// Todas las fechas del mes que caen en el día de la semana indicado (1 = lunes).
function diasConDiaSemana(mes, anio, diaSemana) {
  const dias = [];
  for (let d = 1; d <= diasEnMes(mes, anio); d++) {
    if (diaDeLaSemana(mes, anio, d) === diaSemana) dias.push(d);
  }
  return dias;
}

/**
 * Calcula los días del mes en que se planifica ("P") un formato.
 * @param {{ periodicidad: string, cantidadPlanificada?: number, diaSemana: number, mes: string, anio: number }} p
 * @returns {number[]} días del mes ordenados
 */
export function planificarDias({ periodicidad, cantidadPlanificada, diaSemana, mes, anio }) {
  const tipo = tipoPeriodicidad(periodicidad);
  const habiles = diasHabiles(mes, anio);
  const semanales = diasConDiaSemana(mes, anio, diaSemana);

  switch (tipo) {
    case "diaria":
      return habiles;
    case "interdiaria":
      return habiles.filter((_, i) => i % 2 === 0);
    case "semanal": {
      // Igual que el formato: una P por semana, limitada por la "Cantidad" del formato
      // (p. ej. cantidad 4 en un mes con 5 lunes deja libre la quinta semana).
      const tope = cantidadPlanificada > 0 ? cantidadPlanificada : semanales.length;
      return semanales.slice(0, tope);
    }
    case "quincenal": {
      const primera = semanales.find((d) => d <= 15);
      const segunda = semanales.find((d) => d > 15);
      return [primera, segunda].filter(Boolean);
    }
    case "primera-quincena":
      return semanales.filter((d) => d <= 15);
    default:
      return semanales.slice(0, 1);
  }
}

// Día de la semana por defecto: reparte los formatos de lunes a viernes para equilibrar la carga.
export function diaSemanaPorDefecto(indice) {
  return (indice % 5) + 1;
}

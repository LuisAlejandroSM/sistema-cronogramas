// Métricas de las respuestas de un formulario (pestaña "Resultados" del administrador).
// Funciones puras: la normalización corre en el servidor y la agregación en el navegador
// (para filtrar por inspector y período sin volver a consultar).

import { esNegativa, esNoAplica, TIPOS_CAMPO } from "./campos";

const LIMITE_TEXTOS = 50;
const LIMITE_FOTOS = 12;

/**
 * Convierte las respuestas guardadas a una forma estable para comparar entre envíos.
 * Las listas de verificación se guardan por posición del ítem ({ "0": "B" }); aquí se pasan
 * a { "TEXTO DEL ÍTEM": "B" } usando la copia de campos de ESA respuesta, para que editar
 * el formulario después (agregar o mover ítems) no mezcle resultados.
 */
export function normalizarRespuesta(camposSnapshot, respuestas) {
  const valores = {};
  for (const campo of camposSnapshot ?? []) {
    const valor = respuestas?.[campo.id];
    if (campo.tipo === "tabla_verificacion") {
      const porTexto = {};
      for (const [indice, col] of Object.entries(valor && typeof valor === "object" ? valor : {})) {
        const fila = campo.filas?.[Number(indice)];
        if (fila) porTexto[fila] = col;
      }
      valores[campo.id] = porTexto;
    } else {
      valores[campo.id] = valor ?? null;
    }
  }
  return valores;
}

function vacio(valor) {
  if (valor === null || valor === undefined) return true;
  if (Array.isArray(valor)) return valor.length === 0;
  if (typeof valor === "object") return Object.keys(valor).length === 0;
  return String(valor).trim() === "";
}

// Fechas que indican vencimiento/vigencia: se cuentan las que ya estaban vencidas al inspeccionar.
const RE_VENCIMIENTO = /venc|vigen|caduc/i;

/** Resumen de una pregunta sobre las respuestas filtradas. */
function resumirCampo(campo, respuestas) {
  const conValor = respuestas.filter((r) => !vacio(r.valores[campo.id]));
  const base = { id: campo.id, tipo: campo.tipo, etiqueta: campo.etiqueta, respondidas: conValor.length, total: respuestas.length };

  switch (campo.tipo) {
    case "si_no": {
      const si = conValor.filter((r) => r.valores[campo.id] === true).length;
      return { ...base, opciones: [{ etiqueta: "Sí", cantidad: si }, { etiqueta: "No", cantidad: conValor.length - si }] };
    }
    case "opcion_unica":
    case "opcion_multiple": {
      const cuenta = new Map(campo.opciones.map((o) => [o, 0]));
      for (const r of conValor) {
        const lista = campo.tipo === "opcion_multiple" ? r.valores[campo.id] : [r.valores[campo.id]];
        // Opciones que ya no existen en el formulario se muestran igual (respuestas antiguas).
        for (const o of lista) cuenta.set(o, (cuenta.get(o) ?? 0) + 1);
      }
      return { ...base, opciones: [...cuenta].map(([etiqueta, cantidad]) => ({ etiqueta, cantidad })) };
    }
    case "numero": {
      const nums = conValor.map((r) => Number(r.valores[campo.id])).filter(Number.isFinite);
      if (nums.length === 0) return { ...base, estadisticas: null };
      return {
        ...base,
        estadisticas: {
          promedio: nums.reduce((a, b) => a + b, 0) / nums.length,
          minimo: Math.min(...nums),
          maximo: Math.max(...nums),
        },
      };
    }
    case "fecha": {
      const esVencimiento = RE_VENCIMIENTO.test(campo.etiqueta);
      const fechas = conValor.map((r) => ({ valor: String(r.valores[campo.id]), envio: r.enviadaEn.slice(0, 10), r }));
      const vencidas = esVencimiento ? fechas.filter((f) => f.valor < f.envio) : [];
      const ordenadas = fechas.map((f) => f.valor).sort();
      return {
        ...base,
        esVencimiento,
        vencidas: vencidas.map((f) => ({ inspector: f.r.inspector, valor: f.valor, asignacionId: f.r.id })),
        primera: ordenadas[0] ?? null,
        ultima: ordenadas.at(-1) ?? null,
      };
    }
    case "texto": {
      // Respuestas cortas (placa, centro de trabajo…): se agrupan los valores iguales.
      const cuenta = new Map();
      for (const r of conValor) {
        const texto = String(r.valores[campo.id]).trim();
        const clave = texto.toLocaleUpperCase("es");
        const actual = cuenta.get(clave) ?? { texto, cantidad: 0 };
        actual.cantidad += 1;
        cuenta.set(clave, actual);
      }
      const agrupados = [...cuenta.values()].sort((a, b) => b.cantidad - a.cantidad || a.texto.localeCompare(b.texto));
      return { ...base, agrupados: agrupados.slice(0, LIMITE_TEXTOS), distintos: agrupados.length };
    }
    case "parrafo":
      return {
        ...base,
        textos: conValor.slice(0, LIMITE_TEXTOS).map((r) => ({
          asignacionId: r.id,
          inspector: r.inspector,
          fecha: r.enviadaTexto,
          texto: String(r.valores[campo.id]),
        })),
      };
    case "tabla_verificacion": {
      // Ítems actuales primero, luego los que solo existen en respuestas antiguas.
      const textos = [...campo.filas];
      for (const r of conValor) for (const fila of Object.keys(r.valores[campo.id])) if (!textos.includes(fila)) textos.push(fila);
      const columnas = [...campo.columnas];
      for (const r of conValor) for (const col of Object.values(r.valores[campo.id])) if (!columnas.includes(col)) columnas.push(col);

      const filas = textos.map((texto) => {
        const cuenta = Object.fromEntries(columnas.map((c) => [c, 0]));
        let marcadas = 0;
        for (const r of conValor) {
          const col = r.valores[campo.id][texto];
          if (col !== undefined) {
            cuenta[col] = (cuenta[col] ?? 0) + 1;
            marcadas += 1;
          }
        }
        const fallas = columnas.filter(esNegativa).reduce((a, c) => a + cuenta[c], 0);
        const aplica = marcadas - columnas.filter(esNoAplica).reduce((a, c) => a + cuenta[c], 0);
        return { texto, cuenta, marcadas, fallas, tasaFalla: aplica > 0 ? fallas / aplica : null };
      });
      return { ...base, columnas, filas, fallas: filas.reduce((a, f) => a + f.fallas, 0) };
    }
    case "foto":
    case "firma": {
      const fotos = conValor.flatMap((r) => r.valores[campo.id].map((id) => ({ id, asignacionId: r.id, inspector: r.inspector, fecha: r.enviadaTexto })));
      return { ...base, cantidad: fotos.length, fotos: fotos.slice(0, LIMITE_FOTOS) };
    }
    default:
      return base;
  }
}

/** Fallas de listas de verificación en una respuesta (para la tabla de respuestas). */
export function fallasDeRespuesta(campos, respuesta) {
  let total = 0;
  for (const c of campos) {
    if (c.tipo !== "tabla_verificacion") continue;
    for (const col of Object.values(respuesta.valores[c.id] ?? {})) if (esNegativa(col)) total += 1;
  }
  return total;
}

/**
 * Todas las métricas del formulario para las respuestas y asignaciones ya filtradas.
 * @param {object[]} campos campos actuales del formulario
 * @param {object[]} respuestas [{ id, inspector, enviadaEn, enviadaTexto, aTiempo, valores }]
 * @param {object[]} asignaciones [{ estado, vencida }]
 */
export function calcularResultados(campos, respuestas, asignaciones) {
  const preguntas = campos.filter((c) => TIPOS_CAMPO[c.tipo]?.esPregunta);
  const resumenes = preguntas.map((c) => resumirCampo(c, respuestas));

  const conLimite = respuestas.filter((r) => r.aTiempo !== null);

  // Ítems con más fallas entre todas las listas de verificación.
  const peoresItems = resumenes
    .filter((r) => r.tipo === "tabla_verificacion")
    .flatMap((r) => r.filas.filter((f) => f.fallas > 0).map((f) => ({ ...f, lista: r.etiqueta })))
    .sort((a, b) => b.fallas - a.fallas || (b.tasaFalla ?? 0) - (a.tasaFalla ?? 0))
    .slice(0, 8);

  return {
    indicadores: {
      asignadas: asignaciones.length,
      respondidas: asignaciones.filter((a) => a.estado === "completada").length,
      pendientes: asignaciones.filter((a) => a.estado === "pendiente").length,
      vencidas: asignaciones.filter((a) => a.vencida).length,
      enviadas: respuestas.length,
      aTiempo: conLimite.length ? conLimite.filter((r) => r.aTiempo).length / conLimite.length : null,
      conLimite: conLimite.length,
    },
    peoresItems,
    resumenes,
  };
}

/** Texto de una respuesta normalizada para el CSV. */
function textoCsv(campo, valor) {
  if (vacio(valor)) return "";
  switch (campo.tipo) {
    case "si_no":
      return valor ? "Sí" : "No";
    case "opcion_multiple":
      return valor.join(", ");
    case "fecha": {
      const [a, m, d] = String(valor).split("-");
      return `${d}/${m}/${a}`;
    }
    case "foto":
      return `${valor.length} foto(s)`;
    case "firma":
      return "Firmado";
    default:
      return String(valor);
  }
}

/**
 * CSV (separado por ";" para que Excel en español lo abra en columnas).
 * Las listas de verificación generan una columna por ítem.
 */
export function generarCsv(campos, respuestas) {
  const columnas = [
    { titulo: "Inspector", valor: (r) => r.inspector },
    { titulo: "Rol", valor: (r) => r.rol },
    { titulo: "Enviada", valor: (r) => r.enviadaTexto },
    { titulo: "A tiempo", valor: (r) => (r.aTiempo === null ? "Sin límite" : r.aTiempo ? "Sí" : "No") },
  ];
  for (const c of campos) {
    if (!TIPOS_CAMPO[c.tipo]?.esPregunta) continue;
    if (c.tipo === "tabla_verificacion") {
      for (const fila of c.filas) columnas.push({ titulo: `${c.etiqueta} — ${fila}`, valor: (r) => r.valores[c.id]?.[fila] ?? "" });
    } else {
      columnas.push({ titulo: c.etiqueta, valor: (r) => textoCsv(c, r.valores[c.id]) });
    }
  }
  const celda = (v) => {
    const s = String(v ?? "").replace(/\r?\n/g, " ");
    return /[";]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [columnas.map((c) => celda(c.titulo)).join(";"), ...respuestas.map((r) => columnas.map((c) => celda(c.valor(r))).join(";"))];
  return `﻿${lineas.join("\r\n")}`;
}

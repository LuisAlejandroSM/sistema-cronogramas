// Tipos de pregunta del constructor de formularios y su validación.
// Funciones puras: las usa el constructor (cliente), el formulario del inspector (cliente)
// y el servidor, que SIEMPRE vuelve a validar antes de guardar.

export const TIPOS_CAMPO = {
  seccion: { etiqueta: "Sección / título", descripcion: "Separa el formulario en partes", esPregunta: false },
  texto: { etiqueta: "Texto corto", descripcion: "Una línea (máx. 500 caracteres)", esPregunta: true },
  parrafo: { etiqueta: "Texto largo", descripcion: "Varias líneas (máx. 5000 caracteres)", esPregunta: true },
  numero: { etiqueta: "Número", descripcion: "Cantidad, medida, lectura…", esPregunta: true },
  si_no: { etiqueta: "Sí / No", descripcion: "Respuesta de dos opciones", esPregunta: true },
  opcion_unica: { etiqueta: "Opción única", descripcion: "Elegir una de varias", esPregunta: true },
  opcion_multiple: { etiqueta: "Opción múltiple", descripcion: "Marcar varias", esPregunta: true },
  fecha: { etiqueta: "Fecha", descripcion: "Día del calendario", esPregunta: true },
  tabla_verificacion: {
    etiqueta: "Lista de verificación",
    descripcion: "Varios ítems con las mismas columnas (B / M / N/A…)",
    esPregunta: true,
  },
  foto: { etiqueta: "Foto", descripcion: "Evidencia desde la cámara o galería", esPregunta: true },
  firma: { etiqueta: "Firma", descripcion: "Firmar con el dedo en la pantalla", esPregunta: true },
};

// Respuestas de una lista de verificación que indican una falla (hallazgo).
export const RESPUESTAS_NEGATIVAS = ["M", "MALO", "NO", "NO CUMPLE", "DEFICIENTE"];

export function esNegativa(valor) {
  return RESPUESTAS_NEGATIVAS.includes(String(valor ?? "").trim().toUpperCase());
}

// Columnas neutras (no cuentan como cumple ni como falla).
export function esNoAplica(valor) {
  return ["N/A", "NA", "NO APLICA"].includes(String(valor ?? "").trim().toUpperCase());
}

// Tipos que guardan imágenes en el servidor (fotos y firmas).
export const TIPOS_CON_ARCHIVO = ["foto", "firma"];

// Columnas predefinidas para las listas de verificación (las de los formatos CVC-SST).
export const COLUMNAS_PREDEFINIDAS = [
  ["B", "M", "N/A"],
  ["SI", "NO"],
  ["SI", "NO", "N/A"],
  ["CUMPLE", "NO CUMPLE", "N/A"],
];

// Ancho de la pregunta en pantallas grandes (en el celular siempre ocupa toda la fila).
export const ANCHOS = {
  completo: "Ancho completo",
  mitad: "Mitad",
  tercio: "Un tercio",
};
// Tipos que siempre ocupan el ancho completo.
const SIEMPRE_COMPLETO = ["seccion", "parrafo", "tabla_verificacion", "foto", "firma", "opcion_multiple"];

export const MAX_CAMPOS = 150;
export const MAX_OPCIONES = 30;
export const MAX_FILAS_TABLA = 100;
export const MAX_COLUMNAS_TABLA = 6;
export const MAX_FOTOS_POR_CAMPO = 10;
export const LARGO_TEXTO = 500;
export const LARGO_PARRAFO = 5000;

const ID_CAMPO_RE = /^c_[a-z0-9]{6,20}$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function nuevoIdCampo() {
  return `c_${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
}

export function campoVacio(tipo) {
  const campo = { id: nuevoIdCampo(), tipo, etiqueta: "", ayuda: "", obligatorio: tipo !== "seccion", ancho: "completo" };
  if (tipo === "opcion_unica" || tipo === "opcion_multiple") campo.opciones = ["Opción 1", "Opción 2"];
  if (tipo === "foto") campo.maxFotos = 3;
  if (tipo === "fecha") campo.hoyPorDefecto = false;
  if (tipo === "tabla_verificacion") {
    campo.filas = ["Ítem 1", "Ítem 2"];
    campo.columnas = [...COLUMNAS_PREDEFINIDAS[0]];
  }
  return campo;
}

export function anchoEfectivo(campo) {
  return SIEMPRE_COMPLETO.includes(campo.tipo) ? "completo" : ANCHOS[campo.ancho] ? campo.ancho : "completo";
}

function texto(valor, maximo) {
  return String(valor ?? "").trim().slice(0, maximo);
}

// Lista de textos sin vacíos ni repetidos (sin distinguir mayúsculas).
function listaUnica(entrada, maximo) {
  const vistos = new Set();
  return (Array.isArray(entrada) ? entrada : [])
    .map((o) => texto(o, maximo))
    .filter((o) => {
      const clave = o.toLocaleLowerCase("es");
      if (!o || vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
}

/**
 * Normaliza y valida la definición de un formulario armada en el constructor.
 * @returns {{ ok: true, campos: object[] } | { ok: false, error: string }}
 */
export function normalizarCampos(entrada) {
  if (!Array.isArray(entrada)) return { ok: false, error: "Formato de preguntas inválido." };
  if (entrada.length > MAX_CAMPOS) return { ok: false, error: `Máximo ${MAX_CAMPOS} elementos por formulario.` };

  const vistos = new Set();
  const campos = [];
  for (const [i, c] of entrada.entries()) {
    const n = i + 1;
    if (!c || !TIPOS_CAMPO[c.tipo]) return { ok: false, error: `El elemento ${n} tiene un tipo inválido.` };
    if (!ID_CAMPO_RE.test(String(c.id)) || vistos.has(c.id)) {
      return { ok: false, error: `El elemento ${n} tiene un identificador inválido.` };
    }
    vistos.add(c.id);

    const etiqueta = texto(c.etiqueta, 300);
    if (!etiqueta) return { ok: false, error: `Escriba el texto de la pregunta ${n}.` };

    const campo = {
      id: c.id,
      tipo: c.tipo,
      etiqueta,
      ayuda: texto(c.ayuda, 500),
      obligatorio: TIPOS_CAMPO[c.tipo].esPregunta ? c.obligatorio === true : false,
      ancho: anchoEfectivo(c),
    };

    if (c.tipo === "opcion_unica" || c.tipo === "opcion_multiple") {
      const opciones = listaUnica(c.opciones, 200);
      if (opciones.length < 2) return { ok: false, error: `La pregunta "${etiqueta}" necesita al menos 2 opciones distintas.` };
      if (opciones.length > MAX_OPCIONES) return { ok: false, error: `La pregunta "${etiqueta}" tiene demasiadas opciones.` };
      campo.opciones = opciones;
    }
    if (c.tipo === "tabla_verificacion") {
      const filas = listaUnica(c.filas, 300);
      const columnas = listaUnica(c.columnas, 40);
      if (filas.length < 1) return { ok: false, error: `La lista "${etiqueta}" necesita al menos 1 ítem.` };
      if (filas.length > MAX_FILAS_TABLA) return { ok: false, error: `La lista "${etiqueta}" tiene más de ${MAX_FILAS_TABLA} ítems.` };
      if (columnas.length < 2 || columnas.length > MAX_COLUMNAS_TABLA) {
        return { ok: false, error: `La lista "${etiqueta}" necesita entre 2 y ${MAX_COLUMNAS_TABLA} columnas distintas.` };
      }
      campo.filas = filas;
      campo.columnas = columnas;
    }
    if (c.tipo === "foto") {
      const max = Number.parseInt(c.maxFotos, 10);
      campo.maxFotos = Number.isInteger(max) && max >= 1 && max <= MAX_FOTOS_POR_CAMPO ? max : 3;
    }
    if (c.tipo === "fecha") campo.hoyPorDefecto = c.hoyPorDefecto === true;
    campos.push(campo);
  }

  if (!campos.some((c) => TIPOS_CAMPO[c.tipo].esPregunta)) {
    return { ok: false, error: "Agregue al menos una pregunta." };
  }
  return { ok: true, campos };
}

/** Máximo de imágenes que admite un campo de foto o firma. */
export function maxArchivos(campo) {
  return campo.tipo === "firma" ? 1 : campo.maxFotos;
}

/** Indica si un valor de respuesta está vacío. */
export function estaVacio(campo, valor) {
  if (TIPOS_CON_ARCHIVO.includes(campo.tipo) || campo.tipo === "opcion_multiple") {
    return !Array.isArray(valor) || valor.length === 0;
  }
  if (campo.tipo === "tabla_verificacion") return !valor || typeof valor !== "object" || Object.keys(valor).length === 0;
  if (campo.tipo === "si_no") return valor !== true && valor !== false;
  return valor === null || valor === undefined || String(valor).trim() === "";
}

/** Filas de una lista de verificación que aún no tienen respuesta. */
export function filasSinResponder(campo, valor) {
  const respuestas = valor && typeof valor === "object" ? valor : {};
  return campo.filas.filter((_, i) => !campo.columnas.includes(respuestas[i]));
}

/**
 * Valida las respuestas de un inspector contra los campos del formulario.
 * @param {object[]} campos definición del formulario
 * @param {Record<string, unknown>} entrada respuestas enviadas por el cliente
 * @param {Record<string, string[]>} archivosPorCampo ids de fotos/firmas ya subidas (fuente: servidor)
 * @returns {{ ok: boolean, valores: Record<string, unknown>, errores: Record<string, string> }}
 */
export function validarRespuestas(campos, entrada, archivosPorCampo = {}) {
  const valores = {};
  const errores = {};
  const datos = entrada && typeof entrada === "object" ? entrada : {};

  for (const campo of campos) {
    if (!TIPOS_CAMPO[campo.tipo]?.esPregunta) continue;
    const bruto = datos[campo.id];
    let valor = null;

    switch (campo.tipo) {
      case "texto":
        valor = texto(bruto, LARGO_TEXTO) || null;
        break;
      case "parrafo":
        valor = String(bruto ?? "").trim().slice(0, LARGO_PARRAFO) || null;
        break;
      case "numero": {
        if (bruto === null || bruto === undefined || String(bruto).trim() === "") break;
        const n = Number(String(bruto).replace(",", "."));
        if (!Number.isFinite(n)) errores[campo.id] = "Escriba un número válido.";
        else valor = n;
        break;
      }
      case "si_no":
        valor = bruto === true || bruto === false ? bruto : null;
        break;
      case "opcion_unica":
        if (bruto !== null && bruto !== undefined && bruto !== "") {
          if (campo.opciones.includes(bruto)) valor = bruto;
          else errores[campo.id] = "Seleccione una opción válida.";
        }
        break;
      case "opcion_multiple": {
        const lista = Array.isArray(bruto) ? bruto : [];
        if (lista.some((o) => !campo.opciones.includes(o))) errores[campo.id] = "Hay opciones no válidas.";
        else valor = campo.opciones.filter((o) => lista.includes(o));
        break;
      }
      case "fecha":
        if (bruto) {
          const ok = FECHA_RE.test(String(bruto)) && !Number.isNaN(new Date(`${bruto}T00:00:00Z`).getTime());
          if (ok) valor = String(bruto);
          else errores[campo.id] = "Fecha inválida.";
        }
        break;
      case "tabla_verificacion": {
        // { "0": "B", "3": "N/A", … } — clave = posición del ítem, valor = una de las columnas.
        const respuestas = bruto && typeof bruto === "object" && !Array.isArray(bruto) ? bruto : {};
        const limpio = {};
        for (const [clave, col] of Object.entries(respuestas)) {
          const i = Number.parseInt(clave, 10);
          if (!Number.isInteger(i) || i < 0 || i >= campo.filas.length || String(i) !== clave) continue;
          if (!campo.columnas.includes(col)) {
            errores[campo.id] = "Hay respuestas no válidas en la lista.";
            break;
          }
          limpio[clave] = col;
        }
        valor = Object.keys(limpio).length ? limpio : null;
        if (!errores[campo.id] && campo.obligatorio) {
          const faltan = filasSinResponder(campo, limpio).length;
          if (faltan > 0) errores[campo.id] = `Responda todos los ítems (faltan ${faltan}).`;
        }
        break;
      }
      case "foto":
      case "firma":
        valor = (archivosPorCampo[campo.id] ?? []).slice(0, maxArchivos(campo));
        break;
      default:
        break;
    }

    if (!errores[campo.id] && campo.obligatorio && estaVacio(campo, valor)) {
      errores[campo.id] =
        campo.tipo === "foto" ? "Agregue al menos una foto." : campo.tipo === "firma" ? "Falta la firma." : "Esta pregunta es obligatoria.";
    }
    valores[campo.id] = valor;
  }

  return { ok: Object.keys(errores).length === 0, valores, errores };
}

/** Texto legible de una respuesta (para listas y resúmenes). */
export function textoRespuesta(campo, valor) {
  if (estaVacio(campo, valor)) return "—";
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
    case "tabla_verificacion":
      return `${Object.keys(valor).length} de ${campo.filas.length} ítems respondidos`;
    default:
      return String(valor);
  }
}

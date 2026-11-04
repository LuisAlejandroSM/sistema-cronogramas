"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { eliminarFoto, enviarRespuesta, subirFoto } from "../actions";
import { anchoEfectivo, estaVacio, filasSinResponder, maxArchivos, TIPOS_CAMPO, TIPOS_CON_ARCHIVO } from "../campos";
import { hoyISO } from "../fechas";
import CampoFormulario from "./CampoFormulario";
import { CLASE_ANCHO, CLASE_REJILLA } from "./diseno";

const LADO_MAXIMO = 1600; // px del lado mayor tras comprimir
const CALIDAD_JPEG = 0.8;

// Reduce la foto en el celular antes de subirla (≈200–500 KB). Si el navegador no puede
// decodificarla, se envía tal cual y el servidor la valida.
async function comprimirImagen(archivo) {
  try {
    const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolver) => canvas.toBlob(resolver, "image/jpeg", CALIDAD_JPEG));
    return blob ?? archivo;
  } catch {
    return archivo;
  }
}

function claveBorrador(asignacionId) {
  return `borrador-formulario:${asignacionId}`;
}

// Borrador guardado en este dispositivo (null si no hay o el almacenamiento no está disponible).
function leerBorrador(asignacionId) {
  try {
    const datos = JSON.parse(window.localStorage.getItem(claveBorrador(asignacionId)) ?? "null");
    return datos && typeof datos === "object" && Object.keys(datos).length ? datos : null;
  } catch {
    return null;
  }
}

const suscribirNada = () => () => {};

/**
 * Formulario asignado, para que el inspector lo llene y envíe.
 * Se dibuja solo en el navegador porque el borrador vive en el dispositivo (localStorage).
 * @param {{ asignacionId: string, formulario: { titulo: string, descripcion: string|null, campos: object[] },
 *           fotosIniciales: { id: string, campoId: string }[] }} props
 */
export default function LlenarFormulario(props) {
  const enNavegador = useSyncExternalStore(suscribirNada, () => true, () => false);
  if (!enNavegador) {
    return <div className="mx-auto h-64 max-w-2xl animate-pulse rounded-xl border border-slate-200 bg-white" aria-busy="true" />;
  }
  return <FormularioInterno {...props} />;
}

function FormularioInterno({ asignacionId, formulario, fotosIniciales }) {
  const [isPending, startTransition] = useTransition();
  const [borradorInicial] = useState(() => leerBorrador(asignacionId));
  // Valores iniciales: fechas con "hoy por defecto" y, encima, lo que haya en el borrador.
  const [valores, setValores] = useState(() => {
    const iniciales = {};
    for (const c of formulario.campos) if (c.tipo === "fecha" && c.hoyPorDefecto) iniciales[c.id] = hoyISO();
    return { ...iniciales, ...(borradorInicial ?? {}) };
  });
  const [fotos, setFotos] = useState(fotosIniciales);
  const [subiendo, setSubiendo] = useState({});
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState({ tipo: "idle", texto: "" });
  const borradorRestaurado = Boolean(borradorInicial);

  // Guarda el borrador en el dispositivo cada vez que cambian las respuestas.
  useEffect(() => {
    try {
      window.localStorage.setItem(claveBorrador(asignacionId), JSON.stringify(valores));
    } catch {
      // Sin almacenamiento local: el borrador no se conserva.
    }
  }, [valores, asignacionId]);

  const cambiarValor = (campoId, valor) => {
    setValores((prev) => ({ ...prev, [campoId]: valor }));
    if (errores[campoId]) setErrores((prev) => ({ ...prev, [campoId]: undefined }));
    if (mensaje.tipo === "error") setMensaje({ tipo: "idle", texto: "" });
  };

  const subirFotos = async (campo, archivos) => {
    const actuales = fotos.filter((f) => f.campoId === campo.id).length + (subiendo[campo.id] ?? 0);
    const lote = archivos.slice(0, Math.max(0, maxArchivos(campo) - actuales));
    if (lote.length < archivos.length && campo.tipo === "foto") {
      setErrores((prev) => ({ ...prev, [campo.id]: `Máximo ${campo.maxFotos} foto(s); se ignoraron las demás.` }));
    }
    for (const archivo of lote) {
      setSubiendo((prev) => ({ ...prev, [campo.id]: (prev[campo.id] ?? 0) + 1 }));
      try {
        // La firma se envía como PNG (fondo transparente); las fotos se comprimen a JPEG.
        const contenido = campo.tipo === "firma" ? archivo : await comprimirImagen(archivo);
        const datos = new FormData();
        datos.append("asignacionId", asignacionId);
        datos.append("campoId", campo.id);
        datos.append("archivo", contenido, campo.tipo === "firma" ? "firma.png" : "foto.jpg");
        const res = await subirFoto(datos);
        if (res?.success) {
          setFotos((prev) => [...prev, { id: res.id, campoId: campo.id }]);
          setErrores((prev) => ({ ...prev, [campo.id]: undefined }));
        } else {
          setErrores((prev) => ({ ...prev, [campo.id]: res?.error ?? "No se pudo subir la foto." }));
        }
      } catch {
        setErrores((prev) => ({ ...prev, [campo.id]: "Sin conexión: no se pudo subir la foto." }));
      } finally {
        setSubiendo((prev) => ({ ...prev, [campo.id]: Math.max(0, (prev[campo.id] ?? 1) - 1) }));
      }
    }
  };

  const quitarFoto = async (id) => {
    const res = await eliminarFoto({ id });
    if (res?.success) setFotos((prev) => prev.filter((f) => f.id !== id));
    else setMensaje({ tipo: "error", texto: res?.error ?? "No se pudo quitar la foto." });
  };

  const enviar = () => {
    // Revisión rápida en el celular (el servidor vuelve a validar todo).
    const faltantes = {};
    for (const c of formulario.campos) {
      if (!TIPOS_CAMPO[c.tipo].esPregunta || !c.obligatorio) continue;
      const valor = TIPOS_CON_ARCHIVO.includes(c.tipo) ? fotos.filter((f) => f.campoId === c.id) : valores[c.id];
      if (c.tipo === "tabla_verificacion") {
        const faltan = filasSinResponder(c, valor).length;
        if (faltan > 0) faltantes[c.id] = `Responda todos los ítems (faltan ${faltan}).`;
      } else if (estaVacio(c, valor)) {
        faltantes[c.id] =
          c.tipo === "foto" ? "Agregue al menos una foto." : c.tipo === "firma" ? "Falta la firma." : "Esta pregunta es obligatoria.";
      }
    }
    if (Object.values(subiendo).some((n) => n > 0)) {
      setMensaje({ tipo: "error", texto: "Espere a que terminen de subir las fotos." });
      return;
    }
    if (Object.keys(faltantes).length) {
      setErrores(faltantes);
      setMensaje({ tipo: "error", texto: "Faltan preguntas obligatorias (marcadas en rojo)." });
      document.getElementById(`bloque-${Object.keys(faltantes)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!window.confirm("¿Enviar el formulario? Después no podrá modificarlo.")) return;

    startTransition(async () => {
      try {
        const res = await enviarRespuesta({ asignacionId, respuestas: valores });
        if (res?.success) {
          try {
            window.localStorage.removeItem(claveBorrador(asignacionId));
          } catch {
            // Nada que limpiar.
          }
          setMensaje({ tipo: "ok", texto: "Formulario enviado. ¡Gracias!" });
        } else {
          setErrores(res?.errores ?? {});
          setMensaje({ tipo: "error", texto: res?.error ?? "No se pudo enviar." });
        }
      } catch {
        setMensaje({ tipo: "error", texto: "Sin conexión. Sus respuestas siguen guardadas en este dispositivo." });
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3 pb-24">
      {borradorRestaurado && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-900">
          Se recuperaron las respuestas que había escrito en este dispositivo.
        </p>
      )}

      <div className={CLASE_REJILLA}>
      {formulario.campos.map((c) => (
        <div key={c.id} id={`bloque-${c.id}`} className={`scroll-mt-20 ${CLASE_ANCHO[anchoEfectivo(c)]}`}>
          {TIPOS_CON_ARCHIVO.includes(c.tipo) ? (
            <CampoFormulario
              campo={c}
              error={errores[c.id]}
              fotos={fotos.filter((f) => f.campoId === c.id)}
              subiendo={subiendo[c.id] ?? 0}
              onSubirFotos={(archivos) => subirFotos(c, archivos)}
              onEliminarFoto={quitarFoto}
              deshabilitado={isPending}
            />
          ) : (
            <CampoFormulario
              campo={c}
              valor={valores[c.id]}
              onCambio={(v) => cambiarValor(c.id, v)}
              error={errores[c.id]}
              deshabilitado={isPending}
            />
          )}
        </div>
      ))}
      </div>

      {/* Barra de envío fija abajo (cómoda en el celular) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:sticky md:rounded-xl md:border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <span
            aria-live="polite"
            className={`text-xs font-medium ${mensaje.tipo === "error" ? "text-red-600" : mensaje.tipo === "ok" ? "text-emerald-700" : "text-slate-500"}`}
          >
            {mensaje.texto || "Sus respuestas se guardan en este dispositivo hasta enviarlas."}
          </span>
          <button
            type="button"
            onClick={enviar}
            disabled={isPending}
            className="shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {isPending ? "Enviando…" : "Enviar formulario"}
          </button>
        </div>
      </div>
    </div>
  );
}

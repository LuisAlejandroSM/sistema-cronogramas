"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { eliminarFoto, enviarRespuesta, subirFoto } from "../actions";
import { anchoEfectivo, estaVacio, filasSinResponder, maxArchivos, TIPOS_CAMPO, TIPOS_CON_ARCHIVO } from "../campos";
import { hoyISO } from "../fechas";
import { encolarInspeccion } from "../offline/db";
import { sincronizarCola } from "../offline/sincronizador";
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
  const [guardadoEnCola, setGuardadoEnCola] = useState(false);
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

  const maxGrupos = formulario.campos.reduce((m, c) => Math.max(m, c.grupoAdicional ?? 1), 1);
  const [inspectoresVisibles, setInspectoresVisibles] = useState(() => {
    let visible = 1;
    for (const c of formulario.campos) {
      if (c.grupoAdicional) {
        const tieneValor = Boolean(borradorInicial?.[c.id]) || fotosIniciales.some((f) => f.campoId === c.id);
        if (tieneValor && c.grupoAdicional > visible) {
          visible = c.grupoAdicional;
        }
      }
    }
    return visible;
  });

  const quitarInspectorAdicional = (grupo) => {
    const camposDelGrupo = formulario.campos.filter((c) => c.grupoAdicional === grupo);
    setValores((prev) => {
      const nuevo = { ...prev };
      for (const c of camposDelGrupo) delete nuevo[c.id];
      return nuevo;
    });
    setErrores((prev) => {
      const nuevo = { ...prev };
      for (const c of camposDelGrupo) delete nuevo[c.id];
      return nuevo;
    });
    for (const c of camposDelGrupo) {
      const fotosDelCampo = fotos.filter((f) => f.campoId === c.id);
      for (const f of fotosDelCampo) {
        quitarFoto(f.id);
      }
    }
    if (grupo === inspectoresVisibles) {
      setInspectoresVisibles((prev) => Math.max(1, prev - 1));
    }
  };

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

        // Si estamos sin conexión directamente guardamos en local sin esperar error
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const idLocal = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const previewUrl = URL.createObjectURL(contenido);
          setFotos((prev) => [...prev, { id: idLocal, campoId: campo.id, blob: contenido, previewUrl, esLocal: true }]);
          setErrores((prev) => ({ ...prev, [campo.id]: undefined }));
          continue;
        }

        const datos = new FormData();
        datos.append("asignacionId", asignacionId);
        datos.append("campoId", campo.id);
        datos.append("archivo", contenido, campo.tipo === "firma" ? "firma.png" : "foto.jpg");
        const res = await subirFoto(datos);
        if (res?.success) {
          setFotos((prev) => [...prev, { id: res.id, campoId: campo.id }]);
          setErrores((prev) => ({ ...prev, [campo.id]: undefined }));
        } else {
          // Fallback a almacenamiento local si el servidor da error por red
          const idLocal = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const previewUrl = URL.createObjectURL(contenido);
          setFotos((prev) => [...prev, { id: idLocal, campoId: campo.id, blob: contenido, previewUrl, esLocal: true }]);
          setErrores((prev) => ({ ...prev, [campo.id]: undefined }));
        }
      } catch {
        // En caso de corte repentino de red, resguardar localmente
        try {
          const idLocal = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const previewUrl = URL.createObjectURL(archivo);
          setFotos((prev) => [...prev, { id: idLocal, campoId: campo.id, blob: archivo, previewUrl, esLocal: true }]);
          setErrores((prev) => ({ ...prev, [campo.id]: undefined }));
        } catch {
          setErrores((prev) => ({ ...prev, [campo.id]: "Error al procesar la imagen." }));
        }
      } finally {
        setSubiendo((prev) => ({ ...prev, [campo.id]: Math.max(0, (prev[campo.id] ?? 1) - 1) }));
      }
    }
  };

  const quitarFoto = async (id) => {
    if (String(id).startsWith("local_")) {
      setFotos((prev) => prev.filter((f) => f.id !== id));
      return;
    }
    const res = await eliminarFoto({ id });
    if (res?.success) setFotos((prev) => prev.filter((f) => f.id !== id));
    else setMensaje({ tipo: "error", texto: res?.error ?? "No se pudo quitar la foto." });
  };

  const enviar = () => {
    // Revisión rápida en el celular (el servidor vuelve a validar todo).
    const faltantes = {};
    for (const c of formulario.campos) {
      if (c.grupoAdicional && c.grupoAdicional > inspectoresVisibles) continue;
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

    // Validar inspectores adicionales que se hayan empezado a llenar
    for (let g = 2; g <= inspectoresVisibles; g++) {
      const camposGrupo = formulario.campos.filter((c) => c.grupoAdicional === g && TIPOS_CAMPO[c.tipo].esPregunta);
      const algunoLleno = camposGrupo.some((c) => {
        const valor = TIPOS_CON_ARCHIVO.includes(c.tipo) ? fotos.some((f) => f.campoId === c.id) : valores[c.id];
        return !estaVacio(c, valor);
      });
      if (algunoLleno) {
        for (const c of camposGrupo) {
          if (c.etiqueta.toLowerCase().includes("nombre") || c.tipo === "firma") {
            const valor = TIPOS_CON_ARCHIVO.includes(c.tipo) ? fotos.filter((f) => f.campoId === c.id) : valores[c.id];
            if (estaVacio(c, valor)) {
              faltantes[c.id] = c.tipo === "firma" ? "Falta la firma del inspector adicional." : "Escriba el nombre del inspector.";
            }
          }
        }
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
      const hayFotosLocales = fotos.some((f) => f.esLocal && f.blob);
      const estaSinSenal = typeof navigator !== "undefined" && !navigator.onLine;

      // 1. Si estamos offline o tenemos fotos locales guardadas en memoria: encolar en IndexedDB
      if (estaSinSenal || hayFotosLocales) {
        try {
          await encolarInspeccion({
            asignacionId,
            formularioTitulo: formulario.titulo,
            respuestas: valores,
            fotos,
          });
          try {
            window.localStorage.removeItem(claveBorrador(asignacionId));
          } catch {}
          setGuardadoEnCola(true);
          setMensaje({
            tipo: "ok",
            texto: "✓ Inspección guardada en tu teléfono. Se enviará automáticamente cuando recuperes señal.",
          });
          // Si estamos online pero había fotos locales, disparar sincronización en segundo plano
          if (!estaSinSenal) {
            sincronizarCola().catch(() => {});
          }
          return;
        } catch (errCola) {
          console.error("Error al encolar inspección:", errCola);
          setMensaje({ tipo: "error", texto: "No se pudo guardar en la memoria del teléfono. Intente de nuevo." });
          return;
        }
      }

      // 2. Si estamos online y no hay fotos locales, envío directo al servidor
      try {
        const res = await enviarRespuesta({ asignacionId, respuestas: valores });
        if (res?.success) {
          try {
            window.localStorage.removeItem(claveBorrador(asignacionId));
          } catch {}
          setMensaje({ tipo: "ok", texto: "Formulario enviado. ¡Gracias!" });
        } else {
          setErrores(res?.errores ?? {});
          setMensaje({ tipo: "error", texto: res?.error ?? "No se pudo enviar." });
        }
      } catch {
        // En caso de caída de señal repentina durante el envío: salvaguardar en la cola
        try {
          await encolarInspeccion({
            asignacionId,
            formularioTitulo: formulario.titulo,
            respuestas: valores,
            fotos,
          });
          try {
            window.localStorage.removeItem(claveBorrador(asignacionId));
          } catch {}
          setGuardadoEnCola(true);
          setMensaje({
            tipo: "ok",
            texto: "✓ Se perdió la conexión. La inspección quedó resguardada en tu teléfono y se enviará sola al volver la señal.",
          });
        } catch {
          setMensaje({ tipo: "error", texto: "Sin conexión. Sus respuestas siguen guardadas en este dispositivo." });
        }
      }
    });
  };

  if (guardadoEnCola) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">¡Inspección guardada en tu teléfono!</h2>
        <p className="mt-2 text-sm text-slate-600">
          La inspección para <strong>{formulario.titulo}</strong> quedó guardada de forma segura en la memoria de tu dispositivo.
        </p>
        <div className="my-6 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900">
          <p className="font-semibold">📡 Sincronización automática activada</p>
          <p className="mt-1 text-slate-600">
            En cuanto el teléfono vuelva a detectar conexión Wi-Fi o señal móvil, se enviará automáticamente al servidor y se registrará en el cronograma.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/mis-formularios"
            className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
          >
            ← Volver a Mis Formularios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3 pb-24">
      {borradorRestaurado && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-900">
          Se recuperaron las respuestas que había escrito en este dispositivo.
        </p>
      )}

      <div className={CLASE_REJILLA}>
      {formulario.campos.map((c) => {
        if (c.grupoAdicional && c.grupoAdicional > inspectoresVisibles) return null;

        if (c.tipo === "seccion" && c.grupoAdicional >= 2) {
          return (
            <div key={c.id} id={`bloque-${c.id}`} className="col-span-full mt-4">
              <div className="flex items-center justify-between rounded-xl border border-l-[6px] border-slate-200 border-l-blue-600 bg-white px-5 py-3 shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{c.etiqueta}</h3>
                  {c.ayuda && <p className="text-xs text-slate-500">{c.ayuda}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => quitarInspectorAdicional(c.grupoAdicional)}
                  className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-800"
                >
                  Quitar este inspector
                </button>
              </div>
            </div>
          );
        }

        return (
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
        );
      })}

      {/* Botón para agregar más inspectores */}
      {maxGrupos > 1 && inspectoresVisibles < maxGrupos && (
        <div className="col-span-full py-3">
          <button
            type="button"
            onClick={() => setInspectoresVisibles((prev) => Math.min(maxGrupos, prev + 1))}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/60 px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-600 hover:bg-blue-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            + Agregar otro inspector
          </button>
        </div>
      )}
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

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { contarCola, listarCola } from "../offline/db";
import { iniciarAutoSincronizacion, sincronizarCola } from "../offline/sincronizador";

const suscribirNada = () => () => {};

export default function BarraEstadoOffline() {
  const enNavegador = useSyncExternalStore(suscribirNada, () => true, () => false);
  if (!enNavegador) return null;
  return <BarraInterna />;
}

function BarraInterna() {
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [progresoTexto, setProgresoTexto] = useState("");
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [itemsCola, setItemsCola] = useState([]);

  const refrescarCola = async () => {
    try {
      const n = await contarCola();
      setPendientes(n);
      if (n > 0) {
        const lista = await listarCola();
        setItemsCola(lista);
      } else {
        setItemsCola([]);
      }
    } catch {
      setPendientes(0);
      setItemsCola([]);
    }
  };

  useEffect(() => {
    // 1. Activar sincronización automática al cambiar de red o enfocar ventana
    const limpiarAutoSync = iniciarAutoSincronizacion();
    refrescarCola();

    // 2. Escuchar cambios de conectividad
    const alEstarOnline = () => {
      setOnline(true);
      refrescarCola();
    };
    const alEstarOffline = () => {
      setOnline(false);
      refrescarCola();
    };

    const alIniciarSync = () => {
      setSincronizando(true);
    };

    const alTerminarSync = (e) => {
      setSincronizando(false);
      setProgresoTexto("");
      refrescarCola();
    };

    window.addEventListener("online", alEstarOnline);
    window.addEventListener("offline", alEstarOffline);
    window.addEventListener("cronogramas:sync-start", alIniciarSync);
    window.addEventListener("cronogramas:sync-end", alTerminarSync);

    const intervalo = setInterval(refrescarCola, 5000);

    return () => {
      limpiarAutoSync();
      window.removeEventListener("online", alEstarOnline);
      window.removeEventListener("offline", alEstarOffline);
      window.removeEventListener("cronogramas:sync-start", alIniciarSync);
      window.removeEventListener("cronogramas:sync-end", alTerminarSync);
      clearInterval(intervalo);
    };
  }, []);

  const forzarSincronizacion = () => {
    if (!online || sincronizando) return;
    sincronizarCola((p) => {
      setProgresoTexto(p.mensaje);
    });
  };

  // Si está conectado y no hay nada en la cola, solo mostramos un indicador discreto arriba
  if (online && pendientes === 0) {
    return (
      <div className="flex items-center justify-end px-1 py-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          En línea (Sincronizado)
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 1. Aviso de falta de señal */}
      {!online && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">📡</span>
            <div>
              <p className="font-bold">Modo sin señal activado</p>
              <p className="text-[11px] text-amber-800">
                Puedes llenar formularios con fotos y firmas. Se guardarán en tu teléfono hasta que tengas internet.
              </p>
            </div>
          </div>
          <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
            OFFLINE
          </span>
        </div>
      )}

      {/* 2. Banner de cola de envíos pendientes */}
      {pendientes > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
                {pendientes}
              </span>
              <div>
                <p className="text-xs font-bold text-blue-950">
                  {pendientes === 1
                    ? "1 inspección guardada en este teléfono"
                    : `${pendientes} inspecciones guardadas en este teléfono`}
                </p>
                <p className="text-[11px] text-blue-700">
                  {sincronizando
                    ? progresoTexto || "Subiendo al servidor…"
                    : online
                      ? "Conexión detectada. Sincronizando automáticamente en segundo plano…"
                      : "Esperando señal Wi-Fi o datos para subirse al servidor."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrarDetalles((prev) => !prev)}
                className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100/60"
              >
                {mostrarDetalles ? "Ocultar lista" : "Ver lista"}
              </button>
              {online && (
                <button
                  type="button"
                  onClick={forzarSincronizacion}
                  disabled={sincronizando}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 disabled:opacity-50"
                >
                  {sincronizando ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Subiendo…
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      Sincronizar ahora
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Lista desplegable con el detalle de las inspecciones en cola */}
          {mostrarDetalles && itemsCola.length > 0 && (
            <div className="mt-3 divide-y divide-blue-200/60 rounded-lg border border-blue-200 bg-white/80 p-2 text-xs">
              {itemsCola.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1.5 px-2">
                  <div>
                    <span className="font-semibold text-slate-800">{item.formularioTitulo || "Inspección"}</span>
                    <span className="ml-2 text-[10px] text-slate-500">
                      {new Date(item.creadoEn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {item.fotos?.length > 0 && (
                      <span className="ml-2 text-[10px] text-blue-600">
                        ({item.fotos.length} foto/firma)
                      </span>
                    )}
                  </div>
                  <div>
                    {item.estado === "sincronizando" ? (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                        Subiendo…
                      </span>
                    ) : item.estado === "error" ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700" title={item.error}>
                        Reintentando…
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        En cola
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { registrarEjecucion } from "../actions";

const MAX_OBSERVACION = 1000;

/**
 * Formulario para que el inspector registre el resultado de UNA inspección asignada:
 * cantidad realizada (− / +), "No se ejecutó (N)" y observación. Se usa en el panel que se
 * abre al tocar una celda de la matriz.
 * @param {{ item: { plantillaId: string, dia: number, ejecutado: number, noEjecutado: number, observacion: string|null },
 *           mes: string, anio: number, onGuardado?: () => void }} props
 */
export default function FormularioEjecucion({ item, mes, anio, onGuardado }) {
  const [isPending, startTransition] = useTransition();
  const [cantidad, setCantidad] = useState(item.ejecutado || 0);
  const [noEjecutada, setNoEjecutada] = useState(item.noEjecutado > 0);
  const [observacion, setObservacion] = useState(item.observacion ?? "");
  const [estado, setEstado] = useState({ tipo: "idle", texto: "" });

  const registrada = item.ejecutado > 0 || item.noEjecutado > 0;
  const cambio =
    cantidad !== (item.ejecutado || 0) ||
    noEjecutada !== item.noEjecutado > 0 ||
    observacion.trim() !== (item.observacion ?? "");

  const guardar = () => {
    if (!noEjecutada && cantidad === 0 && !window.confirm("No indicó cantidad ni marcó N. ¿Guardar igualmente?")) return;
    startTransition(async () => {
      try {
        const res = await registrarEjecucion({
          plantillaId: item.plantillaId,
          mes,
          anio,
          dia: item.dia,
          ejecutado: noEjecutada ? 0 : cantidad,
          noEjecutado: noEjecutada,
          observacion,
        });
        if (res?.success) {
          setEstado({ tipo: "ok", texto: "Guardado ✓" });
          onGuardado?.();
        } else {
          setEstado({ tipo: "error", texto: res?.error ?? "No se pudo guardar." });
        }
      } catch {
        setEstado({ tipo: "error", texto: "Sin conexión. Intente de nuevo." });
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1" aria-label="Cantidad ejecutada">
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.max(0, c - 1))}
            disabled={noEjecutada || isPending}
            className="h-10 w-10 rounded border border-slate-300 text-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Restar uno"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={noEjecutada ? 0 : cantidad}
            disabled={noEjecutada || isPending}
            onChange={(e) => setCantidad(Math.min(999, Math.max(0, Number.parseInt(e.target.value, 10) || 0)))}
            className="h-10 w-16 rounded border border-slate-300 text-center text-sm font-semibold tabular-nums disabled:bg-slate-100"
            aria-label="Cantidad de inspecciones realizadas"
          />
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.min(999, c + 1))}
            disabled={noEjecutada || isPending}
            className="h-10 w-10 rounded border border-slate-300 text-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Sumar uno"
          >
            +
          </button>
          <span className="ml-1 text-xs text-slate-500">realizadas</span>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-red-200 bg-red-50/60 px-3 py-2 text-xs font-semibold text-red-700">
          <input
            type="checkbox"
            checked={noEjecutada}
            disabled={isPending}
            onChange={(e) => setNoEjecutada(e.target.checked)}
            className="h-4 w-4 accent-red-600"
          />
          No se ejecutó (N)
        </label>
      </div>

      <label className="block text-xs font-semibold text-slate-600">
        Observación / hallazgo
        <textarea
          rows={3}
          maxLength={MAX_OBSERVACION}
          value={observacion}
          disabled={isPending}
          onChange={(e) => setObservacion(e.target.value)}
          placeholder="Ej. Extintor con presión baja, se reportó a mantenimiento."
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-800"
        />
      </label>

      <div className="flex items-center justify-end gap-3">
        {estado.texto && (
          <span
            aria-live="polite"
            className={`text-xs font-medium ${estado.tipo === "error" ? "text-red-600" : "text-emerald-700"}`}
          >
            {estado.texto}
          </span>
        )}
        <button
          type="button"
          onClick={guardar}
          disabled={isPending || (!cambio && registrada)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
        >
          {isPending ? "Guardando…" : registrada ? "Actualizar" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

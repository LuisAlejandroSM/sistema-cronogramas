"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { editarPlantilla } from "../actions";
import { PERIODICIDADES } from "../constants";

const CLASE_CAMPO =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-marca focus:outline-none focus:ring-2 focus:ring-marca/30";
const CLASE_ETIQUETA = "block text-xs font-medium text-slate-600";

/**
 * Lápiz que abre una ventana para editar una inspección del catálogo (solo administradores).
 * @param {{ plantilla: { id: string, elementoNombre: string, codigoFormato: string, periodicidad: string,
 *           cantidadPlanificada: number|null, rol: string } }} props
 */
export default function EditarInspeccion({ plantilla }) {
  const [isPending, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  // La periodicidad que trae del Excel puede ser un texto propio: se ofrece junto a las de la lista.
  const opciones = PERIODICIDADES.includes(plantilla.periodicidad)
    ? PERIODICIDADES
    : [plantilla.periodicidad, ...PERIODICIDADES];

  const abrir = () => {
    setForm({
      elementoNombre: plantilla.elementoNombre,
      codigoFormato: plantilla.codigoFormato === "N/A" ? "" : plantilla.codigoFormato,
      periodicidad: plantilla.periodicidad,
      cantidadPlanificada: plantilla.cantidadPlanificada ?? 1,
    });
    setError("");
    setAbierto(true);
  };

  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclado = (e) => e.key === "Escape" && !isPending && setAbierto(false);
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [abierto, isPending]);

  const guardar = (e) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await editarPlantilla({ id: plantilla.id, ...form });
        if (res?.success) setAbierto(false);
        else setError(res?.error ?? "No se pudo guardar.");
      } catch {
        setError("Sin conexión con el servidor.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title="Editar inspección"
        aria-label={`Editar ${plantilla.elementoNombre}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-800 focus:text-slate-800 group-hover:text-slate-400"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
        </svg>
      </button>

      {/* La ventana se dibuja en <body>: dentro de la celda fija de la matriz quedaría tapada por la cabecera. */}
      {abierto &&
        createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="editar-inspeccion-titulo">
          <button type="button" aria-label="Cerrar" onClick={() => !isPending && setAbierto(false)} className="absolute inset-0 bg-slate-900/40" />
          <form onSubmit={guardar} className="relative w-full max-w-lg rounded-t-2xl bg-white text-left shadow-xl sm:rounded-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 id="editar-inspeccion-titulo" className="text-base font-semibold text-slate-900">
                Editar inspección
              </h3>
              <p className="text-xs text-slate-500">{plantilla.rol}</p>
            </div>

            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <label className={`${CLASE_ETIQUETA} sm:col-span-2`}>
                Elemento a inspeccionar *
                <input
                  required
                  minLength={3}
                  maxLength={255}
                  value={form.elementoNombre}
                  onChange={(e) => setForm({ ...form, elementoNombre: e.target.value })}
                  className={CLASE_CAMPO}
                />
              </label>
              <label className={CLASE_ETIQUETA}>
                Código del formato
                <input
                  maxLength={50}
                  placeholder="N/A"
                  value={form.codigoFormato}
                  onChange={(e) => setForm({ ...form, codigoFormato: e.target.value })}
                  className={`${CLASE_CAMPO} font-mono uppercase`}
                />
              </label>
              <label className={CLASE_ETIQUETA}>
                Cantidad *
                <input
                  required
                  type="number"
                  min={1}
                  max={999}
                  value={form.cantidadPlanificada}
                  onChange={(e) => setForm({ ...form, cantidadPlanificada: e.target.value })}
                  className={CLASE_CAMPO}
                />
              </label>
              <label className={`${CLASE_ETIQUETA} sm:col-span-2`}>
                Periodicidad *
                <select
                  value={form.periodicidad}
                  onChange={(e) => setForm({ ...form, periodicidad: e.target.value })}
                  className={CLASE_CAMPO}
                >
                  {opciones.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:col-span-2">
                Las &quot;P&quot; ya planificadas no cambian. La nueva periodicidad o cantidad se aplica al usar
                &quot;Generar / Regenerar plan&quot;.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">
              {error && (
                <span aria-live="polite" className="mr-auto text-xs font-medium text-red-600">
                  {error}
                </span>
              )}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {isPending ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>,
          document.body
        )}
    </>
  );
}

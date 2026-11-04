"use client";

import { useState, useTransition } from "react";
import { crearPlantilla } from "../actions";
import { PERIODICIDADES } from "../constants";

const FORM_VACIO = { elementoNombre: "", codigoFormato: "", periodicidad: "Semanal", cantidadPlanificada: 4 };

const CLASE_CAMPO =
  "mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-800";
const CLASE_ETIQUETA = "block text-xs font-medium text-slate-500";

/**
 * Botón "+ Agregar inspección" y formulario para sumar un formato al catálogo del rol
 * de la pestaña actual (Inspector SIHO, Paramédico o Rescatista).
 */
export default function NuevaInspeccion({ rol, etiquetaRol }) {
  const [isPending, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const abrir = () => {
    setForm(FORM_VACIO);
    setError("");
    setAviso("");
    setAbierto(true);
  };

  const handleGuardar = (e) => {
    e.preventDefault();
    const datos = { ...form, rol };
    startTransition(async () => {
      try {
        const res = await crearPlantilla(datos);
        if (res?.success) {
          setAviso(
            `Inspección N° ${res.numero} agregada a ${etiquetaRol}. Asígnela a cada inspector desde "Generar / Regenerar plan".`
          );
          setAbierto(false);
        } else {
          setError(res?.error ?? "No se pudo guardar.");
        }
      } catch {
        setError("Sin conexión con el servidor.");
      }
    });
  };

  if (!abierto) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-3">
        {aviso && (
          <span aria-live="polite" className="mr-auto text-sm font-medium text-emerald-700">
            {aviso}
          </span>
        )}
        <button
          type="button"
          onClick={abrir}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          + Agregar inspección
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleGuardar} className="rounded border border-blue-200 bg-white shadow-sm">
      <div className="border-b border-blue-100 bg-blue-50/60 px-4 py-3">
        <h2 className="text-sm font-bold text-blue-900">Agregar inspección · {etiquetaRol}</h2>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_120px]">
        <label className={CLASE_ETIQUETA}>
          Elemento a inspeccionar *
          <input
            required
            minLength={3}
            maxLength={255}
            placeholder="Ej. Inspección de andamios"
            value={form.elementoNombre}
            onChange={(e) => setForm({ ...form, elementoNombre: e.target.value })}
            className={CLASE_CAMPO}
          />
        </label>

        <label className={CLASE_ETIQUETA}>
          Código del formato
          <input
            maxLength={50}
            placeholder="Ej. CVC-SST-FT-130"
            value={form.codigoFormato}
            onChange={(e) => setForm({ ...form, codigoFormato: e.target.value })}
            className={CLASE_CAMPO}
          />
        </label>

        <label className={CLASE_ETIQUETA}>
          Periodicidad *
          <select
            value={form.periodicidad}
            onChange={(e) => setForm({ ...form, periodicidad: e.target.value })}
            className={CLASE_CAMPO}
          >
            {PERIODICIDADES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
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
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-4 py-3">
        {error && (
          <span aria-live="polite" className="mr-auto text-xs font-medium text-red-600">
            {error}
          </span>
        )}
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={isPending}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useTransition } from "react";
import { ROL_GENERAL } from "@/db/roles";
import { eliminarPlantilla } from "../actions";

/**
 * Botón para quitar una inspección del cronograma de su rol (solo administradores).
 * Pide confirmación explicando qué se borra y qué se conserva.
 * @param {{ plantilla: { id: string, elementoNombre: string, rol: string } }} props
 */
export default function BotonEliminarInspeccion({ plantilla }) {
  const [isPending, startTransition] = useTransition();

  const eliminar = () => {
    const alcance =
      plantilla.rol === ROL_GENERAL
        ? "Es un formato GENERAL: se quitará del cronograma de TODOS los roles."
        : `Se quitará del cronograma de ${plantilla.rol}.`;
    const ok = window.confirm(
      `¿Eliminar "${plantilla.elementoNombre}"?\n\n${alcance}\n` +
        `• Se borran sus "P" de hoy en adelante que aún no tienen nada registrado.\n` +
        `• Lo ya ejecutado, las "N" y las observaciones se conservan en el historial.\n` +
        `• Si tiene un formulario vinculado, se desvincula.`
    );
    if (!ok) return;
    startTransition(async () => {
      try {
        const res = await eliminarPlantilla({ id: plantilla.id });
        if (!res?.success) window.alert(res?.error ?? "No se pudo eliminar la inspección.");
      } catch {
        window.alert("Sin conexión con el servidor.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={eliminar}
      disabled={isPending}
      title="Eliminar inspección del cronograma"
      aria-label={`Eliminar ${plantilla.elementoNombre} del cronograma`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-300 transition hover:bg-red-50 hover:text-red-600 focus:text-red-600 disabled:opacity-40 group-hover:text-slate-400"
    >
      {isPending ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 13h10l1-13" />
        </svg>
      )}
    </button>
  );
}

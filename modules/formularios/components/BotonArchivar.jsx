"use client";

import { useTransition } from "react";
import { cambiarEstadoFormulario } from "../actions";

/** Archiva (oculta a los inspectores) o reactiva un formulario. */
export default function BotonArchivar({ id, activo, titulo }) {
  const [isPending, startTransition] = useTransition();
  const alternar = () => {
    if (activo && !window.confirm(`¿Archivar "${titulo}"? Los inspectores ya no lo verán en sus pendientes.`)) return;
    startTransition(async () => {
      await cambiarEstadoFormulario({ id, activo: !activo });
    });
  };
  return (
    <button
      type="button"
      onClick={alternar}
      disabled={isPending}
      className={`font-semibold hover:underline disabled:opacity-50 ${activo ? "text-slate-600" : "text-emerald-700"}`}
    >
      {isPending ? "…" : activo ? "Archivar" : "Reactivar"}
    </button>
  );
}

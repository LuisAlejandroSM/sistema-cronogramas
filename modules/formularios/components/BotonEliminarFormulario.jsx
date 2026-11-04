"use client";

import { useTransition } from "react";
import { eliminarFormulario } from "../actions";

/** Elimina un formulario sin respuestas (con confirmación). */
export default function BotonEliminarFormulario({ id, titulo, pendientes }) {
  const [isPending, startTransition] = useTransition();
  const eliminar = () => {
    const aviso = pendientes
      ? `¿Eliminar "${titulo}"? También se quitarán sus ${pendientes} asignación(es) pendientes. No se puede deshacer.`
      : `¿Eliminar "${titulo}"? No se puede deshacer.`;
    if (!window.confirm(aviso)) return;
    startTransition(async () => {
      const res = await eliminarFormulario({ id });
      if (!res?.success) window.alert(res?.error ?? "No se pudo eliminar.");
    });
  };
  return (
    <button type="button" onClick={eliminar} disabled={isPending} className="font-semibold text-red-600 hover:underline disabled:opacity-50">
      {isPending ? "…" : "Eliminar"}
    </button>
  );
}

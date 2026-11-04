"use client";

import { useActionState } from "react";
import { cambiarClave } from "../actions";

const CLASE_CAMPO =
  "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none";

export default function FormularioCambioClave() {
  const [estado, accion, isPending] = useActionState(cambiarClave, { error: "" });

  return (
    <form action={accion} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Contraseña actual (la temporal que le entregaron)
        <input name="actual" type="password" required autoComplete="current-password" className={CLASE_CAMPO} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Nueva contraseña (mínimo 8 caracteres)
        <input name="nueva" type="password" required minLength={8} autoComplete="new-password" className={CLASE_CAMPO} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Repita la nueva contraseña
        <input
          name="confirmacion"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={CLASE_CAMPO}
        />
      </label>

      {estado.error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}

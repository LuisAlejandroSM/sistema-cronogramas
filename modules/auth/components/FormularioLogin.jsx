"use client";

import { useActionState } from "react";
import { iniciarSesion } from "../actions";

const CLASE_CAMPO =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-marca focus:outline-none focus:ring-2 focus:ring-marca/30";

export default function FormularioLogin() {
  const [estado, accion, isPending] = useActionState(iniciarSesion, { error: "", correo: "" });

  return (
    <form action={accion} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Correo
        <input
          name="correo"
          type="email"
          required
          autoComplete="username"
          defaultValue={estado.correo}
          className={CLASE_CAMPO}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Contraseña
        <input name="clave" type="password" required autoComplete="current-password" className={CLASE_CAMPO} />
      </label>

      {estado.error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ANIOS, MESES, VISTAS, vistaPorClave, vistaPorRol } from "../constants";
import { confirmarDescartarCambios } from "./cambiosPendientes";

function construirUrl({ vista, mes, anio, usuario }) {
  const params = new URLSearchParams();
  params.set("vista", vista);
  params.set("mes", mes);
  params.set("anio", String(anio));
  if (usuario) params.set("usuario", usuario);
  return `/?${params.toString()}`;
}

/**
 * Filtros del cronograma: pestañas de vista, mes, año e inspector individual.
 * El estado vive en la URL (searchParams); este componente solo navega.
 */
export default function FiltrosCronograma({ vista, mes, anio, usuarioId, inspectores }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const rolVista = vistaPorClave(vista).rol;

  const inspectoresVisibles = inspectores.filter((i) => i.rol === rolVista);

  const navegar = (cambios) => {
    if (!confirmarDescartarCambios()) return;
    const destino = { vista, mes, anio, usuario: usuarioId, ...cambios };
    startTransition(() => {
      router.push(construirUrl(destino));
    });
  };

  const cambiarInspector = (id) => {
    if (!id) {
      navegar({ usuario: null });
      return;
    }
    const inspector = inspectores.find((i) => i.id === id);
    // Siempre se abre la pestaña del rol del inspector elegido.
    const vistaDestino = inspector ? vistaPorRol(inspector.rol).clave : vista;
    navegar({ usuario: id, vista: vistaDestino });
  };

  return (
    <div className="space-y-3">
      <nav aria-label="Tipo de cronograma" className="flex flex-wrap gap-1 border-b border-slate-200">
        {VISTAS.map((v) => {
          const activa = v.clave === vista;
          return (
            <Link
              key={v.clave}
              href={construirUrl({ vista: v.clave, mes, anio, usuario: null })}
              onClick={(e) => {
                if (!confirmarDescartarCambios()) e.preventDefault();
              }}
              aria-current={activa ? "page" : undefined}
              className={`-mb-px rounded-t border px-4 py-2 text-sm font-semibold transition ${
                activa
                  ? "border-slate-200 border-b-white bg-white text-blue-700"
                  : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {v.etiqueta}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-end gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Mes
          <select
            value={mes}
            onChange={(e) => navegar({ mes: e.target.value })}
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium normal-case tracking-normal text-slate-800"
          >
            {MESES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Año
          <select
            value={anio}
            onChange={(e) => navegar({ anio: Number(e.target.value) })}
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium normal-case tracking-normal text-slate-800"
          >
            {ANIOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[260px] flex-col gap-1 text-xs font-medium text-slate-500">
          Inspector / Responsable
          <select
            value={usuarioId ?? ""}
            onChange={(e) => cambiarInspector(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium normal-case tracking-normal text-slate-800"
          >
            <option value="">Consolidado — todos ({rolVista})</option>
            {inspectoresVisibles.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
          </select>
        </label>

        <span aria-live="polite" className="pb-2 text-xs text-slate-400">
          {isPending ? "Cargando…" : ""}
        </span>
      </div>
    </div>
  );
}

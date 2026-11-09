import { connection } from "next/server";
import Link from "next/link";
import { obtenerNotificaciones } from "../queries";

export default async function AlertaDashboardNotificaciones() {
  await connection();
  const sinLeer = await obtenerNotificaciones({ limite: 3, soloNoLeidas: true });

  if (sinLeer.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-red-200 bg-gradient-to-r from-red-50 via-white to-amber-50 p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-lg text-white shadow">
            🔔
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-red-950">
                Atención: Inspecciones no completadas ({sinLeer.length})
              </h3>
              <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                Pendientes de revisión
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-700">
              Hay inspectores que reportaron no haber ejecutado inspecciones asignadas o que tienen formatos vencidos.
            </p>
          </div>
        </div>

        <Link
          href="/notificaciones"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-red-800"
        >
          <span>Ver todas las alertas</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Vista previa de las alertas recientes */}
      <div className="mt-3 divide-y divide-red-100 rounded-lg border border-red-100 bg-white/90">
        {sinLeer.map((n) => (
          <div key={n.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
                {n.tipo === "inspeccion_no_ejecutada" ? "N" : "Vencida"}
              </span>
              <span className="font-semibold text-slate-900">{n.inspectorNombre}:</span>
              <span className="text-slate-700 truncate max-w-md">{n.titulo}</span>
            </div>
            {n.datos?.observacion && (
              <span className="italic text-slate-500 truncate max-w-xs">
                &quot;{n.datos.observacion}&quot;
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

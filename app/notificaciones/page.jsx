import { Suspense } from "react";
import PanelNotificaciones from "@/modules/notificaciones/components/PanelNotificaciones";

export const metadata = {
  title: "Notificaciones de Inspecciones · Sistema Cronogramas",
};

function Cargando() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-14 animate-pulse rounded-xl border border-slate-200 bg-white" />
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    </div>
  );
}

export default function NotificacionesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-marca text-xl text-white shadow-sm">
            🔔
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Notificaciones y Alertas de Inspecciones
            </h1>
            <p className="text-xs text-slate-500">
              Control de inspecciones no ejecutadas (N), justificaciones de inspectores y formatos vencidos
            </p>
          </div>
        </div>
      </header>

      <Suspense fallback={<Cargando />}>
        <PanelNotificaciones />
      </Suspense>
    </div>
  );
}

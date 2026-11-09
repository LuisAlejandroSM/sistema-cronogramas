import { Suspense } from "react";
import DashboardMetricas from "@/modules/dashboard/components/DashboardMetricas";
import AlertaDashboardNotificaciones from "@/modules/notificaciones/components/AlertaDashboardNotificaciones";

export const metadata = {
  title: "Dashboard · Sistema Cronogramas",
};

// Filtros por URL: ?mes=Enero..Diciembre&anio=2026&rol=todos|inspector-siho|paramedicos|rescatistas

function Cargando() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-16 animate-pulse rounded border border-slate-200 bg-white" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}

export default function DashboardPage({ searchParams }) {
  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <AlertaDashboardNotificaciones />
      </Suspense>
      <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
      <Suspense fallback={<Cargando />}>
        <DashboardMetricas searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

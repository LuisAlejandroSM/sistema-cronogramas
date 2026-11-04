import { Suspense } from "react";
import ListadoInspectores from "@/modules/usuarios/components/ListadoInspectores";

export const metadata = {
  title: "Inspectores · Sistema Cronogramas",
};

function Cargando() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="ml-auto h-9 w-44 animate-pulse rounded bg-slate-200/70" />
      <div className="h-80 animate-pulse rounded border border-slate-200 bg-white" />
    </div>
  );
}

export default function InspectoresPage({ searchParams }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Inspectores</h2>
        <p className="text-sm text-slate-600">
          Registre a los inspectores SST, paramédicos y rescatistas, entrégueles su acceso y genere su cronograma
          mensual. También puede dar permiso de administrador a otros usuarios.
        </p>
      </div>
      <Suspense fallback={<Cargando />}>
        <ListadoInspectores searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

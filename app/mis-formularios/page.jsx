import { Suspense } from "react";
import BarraEstadoOffline from "@/modules/formularios/components/BarraEstadoOffline";
import Cargando from "@/modules/formularios/components/Cargando";
import MisFormularios from "@/modules/formularios/components/MisFormularios";

export const metadata = {
  title: "Mis formularios · Sistema Cronogramas",
};

export default function MisFormulariosPage() {
  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-2xl space-y-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mis formularios</h2>
          <p className="text-sm text-slate-600">Formularios que le asignó el administrador. Tóquelo para llenarlo.</p>
        </div>
        <BarraEstadoOffline />
      </div>
      <Suspense fallback={<Cargando />}>
        <MisFormularios />
      </Suspense>
    </div>
  );
}

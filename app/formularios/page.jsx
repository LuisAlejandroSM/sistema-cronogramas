import { Suspense } from "react";
import Cargando from "@/modules/formularios/components/Cargando";
import ListaFormularios from "@/modules/formularios/components/ListaFormularios";

export const metadata = {
  title: "Formularios · Sistema Cronogramas",
};

export default function FormulariosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Formularios</h2>
        <p className="text-sm text-slate-600">
          Cree formularios con preguntas y fotos, y asígnelos a los inspectores para que los llenen desde el celular.
        </p>
      </div>
      <Suspense fallback={<Cargando />}>
        <ListaFormularios />
      </Suspense>
    </div>
  );
}

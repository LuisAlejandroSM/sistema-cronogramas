import { Suspense } from "react";
import Cargando from "@/modules/formularios/components/Cargando";
import DetalleFormulario from "@/modules/formularios/components/DetalleFormulario";

export const metadata = {
  title: "Asignar formulario · Sistema Cronogramas",
};

// `params` se pasa como promesa y se resuelve dentro del Suspense (Cache Components).
export default function Page({ params }) {
  return (
    <Suspense fallback={<Cargando filas={4} />}>
      <DetalleFormulario params={params} seccion="asignar" />
    </Suspense>
  );
}

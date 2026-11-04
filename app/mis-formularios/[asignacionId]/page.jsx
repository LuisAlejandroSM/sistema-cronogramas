import { Suspense } from "react";
import Cargando from "@/modules/formularios/components/Cargando";
import FormularioAsignado from "@/modules/formularios/components/FormularioAsignado";

export const metadata = {
  title: "Llenar formulario · Sistema Cronogramas",
};

export default function FormularioAsignadoPage({ params }) {
  return (
    <Suspense fallback={<Cargando filas={5} />}>
      <FormularioAsignado params={params} />
    </Suspense>
  );
}

import { Suspense } from "react";
import Cargando from "@/modules/formularios/components/Cargando";
import NuevoFormulario from "@/modules/formularios/components/NuevoFormulario";

export const metadata = {
  title: "Nuevo formulario · Sistema Cronogramas",
};

export default function NuevoFormularioPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <NuevoFormulario />
    </Suspense>
  );
}

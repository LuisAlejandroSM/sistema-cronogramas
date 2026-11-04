import { Suspense } from "react";
import Cargando from "@/modules/formularios/components/Cargando";
import RespuestaAdmin from "@/modules/formularios/components/RespuestaAdmin";

export const metadata = {
  title: "Respuesta · Sistema Cronogramas",
};

export default function RespuestaPage({ params }) {
  return (
    <Suspense fallback={<Cargando filas={4} />}>
      <RespuestaAdmin params={params} />
    </Suspense>
  );
}

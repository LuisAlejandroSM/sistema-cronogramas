import { redirect } from "next/navigation";
import { Suspense } from "react";

const SECCIONES = ["editar", "asignar", "resultados"];

// Dirección antigua del formulario: lleva a su página de edición (o a la indicada en ?pestana=).
async function Redirigir({ params, searchParams }) {
  const { id } = await params;
  const pedida = (await searchParams)?.pestana;
  redirect(`/formularios/${encodeURIComponent(id)}/${SECCIONES.includes(pedida) ? pedida : "editar"}`);
}

export default function FormularioPage({ params, searchParams }) {
  return (
    <Suspense fallback={null}>
      <Redirigir params={params} searchParams={searchParams} />
    </Suspense>
  );
}

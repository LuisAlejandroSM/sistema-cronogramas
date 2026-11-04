import { Suspense } from "react";
import MiCronograma from "@/modules/cronogramas/components/MiCronograma";

export const metadata = {
  title: "Mi cronograma · Sistema Cronogramas",
};

// Filtros por URL: ?mes=Enero..Diciembre&anio=2026

function Cargando() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-12 w-64 animate-pulse rounded bg-slate-200/70" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}

export default function MiCronogramaPage({ searchParams }) {
  return (
    <Suspense fallback={<Cargando />}>
      <MiCronograma searchParams={searchParams} />
    </Suspense>
  );
}

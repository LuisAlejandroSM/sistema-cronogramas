// Esqueleto de carga compartido por las páginas de formularios.
export default function Cargando({ filas = 3 }) {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ))}
    </div>
  );
}

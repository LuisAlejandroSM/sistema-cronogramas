"use client";

/**
 * Tooltip de gráfica: el valor va primero (destacado) y la etiqueta después.
 * Cada fila se identifica con una línea corta del color de la serie.
 * @param {{ x: number, y: number, anchoContenedor: number, titulo: string, filas: { color?: string, valor: string, etiqueta: string }[] }} props
 */
export default function Tooltip({ x, y, anchoContenedor, titulo, filas }) {
  const ANCHO = 190;
  const izquierda = Math.min(Math.max(x + 12, 4), anchoContenedor - ANCHO - 4);
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: izquierda, top: Math.max(y - 12, 0), width: ANCHO }}
    >
      <p className="mb-1 font-semibold text-[var(--viz-text-secondary)]">{titulo}</p>
      <ul className="space-y-0.5">
        {filas.map((f) => (
          <li key={f.etiqueta} className="flex items-center gap-2">
            {f.color && (
              <span aria-hidden="true" className="h-0.5 w-3 shrink-0 rounded" style={{ background: f.color }} />
            )}
            <span className="font-bold text-[var(--viz-text-primary)]">{f.valor}</span>
            <span className="truncate text-[var(--viz-text-secondary)]">{f.etiqueta}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

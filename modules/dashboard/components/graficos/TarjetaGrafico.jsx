"use client";

import { useState } from "react";

/**
 * Contenedor de una gráfica: título, subtítulo, leyenda y botón "Ver tabla"
 * (la versión en tabla es el equivalente accesible de cada gráfica).
 * @param {{
 *   titulo: string,
 *   subtitulo?: string,
 *   leyenda?: { etiqueta: string, color: string, forma: "barra"|"linea" }[],
 *   tabla: { columnas: string[], filas: (string|number)[][] },
 *   vacio?: string|null,
 *   children: React.ReactNode,
 *   className?: string,
 * }} props
 * `className` permite estirar la tarjeta (h-full / flex-1) para igualar el alto con sus vecinas.
 */
export default function TarjetaGrafico({ titulo, subtitulo, leyenda = [], tabla, vacio = null, children, className = "" }) {
  const [verTabla, setVerTabla] = useState(false);

  return (
    <figure className={`viz-root flex flex-col rounded-lg border border-black/10 bg-[var(--viz-surface)] p-4 shadow-sm ${className}`}>
      <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--viz-text-primary)]">{titulo}</h3>
          {subtitulo && <p className="text-xs text-[var(--viz-text-secondary)]">{subtitulo}</p>}
        </div>
        {!vacio && (
          <button
            type="button"
            onClick={() => setVerTabla((v) => !v)}
            aria-pressed={verTabla}
            className="rounded border border-black/10 px-2 py-1 text-[11px] font-medium text-[var(--viz-text-secondary)] hover:bg-black/[.04]"
          >
            {verTabla ? "Ver gráfica" : "Ver tabla"}
          </button>
        )}
      </figcaption>

      {leyenda.length > 1 && !vacio && !verTabla && (
        <ul className="mb-2 flex flex-wrap gap-4 text-xs text-[var(--viz-text-secondary)]">
          {leyenda.map((l) => (
            <li key={l.etiqueta} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={l.forma === "linea" ? "h-0.5 w-4 rounded" : "h-2.5 w-2.5 rounded-sm"}
                style={{ background: l.color }}
              />
              {l.etiqueta}
            </li>
          ))}
        </ul>
      )}

      {vacio ? (
        <p className="flex min-h-[160px] flex-1 items-center justify-center rounded border border-dashed border-black/10 px-4 text-center text-sm text-[var(--viz-text-secondary)]">
          {vacio}
        </p>
      ) : verTabla ? (
        <div className="max-h-[320px] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[var(--viz-surface)] text-[var(--viz-text-secondary)]">
              <tr className="border-b border-[var(--viz-grid)]">
                {tabla.columnas.map((c, i) => (
                  <th key={c} className={`px-2 py-1.5 font-semibold ${i > 0 ? "text-right" : ""}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[var(--viz-text-primary)]">
              {tabla.filas.map((fila, i) => (
                <tr key={i} className="border-b border-[var(--viz-grid)]/60">
                  {fila.map((celda, j) => (
                    <td key={j} className={`px-2 py-1.5 ${j > 0 ? "text-right tabular-nums" : ""}`}>
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  );
}

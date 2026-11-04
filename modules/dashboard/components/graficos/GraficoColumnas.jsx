"use client";

import { useState } from "react";
import { ejeEntero, formatoNumero, pathColumna } from "./escala";
import Tooltip from "./Tooltip";
import { useAncho } from "./useAncho";

const MARGEN = { arriba: 18, derecha: 8, abajo: 26, izquierda: 36 };
const GAP = 2; // separación (en color de fondo) entre columnas que se tocan
const MAX_COLUMNA = 24;

/**
 * Columnas verticales (agrupadas si hay varias series). Un solo eje Y.
 * Con una sola serie se rotula el valor sobre cada columna; con varias, el valor
 * está en el tooltip y en la tabla.
 * @param {{ categorias: string[], series: { etiqueta: string, color: string, valores: number[] }[], alto?: number, etiquetaEje?: string }} props
 */
export default function GraficoColumnas({ categorias, series, alto = 220, etiquetaEje = "" }) {
  const [ref, ancho] = useAncho();
  const [activo, setActivo] = useState(null);

  if (ancho === null) return <div ref={ref} style={{ height: alto }} aria-hidden="true" />;

  const maximo = Math.max(0, ...series.flatMap((s) => s.valores));
  const { max, ticks } = ejeEntero(maximo);
  const anchoPlot = ancho - MARGEN.izquierda - MARGEN.derecha;
  const altoPlot = alto - MARGEN.arriba - MARGEN.abajo;
  const banda = anchoPlot / categorias.length;
  const k = series.length;
  const anchoColumna = Math.max(4, Math.min(MAX_COLUMNA, (banda * 0.7 - GAP * (k - 1)) / k));
  const anchoGrupo = anchoColumna * k + GAP * (k - 1);
  const y = (v) => MARGEN.arriba + altoPlot - (v / max) * altoPlot;
  const yBase = MARGEN.arriba + altoPlot;
  const rotular = k === 1;

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setActivo(null)}>
      <svg width={ancho} height={alto} role="img" aria-label={etiquetaEje} className="block">
        {/* Rejilla y eje Y */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={MARGEN.izquierda}
              x2={ancho - MARGEN.derecha}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
              strokeWidth="1"
            />
            <text
              x={MARGEN.izquierda - 6}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              className="fill-[var(--viz-muted)] text-[10px] tabular-nums"
            >
              {formatoNumero(t)}
            </text>
          </g>
        ))}

        {categorias.map((cat, i) => {
          const x0 = MARGEN.izquierda + banda * i + (banda - anchoGrupo) / 2;
          const enfocado = activo === i;
          return (
            <g
              key={cat}
              tabIndex={0}
              aria-label={`${cat}: ${series.map((s) => `${s.etiqueta} ${s.valores[i]}`).join(", ")}`}
              onPointerEnter={() => setActivo(i)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              className="outline-none"
            >
              {/* Área de contacto: toda la banda (más grande que la marca) */}
              <rect
                x={MARGEN.izquierda + banda * i}
                y={MARGEN.arriba}
                width={banda}
                height={altoPlot}
                fill={enfocado ? "rgba(11,11,11,0.04)" : "transparent"}
              />
              {series.map((s, j) => {
                const v = s.valores[i];
                const x = x0 + j * (anchoColumna + GAP);
                return (
                  <g key={s.etiqueta}>
                    <path
                      d={pathColumna(x, y(v), anchoColumna, yBase)}
                      fill={s.color}
                      opacity={activo === null || enfocado ? 1 : 0.55}
                    />
                    {rotular && v > 0 && (
                      <text
                        x={x + anchoColumna / 2}
                        y={y(v) - 5}
                        textAnchor="middle"
                        className="fill-[var(--viz-text-primary)] text-[10px] font-semibold"
                      >
                        {formatoNumero(v)}
                      </text>
                    )}
                  </g>
                );
              })}
              <text
                x={MARGEN.izquierda + banda * i + banda / 2}
                y={alto - 8}
                textAnchor="middle"
                className="fill-[var(--viz-muted)] text-[10px]"
              >
                {cat}
              </text>
            </g>
          );
        })}
      </svg>

      {activo !== null && (
        <Tooltip
          x={MARGEN.izquierda + banda * activo + banda / 2}
          y={MARGEN.arriba}
          anchoContenedor={ancho}
          titulo={categorias[activo]}
          filas={series.map((s) => ({
            color: s.color,
            valor: formatoNumero(s.valores[activo]),
            etiqueta: s.etiqueta,
          }))}
        />
      )}
    </div>
  );
}

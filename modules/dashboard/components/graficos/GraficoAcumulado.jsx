"use client";

import { useState } from "react";
import { ejeEntero, formatoNumero } from "./escala";
import Tooltip from "./Tooltip";
import { useAncho } from "./useAncho";

const MARGEN = { arriba: 16, derecha: 44, abajo: 26, izquierda: 36 };

/**
 * Líneas acumuladas por día del mes (burn-up): planificado vs ejecutado.
 * Cruz vertical que se ajusta al día más cercano; tooltip con todas las series.
 * @param {{ dias: number, series: { etiqueta: string, color: string, valores: (number|null)[] }[], diaHoy?: number, alto?: number }} props
 */
export default function GraficoAcumulado({ dias, series, diaHoy = 0, alto = 240 }) {
  const [ref, ancho] = useAncho();
  const [activo, setActivo] = useState(null);

  if (ancho === null) return <div ref={ref} style={{ height: alto }} aria-hidden="true" />;

  const maximo = Math.max(0, ...series.flatMap((s) => s.valores.filter((v) => v !== null)));
  const { max, ticks } = ejeEntero(maximo);
  const anchoPlot = ancho - MARGEN.izquierda - MARGEN.derecha;
  const altoPlot = alto - MARGEN.arriba - MARGEN.abajo;
  const x = (dia) => MARGEN.izquierda + ((dia - 1) / Math.max(dias - 1, 1)) * anchoPlot;
  const y = (v) => MARGEN.arriba + altoPlot - (v / max) * altoPlot;

  const ruta = (valores) =>
    valores
      .map((v, i) => (v === null ? null : `${x(i + 1)},${y(v)}`))
      .filter(Boolean)
      .map((p, i) => `${i === 0 ? "M" : "L"}${p}`)
      .join("");

  const diaDesdePuntero = (evento) => {
    const rect = evento.currentTarget.getBoundingClientRect();
    const px = evento.clientX - rect.left;
    const dia = Math.round(((px - MARGEN.izquierda) / anchoPlot) * (dias - 1)) + 1;
    return Math.min(Math.max(dia, 1), dias);
  };

  const alTeclado = (e) => {
    if (e.key === "ArrowRight") setActivo((d) => Math.min((d ?? 0) + 1, dias));
    if (e.key === "ArrowLeft") setActivo((d) => Math.max((d ?? 2) - 1, 1));
  };

  // Rótulos al final de cada línea, solo si no se pisan entre sí.
  const finales = series.map((s) => {
    let ultimo = -1;
    s.valores.forEach((v, i) => {
      if (v !== null) ultimo = i;
    });
    return ultimo < 0 ? null : { dia: ultimo + 1, valor: s.valores[ultimo] };
  });
  const separados =
    finales.filter(Boolean).length < 2 ||
    Math.abs(y(finales[0]?.valor ?? 0) - y(finales[1]?.valor ?? 0)) >= 14;

  const ticksX = [1, 5, 10, 15, 20, 25, dias].filter((d, i, arr) => d <= dias && arr.indexOf(d) === i);

  return (
    <div ref={ref} className="relative">
      <svg
        width={ancho}
        height={alto}
        role="img"
        aria-label="Avance acumulado del mes, planificado frente a ejecutado"
        tabIndex={0}
        onPointerMove={(e) => setActivo(diaDesdePuntero(e))}
        onPointerLeave={() => setActivo(null)}
        onFocus={() => setActivo(diaHoy || 1)}
        onBlur={() => setActivo(null)}
        onKeyDown={alTeclado}
        className="block outline-none"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={MARGEN.izquierda}
              x2={MARGEN.izquierda + anchoPlot}
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
        {ticksX.map((d) => (
          <text
            key={d}
            x={x(d)}
            y={alto - 8}
            textAnchor="middle"
            className="fill-[var(--viz-muted)] text-[10px] tabular-nums"
          >
            {d}
          </text>
        ))}

        {/* Marca de "hoy" */}
        {diaHoy > 0 && diaHoy < dias && (
          <g>
            <line
              x1={x(diaHoy)}
              x2={x(diaHoy)}
              y1={MARGEN.arriba}
              y2={MARGEN.arriba + altoPlot}
              stroke="var(--viz-axis)"
              strokeWidth="1"
            />
            <text x={x(diaHoy) + 4} y={MARGEN.arriba + 8} className="fill-[var(--viz-muted)] text-[10px]">
              Hoy
            </text>
          </g>
        )}

        {series.map((s) => (
          <path
            key={s.etiqueta}
            d={ruta(s.valores)}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Punto final con anillo del color de fondo + rótulo del valor */}
        {series.map((s, i) => {
          const f = finales[i];
          if (!f) return null;
          return (
            <g key={s.etiqueta}>
              <circle cx={x(f.dia)} cy={y(f.valor)} r="4" fill={s.color} stroke="var(--viz-surface)" strokeWidth="2" />
              {separados && (
                <text
                  x={x(f.dia) + 7}
                  y={y(f.valor)}
                  dy="0.32em"
                  className="fill-[var(--viz-text-primary)] text-[10px] font-semibold tabular-nums"
                >
                  {formatoNumero(f.valor)}
                </text>
              )}
            </g>
          );
        })}

        {/* Cruz vertical y puntos del día activo */}
        {activo !== null && (
          <g pointerEvents="none">
            <line
              x1={x(activo)}
              x2={x(activo)}
              y1={MARGEN.arriba}
              y2={MARGEN.arriba + altoPlot}
              stroke="var(--viz-text-secondary)"
              strokeWidth="1"
            />
            {series.map((s) =>
              s.valores[activo - 1] === null ? null : (
                <circle
                  key={s.etiqueta}
                  cx={x(activo)}
                  cy={y(s.valores[activo - 1])}
                  r="4"
                  fill={s.color}
                  stroke="var(--viz-surface)"
                  strokeWidth="2"
                />
              )
            )}
          </g>
        )}
      </svg>

      {activo !== null && (
        <Tooltip
          x={x(activo)}
          y={MARGEN.arriba}
          anchoContenedor={ancho}
          titulo={`Día ${activo}`}
          filas={series.map((s) => ({
            color: s.color,
            valor: s.valores[activo - 1] === null ? "—" : formatoNumero(s.valores[activo - 1]),
            etiqueta: s.etiqueta,
          }))}
        />
      )}
    </div>
  );
}

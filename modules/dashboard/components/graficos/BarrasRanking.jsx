"use client";

import { useState } from "react";
import { formatoPorcentaje, pathBarra } from "./escala";
import Tooltip from "./Tooltip";
import { useAncho } from "./useAncho";

const ALTO_FILA = 30;
const ALTO_BARRA = 14;
const ANCHO_ETIQUETA = 150;
const ESPACIO_VALOR = 44;

/**
 * Barras horizontales ordenadas (un solo color). Valor en el extremo de cada barra
 * y línea de referencia de la meta (100 %).
 * @param {{ filas: { etiqueta: string, valor: number|null, detalle: string }[], color: string, meta?: number }} props
 */
export default function BarrasRanking({ filas, color, meta = 1 }) {
  const [ref, ancho] = useAncho();
  const [activo, setActivo] = useState(null);
  const alto = filas.length * ALTO_FILA + 18;

  if (ancho === null) return <div ref={ref} style={{ height: alto }} aria-hidden="true" />;

  const maxValor = Math.max(meta, ...filas.map((f) => f.valor ?? 0));
  const x0 = ANCHO_ETIQUETA;
  const anchoPlot = Math.max(40, ancho - ANCHO_ETIQUETA - ESPACIO_VALOR);
  const x = (v) => x0 + (v / maxValor) * anchoPlot;

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setActivo(null)}>
      <svg width={ancho} height={alto} role="list" className="block">
        {/* Línea base y meta */}
        <line x1={x0} x2={x0} y1={0} y2={alto - 18} stroke="var(--viz-axis)" strokeWidth="1" />
        <line x1={x(meta)} x2={x(meta)} y1={0} y2={alto - 18} stroke="var(--viz-grid)" strokeWidth="1" />
        <text x={x(meta)} y={alto - 4} textAnchor="middle" className="fill-[var(--viz-muted)] text-[10px]">
          Meta {formatoPorcentaje(meta)}
        </text>

        {filas.map((f, i) => {
          const yFila = i * ALTO_FILA;
          const yBarra = yFila + (ALTO_FILA - ALTO_BARRA) / 2;
          const v = f.valor ?? 0;
          return (
            <g
              key={f.etiqueta + i}
              role="listitem"
              tabIndex={0}
              aria-label={`${f.etiqueta}: ${formatoPorcentaje(f.valor)}, ${f.detalle}`}
              onPointerEnter={() => setActivo(i)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              className="outline-none"
            >
              <rect
                x={0}
                y={yFila}
                width={ancho}
                height={ALTO_FILA}
                fill={activo === i ? "rgba(11,11,11,0.04)" : "transparent"}
              />
              <text
                x={x0 - 8}
                y={yFila + ALTO_FILA / 2}
                dy="0.32em"
                textAnchor="end"
                className="fill-[var(--viz-text-primary)] text-[11px]"
              >
                {f.etiqueta.length > 22 ? `${f.etiqueta.slice(0, 21)}…` : f.etiqueta}
              </text>
              <path d={pathBarra(x0, x(v), yBarra, ALTO_BARRA)} fill={color} />
              <text
                x={x(v) + 6}
                y={yFila + ALTO_FILA / 2}
                dy="0.32em"
                className="fill-[var(--viz-text-primary)] text-[11px] font-semibold tabular-nums"
              >
                {formatoPorcentaje(f.valor)}
              </text>
            </g>
          );
        })}
      </svg>

      {activo !== null && (
        <Tooltip
          x={x(filas[activo].valor ?? 0)}
          y={activo * ALTO_FILA + ALTO_FILA}
          anchoContenedor={ancho}
          titulo={filas[activo].etiqueta}
          filas={[
            { color, valor: formatoPorcentaje(filas[activo].valor), etiqueta: "efectividad a la fecha" },
            { valor: filas[activo].detalle, etiqueta: "" },
          ]}
        />
      )}
    </div>
  );
}

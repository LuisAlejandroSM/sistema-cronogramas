"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatoNumero, formatoPorcentaje } from "@/modules/dashboard/components/graficos/escala";
import { Indicador } from "@/modules/dashboard/components/Indicadores";
import { esNegativa, esNoAplica } from "../campos";
import { textoFecha } from "../fechas";
import { calcularResultados, fallasDeRespuesta, generarCsv } from "../resultados";

const CLASE_SELECT = "rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-800";

const PERIODOS = [
  ["todo", "Todo"],
  ["7", "Últimos 7 días"],
  ["30", "Últimos 30 días"],
  ["mes", "Este mes"],
];

// Fecha mínima de envío para el período elegido (null = sin límite).
function desdePeriodo(periodo) {
  const ahora = new Date();
  if (periodo === "mes") return new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const dias = Number(periodo);
  return dias ? new Date(ahora.getTime() - dias * 86400000) : null;
}

// Color por columna de una lista: fallas en rojo (estado crítico), N/A en gris, el resto en azul/verde.
function colorColumna(col, indicePositiva) {
  if (esNegativa(col)) return "var(--viz-critical)";
  if (esNoAplica(col)) return "var(--viz-axis)";
  return indicePositiva === 0 ? "var(--viz-plan)" : "var(--viz-ejec)";
}

function coloresDeColumnas(columnas) {
  let positivas = 0;
  return Object.fromEntries(
    columnas.map((c) => {
      const color = colorColumna(c, positivas);
      if (!esNegativa(c) && !esNoAplica(c)) positivas += 1;
      return [c, color];
    })
  );
}

function Tarjeta({ titulo, subtitulo, children, accion }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--viz-text-primary)]">{titulo}</h3>
          {subtitulo && <p className="text-xs text-[var(--viz-text-secondary)]">{subtitulo}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  );
}

/** Barras horizontales con el valor escrito al final (una sola serie). */
function Barras({ filas, total, color = "var(--viz-plan)" }) {
  const maximo = Math.max(1, ...filas.map((f) => f.cantidad));
  return (
    <ul className="space-y-2">
      {filas.map((f) => {
        const pct = total > 0 ? f.cantidad / total : null;
        return (
          <li key={f.etiqueta} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 text-sm sm:grid-cols-[minmax(0,14rem)_1fr]">
            <span className="truncate text-[var(--viz-text-primary)]" title={f.etiqueta}>
              {f.etiqueta}
            </span>
            <span className="flex items-center gap-2" title={`${f.etiqueta}: ${f.cantidad} (${formatoPorcentaje(pct)})`}>
              <span className="h-3.5 rounded-r" style={{ width: `${(f.cantidad / maximo) * 80}%`, minWidth: f.cantidad ? 4 : 0, background: color }} />
              <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-[var(--viz-text-primary)]">
                {f.cantidad} <span className="font-normal text-[var(--viz-muted)]">({formatoPorcentaje(pct)})</span>
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ResumenLista({ r }) {
  const colores = coloresDeColumnas(r.columnas);
  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--viz-text-secondary)]" aria-label="Leyenda">
        {r.columnas.map((c) => (
          <li key={c} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colores[c] }} />
            {c}
            {esNegativa(c) && " (falla)"}
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs text-[var(--viz-muted)]">
            <tr className="border-b border-[var(--viz-grid)]">
              <th className="py-1.5 pr-3 font-semibold">Ítem</th>
              <th className="w-40 py-1.5 pr-3 font-semibold">Distribución</th>
              {r.columnas.map((c) => (
                <th key={c} className="w-14 py-1.5 text-right font-semibold">
                  {c}
                </th>
              ))}
              <th className="w-16 py-1.5 text-right font-semibold">% falla</th>
            </tr>
          </thead>
          <tbody>
            {r.filas.map((f) => (
              <tr key={f.texto} className={`border-b border-slate-100 ${f.fallas > 0 ? "bg-red-50/40" : ""}`}>
                <td className="py-1.5 pr-3 text-[var(--viz-text-primary)]">{f.texto}</td>
                <td className="py-1.5 pr-3">
                  {f.marcadas > 0 ? (
                    <span className="flex h-3 gap-[2px] overflow-hidden rounded" aria-hidden="true">
                      {r.columnas
                        .filter((c) => f.cuenta[c] > 0)
                        .map((c) => (
                          <span
                            key={c}
                            title={`${c}: ${f.cuenta[c]}`}
                            style={{ flexGrow: f.cuenta[c], background: colores[c] }}
                          />
                        ))}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--viz-muted)]">Sin respuestas</span>
                  )}
                </td>
                {r.columnas.map((c) => (
                  <td
                    key={c}
                    className={`py-1.5 text-right tabular-nums ${
                      esNegativa(c) && f.cuenta[c] > 0 ? "font-bold text-[var(--viz-critical)]" : "text-[var(--viz-text-secondary)]"
                    }`}
                  >
                    {f.cuenta[c] || "·"}
                  </td>
                ))}
                <td className="py-1.5 text-right text-xs font-semibold tabular-nums text-[var(--viz-text-primary)]">
                  {f.tasaFalla === null ? "—" : formatoPorcentaje(f.tasaFalla)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResumenPregunta({ r }) {
  const subtitulo = `${r.respondidas} de ${r.total} respuesta(s)`;

  let contenido = null;
  if (r.respondidas === 0) {
    contenido = <p className="text-sm text-[var(--viz-muted)]">Nadie respondió esta pregunta en el período.</p>;
  } else if (r.opciones) {
    contenido = <Barras filas={r.opciones} total={r.respondidas} />;
  } else if (r.tipo === "numero" && r.estadisticas) {
    contenido = (
      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Promedio", r.estadisticas.promedio],
          ["Mínimo", r.estadisticas.minimo],
          ["Máximo", r.estadisticas.maximo],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs text-[var(--viz-text-secondary)]">{etiqueta}</dt>
            <dd className="text-xl font-semibold tabular-nums text-[var(--viz-text-primary)]">
              {Number.isInteger(valor) ? formatoNumero(valor) : valor.toFixed(1).replace(".", ",")}
            </dd>
          </div>
        ))}
      </dl>
    );
  } else if (r.tipo === "fecha") {
    contenido = (
      <div className="space-y-2 text-sm">
        <p className="text-[var(--viz-text-secondary)]">
          Desde <strong className="text-[var(--viz-text-primary)]">{textoFecha(r.primera)}</strong> hasta{" "}
          <strong className="text-[var(--viz-text-primary)]">{textoFecha(r.ultima)}</strong>
        </p>
        {r.esVencimiento &&
          (r.vencidas.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm font-semibold text-red-800">✕ {r.vencidas.length} ya vencida(s) al momento de la inspección</p>
              <ul className="mt-1 space-y-0.5 text-xs text-red-900">
                {r.vencidas.slice(0, 10).map((v) => (
                  <li key={v.asignacionId}>
                    <Link href={`/formularios/respuesta/${v.asignacionId}`} className="hover:underline">
                      {v.inspector}: venció el {textoFecha(v.valor)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs font-medium text-[var(--viz-good-text)]">✓ Ninguna vencida al momento de la inspección</p>
          ))}
      </div>
    );
  } else if (r.agrupados) {
    contenido = (
      <div>
        <p className="mb-2 text-xs text-[var(--viz-text-secondary)]">{r.distintos} valor(es) distinto(s)</p>
        <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100 pr-1">
          {r.agrupados.map((g) => (
            <li key={g.texto} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
              <span className="min-w-0 truncate text-[var(--viz-text-primary)]" title={g.texto}>
                {g.texto}
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--viz-text-secondary)]">
                {g.cantidad > 1 ? `${g.cantidad} veces` : "1 vez"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (r.textos) {
    contenido = (
      <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {r.textos.map((t) => (
          <li key={t.asignacionId} className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="whitespace-pre-line text-sm text-[var(--viz-text-primary)]">{t.texto}</p>
            <Link href={`/formularios/respuesta/${t.asignacionId}`} className="mt-0.5 block text-xs text-[var(--viz-text-secondary)] hover:text-blue-700 hover:underline">
              {t.inspector} · {t.fecha}
            </Link>
          </li>
        ))}
      </ul>
    );
  } else if (r.tipo === "tabla_verificacion") {
    contenido = <ResumenLista r={r} />;
  } else if (r.fotos) {
    contenido = (
      <div>
        <p className="mb-2 text-sm text-[var(--viz-text-secondary)]">
          {r.tipo === "firma" ? `${r.cantidad} firma(s)` : `${r.cantidad} foto(s) en total`}
          {r.cantidad > r.fotos.length && ` · se muestran las ${r.fotos.length} más recientes`}
        </p>
        <div className="flex flex-wrap gap-2">
          {r.fotos.map((f) => (
            <Link
              key={f.id}
              href={`/formularios/respuesta/${f.asignacionId}`}
              title={`${f.inspector} · ${f.fecha}`}
              className={`block overflow-hidden rounded-lg border border-slate-200 ${r.tipo === "firma" ? "h-16 w-32 bg-white p-1" : "h-20 w-20 bg-slate-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por /api/archivos */}
              <img
                src={`/api/archivos/${f.id}`}
                alt={`${r.etiqueta} — ${f.inspector}`}
                loading="lazy"
                className={`h-full w-full ${r.tipo === "firma" ? "object-contain" : "object-cover"}`}
              />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const accion =
    r.tipo === "tabla_verificacion" && r.fallas > 0 ? (
      <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">✕ {r.fallas} falla(s)</span>
    ) : null;

  return (
    <Tarjeta titulo={r.etiqueta} subtitulo={subtitulo} accion={accion}>
      {contenido}
    </Tarjeta>
  );
}

/**
 * Resultados de un formulario para el administrador: indicadores, resumen por pregunta,
 * ítems con más fallas, lista de respuestas y descarga en CSV.
 */
export default function ResultadosFormulario({ titulo, campos, respuestas, asignaciones }) {
  const [inspector, setInspector] = useState("todos");
  const [periodo, setPeriodo] = useState("todo");

  const inspectores = useMemo(() => {
    const mapa = new Map();
    for (const a of asignaciones) mapa.set(a.usuarioId, a.inspector);
    return [...mapa].sort((a, b) => a[1].localeCompare(b[1]));
  }, [asignaciones]);

  const filtradas = useMemo(() => {
    const desde = desdePeriodo(periodo);
    return respuestas.filter(
      (r) => (inspector === "todos" || r.usuarioId === inspector) && (!desde || new Date(r.enviadaEn) >= desde)
    );
  }, [respuestas, inspector, periodo]);

  const asignacionesFiltradas = useMemo(
    () => asignaciones.filter((a) => inspector === "todos" || a.usuarioId === inspector),
    [asignaciones, inspector]
  );

  const datos = useMemo(() => calcularResultados(campos, filtradas, asignacionesFiltradas), [campos, filtradas, asignacionesFiltradas]);
  const ind = datos.indicadores;

  const descargar = () => {
    const blob = new Blob([generarCsv(campos, filtradas)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `${titulo.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "formulario"}-respuestas.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="viz-root space-y-4">
      {/* Filtros en una fila, arriba de todo */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Inspector
          <select value={inspector} onChange={(e) => setInspector(e.target.value)} className={CLASE_SELECT}>
            <option value="todos">Todos</option>
            {inspectores.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Período de envío
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={CLASE_SELECT}>
            {PERIODOS.map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-xs text-slate-500">{filtradas.length} respuesta(s)</span>
        <button
          type="button"
          onClick={descargar}
          disabled={filtradas.length === 0}
          className="ml-auto rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
        >
          Descargar Excel (CSV)
        </button>
      </div>

      {/* Tres indicadores del mismo alto; en el celular "Respondidas" ocupa la fila completa. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Indicador
            grande
            etiqueta="Respondidas"
            valor={`${formatoNumero(ind.respondidas)} de ${formatoNumero(ind.asignadas)}`}
            nota={ind.asignadas ? `${formatoPorcentaje(ind.respondidas / ind.asignadas)} de lo asignado` : "Aún no se asigna"}
          />
        </div>
        <Indicador
          grande
          etiqueta="Pendientes"
          valor={formatoNumero(ind.pendientes)}
          nota={ind.vencidas ? `${formatoNumero(ind.vencidas)} con fecha límite vencida` : "Ninguna vencida"}
        />
        <Indicador
          grande
          etiqueta="Enviadas a tiempo"
          valor={formatoPorcentaje(ind.aTiempo)}
          nota={ind.conLimite ? `De ${formatoNumero(ind.conLimite)} con fecha límite` : "Sin fechas límite"}
        />
      </div>

      {filtradas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          {respuestas.length === 0
            ? "Todavía no hay respuestas. Aparecerán aquí cuando los inspectores envíen el formulario."
            : "No hay respuestas con estos filtros."}
        </p>
      ) : (
        <>
          {datos.peoresItems.length > 0 && (
            <Tarjeta titulo="Ítems con más fallas" subtitulo="Marcados como malo / no cumple en las listas de verificación">
              <ul className="space-y-2">
                {datos.peoresItems.map((f) => {
                  const maximo = datos.peoresItems[0].fallas;
                  return (
                    <li key={`${f.lista}|${f.texto}`} className="grid items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <span className="min-w-0">
                        <span className="block text-[var(--viz-text-primary)] sm:truncate" title={f.texto}>
                          {f.texto}
                        </span>
                        <span className="block truncate text-xs text-[var(--viz-muted)]">{f.lista}</span>
                      </span>
                      <span className="flex items-center gap-2" title={`${f.fallas} falla(s) de ${f.marcadas} respuesta(s)`}>
                        <span className="h-3.5 rounded-r" style={{ width: `${(f.fallas / maximo) * 75}%`, minWidth: 4, background: "var(--viz-critical)" }} />
                        <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-[var(--viz-text-primary)]">
                          {f.fallas} <span className="font-normal text-[var(--viz-muted)]">de {f.marcadas}</span>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Tarjeta>
          )}

          <div className="space-y-3">
            <h3 className="pt-2 text-sm font-semibold text-slate-900">Resumen por pregunta</h3>
            {datos.resumenes.map((r) => (
              <ResumenPregunta key={r.id} r={r} />
            ))}
          </div>

          <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">Respuestas individuales</h3>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">Inspector</th>
                  <th className="px-4 py-2">Enviada</th>
                  <th className="px-4 py-2">A tiempo</th>
                  <th className="px-4 py-2 text-right">Fallas</th>
                  <th className="px-4 py-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {filtradas.map((r) => {
                  const fallas = fallasDeRespuesta(campos, r);
                  return (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-2">
                        <span className="font-medium text-slate-800">{r.inspector}</span>
                        <span className="block text-xs text-slate-500">{r.rol}</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-600">{r.enviadaTexto}</td>
                      <td className="px-4 py-2 text-xs">
                        {r.aTiempo === null ? (
                          <span className="text-slate-400">Sin límite</span>
                        ) : r.aTiempo ? (
                          <span className="font-medium text-[var(--viz-good-text)]">✓ Sí</span>
                        ) : (
                          <span className="font-medium text-[var(--viz-critical)]">✕ Fuera de plazo</span>
                        )}
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums ${fallas ? "font-bold text-[var(--viz-critical)]" : "text-slate-400"}`}>{fallas}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-xs">
                        <Link href={`/formularios/respuesta/${r.id}`} className="font-semibold text-blue-700 hover:underline">
                          Ver respuesta
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

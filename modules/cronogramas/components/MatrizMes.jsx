"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { guardarRegistrosCronograma } from "../actions";
import {
  DIAS_SEMANA,
  SEMANAS,
  diaDeFecha,
  diaDeLaSemana,
  diasEnMes,
  efectividad,
  semanaDelMes,
} from "../constants";
import BotonEliminarInspeccion from "@/modules/plantillas/components/BotonEliminarInspeccion";
import EditarInspeccion from "@/modules/plantillas/components/EditarInspeccion";
import { registrarCambiosPendientes } from "./cambiosPendientes";

const CELDA_VACIA = { planificado: 0, ejecutado: 0, noEjecutado: 0 };
const clave = (plantillaId, dia) => `${plantillaId}|${dia}`;

function estadoInicial(registros) {
  const estado = {};
  for (const r of registros) {
    estado[clave(r.plantillaId, diaDeFecha(r.fecha))] = {
      planificado: Number(r.planificado) || 0,
      ejecutado: Number(r.ejecutado) || 0,
      noEjecutado: Number(r.noEjecutado) || 0,
      observacion: r.observacion ?? null,
    };
  }
  return estado;
}

function formatoPct(valor) {
  return `${Math.round(valor * 100)}%`;
}

function colorEfectividad(valor, totalP) {
  if (totalP === 0) return "text-slate-400";
  if (valor >= 1) return "text-emerald-700";
  if (valor >= 0.7) return "text-amber-600";
  return "text-red-600";
}

function fondoEfectividad(valor, totalP) {
  if (totalP === 0) return "bg-slate-50";
  if (valor >= 1) return "bg-emerald-50";
  if (valor >= 0.7) return "bg-amber-50";
  return "bg-red-50";
}

// Texto que se muestra en la fila inferior (E) para una celda.
function textoEjecucion(celda) {
  if (celda.noEjecutado > 0 && !celda.ejecutado) return "N";
  return celda.ejecutado ? String(celda.ejecutado) : "";
}

/**
 * Matriz mensual del formato CVC-SST-FT-11.
 * - modo "individual": editable (P / cantidad / N) y guarda con Server Action.
 * - modo "consolidado": solo lectura; muestra la suma de todos los inspectores.
 * - modo "inspector": el inspector ve su mes completo y toca las celdas E de días ya
 *   transcurridos con P para registrar el resultado (onSeleccionarCelda).
 * Las celdas con observación muestran un punto ámbar y el texto al pasar el mouse.
 */
export default function MatrizMes({
  modo,
  usuarioId,
  mes,
  anio,
  tituloVista,
  plantillas,
  registrosIniciales,
  // Solo modo "inspector": hasta qué día puede registrar y qué hacer al tocar una celda.
  diaActual = 0,
  onSeleccionarCelda = null,
  celdaSeleccionada = null,
}) {
  const editable = modo === "individual";
  const seleccionable = modo === "inspector" && typeof onSeleccionarCelda === "function";
  const [isPending, startTransition] = useTransition();
  const [datos, setDatos] = useState(() => estadoInicial(registrosIniciales));
  const [modificadas, setModificadas] = useState(() => new Set());
  const [estadoGuardado, setEstadoGuardado] = useState({ tipo: "idle", texto: "" });
  const [soloHabiles, setSoloHabiles] = useState(true);
  const [soloAsignados, setSoloAsignados] = useState(true);

  // Si el servidor envía datos nuevos (p. ej. tras generar el cronograma) y no hay cambios
  // locales pendientes, la matriz se sincroniza con ellos.
  const [registrosPrevios, setRegistrosPrevios] = useState(registrosIniciales);
  if (registrosIniciales !== registrosPrevios) {
    setRegistrosPrevios(registrosIniciales);
    if (modificadas.size === 0) setDatos(estadoInicial(registrosIniciales));
  }

  // Formatos asignados este mes = los que tienen algún registro guardado.
  const asignadas = useMemo(
    () => new Set(registrosIniciales.map((r) => r.plantillaId)),
    [registrosIniciales]
  );
  const filtrarAsignados = soloAsignados && asignadas.size > 0;
  const plantillasVisibles = filtrarAsignados
    ? plantillas.filter((p) => asignadas.has(p.id))
    : plantillas;

  const totalDiasMes = diasEnMes(mes, anio);
  const pendientes = modificadas.size;

  // Comparte el número de cambios pendientes con los filtros y protege al cerrar la pestaña.
  useEffect(() => {
    registrarCambiosPendientes(pendientes);
    if (pendientes === 0) return undefined;
    const alSalir = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [pendientes]);

  useEffect(() => () => registrarCambiosPendientes(0), []);

  // Columnas de días: como el Excel, por defecto solo días hábiles (LUN-VIE).
  const columnas = useMemo(() => {
    const lista = [];
    for (let d = 1; d <= totalDiasMes; d++) {
      const dow = diaDeLaSemana(mes, anio, d);
      const finDeSemana = dow === 0 || dow === 6;
      if (soloHabiles && finDeSemana) continue;
      lista.push({ dia: d, etiqueta: DIAS_SEMANA[dow], finDeSemana });
    }
    return lista;
  }, [mes, anio, totalDiasMes, soloHabiles]);

  // Totales igual que el Excel: P = COUNTIF("P"), E = SUM(ejecuciones), % = IF(P>0, E/P, 1).
  // Se calculan sobre todos los días del mes, aunque la vista oculte los fines de semana.
  const totales = useMemo(() => {
    const porPlantilla = {};
    const porSemana = Object.fromEntries(SEMANAS.map((s) => [s, { p: 0, e: 0, n: 0 }]));
    let globalP = 0;
    let globalE = 0;
    let globalN = 0;

    for (const p of plantillas) {
      let totP = 0;
      let totE = 0;
      let totN = 0;
      for (let d = 1; d <= totalDiasMes; d++) {
        const celda = datos[clave(p.id, d)];
        if (!celda) continue;
        totP += celda.planificado || 0;
        totE += celda.ejecutado || 0;
        totN += celda.noEjecutado || 0;
        const semana = porSemana[semanaDelMes(d)];
        semana.p += celda.planificado || 0;
        semana.e += celda.ejecutado || 0;
        semana.n += celda.noEjecutado || 0;
      }
      porPlantilla[p.id] = { totP, totE, totN, pct: efectividad(totP, totE) };
      globalP += totP;
      globalE += totE;
      globalN += totN;
    }

    return { porPlantilla, porSemana, globalP, globalE, globalN };
  }, [datos, plantillas, totalDiasMes]);

  const actualizarCelda = (plantillaId, dia, cambio) => {
    const key = clave(plantillaId, dia);
    setDatos((prev) => ({ ...prev, [key]: { ...(prev[key] ?? CELDA_VACIA), ...cambio } }));
    setModificadas((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    if (estadoGuardado.tipo !== "idle") setEstadoGuardado({ tipo: "idle", texto: "" });
  };

  const togglePlanificado = (plantillaId, dia) => {
    const actual = datos[clave(plantillaId, dia)] ?? CELDA_VACIA;
    actualizarCelda(plantillaId, dia, { planificado: actual.planificado ? 0 : 1 });
  };

  // Fila inferior: acepta un número (inspecciones ejecutadas) o "N" (no ejecutada).
  const cambiarEjecucion = (plantillaId, dia, valor) => {
    const texto = String(valor).trim().toUpperCase();
    if (texto === "") {
      actualizarCelda(plantillaId, dia, { ejecutado: 0, noEjecutado: 0 });
    } else if (texto.startsWith("N")) {
      actualizarCelda(plantillaId, dia, { ejecutado: 0, noEjecutado: 1 });
    } else {
      const num = Number.parseInt(texto.replace(/\D/g, ""), 10);
      if (Number.isFinite(num)) {
        actualizarCelda(plantillaId, dia, { ejecutado: Math.min(num, 999), noEjecutado: 0 });
      }
    }
  };

  const handleGuardar = () => {
    // Se envían también las celdas vaciadas para que el UPSERT limpie valores previos.
    const celdas = Array.from(modificadas).map((key) => {
      const [plantillaId, dia] = key.split("|");
      const celda = datos[key] ?? CELDA_VACIA;
      return {
        plantillaId,
        dia: Number(dia),
        planificado: celda.planificado || 0,
        ejecutado: celda.ejecutado || 0,
        noEjecutado: celda.noEjecutado || 0,
      };
    });

    if (celdas.length === 0) return;
    const enviadas = new Set(modificadas);

    startTransition(async () => {
      try {
        const res = await guardarRegistrosCronograma({ usuarioId, mes, anio, celdas });
        if (res?.success) {
          setModificadas((prev) => {
            const next = new Set(prev);
            enviadas.forEach((k) => next.delete(k));
            return next;
          });
          setEstadoGuardado({ tipo: "ok", texto: `Guardado (${res.guardados} celda(s)).` });
        } else {
          setEstadoGuardado({ tipo: "error", texto: res?.error ?? "Error al guardar." });
        }
      } catch {
        setEstadoGuardado({ tipo: "error", texto: "Sin conexión con el servidor." });
      }
    });
  };

  const descartarCambios = () => {
    setDatos(estadoInicial(registrosIniciales));
    setModificadas(new Set());
    setEstadoGuardado({ tipo: "idle", texto: "" });
  };

  const globalPct = efectividad(totales.globalP, totales.globalE);
  const columnasFijas = 5;
  const columnasTotales = columnasFijas + columnas.length + 2;

  // Fila "SEMANA" del Excel: rango de días hábiles de cada semana del mes.
  const semanasDelMes = SEMANAS.map((s) => {
    const dias = [];
    for (let d = 1; d <= totalDiasMes; d++) {
      if (semanaDelMes(d) === s) dias.push(d);
    }
    return { semana: s, desde: dias[0], hasta: dias[dias.length - 1], ...totales.porSemana[s] };
  }).filter((s) => s.desde);

  return (
    <div className="space-y-4">
      {/* Barra de estado, indicadores y guardado */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-slate-200 bg-white p-3 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-800">{tituloVista}</h2>
          <p className="text-xs text-slate-500">
            {editable
              ? "Clic en la fila P para planificar o quitar · en la fila E escriba la cantidad ejecutada o N"
              : modo === "inspector"
                ? "Toque una celda de la fila E (en ámbar = por registrar) para anotar la cantidad realizada, una N o una observación"
                : "Vista consolidada de solo lectura · seleccione un inspector para editar su cronograma"}
          </p>
          <label className="mt-1 inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={soloHabiles}
              onChange={(e) => setSoloHabiles(e.target.checked)}
              className="h-3.5 w-3.5 accent-blue-600"
            />
            Solo días hábiles (LUN–VIE), como el formato
          </label>
          {asignadas.size > 0 && (
            <label className="ml-4 mt-1 inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={soloAsignados}
                onChange={(e) => setSoloAsignados(e.target.checked)}
                className="h-3.5 w-3.5 accent-blue-600"
              />
              Solo formatos asignados este mes ({asignadas.size} de {plantillas.length})
            </label>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* El inspector ya ve su resumen "a la fecha" arriba; aquí se omiten los totales del mes completo. */}
          <dl className={`gap-5 text-center ${modo === "inspector" ? "hidden" : "flex"}`}>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Planificadas</dt>
              <dd className="text-lg font-bold tabular-nums text-blue-700">{totales.globalP}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ejecutadas</dt>
              <dd className="text-lg font-bold tabular-nums text-emerald-700">{totales.globalE}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">No ejec. (N)</dt>
              <dd className="text-lg font-bold tabular-nums text-red-600">{totales.globalN}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Efectividad</dt>
              <dd className={`text-lg font-black tabular-nums ${colorEfectividad(globalPct, totales.globalP)}`}>
                {formatoPct(globalPct)}
              </dd>
            </div>
          </dl>

          {editable && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={descartarCambios}
                  disabled={isPending || pendientes === 0}
                  className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={handleGuardar}
                  disabled={isPending || pendientes === 0}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
              <span
                aria-live="polite"
                className={`text-xs font-medium ${
                  estadoGuardado.tipo === "error"
                    ? "text-red-600"
                    : estadoGuardado.tipo === "ok"
                      ? "text-emerald-600"
                      : pendientes > 0
                        ? "text-amber-600"
                        : "text-slate-400"
                }`}
              >
                {estadoGuardado.texto ||
                  (pendientes > 0 ? `${pendientes} celda(s) sin guardar` : "Todo guardado")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Matriz */}
      <div className="overflow-x-auto rounded border border-slate-400 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead className="bg-slate-100 font-semibold uppercase text-slate-700">
            <tr className="border-b border-slate-300">
              <th rowSpan={2} className="w-8 border-r border-slate-300 p-1 text-center">N°</th>
              <th rowSpan={2} className="sticky left-0 z-20 min-w-[150px] md:min-w-[240px] border-r border-slate-300 bg-slate-100 p-2">
                Elemento a inspeccionar
              </th>
              <th rowSpan={2} className="hidden w-12 border-r border-slate-300 p-1 text-center md:table-cell">Cant.</th>
              <th rowSpan={2} className="hidden min-w-[90px] border-r border-slate-300 p-1 md:table-cell">Periodicidad</th>
              <th rowSpan={2} className="hidden min-w-[105px] border-r border-slate-300 p-1 md:table-cell">Código del formato</th>
              {columnas.map((c) => (
                <th
                  key={`dow-${c.dia}`}
                  className={`w-7 border-r border-slate-300 px-0.5 pt-1 text-center text-[9px] ${
                    c.finDeSemana ? "bg-slate-200 text-slate-500" : ""
                  }`}
                >
                  {c.etiqueta}
                </th>
              ))}
              <th colSpan={2} className="border-slate-300 bg-slate-200 p-1 text-center text-[10px]">
                Efectividad de la ejecución
              </th>
            </tr>
            <tr className="border-b border-slate-400">
              {columnas.map((c) => (
                <th
                  key={`dia-${c.dia}`}
                  className={`border-r border-slate-300 px-0.5 pb-1 text-center tabular-nums ${
                    c.finDeSemana ? "bg-slate-200 text-slate-500" : ""
                  }`}
                >
                  {c.dia}
                </th>
              ))}
              <th className="w-10 border-r border-slate-300 bg-slate-200 p-1 text-center text-[10px]">Total</th>
              <th className="w-12 bg-slate-200 p-1 text-center text-[10px]">%</th>
            </tr>
          </thead>

          <tbody>
            {plantillas.length === 0 && (
              <tr>
                <td colSpan={columnasTotales} className="p-6 text-center text-sm text-slate-500">
                  No hay formatos de inspección activos para esta vista.
                </td>
              </tr>
            )}

            {plantillasVisibles.map((p, indice) => {
              const { totP, totE, pct } = totales.porPlantilla[p.id];

              return (
                <Fragment key={p.id}>
                  {/* Fila superior: P (planificado) */}
                  <tr className="border-t border-slate-400">
                    {/* N° seguido según las filas visibles (el del Excel saltaba: 4, 13, 25…). */}
                    <td rowSpan={2} className="border-r border-slate-300 p-1 text-center font-semibold tabular-nums text-slate-600">
                      {indice + 1}
                    </td>
                    <td rowSpan={2} className="group sticky left-0 z-10 border-r border-slate-300 bg-white p-2 font-medium leading-snug text-slate-800">
                      <div className="flex items-start justify-between gap-1">
                        <span className={p.activo === false ? "text-slate-400" : ""}>
                          {p.elementoNombre}
                          {p.activo === false && (
                            <span className="ml-1.5 inline-block rounded-full bg-slate-100 px-1.5 py-px align-middle text-[10px] font-medium text-slate-500">
                              Eliminada
                            </span>
                          )}
                        </span>
                        {/* El administrador puede editar o quitar la inspección (no en la vista del inspector). */}
                        {modo !== "inspector" && p.activo !== false && (
                          <span className="flex shrink-0">
                            <EditarInspeccion plantilla={p} />
                            <BotonEliminarInspeccion plantilla={p} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td rowSpan={2} className="hidden border-r border-slate-300 p-1 text-center tabular-nums text-slate-700 md:table-cell">
                      {p.cantidadPlanificada ?? "—"}
                    </td>
                    <td rowSpan={2} className="hidden border-r border-slate-300 p-1 text-[10px] leading-snug text-slate-600 md:table-cell">
                      {p.periodicidad}
                    </td>
                    <td rowSpan={2} className="hidden border-r border-slate-300 p-1 font-mono text-[10px] text-slate-600 md:table-cell">
                      {p.codigoFormato}
                    </td>

                    {columnas.map((c) => {
                      const key = clave(p.id, c.dia);
                      const celda = datos[key] ?? CELDA_VACIA;
                      const sinGuardar = modificadas.has(key);
                      return (
                        <td
                          key={c.dia}
                          className={`h-6 border-r border-b border-slate-200 p-0 text-center ${
                            sinGuardar ? "bg-amber-100" : c.finDeSemana ? "bg-slate-100" : "bg-blue-50/40"
                          }`}
                        >
                          {editable ? (
                            <button
                              type="button"
                              aria-label={`Planificar ${p.elementoNombre} día ${c.dia}`}
                              aria-pressed={celda.planificado > 0}
                              onClick={() => togglePlanificado(p.id, c.dia)}
                              className={`mx-auto flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold transition ${
                                celda.planificado > 0
                                  ? "bg-marca text-tinta"
                                  : "text-slate-300 hover:bg-blue-100 hover:text-blue-700"
                              }`}
                            >
                              {celda.planificado > 0 ? "P" : "·"}
                            </button>
                          ) : (
                            <span className={`text-[10px] font-bold ${celda.planificado ? "text-blue-700" : "text-slate-300"}`}>
                              {celda.planificado > 1 ? celda.planificado : celda.planificado === 1 ? "P" : ""}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="border-r border-b border-slate-300 bg-blue-50 p-1 text-center font-bold tabular-nums text-blue-700">
                      {totP}
                    </td>
                    <td
                      rowSpan={2}
                      className={`p-1 text-center text-xs font-black tabular-nums ${fondoEfectividad(pct, totP)} ${colorEfectividad(pct, totP)}`}
                    >
                      {formatoPct(pct)}
                    </td>
                  </tr>

                  {/* Fila inferior: E (cantidad ejecutada) o N (no ejecutada) */}
                  <tr>
                    {columnas.map((c) => {
                      const key = clave(p.id, c.dia);
                      const celda = datos[key] ?? CELDA_VACIA;
                      const sinGuardar = modificadas.has(key);
                      const texto = textoEjecucion(celda);
                      const pendienteSinMarca = celda.planificado > 0 && !celda.ejecutado && !celda.noEjecutado;
                      return (
                        <td
                          key={c.dia}
                          title={celda.observacion ? `Observación: ${celda.observacion}` : undefined}
                          className={`relative h-6 border-r border-slate-300 p-0 text-center ${
                            sinGuardar ? "bg-amber-100" : c.finDeSemana ? "bg-slate-100" : ""
                          }`}
                        >
                          {celda.observacion && (
                            <span
                              aria-label="Tiene observación"
                              className="pointer-events-none absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500"
                            />
                          )}
                          {editable ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={3}
                              aria-label={`Ejecución ${p.elementoNombre} día ${c.dia}`}
                              value={texto}
                              onChange={(e) => cambiarEjecucion(p.id, c.dia, e.target.value)}
                              className={`h-5 w-6 rounded border text-center text-[11px] font-semibold tabular-nums focus:outline-blue-500 ${
                                texto === "N"
                                  ? "border-red-300 bg-red-50 text-red-700"
                                  : texto
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : pendienteSinMarca
                                      ? "border-amber-300 bg-white"
                                      : "border-slate-200 bg-white"
                              }`}
                            />
                          ) : seleccionable && celda.planificado > 0 && c.dia <= diaActual ? (
                            // Inspector: toca la celda para registrar lo que hizo ese día.
                            <button
                              type="button"
                              onClick={() => onSeleccionarCelda({ plantillaId: p.id, dia: c.dia })}
                              aria-label={`Registrar ${p.elementoNombre} del día ${c.dia}`}
                              aria-pressed={celdaSeleccionada === key}
                              className={`mx-auto flex h-5 w-6 items-center justify-center rounded border text-[11px] font-bold tabular-nums transition hover:ring-2 hover:ring-blue-300 ${
                                celdaSeleccionada === key ? "ring-2 ring-blue-500" : ""
                              } ${
                                texto === "N"
                                  ? "border-red-300 bg-red-50 text-red-700"
                                  : texto
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : "border-amber-400 bg-amber-100 text-amber-800"
                              }`}
                            >
                              {texto || "?"}
                            </button>
                          ) : (
                            <span
                              className={`text-[10px] font-semibold tabular-nums ${
                                celda.ejecutado ? "text-emerald-700" : celda.noEjecutado ? "text-red-600" : ""
                              }`}
                            >
                              {celda.ejecutado
                                ? celda.ejecutado
                                : celda.noEjecutado
                                  ? celda.noEjecutado > 1
                                    ? `N${celda.noEjecutado}`
                                    : "N"
                                  : ""}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-r border-slate-300 bg-emerald-50 p-1 text-center font-bold tabular-nums text-emerald-700">
                      {totE}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>

          {plantillas.length > 0 && (
            <tfoot className="border-t-2 border-slate-500 bg-slate-100 font-bold">
              <tr>
                <td colSpan={2} className="sticky left-0 z-10 bg-slate-100 p-2 text-right uppercase text-slate-700">
                  Total planificadas / ejecutadas
                </td>
                {/* Columnas Cant. / Periodicidad / Código: ocultas en pantallas pequeñas */}
                <td colSpan={columnasFijas - 2} className="hidden md:table-cell" />
                <td colSpan={columnas.length} />
                <td className="border-r border-slate-300 p-1 text-center tabular-nums">
                  <div className="text-blue-700">{totales.globalP}</div>
                  <div className="text-emerald-700">{totales.globalE}</div>
                </td>
                <td className={`p-1 text-center text-xs font-black tabular-nums ${colorEfectividad(globalPct, totales.globalP)}`}>
                  {formatoPct(globalPct)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Resumen semanal (ocupa todo el ancho, igual que la matriz) */}
      <div>
        <section className="overflow-hidden rounded border border-slate-300 bg-white text-xs shadow-sm">
          <h3 className="border-b border-slate-300 bg-slate-100 px-3 py-2 font-bold uppercase text-slate-700">
            Resumen semanal
          </h3>
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-1.5">Semana</th>
                <th className="px-3 py-1.5">Días</th>
                <th className="px-3 py-1.5 text-right">Planif.</th>
                <th className="px-3 py-1.5 text-right">Ejec.</th>
                <th className="px-3 py-1.5 text-right">N</th>
                <th className="px-3 py-1.5 text-right">% Efect.</th>
              </tr>
            </thead>
            <tbody>
              {semanasDelMes.map((s) => {
                const pct = efectividad(s.p, s.e);
                return (
                  <tr key={s.semana} className="border-b border-slate-100 tabular-nums">
                    <td className="px-3 py-1.5 font-semibold text-slate-700">{s.semana}</td>
                    <td className="px-3 py-1.5 text-slate-500">
                      {String(s.desde).padStart(2, "0")} al {String(s.hasta).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-1.5 text-right text-blue-700">{s.p}</td>
                    <td className="px-3 py-1.5 text-right text-emerald-700">{s.e}</td>
                    <td className="px-3 py-1.5 text-right text-red-600">{s.n}</td>
                    <td className={`px-3 py-1.5 text-right font-bold ${colorEfectividad(pct, s.p)}`}>
                      {formatoPct(pct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

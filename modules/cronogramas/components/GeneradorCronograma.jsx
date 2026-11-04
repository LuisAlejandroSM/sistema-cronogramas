"use client";

import { useMemo, useState, useTransition } from "react";
import { generarCronograma } from "../actions";
import {
  DESCRIPCION_REGLA,
  DIAS_ASIGNABLES,
  diaSemanaPorDefecto,
  planificarDias,
  tipoPeriodicidad,
  usaDiaDeSemana,
} from "../planificacion";
import { hayCambiosPendientes } from "./cambiosPendientes";

/**
 * Asistente para generar el cronograma mensual de un inspector:
 * se eligen los formatos que le corresponden y el día de la semana en que hará cada uno;
 * el servidor coloca las "P" según la periodicidad. Luego se ajusta a mano en la matriz.
 */
export default function GeneradorCronograma({
  usuarioId,
  usuarioNombre,
  mes,
  anio,
  plantillas,
  asignacionActual,
}) {
  const tienePlan = Object.keys(asignacionActual).length > 0;
  const [abierto, setAbierto] = useState(!tienePlan);
  const [isPending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState({ tipo: "idle", texto: "" });

  // Estado por formato: { incluido, diaSemana }. Si ya hay plan, parte de lo asignado.
  const [config, setConfig] = useState(() =>
    Object.fromEntries(
      plantillas.map((p, i) => [
        p.id,
        {
          incluido: tienePlan ? Boolean(asignacionActual[p.id]) : true,
          diaSemana: asignacionActual[p.id] ?? diaSemanaPorDefecto(i),
        },
      ])
    )
  );

  const vistaPrevia = useMemo(() => {
    const porPlantilla = {};
    const porDia = Object.fromEntries(DIAS_ASIGNABLES.map((d) => [d.valor, 0]));
    let total = 0;
    let formatos = 0;
    for (const p of plantillas) {
      const c = config[p.id];
      if (!c?.incluido) continue;
      const dias = planificarDias({
        periodicidad: p.periodicidad,
        cantidadPlanificada: p.cantidadPlanificada,
        diaSemana: c.diaSemana,
        mes,
        anio,
      });
      porPlantilla[p.id] = dias;
      total += dias.length;
      formatos += 1;
      if (usaDiaDeSemana(p.periodicidad)) porDia[c.diaSemana] += dias.length;
    }
    return { porPlantilla, porDia, total, formatos };
  }, [config, plantillas, mes, anio]);

  // Formatos agregados al catálogo después de abrir el generador: sin asignar, lunes por defecto.
  const configDe = (id) => config[id] ?? { incluido: false, diaSemana: 1 };

  const actualizar = (id, cambio) =>
    setConfig((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { incluido: false, diaSemana: 1 }), ...cambio },
    }));

  const marcarTodos = (incluido) =>
    setConfig((prev) =>
      Object.fromEntries(Object.entries(prev).map(([id, c]) => [id, { ...c, incluido }]))
    );

  const handleGenerar = () => {
    if (hayCambiosPendientes()) {
      setMensaje({ tipo: "error", texto: "Guarde o descarte primero los cambios pendientes de la matriz." });
      return;
    }
    if (
      tienePlan &&
      !window.confirm(
        `Se reemplazarán todas las P de ${mes} ${anio} de ${usuarioNombre}. Las ejecuciones ya registradas se conservan. ¿Continuar?`
      )
    ) {
      return;
    }

    const asignaciones = plantillas
      .filter((p) => config[p.id]?.incluido)
      .map((p) => ({ plantillaId: p.id, diaSemana: config[p.id].diaSemana }));

    startTransition(async () => {
      try {
        const res = await generarCronograma({ usuarioId, mes, anio, asignaciones });
        if (res?.success) {
          setMensaje({
            tipo: "ok",
            texto: `Cronograma generado: ${res.planificadas} inspección(es) planificadas en ${res.formatos} formato(s).`,
          });
          setAbierto(false);
        } else {
          setMensaje({ tipo: "error", texto: res?.error ?? "No se pudo generar el cronograma." });
        }
      } catch {
        setMensaje({ tipo: "error", texto: "Sin conexión con el servidor." });
      }
    });
  };

  return (
    <section className="rounded border border-blue-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-blue-900">
            Generar cronograma · {usuarioNombre} · {mes} {anio}
          </h2>
          <p className="text-xs text-blue-800/80">
            {tienePlan
              ? "Este inspector ya tiene planificación este mes. Puede regenerarla o ajustarla en la matriz."
              : "Elija los formatos que le corresponden y el día de la semana en que hará cada uno."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {mensaje.texto && (
            <span
              aria-live="polite"
              className={`text-xs font-medium ${mensaje.tipo === "error" ? "text-red-600" : "text-emerald-700"}`}
            >
              {mensaje.texto}
            </span>
          )}
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            {abierto ? "Ocultar" : tienePlan ? "Regenerar plan" : "Generar plan"}
          </button>
        </div>
      </div>

      {abierto && (
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => marcarTodos(true)}
                className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => marcarTodos(false)}
                className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100"
              >
                Ninguno
              </button>
            </div>
            <dl className="flex flex-wrap gap-4 text-slate-600">
              {DIAS_ASIGNABLES.map((d) => (
                <div key={d.valor} className="flex gap-1">
                  <dt className="font-semibold">{d.etiqueta}</dt>
                  <dd className="tabular-nums">{vistaPrevia.porDia[d.valor]}</dd>
                </div>
              ))}
              <div className="flex gap-1 border-l border-slate-200 pl-4">
                <dt className="font-semibold">Total P</dt>
                <dd className="font-bold tabular-nums text-blue-700">{vistaPrevia.total}</dd>
              </div>
            </dl>
          </div>

          <div className="max-h-[420px] overflow-auto rounded border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white text-xs text-slate-500">
                <tr>
                  <th className="w-10 p-2 text-center">Asignar</th>
                  <th className="w-10 p-2 text-center">N°</th>
                  <th className="p-2">Elemento a inspeccionar</th>
                  <th className="p-2">Periodicidad</th>
                  <th className="w-24 p-2">Día</th>
                  <th className="p-2">Días planificados</th>
                </tr>
              </thead>
              <tbody>
                {plantillas.map((p, indice) => {
                  const c = configDe(p.id);
                  const tipo = tipoPeriodicidad(p.periodicidad);
                  const dias = vistaPrevia.porPlantilla[p.id] ?? [];
                  const conDia = usaDiaDeSemana(p.periodicidad);
                  return (
                    <tr key={p.id} className={`border-t border-slate-100 ${c.incluido ? "" : "opacity-50"}`}>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={c.incluido}
                          onChange={(e) => actualizar(p.id, { incluido: e.target.checked })}
                          aria-label={`Asignar ${p.elementoNombre}`}
                          className="h-4 w-4 accent-blue-600"
                        />
                      </td>
                      <td className="p-2 text-center tabular-nums text-slate-500">{indice + 1}</td>
                      <td className="p-2 font-medium text-slate-800">
                        {p.elementoNombre}
                        <span className="ml-1 font-mono text-[10px] font-normal text-slate-400">{p.codigoFormato}</span>
                      </td>
                      <td className="p-2 text-slate-600">
                        <span className="block max-w-[220px] truncate" title={p.periodicidad}>
                          {p.periodicidad}
                        </span>
                        <span className="text-[10px] text-slate-400">{DESCRIPCION_REGLA[tipo]}</span>
                      </td>
                      <td className="p-2">
                        {conDia ? (
                          <select
                            value={c.diaSemana}
                            disabled={!c.incluido}
                            onChange={(e) => actualizar(p.id, { diaSemana: Number(e.target.value) })}
                            className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs"
                          >
                            {DIAS_ASIGNABLES.map((d) => (
                              <option key={d.valor} value={d.valor}>
                                {d.etiqueta}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] text-slate-400">LUN–VIE</span>
                        )}
                      </td>
                      <td className="p-2 tabular-nums text-slate-600">
                        {c.incluido ? (
                          <>
                            <span className="font-semibold text-blue-700">{dias.length} P</span>
                            {dias.length > 0 && dias.length <= 8 && (
                              <span className="ml-1 text-slate-400">({dias.join(", ")})</span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-slate-500">
              {vistaPrevia.formatos} formato(s) · {vistaPrevia.total} inspección(es) en el mes
            </span>
            <button
              type="button"
              onClick={handleGenerar}
              disabled={isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Generando…" : tienePlan ? "Regenerar cronograma" : "Generar cronograma"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

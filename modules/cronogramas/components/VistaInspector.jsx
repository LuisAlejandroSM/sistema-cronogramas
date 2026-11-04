"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ANIOS, DIAS_SEMANA, MESES, diaDeLaSemana } from "../constants";
import FormularioEjecucion from "./FormularioEjecucion";
import MatrizMes from "./MatrizMes";

const CLASE_SELECT = "rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-800";

function etiquetaDia(mes, anio, dia) {
  return `${DIAS_SEMANA[diaDeLaSemana(mes, anio, dia)]} ${dia}`;
}

/** Insignia de estado de una inspección asignada. */
function EstadoInspeccion({ item }) {
  const insignia = item.noEjecutado
    ? { texto: "No ejecutada (N)", clase: "bg-red-50 text-red-700 border-red-200" }
    : item.ejecutado
      ? { texto: `Ejecutada (${item.ejecutado})`, clase: "bg-emerald-50 text-emerald-700 border-emerald-200" }
      : { texto: "Por registrar", clase: "bg-amber-50 text-amber-800 border-amber-200" };
  return (
    <span className={`shrink-0 rounded border px-2 py-0.5 text-[11px] font-semibold ${insignia.clase}`}>
      {insignia.texto}
    </span>
  );
}

/** Panel para registrar la inspección de la celda tocada en la matriz. */
function PanelRegistro({ item, mes, anio, onCerrar, onGuardado }) {
  useEffect(() => {
    const alTeclado = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="panel-registro-titulo">
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-slate-900/40" />
      <div className="relative w-full max-w-lg rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-blue-700">
              {etiquetaDia(mes, anio, item.dia)} de {mes}
            </p>
            <h3 id="panel-registro-titulo" className="text-base font-bold leading-snug text-slate-900">
              {item.elemento}
            </h3>
            <p className="text-xs text-slate-500">
              {item.codigo} · {item.periodicidad}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <EstadoInspeccion item={item} />
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="h-8 w-8 rounded-full text-lg text-slate-500 hover:bg-slate-100"
            >
              ×
            </button>
          </div>
        </div>
        {item.formulario && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-marca-suave px-3.5 py-3">
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-tinta">{item.formulario.estado === "completada" ? "Formulario enviado ✓" : "Esta inspección tiene formulario"}</p>
              <p className="truncate text-xs text-slate-600">{item.formulario.titulo}</p>
            </div>
            <Link
              href={`/mis-formularios/${item.formulario.asignacionId}`}
              className="shrink-0 rounded-lg bg-tinta px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              {item.formulario.estado === "completada" ? "Ver" : "Llenar formulario"}
            </Link>
          </div>
        )}
        <FormularioEjecucion
          key={`${item.plantillaId}|${item.dia}|${item.ejecutado}|${item.noEjecutado}|${item.observacion ?? ""}`}
          item={item}
          mes={mes}
          anio={anio}
          onGuardado={onGuardado}
        />
      </div>
    </div>
  );
}

/**
 * Vista del inspector: selector de mes y su cronograma completo del mes,
 * donde toca cada celda para registrar lo que hizo.
 */
export default function VistaInspector({ mes, anio, diaActual, items, plantillas, registros, tituloMatriz }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [seleccion, setSeleccion] = useState(null);
  const [aviso, setAviso] = useState("");

  const navegar = (cambios) => {
    const params = new URLSearchParams({ mes, anio: String(anio), ...cambios });
    startTransition(() => router.push(`/mi-cronograma?${params.toString()}`));
  };

  const itemSeleccionado = seleccion
    ? items.find((it) => it.plantillaId === seleccion.plantillaId && it.dia === seleccion.dia)
    : null;

  const porRegistrar = items.filter((it) => it.dia <= diaActual && !it.ejecutado && !it.noEjecutado).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Mes
          <select value={mes} onChange={(e) => navegar({ mes: e.target.value })} className={CLASE_SELECT}>
            {MESES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Año
          <select value={anio} onChange={(e) => navegar({ anio: e.target.value })} className={CLASE_SELECT}>
            {ANIOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <span aria-live="polite" className="self-end pb-2 text-xs text-slate-400">
          {isPending ? "Cargando…" : ""}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No tiene inspecciones asignadas en {mes} {anio}. Consulte con su administrador.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-2.5 text-sm text-blue-900">
            <span>
              {porRegistrar > 0 ? (
                <>
                  Tiene <strong>{porRegistrar}</strong> inspección(es) por registrar: toque las celdas en{" "}
                  <span className="rounded border border-amber-400 bg-amber-100 px-1 font-bold text-amber-800">?</span> de
                  la fila E.
                </>
              ) : (
                "Todo lo que ya le tocaba está registrado. Puede tocar una celda para corregirla."
              )}
            </span>
            {aviso && (
              <span aria-live="polite" className="font-semibold text-emerald-700">
                {aviso}
              </span>
            )}
          </div>

          <MatrizMes
            key={`insp|${mes}|${anio}`}
            modo="inspector"
            usuarioId={null}
            mes={mes}
            anio={anio}
            tituloVista={tituloMatriz}
            plantillas={plantillas}
            registrosIniciales={registros}
            diaActual={diaActual}
            celdaSeleccionada={seleccion ? `${seleccion.plantillaId}|${seleccion.dia}` : null}
            onSeleccionarCelda={(celda) => {
              setAviso("");
              setSeleccion(celda);
            }}
          />
        </>
      )}

      {itemSeleccionado && (
        <PanelRegistro
          item={itemSeleccionado}
          mes={mes}
          anio={anio}
          onCerrar={() => setSeleccion(null)}
          onGuardado={() => {
            setSeleccion(null);
            setAviso(`Guardado: ${itemSeleccionado.elemento.toLowerCase()} del día ${itemSeleccionado.dia}.`);
          }}
        />
      )}
    </div>
  );
}

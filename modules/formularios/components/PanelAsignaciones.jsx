"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { asignarFormulario, quitarAsignacion } from "../actions";

const CLASE_INPUT =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marca focus:outline-none focus:ring-2 focus:ring-marca/30";

// Con más inspectores que esto se muestra un buscador.
const LIMITE_SIN_BUSCADOR = 8;

function iniciales(nombre) {
  return String(nombre ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function Avatar({ nombre, activo = false }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        activo ? "bg-marca text-tinta" : "bg-slate-100 text-slate-600"
      }`}
    >
      {iniciales(nombre)}
    </span>
  );
}

function Estado({ a }) {
  const estilos =
    a.estado === "completada"
      ? ["✓ Completada", "bg-emerald-50 text-emerald-700 ring-emerald-200"]
      : a.vencida
        ? ["✕ Vencida", "bg-red-50 text-red-700 ring-red-200"]
        : ["Pendiente", "bg-amber-50 text-amber-800 ring-amber-200"];
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${estilos[1]}`}>{estilos[0]}</span>
  );
}

function IconoCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5L19 7" />
    </svg>
  );
}

function IconoBorrar() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}

/**
 * Asignación del formulario a inspectores y seguimiento de sus respuestas.
 * Solo se listan (y el servidor solo acepta) inspectores del rol del formulario.
 * Si el formulario está vinculado a un formato del cronograma (`formato`), las asignaciones se crean
 * solas con cada "P"; aquí además se puede asignar a mano.
 * @param {{ formularioId: string, activo: boolean, rol: string|null, formato: { nombre: string, codigo: string, periodicidad: string } | null,
 *           inspectores: {id,nombre,rol}[], asignaciones: object[] }} props
 */
export default function PanelAsignaciones({ formularioId, activo, rol, formato = null, inspectores, asignaciones }) {
  const [isPending, startTransition] = useTransition();
  const [seleccion, setSeleccion] = useState(() => new Set());
  const [busqueda, setBusqueda] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [nota, setNota] = useState("");
  const [mensaje, setMensaje] = useState({ tipo: "idle", texto: "" });

  // Inspectores que ya tienen este formulario pendiente (para no asignarlo dos veces sin querer).
  const conPendiente = new Set(asignaciones.filter((a) => a.estado === "pendiente").map((a) => a.usuarioId));

  const texto = busqueda.trim().toLocaleLowerCase("es");
  const visibles = texto ? inspectores.filter((i) => i.nombre.toLocaleLowerCase("es").includes(texto)) : inspectores;
  const todosMarcados = visibles.length > 0 && visibles.every((i) => seleccion.has(i.id));

  const alternar = (id) =>
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  const alternarTodos = () =>
    setSeleccion((prev) => {
      const s = new Set(prev);
      visibles.forEach((i) => (todosMarcados ? s.delete(i.id) : s.add(i.id)));
      return s;
    });

  const asignar = () => {
    startTransition(async () => {
      try {
        const res = await asignarFormulario({ formularioId, usuarioIds: [...seleccion], fechaLimite: fechaLimite || null, nota });
        if (res?.success) {
          setMensaje({ tipo: "ok", texto: `Asignado a ${res.asignadas} inspector(es).` });
          setSeleccion(new Set());
          setNota("");
        } else {
          setMensaje({ tipo: "error", texto: res?.error ?? "No se pudo asignar." });
        }
      } catch {
        setMensaje({ tipo: "error", texto: "Sin conexión con el servidor." });
      }
    });
  };

  const quitar = (a) => {
    if (!window.confirm(`¿Quitar la asignación de ${a.inspector}? Se borrarán las fotos que haya subido.`)) return;
    startTransition(async () => {
      const res = await quitarAsignacion({ id: a.id });
      setMensaje(res?.success ? { tipo: "ok", texto: "Asignación quitada." } : { tipo: "error", texto: res?.error ?? "No se pudo quitar." });
    });
  };

  const completadas = asignaciones.filter((a) => a.estado === "completada").length;
  const vencidas = asignaciones.filter((a) => a.vencida).length;
  const pendientes = asignaciones.length - completadas;
  const avance = asignaciones.length ? completadas / asignaciones.length : 0;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      {/* Nueva asignación */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">Nueva asignación</h3>
          {rol && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              Solo inspectores con rol
              <span className="rounded-full bg-marca-suave px-2 py-0.5 font-semibold text-tinta ring-1 ring-marca/50">{rol}</span>
            </p>
          )}
        </div>

        <div className="px-5 py-4">
          {formato && activo && (
            <div className="mb-4 rounded-xl bg-marca-suave px-3.5 py-3 text-xs text-slate-700">
              <p className="font-semibold text-tinta">Vinculado al cronograma</p>
              <p className="mt-0.5">
                {formato.codigo} · {formato.nombre} ({formato.periodicidad}). Cada &quot;P&quot; de ese formato asigna este
                formulario automáticamente. Aquí puede asignarlo además a mano.
              </p>
            </div>
          )}
          {!activo ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">El formulario está archivado. Reactívelo para asignarlo.</p>
          ) : !rol ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Este formulario aún no tiene rol. Elija en{" "}
              <Link href={`/formularios/${formularioId}/editar`} className="font-semibold underline">
                Editar
              </Link>{" "}
              si es para Inspector SIHO, Paramédico o Rescatista, y guarde los cambios.
            </p>
          ) : inspectores.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
              No hay inspectores activos con el rol {rol}. Regístrelos en{" "}
              <Link href="/inspectores" className="font-semibold text-blue-700 underline">
                Inspectores
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-5">
              {/* Paso 1: a quién */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    Inspectores{seleccion.size > 0 && <span className="ml-1 normal-case tracking-normal text-slate-800">· {seleccion.size} elegido(s)</span>}
                  </span>
                  <button type="button" onClick={alternarTodos} className="text-xs font-semibold text-blue-700 hover:underline">
                    {todosMarcados ? "Quitar todos" : "Seleccionar todos"}
                  </button>
                </div>
                {inspectores.length > LIMITE_SIN_BUSCADOR && (
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar inspector…"
                    aria-label="Buscar inspector"
                    className={`${CLASE_INPUT} mb-2 mt-0`}
                  />
                )}
                <ul className="max-h-72 space-y-1.5 overflow-auto pr-0.5">
                  {visibles.map((i) => {
                    const marcado = seleccion.has(i.id);
                    return (
                      <li key={i.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={marcado}
                          onClick={() => alternar(i.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                            marcado ? "border-marca bg-marca-suave" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <Avatar nombre={i.nombre} activo={marcado} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800">{i.nombre}</span>
                            {conPendiente.has(i.id) && <span className="block text-[11px] text-amber-700">Ya tiene una pendiente</span>}
                          </span>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              marcado ? "border-tinta bg-tinta text-white" : "border-slate-300 bg-white text-transparent"
                            }`}
                          >
                            <IconoCheck />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {visibles.length === 0 && <li className="py-3 text-center text-xs text-slate-500">Ningún inspector coincide.</li>}
                </ul>
              </div>

              {/* Paso 2: detalles opcionales */}
              <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                <span className="block text-xs font-medium text-slate-500">Detalles (opcional)</span>
                <label className="block text-xs font-medium text-slate-600">
                  Fecha límite
                  <input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} className={CLASE_INPUT} />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Nota para el inspector
                  <input
                    value={nota}
                    maxLength={300}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Ej. Revisar los extintores del galpón 2"
                    className={CLASE_INPUT}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={asignar}
                disabled={isPending || seleccion.size === 0}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
              >
                {isPending ? "Asignando…" : seleccion.size ? `Asignar a ${seleccion.size} inspector(es)` : "Elija al menos un inspector"}
              </button>
            </div>
          )}
          {mensaje.texto && (
            <p
              aria-live="polite"
              className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${mensaje.tipo === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
            >
              {mensaje.texto}
            </p>
          )}
        </div>
      </section>

      {/* Seguimiento */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">Seguimiento</h3>
            <span className="text-sm text-slate-500">
              <strong className="text-slate-900">{completadas}</strong> de {asignaciones.length} respondieron
            </span>
          </div>
          {asignaciones.length > 0 && (
            <>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label="Avance de respuestas"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(avance * 100)}
              >
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${avance * 100}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">{completadas} completada(s)</span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800">{pendientes} pendiente(s)</span>
                {vencidas > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700">{vencidas} vencida(s)</span>}
              </div>
            </>
          )}
        </div>

        {asignaciones.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">Aún no se ha asignado a nadie</p>
            <p className="mt-1 text-xs text-slate-500">Elija inspectores a la izquierda para enviarles este formulario.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {asignaciones.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
                <Avatar nombre={a.inspector} activo={a.estado === "completada"} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="truncate">{a.inspector}</span>
                    {a.origen === "cronograma" && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Cronograma</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.completadaTexto ?? `Asignado ${a.asignadoTexto}`}
                    {a.limiteTexto && <span className={a.vencida ? "font-medium text-red-600" : ""}> · Límite {a.limiteTexto}</span>}
                  </p>
                  {a.nota && <p className="mt-0.5 truncate text-xs italic text-slate-500">“{a.nota}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Estado a={a} />
                  {a.estado === "completada" ? (
                    <Link
                      href={`/formularios/respuesta/${a.id}`}
                      className="whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Ver respuesta
                    </Link>
                  ) : a.origen === "cronograma" ? (
                    <span className="w-8" aria-hidden="true" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => quitar(a)}
                      disabled={isPending}
                      title="Quitar asignación"
                      aria-label={`Quitar asignación de ${a.inspector}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <IconoBorrar />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

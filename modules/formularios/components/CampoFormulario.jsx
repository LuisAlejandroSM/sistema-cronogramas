"use client";

import { LARGO_PARRAFO, LARGO_TEXTO } from "../campos";
import PadFirma from "./PadFirma";

const CLASE_INPUT =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-50 sm:text-sm";

/**
 * Una pregunta del formulario lista para responder (o en vista previa con `deshabilitado`).
 * Para tipo "foto": `fotos` = [{ id }] ya subidas, `onSubirFotos(files)`, `onEliminarFoto(id)`.
 * `plano`: sin tarjeta propia (se usa dentro de la tarjeta del constructor).
 */
export default function CampoFormulario({
  campo,
  valor,
  onCambio,
  error,
  deshabilitado = false,
  fotos = [],
  subiendo = 0,
  onSubirFotos,
  onEliminarFoto,
  plano = false,
}) {
  if (campo.tipo === "seccion") {
    const contenido = (
      <>
        <h3 className="text-lg font-bold text-slate-900">{campo.etiqueta || "Sección sin título"}</h3>
        {campo.ayuda && <p className="mt-0.5 whitespace-pre-line text-sm text-slate-600">{campo.ayuda}</p>}
      </>
    );
    if (plano) return <div>{contenido}</div>;
    return (
      <div className="mt-3 rounded-xl border border-l-[6px] border-slate-200 border-l-marca bg-white px-5 py-4 shadow-sm">
        {contenido}
      </div>
    );
  }

  const idCampo = `campo-${campo.id}`;
  const encabezado = (
    <>
      <span className="text-sm font-semibold text-slate-800">
        {campo.etiqueta || "Pregunta sin título"}
        {campo.obligatorio && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
      </span>
      {campo.ayuda && <span className="mt-0.5 block text-xs text-slate-500">{campo.ayuda}</span>}
    </>
  );
  const mensajeError = error && (
    <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
      {error}
    </p>
  );
  const marco = plano
    ? ""
    : `rounded-xl border bg-white p-5 shadow-sm ${error ? "border-red-300 ring-1 ring-red-200" : "border-slate-200"}`;

  if (campo.tipo === "texto" || campo.tipo === "parrafo" || campo.tipo === "numero" || campo.tipo === "fecha") {
    const comun = {
      id: idCampo,
      disabled: deshabilitado,
      required: campo.obligatorio,
      "aria-invalid": Boolean(error),
      className: CLASE_INPUT,
      value: valor ?? "",
      onChange: (e) => onCambio?.(e.target.value),
    };
    return (
      <div className={marco}>
        <label htmlFor={idCampo} className="block">
          {encabezado}
        </label>
        {campo.tipo === "parrafo" ? (
          <textarea rows={4} maxLength={LARGO_PARRAFO} {...comun} />
        ) : campo.tipo === "numero" ? (
          <input type="text" inputMode="decimal" {...comun} />
        ) : campo.tipo === "fecha" ? (
          <input type="date" {...comun} />
        ) : (
          <input type="text" maxLength={LARGO_TEXTO} {...comun} />
        )}
        {mensajeError}
      </div>
    );
  }

  if (campo.tipo === "si_no" || campo.tipo === "opcion_unica") {
    const opciones = campo.tipo === "si_no" ? [["Sí", true], ["No", false]] : campo.opciones.map((o) => [o, o]);
    return (
      <fieldset className={marco}>
        <legend className="sr-only">{campo.etiqueta}</legend>
        <div aria-hidden="true">{encabezado}</div>
        <div className={`mt-2 ${campo.tipo === "si_no" ? "flex gap-2" : "space-y-2"}`}>
          {opciones.map(([texto, v]) => {
            const marcado = valor === v;
            return (
              <label
                key={String(texto)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                  campo.tipo === "si_no" ? "flex-1 justify-center font-semibold" : ""
                } ${marcado ? "border-blue-500 bg-blue-50 text-blue-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"} ${
                  deshabilitado ? "cursor-default opacity-70" : ""
                }`}
              >
                <input
                  type="radio"
                  name={idCampo}
                  checked={marcado}
                  disabled={deshabilitado}
                  onChange={() => onCambio?.(v)}
                  className={campo.tipo === "si_no" ? "sr-only" : "h-4 w-4 accent-blue-600"}
                />
                {texto}
              </label>
            );
          })}
        </div>
        {mensajeError}
      </fieldset>
    );
  }

  if (campo.tipo === "opcion_multiple") {
    const lista = Array.isArray(valor) ? valor : [];
    return (
      <fieldset className={marco}>
        <legend className="sr-only">{campo.etiqueta}</legend>
        <div aria-hidden="true">{encabezado}</div>
        <div className="mt-2 space-y-2">
          {campo.opciones.map((o) => {
            const marcado = lista.includes(o);
            return (
              <label
                key={o}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                  marcado ? "border-blue-500 bg-blue-50 text-blue-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                } ${deshabilitado ? "cursor-default opacity-70" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  disabled={deshabilitado}
                  onChange={(e) => onCambio?.(e.target.checked ? [...lista, o] : lista.filter((x) => x !== o))}
                  className="h-4 w-4 accent-blue-600"
                />
                {o}
              </label>
            );
          })}
        </div>
        {mensajeError}
      </fieldset>
    );
  }

  if (campo.tipo === "tabla_verificacion") {
    const respuestas = valor && typeof valor === "object" ? valor : {};
    const respondidas = campo.filas.filter((_, i) => campo.columnas.includes(respuestas[i])).length;
    const marcarRestantes = (col) => {
      const nuevo = { ...respuestas };
      campo.filas.forEach((_, i) => {
        if (!campo.columnas.includes(nuevo[i])) nuevo[i] = col;
      });
      onCambio?.(nuevo);
    };
    return (
      <fieldset className={marco}>
        <legend className="sr-only">{campo.etiqueta}</legend>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div aria-hidden="true">{encabezado}</div>
          <span className={`text-xs font-semibold ${respondidas === campo.filas.length ? "text-emerald-700" : "text-slate-500"}`}>
            {respondidas}/{campo.filas.length}
          </span>
        </div>
        <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {/* Encabezado de columnas (pantallas medianas en adelante) */}
          <div className="hidden items-center gap-3 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:flex">
            <span className="flex-1">Componente / ítem</span>
            <span className="flex gap-1">
              {campo.columnas.map((col) => (
                <span key={col} className="w-16 text-center">
                  {col}
                </span>
              ))}
            </span>
          </div>
          {campo.filas.map((fila, i) => (
            <div key={fila} role="radiogroup" aria-label={fila} className="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex-1 text-sm text-slate-800">{fila}</span>
              <span className="flex gap-1">
                {campo.columnas.map((col) => {
                  const marcado = respuestas[i] === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      role="radio"
                      aria-checked={marcado}
                      disabled={deshabilitado}
                      onClick={() => onCambio?.({ ...respuestas, [i]: col })}
                      className={`h-9 min-w-16 flex-1 rounded-md border px-2 text-xs font-bold transition sm:flex-none ${
                        marcado ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      } ${deshabilitado ? "cursor-default opacity-70" : ""}`}
                    >
                      {col}
                    </button>
                  );
                })}
              </span>
            </div>
          ))}
        </div>
        {!deshabilitado && respondidas < campo.filas.length && respondidas > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            Marcar los {campo.filas.length - respondidas} restantes como:
            {campo.columnas.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => marcarRestantes(col)}
                className="rounded border border-slate-300 px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-100"
              >
                {col}
              </button>
            ))}
          </div>
        )}
        {mensajeError}
      </fieldset>
    );
  }

  if (campo.tipo === "firma") {
    const firma = fotos[0];
    return (
      <div className={marco}>
        <div>{encabezado}</div>
        <div className="mt-2">
          {firma ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="h-32 w-full max-w-sm rounded-lg border border-slate-200 bg-white p-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- firma privada servida por /api/archivos */}
                <img src={`/api/archivos/${firma.id}`} alt="Firma registrada" className="h-full w-full object-contain" />
              </div>
              {onEliminarFoto && !deshabilitado && (
                <button
                  type="button"
                  onClick={() => onEliminarFoto(firma.id)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Firmar de nuevo
                </button>
              )}
            </div>
          ) : subiendo > 0 ? (
            <p className="h-40 animate-pulse rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4 text-sm text-blue-700">
              Guardando firma…
            </p>
          ) : (
            <PadFirma
              deshabilitado={deshabilitado || !onSubirFotos}
              onConfirmar={(blob) => onSubirFotos?.([new File([blob], "firma.png", { type: "image/png" })])}
            />
          )}
        </div>
        {mensajeError}
      </div>
    );
  }

  if (campo.tipo === "foto") {
    const lleno = fotos.length + subiendo >= campo.maxFotos;
    return (
      <div className={marco}>
        <div>{encabezado}</div>
        <p className="mt-0.5 text-xs text-slate-400">Hasta {campo.maxFotos} foto(s)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {fotos.map((f) => (
            <div key={f.id} className="relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- foto privada servida por /api/archivos */}
              <img src={`/api/archivos/${f.id}`} alt="Foto adjunta" className="h-full w-full object-cover" />
              {onEliminarFoto && !deshabilitado && (
                <button
                  type="button"
                  onClick={() => onEliminarFoto(f.id)}
                  aria-label="Quitar foto"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-sm text-white"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {Array.from({ length: subiendo }, (_, i) => (
            <div
              key={`subiendo-${i}`}
              className="flex h-24 w-24 animate-pulse items-center justify-center rounded-lg border border-dashed border-blue-300 bg-blue-50 text-xs text-blue-700"
            >
              Subiendo…
            </div>
          ))}
          {!lleno && (
            <label
              className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs font-semibold ${
                deshabilitado
                  ? "cursor-default border-slate-200 text-slate-400"
                  : "cursor-pointer border-blue-300 text-blue-700 hover:bg-blue-50"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              Agregar foto
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={deshabilitado}
                onChange={(e) => {
                  const archivos = [...(e.target.files ?? [])];
                  e.target.value = "";
                  if (archivos.length) onSubirFotos?.(archivos);
                }}
                className="sr-only"
              />
            </label>
          )}
        </div>
        {mensajeError}
      </div>
    );
  }

  return null;
}

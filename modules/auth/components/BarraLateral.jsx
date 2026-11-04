"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cerrarSesion } from "../actions";
import { COOKIE_BARRA } from "../preferencias";

// Íconos simples (trazo de 2px, heredan el color del texto).
const ICONOS = {
  dashboard: (
    <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" />
  ),
  cronogramas: (
    <path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 8h2m4 0h2m-8 4h2m4 0h2" />
  ),
  inspectores: (
    <path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m17 0v-1a4 4 0 0 0-3-3.87M14 4.13a4 4 0 0 1 0 7.75M13.5 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
  ),
  formularios: (
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.59a1 1 0 0 1 .7.29l5.42 5.42a1 1 0 0 1 .29.7V19a2 2 0 0 1-2 2Z" />
  ),
  "mi-cronograma": (
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
  ),
  salir: <path d="M15 17l5-5-5-5m5 5H9m4 9H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8" />,
  colapsar: <path d="M15 18l-6-6 6-6" />,
  expandir: <path d="M9 18l6-6-6-6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
};

function Icono({ nombre, className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {ICONOS[nombre]}
    </svg>
  );
}

function enlacesDe(usuario) {
  return usuario.esAdmin
    ? [
        { href: "/dashboard", etiqueta: "Dashboard", icono: "dashboard" },
        { href: "/", etiqueta: "Cronogramas", icono: "cronogramas" },
        { href: "/formularios", etiqueta: "Formularios", icono: "formularios" },
        { href: "/inspectores", etiqueta: "Inspectores", icono: "inspectores" },
      ]
    : [
        { href: "/mi-cronograma", etiqueta: "Mi cronograma", icono: "mi-cronograma" },
        { href: "/mis-formularios", etiqueta: "Mis formularios", icono: "formularios", contador: usuario.pendientes },
      ];
}

function esActivo(href, ruta) {
  return href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(`${href}/`);
}

function iniciales(nombre) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/** Contenido de la barra (se usa en escritorio y en el panel del celular). */
function Contenido({ usuario, colapsada, onNavegar, botonColapsar }) {
  const ruta = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className={`flex h-16 items-center border-b border-slate-100 ${colapsada ? "justify-center px-2" : "justify-between px-4"}`}>
        {!colapsada && <span className="text-sm font-bold leading-tight text-slate-900">Sistema de<br />Cronogramas</span>}
        {botonColapsar}
      </div>

      <nav aria-label="Principal" className="flex-1 space-y-1 p-2">
        {enlacesDe(usuario).map((e) => {
          const activo = esActivo(e.href, ruta);
          return (
            <Link
              key={e.href}
              href={e.href}
              onClick={onNavegar}
              title={colapsada ? e.etiqueta : undefined}
              aria-current={activo ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                colapsada ? "justify-center" : ""
              } ${activo ? "bg-marca-suave text-tinta ring-1 ring-marca/40" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <span className="relative">
                <Icono nombre={e.icono} />
                {colapsada && e.contador > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </span>
              {!colapsada && <span className="flex-1">{e.etiqueta}</span>}
              {!colapsada && e.contador > 0 && (
                <span
                  aria-label={`${e.contador} pendiente(s)`}
                  className="rounded-full bg-tinta px-2 py-0.5 text-[11px] font-bold text-white"
                >
                  {e.contador}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-2">
        <div className={`flex items-center gap-3 px-2 py-2 ${colapsada ? "justify-center" : ""}`} title={colapsada ? usuario.nombre : undefined}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marca-suave text-xs font-bold text-tinta ring-1 ring-marca">
            {iniciales(usuario.nombre)}
          </span>
          {!colapsada && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">{usuario.nombre}</span>
              <span className="block truncate text-xs text-slate-500">
                {usuario.esAdmin ? "Administrador" : usuario.rol}
              </span>
            </span>
          )}
        </div>
        <form action={cerrarSesion}>
          <button
            type="submit"
            title={colapsada ? "Cerrar sesión" : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 ${
              colapsada ? "justify-center" : ""
            }`}
          >
            <Icono nombre="salir" />
            {!colapsada && <span>Cerrar sesión</span>}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Barra lateral de navegación.
 * - Escritorio: fija a la izquierda; se colapsa a solo íconos (recordado en una cookie).
 * - Celular: barra superior con botón ☰ que abre la barra como panel deslizable.
 */
export default function BarraLateral({ usuario, colapsadaInicial = false }) {
  const [colapsada, setColapsada] = useState(colapsadaInicial);
  const [abiertaMovil, setAbiertaMovil] = useState(false);

  const alternar = () => {
    const nueva = !colapsada;
    setColapsada(nueva);
    document.cookie = `${COOKIE_BARRA}=${nueva ? "colapsada" : "expandida"}; path=/; max-age=31536000; samesite=lax`;
  };

  useEffect(() => {
    if (!abiertaMovil) return undefined;
    const alTeclado = (e) => e.key === "Escape" && setAbiertaMovil(false);
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [abiertaMovil]);

  return (
    <>
      {/* Celular: barra superior con botón de menú */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 md:hidden">
        <button
          type="button"
          onClick={() => setAbiertaMovil(true)}
          aria-label="Abrir menú"
          aria-expanded={abiertaMovil}
          className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100"
        >
          <Icono nombre="menu" className="h-6 w-6" />
        </button>
        <span className="text-sm font-bold text-slate-900">Sistema de Cronogramas</span>
      </div>

      {/* Celular: panel deslizable */}
      {abiertaMovil && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setAbiertaMovil(false)}
            className="absolute inset-0 bg-slate-900/50"
          />
          <aside className="relative h-full w-64 bg-white shadow-xl">
            <Contenido
              usuario={usuario}
              colapsada={false}
              onNavegar={() => setAbiertaMovil(false)}
              botonColapsar={
                <button
                  type="button"
                  onClick={() => setAbiertaMovil(false)}
                  aria-label="Cerrar menú"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                >
                  <Icono nombre="cerrar" />
                </button>
              }
            />
          </aside>
        </div>
      )}

      {/* Escritorio: barra fija, expandida o colapsada */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 md:block ${
          colapsada ? "w-16" : "w-60"
        }`}
      >
        <Contenido
          usuario={usuario}
          colapsada={colapsada}
          botonColapsar={
            <button
              type="button"
              onClick={alternar}
              aria-label={colapsada ? "Expandir menú" : "Colapsar menú"}
              aria-expanded={!colapsada}
              title={colapsada ? "Expandir menú" : "Colapsar menú"}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              <Icono nombre={colapsada ? "expandir" : "colapsar"} />
            </button>
          }
        />
      </aside>
    </>
  );
}

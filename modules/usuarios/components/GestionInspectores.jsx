"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ROL_ADMINISTRACION, ROLES_OPERATIVOS } from "@/db/roles";
import { cambiarAdministrador, cambiarEstadoInspector, crearInspector, restablecerClave } from "../actions";

// Pestaña del cronograma que corresponde a cada rol operativo.
const VISTA_POR_ROL = {
  "Inspector SIHO": "inspector-siho",
  Paramédico: "paramedicos",
  Rescatista: "rescatistas",
};
const ROLES_FORM = [...ROLES_OPERATIVOS, ROL_ADMINISTRACION];

const FORM_VACIO = { nombre: "", usuario: "", cargo: "" };

const CLASE_CAMPO =
  "mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-800";
const CLASE_ETIQUETA = "block text-xs font-medium text-slate-500";

function Etiqueta({ children, tono }) {
  const tonos = {
    azul: "bg-blue-50 text-blue-700 border-blue-200",
    ambar: "bg-amber-50 text-amber-800 border-amber-200",
    rojo: "bg-red-50 text-red-700 border-red-200",
    gris: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`ml-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${tonos[tono]}`}>
      {children}
    </span>
  );
}

/** Panel que muestra una contraseña temporal UNA sola vez para entregarla al usuario. */
function ClaveTemporal({ datos, onCerrar }) {
  const [copiado, setCopiado] = useState(false);
  const usuarioTexto = datos.usuario || datos.correo;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`Usuario: ${usuarioTexto}\nContraseña temporal: ${datos.clave}`);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };
  return (
    <div role="status" className="rounded border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="font-semibold">{datos.titulo}</p>
      <p className="mt-1">
        Entréguele estos datos a <strong>{datos.nombre}</strong>. La contraseña no se volverá a mostrar y el sistema le
        pedirá cambiarla al entrar.
      </p>
      <dl className="mt-3 grid gap-1 font-mono text-sm sm:grid-cols-[auto_1fr] sm:gap-x-3">
        <dt className="text-emerald-700">Usuario</dt>
        <dd className="select-all font-semibold">{usuarioTexto}</dd>
        <dt className="text-emerald-700">Contraseña temporal</dt>
        <dd className="select-all text-base font-bold tracking-wider">{datos.clave}</dd>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copiar}
          className="rounded border border-emerald-400 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
        >
          {copiado ? "Copiado ✓" : "Copiar datos"}
        </button>
        {datos.enlace && (
          <Link
            href={datos.enlace}
            className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            Generar su cronograma →
          </Link>
        )}
        <button
          type="button"
          onClick={onCerrar}
          className="rounded px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
        >
          Ya la entregué, cerrar
        </button>
      </div>
    </div>
  );
}

export default function GestionInspectores({ inspectores, rolInicial, usuarioActualId }) {
  const [isPending, startTransition] = useTransition();
  const [formAbierto, setFormAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [rol, setRol] = useState(ROLES_FORM.includes(rolInicial) ? rolInicial : ROLES_FORM[0]);
  const [errorForm, setErrorForm] = useState("");
  const [mensaje, setMensaje] = useState({ tipo: "idle", texto: "" });
  const [claveMostrada, setClaveMostrada] = useState(null);
  const [verInactivos, setVerInactivos] = useState(false);

  const urlCronograma = (i) => (VISTA_POR_ROL[i.rol] ? `/?vista=${VISTA_POR_ROL[i.rol]}&usuario=${i.id}` : null);

  const abrirFormulario = () => {
    setForm(FORM_VACIO);
    setErrorForm("");
    setFormAbierto(true);
  };

  const handleCrear = (e) => {
    e.preventDefault();
    const datos = { ...form, rol };
    startTransition(async () => {
      try {
        const res = await crearInspector(datos);
        if (res?.success) {
          setClaveMostrada({
            titulo: `${datos.nombre.trim()} quedó registrado como ${rol}.`,
            nombre: datos.nombre.trim(),
            usuario: (res?.usuario || datos.usuario).trim().toLowerCase(),
            clave: res.claveTemporal,
            enlace: urlCronograma({ id: res.id, rol }),
          });
          setMensaje({ tipo: "idle", texto: "" });
          setForm(FORM_VACIO);
          setFormAbierto(false);
        } else {
          setErrorForm(res?.error ?? "No se pudo guardar.");
        }
      } catch {
        setErrorForm("Sin conexión con el servidor.");
      }
    });
  };

  const ejecutar = (accion, exito) => {
    startTransition(async () => {
      try {
        const res = await accion();
        setMensaje(res?.success ? { tipo: "ok", texto: exito(res) } : { tipo: "error", texto: res?.error ?? "No se pudo completar." });
      } catch {
        setMensaje({ tipo: "error", texto: "Sin conexión con el servidor." });
      }
    });
  };

  const handleEstado = (u) => {
    if (u.activo && !window.confirm(`¿Desactivar a ${u.nombre}? Perderá el acceso; su historial se conserva.`)) return;
    ejecutar(
      () => cambiarEstadoInspector({ id: u.id, activo: !u.activo }),
      () => `${u.nombre}: ${u.activo ? "desactivado" : "reactivado"}.`
    );
  };

  const handleRestablecer = (u) => {
    if (!window.confirm(`¿Generar una nueva contraseña temporal para ${u.nombre}? La actual dejará de funcionar.`)) return;
    startTransition(async () => {
      try {
        const res = await restablecerClave({ id: u.id });
        if (res?.success) {
          setClaveMostrada({
            titulo: `Nueva contraseña temporal para ${u.nombre}.`,
            nombre: u.nombre,
            usuario: res?.usuario || u.alias || u.correo,
            clave: res.claveTemporal,
            enlace: null,
          });
          setMensaje({ tipo: "idle", texto: "" });
        } else {
          setMensaje({ tipo: "error", texto: res?.error ?? "No se pudo restablecer." });
        }
      } catch {
        setMensaje({ tipo: "error", texto: "Sin conexión con el servidor." });
      }
    });
  };

  const handleAdmin = (u) => {
    const dar = !u.esAdmin;
    if (!window.confirm(dar ? `¿Dar permiso de administrador a ${u.nombre}?` : `¿Quitar el permiso de administrador a ${u.nombre}?`)) return;
    ejecutar(
      () => cambiarAdministrador({ id: u.id, esAdmin: dar }),
      () => `${u.nombre}: ${dar ? "ahora es administrador" : "ya no es administrador"}.`
    );
  };

  const visibles = inspectores.filter((i) => verInactivos || i.activo);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" className="min-h-[1.5rem] text-sm">
          {mensaje.texto && (
            <span className={`font-medium ${mensaje.tipo === "error" ? "text-red-600" : "text-emerald-700"}`}>
              {mensaje.texto}
            </span>
          )}
        </div>
        {!formAbierto && (
          <button
            type="button"
            onClick={abrirFormulario}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            + Registrar usuario
          </button>
        )}
      </div>

      {claveMostrada && <ClaveTemporal datos={claveMostrada} onCerrar={() => setClaveMostrada(null)} />}

      {formAbierto && (
        <form onSubmit={handleCrear} className="rounded border border-blue-200 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-blue-50/60 px-4 py-3">
            <h2 className="text-sm font-bold text-blue-900">Registrar usuario</h2>
            <p className="text-xs text-blue-800/80">
              Se generará una contraseña temporal para entregarle. Con el rol <strong>Administración</strong> se crea un
              administrador que no ejecuta inspecciones.
            </p>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className={CLASE_ETIQUETA}>
              Nombre y apellido *
              <input
                required
                autoFocus
                minLength={3}
                maxLength={100}
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={CLASE_CAMPO}
              />
            </label>

            <label className={CLASE_ETIQUETA}>
              Rol *
              <select value={rol} onChange={(e) => setRol(e.target.value)} className={CLASE_CAMPO}>
                {ROLES_FORM.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label className={CLASE_ETIQUETA}>
              Usuario *
              <input
                required
                type="text"
                maxLength={50}
                placeholder="Ej. cperez"
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                className={CLASE_CAMPO}
              />
            </label>

            <label className={CLASE_ETIQUETA}>
              Cargo
              <input
                maxLength={100}
                placeholder="Ej. Supervisor SIHO"
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                className={CLASE_CAMPO}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-4 py-3">
            {errorForm && (
              <span aria-live="polite" className="mr-auto text-xs font-medium text-red-600">
                {errorForm}
              </span>
            )}
            <button
              type="button"
              onClick={() => setFormAbierto(false)}
              disabled={isPending}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      <section className="overflow-x-auto rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-bold text-slate-800">
            Usuarios registrados{" "}
            <span className="font-normal text-slate-500">({inspectores.filter((i) => i.activo).length} activos)</span>
          </h2>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={verInactivos}
              onChange={(e) => setVerInactivos(e.target.checked)}
              className="h-3.5 w-3.5 accent-blue-600"
            />
            Mostrar desactivados
          </label>
        </div>

        {visibles.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            Aún no hay usuarios. Pulse <strong>Registrar usuario</strong> para agregar el primero.
          </p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2">Cargo</th>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Último acceso</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((u) => {
                const yo = u.id === usuarioActualId;
                const enlace = urlCronograma(u);
                return (
                  <tr key={u.id} className={`border-t border-slate-100 ${u.activo ? "" : "bg-slate-50 text-slate-400"}`}>
                    <td className="px-4 py-2 font-medium">
                      {u.nombre}
                      {yo && <Etiqueta tono="gris">Usted</Etiqueta>}
                      {u.esAdmin && <Etiqueta tono="azul">Admin</Etiqueta>}
                      {!u.activo && <Etiqueta tono="gris">Desactivado</Etiqueta>}
                      {u.activo && !u.tieneAcceso && <Etiqueta tono="ambar">Sin contraseña</Etiqueta>}
                      {u.activo && u.tieneAcceso && u.debeCambiarClave && <Etiqueta tono="ambar">Clave temporal</Etiqueta>}
                      {u.bloqueado && <Etiqueta tono="rojo">Bloqueado</Etiqueta>}
                    </td>
                    <td className="px-4 py-2">{u.rol}</td>
                    <td className="px-4 py-2 text-slate-600">{u.cargo || "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{u.alias || u.correo || "—"}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{u.ultimoAcceso ?? "Nunca"}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-xs">
                      <div className="inline-flex flex-wrap justify-end gap-x-3 gap-y-1">
                        {u.activo && enlace && (
                          <Link href={enlace} className="font-semibold text-blue-700 hover:underline">
                            Cronograma
                          </Link>
                        )}
                        {u.activo && !yo && (u.alias || u.correo) && (
                          <button
                            type="button"
                            onClick={() => handleRestablecer(u)}
                            disabled={isPending}
                            className="font-semibold text-slate-700 hover:underline disabled:opacity-50"
                          >
                            {u.tieneAcceso ? "Restablecer contraseña" : "Dar acceso"}
                          </button>
                        )}
                        {u.activo && !yo && u.rol !== ROL_ADMINISTRACION && (
                          <button
                            type="button"
                            onClick={() => handleAdmin(u)}
                            disabled={isPending}
                            className="font-semibold text-slate-700 hover:underline disabled:opacity-50"
                          >
                            {u.esAdmin ? "Quitar admin" : "Hacer admin"}
                          </button>
                        )}
                        {!yo && (
                          <button
                            type="button"
                            onClick={() => handleEstado(u)}
                            disabled={isPending}
                            className={`font-semibold hover:underline disabled:opacity-50 ${u.activo ? "text-red-600" : "text-emerald-700"}`}
                          >
                            {u.activo ? "Desactivar" : "Reactivar"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

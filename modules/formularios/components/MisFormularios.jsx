import Link from "next/link";
import { connection } from "next/server";
import { requerirUsuario } from "@/modules/auth/dal";
import { hoyISO, textoFecha, textoFechaHora } from "../fechas";
import { listarMisAsignaciones } from "../queries";

// Estado de una asignación pendiente según su fecha límite.
function situacion(a, hoy) {
  if (a.estado === "completada") return { texto: "Enviado", punto: "bg-emerald-500", tono: "text-emerald-700" };
  if (a.fechaLimite && a.fechaLimite < hoy) return { texto: "Atrasado", punto: "bg-red-500", tono: "text-red-700" };
  if (a.fechaLimite === hoy) return { texto: "Para hoy", punto: "bg-marca", tono: "text-tinta" };
  return { texto: "Pendiente", punto: "bg-slate-300", tono: "text-slate-600" };
}

function Fila({ a, hoy }) {
  const s = situacion(a, hoy);
  const detalle =
    a.estado === "completada"
      ? `Enviado ${textoFechaHora(a.completadaEn)}`
      : a.fechaLimite
        ? `${a.fechaLimite === hoy ? "Hoy" : textoFecha(a.fechaLimite)}${a.origen === "cronograma" ? " · según su cronograma" : ""}`
        : "Sin fecha límite";
  return (
    <li>
      <Link
        href={`/mis-formularios/${a.id}`}
        className="flex items-center gap-4 rounded-xl bg-white px-4 py-3.5 ring-1 ring-slate-200/70 transition hover:ring-slate-300"
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.punto}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-slate-900">{a.titulo}</span>
          <span className="block truncate text-xs text-slate-500">{detalle}</span>
          {a.nota && <span className="mt-0.5 block truncate text-xs italic text-slate-500">“{a.nota}”</span>}
        </span>
        <span className={`shrink-0 text-xs font-medium ${s.tono}`}>{s.texto}</span>
        <span className="shrink-0 text-slate-300" aria-hidden="true">›</span>
      </Link>
    </li>
  );
}

function Seccion({ titulo, cantidad, children }) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-baseline gap-2 text-sm font-semibold text-slate-900">
        {titulo}
        <span className="font-normal text-slate-400">{cantidad}</span>
      </h3>
      {children}
    </section>
  );
}

// Lista plegable (próximos y enviados) para que lo urgente quede arriba sin ruido.
function Plegable({ titulo, cantidad, children }) {
  return (
    <details className="group space-y-2.5">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-900 marker:hidden">
        <span className="text-slate-400 transition group-open:rotate-90" aria-hidden="true">›</span>
        {titulo}
        <span className="font-normal text-slate-400">{cantidad}</span>
      </summary>
      {children}
    </details>
  );
}

// Server Component: formularios asignados al usuario de la sesión.
export default async function MisFormularios() {
  await connection();
  const usuario = await requerirUsuario();
  const hoy = hoyISO();

  const todas = await listarMisAsignaciones(usuario.id);
  const pendientes = todas
    .filter((a) => a.estado === "pendiente" && a.activo)
    .sort((a, b) => (a.fechaLimite ?? "9999").localeCompare(b.fechaLimite ?? "9999"));
  // Lo que toca hoy, lo atrasado y lo que no tiene fecha; lo de días futuros va aparte.
  const porLlenar = pendientes.filter((a) => !a.fechaLimite || a.fechaLimite <= hoy);
  const proximos = pendientes.filter((a) => a.fechaLimite && a.fechaLimite > hoy);
  const enviadas = todas
    .filter((a) => a.estado === "completada")
    .sort((a, b) => new Date(b.completadaEn) - new Date(a.completadaEn));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Seccion titulo="Por llenar" cantidad={porLlenar.length}>
        {porLlenar.length === 0 ? (
          <p className="rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-500 ring-1 ring-slate-200/70">
            Nada pendiente para hoy. 👍
          </p>
        ) : (
          <ul className="space-y-2">
            {porLlenar.map((a) => (
              <Fila key={a.id} a={a} hoy={hoy} />
            ))}
          </ul>
        )}
      </Seccion>

      {proximos.length > 0 && (
        <Plegable titulo="Próximos" cantidad={proximos.length}>
          <ul className="space-y-2">
            {proximos.map((a) => (
              <Fila key={a.id} a={a} hoy={hoy} />
            ))}
          </ul>
        </Plegable>
      )}

      {enviadas.length > 0 && (
        <Plegable titulo="Enviados" cantidad={enviadas.length}>
          <ul className="space-y-2">
            {enviadas.map((a) => (
              <Fila key={a.id} a={a} hoy={hoy} />
            ))}
          </ul>
        </Plegable>
      )}
    </div>
  );
}

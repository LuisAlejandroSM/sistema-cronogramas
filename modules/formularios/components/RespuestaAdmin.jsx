import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requerirAdmin } from "@/modules/auth/dal";
import { textoFecha, textoFechaHora } from "../fechas";
import { obtenerAsignacionCompleta } from "../queries";
import EncabezadoFormato from "./EncabezadoFormato";
import VerRespuesta from "./VerRespuesta";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server Component (solo administradores): respuesta completa de un inspector.
export default async function RespuestaAdmin({ params }) {
  await connection();
  await requerirAdmin();

  const { asignacionId } = await params;
  if (!UUID_RE.test(String(asignacionId))) notFound();
  const datos = await obtenerAsignacionCompleta(asignacionId);
  if (!datos) notFound();
  const { asignacion, formulario, inspector, respuesta, fotos } = datos;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/formularios/${formulario.id}/resultados`} className="text-sm font-semibold text-blue-700 hover:underline">
        ← {formulario.titulo}
      </Link>
      <EncabezadoFormato
        titulo={formulario.titulo}
        codigo={formulario.codigo}
        emision={formulario.emision}
        revision={formulario.revision}
      >
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline text-slate-500">Inspector: </dt>
            <dd className="inline font-semibold text-slate-800">
              {inspector.nombre} <span className="font-normal text-slate-500">({inspector.rol})</span>
            </dd>
          </div>
          <div>
            <dt className="inline text-slate-500">Enviada: </dt>
            <dd className="inline font-semibold text-slate-800">{textoFechaHora(respuesta?.enviadaEn) ?? "Aún no enviada"}</dd>
          </div>
          <div>
            <dt className="inline text-slate-500">Asignada: </dt>
            <dd className="inline text-slate-800">{textoFechaHora(asignacion.creadoEn)}</dd>
          </div>
          <div>
            <dt className="inline text-slate-500">Fecha límite: </dt>
            <dd className="inline text-slate-800">{textoFecha(asignacion.fechaLimite) ?? "—"}</dd>
          </div>
        </dl>
      </EncabezadoFormato>

      {respuesta ? (
        <VerRespuesta campos={respuesta.camposSnapshot} respuestas={respuesta.respuestas} fotos={fotos} />
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          El inspector todavía no envía este formulario.
        </p>
      )}
    </div>
  );
}

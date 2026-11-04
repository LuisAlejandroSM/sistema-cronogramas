import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requerirUsuario } from "@/modules/auth/dal";
import { textoFecha, textoFechaHora } from "../fechas";
import { obtenerAsignacionCompleta } from "../queries";
import EncabezadoFormato from "./EncabezadoFormato";
import LlenarFormulario from "./LlenarFormulario";
import VerRespuesta from "./VerRespuesta";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server Component: el inspector llena (o consulta, si ya lo envió) un formulario asignado a él.
export default async function FormularioAsignado({ params }) {
  await connection();
  const usuario = await requerirUsuario();

  const { asignacionId } = await params;
  if (!UUID_RE.test(String(asignacionId))) notFound();
  const datos = await obtenerAsignacionCompleta(asignacionId);
  // Solo el dueño de la asignación puede verla (otro inspector recibe "no encontrado").
  if (!datos || datos.asignacion.usuarioId !== usuario.id) notFound();
  const { asignacion, formulario, respuesta, fotos } = datos;

  const encabezado = (
    <EncabezadoFormato
      titulo={formulario.titulo}
      descripcion={formulario.descripcion}
      codigo={formulario.codigo}
      emision={formulario.emision}
      revision={formulario.revision}
    >
      {asignacion.nota && <p className="mt-2 text-sm italic text-slate-700">Nota del administrador: “{asignacion.nota}”</p>}
      <p className="mt-2 text-xs text-slate-500">
        {respuesta
          ? `Enviado ${textoFechaHora(respuesta.enviadaEn)}`
          : asignacion.fechaLimite
            ? `Fecha límite: ${textoFecha(asignacion.fechaLimite)}`
            : "Sin fecha límite"}
      </p>
    </EncabezadoFormato>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <Link href="/mis-formularios" className="text-sm font-semibold text-blue-700 hover:underline">
        ← Mis formularios
      </Link>
      {encabezado}
      {respuesta ? (
        <>
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
            ✓ Formulario enviado. Estas fueron sus respuestas.
          </p>
          <VerRespuesta campos={respuesta.camposSnapshot} respuestas={respuesta.respuestas} fotos={fotos} />
        </>
      ) : !formulario.activo ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900">
          Este formulario fue archivado por el administrador y ya no se puede llenar.
        </p>
      ) : (
        <LlenarFormulario
          asignacionId={asignacion.id}
          formulario={{ titulo: formulario.titulo, descripcion: formulario.descripcion, campos: formulario.campos }}
          fotosIniciales={fotos}
        />
      )}
    </div>
  );
}

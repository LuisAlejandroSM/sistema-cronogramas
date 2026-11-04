import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requerirAdmin } from "@/modules/auth/dal";
import { obtenerInspectores } from "@/modules/usuarios/queries";
import { hoyISO, textoFecha, textoFechaHora } from "../fechas";
import { cargarFormatosParaVincular } from "../formatos";
import { listarAsignacionesDeFormulario, listarRespuestasDeFormulario, obtenerFormulario } from "../queries";
import { normalizarRespuesta } from "../resultados";
import EditorFormulario from "./EditorFormulario";
import PanelAsignaciones from "./PanelAsignaciones";
import ResultadosFormulario from "./ResultadosFormulario";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SECCIONES = {
  editar: "Editar formulario",
  asignar: "Asignar a inspectores",
  resultados: "Resultados",
};

// Asignaciones del formulario listas para el navegador (fechas como texto).
async function cargarAsignaciones(id) {
  const hoy = hoyISO();
  const asignaciones = await listarAsignacionesDeFormulario(id);
  return asignaciones.map((a) => ({
    id: a.id,
    usuarioId: a.usuarioId,
    inspector: a.inspector,
    rol: a.rol,
    nota: a.nota,
    estado: a.estado,
    origen: a.origen,
    vencida: a.estado === "pendiente" && Boolean(a.fechaLimite) && a.fechaLimite < hoy,
    asignadoTexto: textoFechaHora(a.creadoEn),
    limiteTexto: textoFecha(a.fechaLimite),
    completadaTexto: a.completadaEn ? `Enviada ${textoFechaHora(a.completadaEn)}` : null,
  }));
}

// Respuestas listas para el navegador (fechas como texto, listas por texto del ítem).
async function cargarRespuestas(id) {
  const respuestas = await listarRespuestasDeFormulario(id);
  return respuestas.map((r) => ({
    id: r.asignacionId,
    usuarioId: r.usuarioId,
    inspector: r.inspector,
    rol: r.rol,
    enviadaEn: new Date(r.enviadaEn).toISOString(),
    enviadaTexto: textoFechaHora(r.enviadaEn),
    aTiempo: r.fechaLimite ? hoyISO(new Date(r.enviadaEn)) <= r.fechaLimite : null,
    valores: normalizarRespuesta(r.camposSnapshot, r.respuestas),
  }));
}

/**
 * Server Component (solo administradores): una sola sección de un formulario.
 * Cada sección es su propia página y carga solo los datos que necesita.
 * @param {{ params: Promise<{ id: string }>, seccion: "editar" | "asignar" | "resultados" }} props
 */
export default async function DetalleFormulario({ params, seccion }) {
  await connection();
  await requerirAdmin();

  const { id } = await params;
  if (!UUID_RE.test(String(id))) notFound();

  const formulario = await obtenerFormulario(id);
  if (!formulario) notFound();
  // Formato del cronograma vinculado (si lo hay), para mostrarlo en la cabecera y en Asignar.
  const formatos = await cargarFormatosParaVincular();
  const formato = formatos.find((f) => f.id === formulario.plantillaId) ?? null;

  let contenido;
  if (seccion === "asignar") {
    // Solo inspectores del rol del formulario (sin rol definido no se lista a nadie).
    const [asignaciones, inspectores] = await Promise.all([
      cargarAsignaciones(id),
      formulario.rol ? obtenerInspectores({ rol: formulario.rol }) : Promise.resolve([]),
    ]);
    contenido = (
      <PanelAsignaciones
        formularioId={formulario.id}
        activo={formulario.activo}
        rol={formulario.rol}
        formato={formato ? { nombre: formato.nombre, codigo: formato.codigo, periodicidad: formato.periodicidad } : null}
        inspectores={inspectores.map((i) => ({ id: i.id, nombre: i.nombre, rol: i.rol }))}
        asignaciones={asignaciones}
      />
    );
  } else if (seccion === "resultados") {
    const [asignaciones, respuestas] = await Promise.all([cargarAsignaciones(id), cargarRespuestas(id)]);
    contenido = (
      <ResultadosFormulario titulo={formulario.titulo} campos={formulario.campos} respuestas={respuestas} asignaciones={asignaciones} />
    );
  } else {
    contenido = (
      <EditorFormulario
        formulario={{
          id: formulario.id,
          titulo: formulario.titulo,
          descripcion: formulario.descripcion,
          codigo: formulario.codigo,
          emision: formulario.emision,
          revision: formulario.revision,
          rol: formulario.rol,
          plantillaId: formulario.plantillaId,
          campos: formulario.campos,
        }}
        formatos={formatos}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        {/* Ruta: Formularios / sección */}
        <nav aria-label="Ruta" className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link href="/formularios" className="hover:text-slate-900">
            Formularios
          </Link>
          <span aria-hidden="true" className="text-slate-300">
            /
          </span>
          <span className="text-slate-700">{SECCIONES[seccion] ?? SECCIONES.editar}</span>
        </nav>
        <h2 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
          {formulario.titulo}
          {formulario.rol && (
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{formulario.rol}</span>
          )}
          {formato && (
            <span className="rounded-full bg-marca-suave px-2.5 py-0.5 text-xs font-medium text-tinta">Cronograma · {formato.codigo}</span>
          )}
          {!formulario.activo && (
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">Archivado</span>
          )}
        </h2>
      </div>
      {contenido}
    </div>
  );
}

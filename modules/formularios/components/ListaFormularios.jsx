import Link from "next/link";
import { connection } from "next/server";
import { requerirAdmin } from "@/modules/auth/dal";
import { TIPOS_CAMPO } from "../campos";
import { textoFechaHora } from "../fechas";
import { listarFormularios } from "../queries";
import BotonArchivar from "./BotonArchivar";
import BotonEliminarFormulario from "./BotonEliminarFormulario";

// Server Component (solo administradores): lista de formularios creados.
export default async function ListaFormularios() {
  await connection();
  await requerirAdmin();

  let lista;
  try {
    lista = await listarFormularios();
  } catch (error) {
    console.error("[formularios] Error listando formularios:", error);
    return (
      <section className="rounded border border-red-300 bg-red-50 p-6 text-sm text-red-900">
        No se pudieron cargar los formularios.
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/formularios/nuevo"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          + Nuevo formulario
        </Link>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Aún no hay formularios. Cree el primero con <strong>Nuevo formulario</strong>.
        </p>
      ) : (
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">Formulario</th>
                <th className="px-4 py-2 text-right">Preguntas</th>
                <th className="px-4 py-2 text-right">Pendientes</th>
                <th className="px-4 py-2 text-right">Completadas</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id} className={`border-t border-slate-100 ${f.activo ? "" : "bg-slate-50 text-slate-400"}`}>
                  <td className="px-4 py-2.5">
                    <Link href={`/formularios/${f.id}/editar`} className="font-semibold text-slate-800 hover:text-blue-700 hover:underline">
                      {f.titulo}
                    </Link>
                    {!f.activo && (
                      <span className="ml-2 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        Archivado
                      </span>
                    )}
                    {f.codigo && <span className="ml-2 font-mono text-[11px] text-slate-500">{f.codigo}</span>}
                    {f.rol ? (
                      <span className="ml-2 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{f.rol}</span>
                    ) : (
                      <span className="ml-2 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Sin rol</span>
                    )}
                    {f.descripcion && <span className="block max-w-sm truncate text-xs text-slate-500">{f.descripcion}</span>}
                    <span className="block text-[11px] text-slate-400">
                      {f.formato ? `Cronograma: ${f.formato} · ` : ""}Actualizado {textoFechaHora(f.actualizadoEn)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {f.campos.filter((c) => TIPOS_CAMPO[c.tipo]?.esPregunta).length}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-700">{f.pendientes}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{f.completadas}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs">
                    <div className="flex flex-col items-end gap-1.5">
                      {/* Las tres vistas del formulario, cada una abre su propia pestaña */}
                      <div className="inline-flex overflow-hidden rounded-md border border-slate-300 font-semibold">
                        {[
                          ["editar", "Editar"],
                          ["asignar", "Asignar"],
                          ["resultados", "Resultados"],
                        ].map(([pestana, etiqueta], i) => (
                          <Link
                            key={pestana}
                            href={`/formularios/${f.id}/${pestana}`}
                            className={`px-2.5 py-1 text-blue-700 transition hover:bg-blue-50 ${i > 0 ? "border-l border-slate-300" : ""}`}
                          >
                            {etiqueta}
                          </Link>
                        ))}
                      </div>
                      <div className="inline-flex gap-3 text-[11px]">
                        <BotonArchivar id={f.id} activo={f.activo} titulo={f.titulo} />
                        {f.completadas === 0 && <BotonEliminarFormulario id={f.id} titulo={f.titulo} pendientes={f.pendientes} />}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

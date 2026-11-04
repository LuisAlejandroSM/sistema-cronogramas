import { anchoEfectivo, esNegativa, textoRespuesta, TIPOS_CAMPO } from "../campos";
import { CLASE_ANCHO, CLASE_REJILLA } from "./diseno";

function Imagen({ id, alt, contener = false }) {
  return (
    <a
      href={`/api/archivos/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`block overflow-hidden rounded-lg border border-slate-200 ${contener ? "h-28 w-64 bg-white p-1" : "h-28 w-28 bg-slate-100"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por /api/archivos */}
      <img src={`/api/archivos/${id}`} alt={alt} className={`h-full w-full ${contener ? "object-contain" : "object-cover"}`} />
    </a>
  );
}

/**
 * Respuesta enviada, en solo lectura. Usa la copia de los campos guardada al responder.
 * @param {{ campos: object[], respuestas: Record<string, unknown>, fotos: { id: string, campoId: string }[] }} props
 */
export default function VerRespuesta({ campos, respuestas, fotos }) {
  return (
    <div className={CLASE_REJILLA}>
      {campos.map((c) => {
        const ancho = CLASE_ANCHO[anchoEfectivo(c)];
        if (!TIPOS_CAMPO[c.tipo]?.esPregunta) {
          return (
            <div
              key={c.id}
              className={`${ancho} mt-3 rounded-xl border border-l-[6px] border-slate-200 border-l-marca bg-white px-5 py-3 shadow-sm`}
            >
              <h3 className="text-lg font-bold text-slate-900">{c.etiqueta}</h3>
              {c.ayuda && <p className="text-sm text-slate-500">{c.ayuda}</p>}
            </div>
          );
        }
        const valor = respuestas?.[c.id];
        const archivos = c.tipo === "foto" || c.tipo === "firma" ? fotos.filter((f) => (valor ?? []).includes(f.id)) : [];

        let contenido;
        if (c.tipo === "foto") {
          contenido = archivos.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {archivos.map((f) => (
                <Imagen key={f.id} id={f.id} alt={`Foto: ${c.etiqueta}`} />
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-400">Sin fotos</p>
          );
        } else if (c.tipo === "firma") {
          contenido = archivos.length ? (
            <div className="mt-2">
              <Imagen id={archivos[0].id} alt={`Firma: ${c.etiqueta}`} contener />
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-400">Sin firma</p>
          );
        } else if (c.tipo === "tabla_verificacion") {
          const r = valor && typeof valor === "object" ? valor : {};
          contenido = (
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-1 pr-2 font-semibold">Ítem</th>
                  <th className="w-28 py-1 text-center font-semibold">{c.columnas.join(" / ")}</th>
                </tr>
              </thead>
              <tbody>
                {c.filas.map((fila, i) => {
                  const res = r[i];
                  // Se resaltan las fallas para leer rápido los hallazgos.
                  const negativa = esNegativa(res);
                  return (
                    <tr key={fila} className="border-b border-slate-100">
                      <td className="py-1 pr-2 text-slate-800">{fila}</td>
                      <td className="py-1 text-center">
                        <span
                          className={`inline-block min-w-10 rounded px-1.5 py-0.5 text-xs font-bold ${
                            res === undefined
                              ? "text-slate-300"
                              : negativa
                                ? "bg-red-50 text-red-700"
                                : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {res ?? "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        } else {
          contenido = <p className="mt-1 whitespace-pre-line text-sm font-medium text-slate-900">{textoRespuesta(c, valor)}</p>;
        }

        return (
          <div key={c.id} className={`${ancho} rounded-xl border border-slate-200 bg-white p-5 shadow-sm`}>
            <p className="text-sm font-semibold text-slate-700">{c.etiqueta}</p>
            {contenido}
          </div>
        );
      })}
    </div>
  );
}

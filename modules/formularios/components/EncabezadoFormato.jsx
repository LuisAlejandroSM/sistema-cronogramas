/**
 * Encabezado del formulario con los datos del formato oficial (código, emisión, revisión).
 * `children` agrega líneas extra (nota, fechas, inspector…).
 */
export default function EncabezadoFormato({ titulo, descripcion, codigo, emision, revision, children }) {
  const datos = [
    ["Código", codigo],
    ["Emisión", emision],
    ["Revisión", revision],
  ].filter(([, v]) => v);

  return (
    <div className="overflow-hidden rounded-xl border-t-4 border-marca bg-white shadow-sm">
      <div className="p-5">
        <h2 className="text-xl font-bold text-slate-900">{titulo || "Formulario sin título"}</h2>
        {descripcion && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{descripcion}</p>}
        {children}
      </div>
      {datos.length > 0 && (
        <dl className="flex flex-wrap divide-x divide-slate-200 border-t border-slate-200 bg-slate-50 text-xs">
          {datos.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="px-4 py-2">
              <dt className="inline text-slate-500">{etiqueta}: </dt>
              <dd className="inline font-semibold text-slate-800">{valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

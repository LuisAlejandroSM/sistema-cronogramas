import Link from "next/link";
import { connection } from "next/server";
import { requerirAdmin } from "@/modules/auth/dal";
import NuevaInspeccion from "@/modules/plantillas/components/NuevaInspeccion";
import { completarConEliminadas, obtenerPlantillas } from "@/modules/plantillas/queries";
import { obtenerInspectores, obtenerUsuarioPorId } from "@/modules/usuarios/queries";
import { diaDeFecha, diaDeLaSemana, normalizarFiltros, vistaPorClave, vistaPorRol } from "../constants";
import { obtenerRegistrosConsolidados, obtenerRegistrosUsuario } from "../queries";
import FiltrosCronograma from "./FiltrosCronograma";
import GeneradorCronograma from "./GeneradorCronograma";
import MatrizMes from "./MatrizMes";

// Ejecuta todas las consultas y devuelve un resultado plano (sin JSX dentro del try/catch).
async function cargarDatos(filtros) {
  try {
    const [inspectores, usuarioSeleccionado] = await Promise.all([
      obtenerInspectores(),
      filtros.usuarioId ? obtenerUsuarioPorId(filtros.usuarioId) : Promise.resolve(null),
    ]);

    // Un inspector válido manda sobre la pestaña: siempre se muestra en la vista de su rol.
    const usuario = usuarioSeleccionado && inspectores.some((i) => i.id === usuarioSeleccionado.id)
      ? usuarioSeleccionado
      : null;
    const vista = usuario ? vistaPorRol(usuario.rol) : vistaPorClave(filtros.vista);

    const [plantillas, registros] = usuario
      ? await Promise.all([
          obtenerPlantillas({ rol: usuario.rol }),
          obtenerRegistrosUsuario({ usuarioId: usuario.id, mes: filtros.mes, anio: filtros.anio }),
        ])
      : await Promise.all([
          obtenerPlantillas({ rol: vista.rol }),
          obtenerRegistrosConsolidados({ rol: vista.rol, mes: filtros.mes, anio: filtros.anio }),
        ]);

    // Inspecciones eliminadas que tienen registros este mes: se siguen mostrando (historial).
    const conEliminadas = await completarConEliminadas(plantillas, registros);
    return { ok: true, vista, usuario, inspectores, plantillas: conEliminadas, registros };
  } catch (error) {
    console.error("[cronogramas] Error consultando la base de datos:", error);
    return { ok: false, detalle: error?.code ?? error?.message ?? "Error desconocido" };
  }
}

// Día de la semana (1-5) en que cada formato tiene su primera P del mes.
// Sirve para precargar el generador con la asignación vigente.
function asignacionVigente(registros, mes, anio) {
  const asignacion = {};
  const ordenados = [...registros]
    .filter((r) => r.planificado > 0)
    .sort((a, b) => diaDeFecha(a.fecha) - diaDeFecha(b.fecha));
  for (const r of ordenados) {
    if (asignacion[r.plantillaId]) continue;
    const dow = diaDeLaSemana(mes, anio, diaDeFecha(r.fecha));
    asignacion[r.plantillaId] = dow >= 1 && dow <= 5 ? dow : 1;
  }
  return asignacion;
}

// Server Component: lee los filtros de la URL, carga los datos y ensambla filtros + matriz.
// Debe renderizarse dentro de <Suspense> (usa searchParams y datos en tiempo de request).
export default async function CronogramaMensual({ searchParams }) {
  // Con cacheComponents activo, marca este árbol como dinámico (request-time).
  await connection();
  await requerirAdmin();

  const filtros = normalizarFiltros(await searchParams, new Date());
  const resultado = await cargarDatos(filtros);

  if (!resultado.ok) {
    return (
      <section className="rounded border border-red-300 bg-red-50 p-6">
        <h2 className="text-base font-bold text-red-900">No se pudo conectar con la base de datos.</h2>
        <p className="mt-1 text-sm text-red-800">
          Verifica que PostgreSQL esté corriendo en WSL2 (
          <code className="font-mono">sudo service postgresql start</code>) y que{" "}
          <code className="font-mono">DATABASE_URL</code> en <code className="font-mono">.env.local</code> sea
          correcta.
        </p>
        <p className="mt-2 font-mono text-xs text-red-700">{resultado.detalle}</p>
      </section>
    );
  }

  const { vista, usuario, inspectores, plantillas, registros } = resultado;
  const inspectoresDelRol = inspectores.filter((i) => i.rol === vista.rol);

  const modo = usuario ? "individual" : "consolidado";
  const tituloVista = usuario
    ? `Cronograma individual · ${usuario.nombre} (${usuario.rol})`
    : `${vista.etiqueta} · consolidado de ${inspectoresDelRol.length} inspector(es)`;

  return (
    <div className="space-y-4">
      <FiltrosCronograma
        vista={vista.clave}
        mes={filtros.mes}
        anio={filtros.anio}
        usuarioId={usuario?.id ?? null}
        inspectores={inspectores}
      />

      <NuevaInspeccion key={`nueva|${vista.rol}`} rol={vista.rol} etiquetaRol={vista.etiqueta} />

      {!usuario && (
        <p className="rounded border border-dashed border-blue-300 bg-blue-50/50 px-4 py-3 text-sm text-blue-900">
          {inspectoresDelRol.length === 0 ? (
            <>
              No hay personal registrado con el rol <strong>{vista.rol}</strong>. Regístrelo en la opción{" "}
              <Link href="/inspectores" className="font-semibold underline">
                Inspectores
              </Link>{" "}
              para poder generarle su cronograma.
            </>
          ) : (
            <>
              Para generar o editar un cronograma, elija un inspector en el selector{" "}
              <strong>Inspector / Responsable</strong>.
            </>
          )}
        </p>
      )}

      {usuario && (
        <GeneradorCronograma
          key={`gen|${usuario.id}|${filtros.mes}|${filtros.anio}`}
          usuarioId={usuario.id}
          usuarioNombre={usuario.nombre}
          mes={filtros.mes}
          anio={filtros.anio}
          plantillas={plantillas}
          asignacionActual={asignacionVigente(registros, filtros.mes, filtros.anio)}
        />
      )}

      <MatrizMes
        // La key reinicia el estado local de la matriz al cambiar de vista, mes, año o inspector.
        key={`${vista.clave}|${usuario?.id ?? "todos"}|${filtros.mes}|${filtros.anio}`}
        modo={modo}
        usuarioId={usuario?.id ?? null}
        mes={filtros.mes}
        anio={filtros.anio}
        tituloVista={tituloVista}
        plantillas={plantillas}
        registrosIniciales={registros}
      />
    </div>
  );
}

import Link from "next/link";
import { connection } from "next/server";
import { requerirAdmin } from "@/modules/auth/dal";
import { normalizarFiltros, numeroMes, VISTAS } from "@/modules/cronogramas/constants";
import { obtenerInspectores } from "@/modules/usuarios/queries";
import { calcularMetricas, mesesAnteriores, razon } from "../metricas";
import { obtenerDetalleMes, obtenerObservacionesRecientes, obtenerTotalesPorMes } from "../queries";
import { diaDeFecha } from "@/modules/cronogramas/constants";
import FiltrosDashboard from "./FiltrosDashboard";
import BarrasRanking from "./graficos/BarrasRanking";
import { formatoNumero, formatoPorcentaje } from "./graficos/escala";
import GraficoAcumulado from "./graficos/GraficoAcumulado";
import GraficoColumnas from "./graficos/GraficoColumnas";
import TarjetaGrafico from "./graficos/TarjetaGrafico";
import { BarraSegmentada, CifraPrincipal, Indicador, Medidor } from "./Indicadores";

const COLOR_PLAN = "var(--viz-plan)";
const COLOR_EJEC = "var(--viz-ejec)";
const MESES_TENDENCIA = 6;

function leerFiltros(searchParams, hoy) {
  const base = normalizarFiltros(searchParams, hoy);
  const rolParam = Array.isArray(searchParams?.rol) ? searchParams.rol[0] : searchParams?.rol;
  const vista = VISTAS.find((v) => v.clave === rolParam);
  return { mes: base.mes, anio: base.anio, rolClave: vista?.clave ?? "todos", rol: vista?.rol ?? null };
}

async function cargarDatos({ mes, anio, rol }) {
  try {
    const periodos = mesesAnteriores(mes, anio, MESES_TENDENCIA);
    const anterior = periodos[periodos.length - 2];
    const [detalle, detalleAnterior, totales, inspectores, observaciones] = await Promise.all([
      obtenerDetalleMes({ mes, anio, rol }),
      obtenerDetalleMes({ mes: anterior.mes, anio: anterior.anio, rol }),
      obtenerTotalesPorMes({ periodos, rol }),
      obtenerInspectores({ rol }),
      obtenerObservacionesRecientes({ mes, anio, rol }),
    ]);
    return {
      ok: true,
      detalle,
      observaciones,
      detalleAnterior,
      anterior,
      totales,
      periodos,
      inspectoresActivos: inspectores.length,
    };
  } catch (error) {
    console.error("[dashboard] Error consultando la base de datos:", error);
    return { ok: false, detalle: error?.code ?? error?.message ?? "Error desconocido" };
  }
}

// Server Component: lee filtros de la URL, calcula métricas y arma el dashboard.
export default async function DashboardMetricas({ searchParams }) {
  await connection();
  await requerirAdmin();

  const ahora = new Date();
  const hoy = { dia: ahora.getDate(), mes: ahora.getMonth() + 1, anio: ahora.getFullYear() };
  const filtros = leerFiltros(await searchParams, ahora);
  const datos = await cargarDatos(filtros);

  if (!datos.ok) {
    return (
      <section className="rounded border border-red-300 bg-red-50 p-6">
        <h2 className="text-base font-bold text-red-900">No se pudo conectar con la base de datos.</h2>
        <p className="mt-2 font-mono text-xs text-red-700">{datos.detalle}</p>
      </section>
    );
  }

  const m = calcularMetricas(datos.detalle, { mes: filtros.mes, anio: filtros.anio, hoy });
  const t = m.total;

  // Tendencia de los últimos meses (en orden cronológico).
  const tendencia = datos.periodos.map((p) => {
    const fila = datos.totales.find((x) => x.mes === p.mes && x.anio === p.anio);
    return { ...p, planificadas: fila?.planificadas ?? 0, ejecutadas: fila?.ejecutadas ?? 0 };
  });
  // Comparación con el mes anterior. Si el mes está en curso se compara con el mes anterior
  // cortado en el mismo día (p. ej. 1–2 de noviembre vs. 1–2 de octubre), no con el mes completo.
  const mesEnCurso = m.corte > 0 && m.corte < m.totalDias;
  const { anterior } = datos;
  const hoyAnterior = mesEnCurso
    ? { dia: m.corte, mes: numeroMes(anterior.mes), anio: anterior.anio }
    : { dia: 1, mes: 1, anio: 9999 }; // mes anterior completo
  const prev = calcularMetricas(datos.detalleAnterior, { mes: anterior.mes, anio: anterior.anio, hoy: hoyAnterior }).total;
  const hayAnterior = prev.planificadas > 0 || prev.ejecutadas > 0;
  const diferenciaPuntos =
    hayAnterior && t.efectividad !== null && prev.efectividad !== null
      ? Math.round((t.efectividad - prev.efectividad) * 100)
      : null;
  const refAnterior = mesEnCurso ? `${anterior.mes} (días 1–${m.corte})` : anterior.mes;
  const sinPlan = t.planificadas === 0 && t.ejecutadas === 0;
  const etiquetaRol = filtros.rol ?? "todos los roles";

  // Ranking de inspectores: va abajo con todos los roles, o a la derecha del avance con un rol filtrado.
  const tarjetaInspectores = (className) => (
    <TarjetaGrafico
      className={className}
      titulo="Efectividad por inspector"
      subtitulo="Ejecutadas ÷ planificadas a la fecha, de mayor a menor"
      vacio={m.inspectores.length === 0 ? "Ningún inspector tiene cronograma este mes." : null}
      tabla={{
        columnas: ["Inspector", "Planificadas", "Ejecutadas", "N", "Pendientes", "Efectividad"],
        filas: m.inspectores.map((i) => [
          i.nombre,
          i.pALaFecha,
          i.eALaFecha,
          i.noEjecutadas,
          i.pendientes,
          formatoPorcentaje(i.efectividad),
        ]),
      }}
    >
      <BarrasRanking
        color={COLOR_PLAN}
        filas={m.inspectores.map((i) => ({
          etiqueta: i.nombre,
          valor: i.efectividad,
          detalle: `${formatoNumero(i.eALaFecha)} de ${formatoNumero(i.pALaFecha)} · ${formatoNumero(i.pendientes)} pendientes`,
        }))}
      />
    </TarjetaGrafico>
  );

  return (
    <div className="space-y-4">
      <FiltrosDashboard mes={filtros.mes} anio={filtros.anio} rol={filtros.rolClave} />

      {sinPlan && (
        <p className="rounded border border-dashed border-blue-300 bg-blue-50/50 px-4 py-3 text-sm text-blue-900">
          No hay inspecciones planificadas en {filtros.mes} {filtros.anio} para {etiquetaRol}. Genere los
          cronogramas desde{" "}
          <Link href="/" className="font-semibold underline">
            Cronogramas
          </Link>{" "}
          para ver las métricas.
        </p>
      )}

      {/* Indicadores principales: una fila de 4, todos del mismo alto */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <CifraPrincipal
            titulo={mesEnCurso ? "Efectividad a la fecha" : "Efectividad del mes"}
            valor={t.efectividad}
            diferenciaPuntos={diferenciaPuntos}
            referencia={refAnterior}
            detalle={`Ejecutadas ÷ planificadas${mesEnCurso ? " hasta hoy" : ""}: ${formatoNumero(
              t.ejecutadasALaFecha
            )} de ${formatoNumero(t.planificadasALaFecha)}`}
          />
        </div>
        <Indicador
          grande
          etiqueta="Inspecciones planificadas"
          valor={formatoNumero(t.planificadas)}
          diferencia={hayAnterior ? t.planificadas - prev.planificadas : null}
          referencia={anterior.mes}
          subirEsBueno={null}
        />
        <Indicador
          grande
          etiqueta="Inspecciones ejecutadas"
          valor={formatoNumero(t.ejecutadas)}
          diferencia={hayAnterior ? t.ejecutadasALaFecha - prev.ejecutadasALaFecha : null}
          referencia={refAnterior}
          subirEsBueno
        />
        {/* Cumplimiento en fecha y No ejecutadas (N) se ven en "Resultado de lo planificado";
            los pendientes, en su tabla detallada al final. */}
        <div className="col-span-2 sm:col-span-1">
          <Indicador
            grande
            etiqueta="Inspectores con cronograma"
            valor={`${formatoNumero(t.inspectoresConPlan)} de ${formatoNumero(datos.inspectoresActivos)}`}
            nota={`${formatoNumero(t.restantes)} inspecciones programadas por delante`}
          />
        </div>
      </div>

      {/* Avance del mes + resultado de lo planificado */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TarjetaGrafico
            className="h-full"
            titulo="Avance acumulado del mes"
            subtitulo="Inspecciones acumuladas día a día: lo planificado frente a lo ejecutado"
            leyenda={[
              { etiqueta: "Planificado", color: COLOR_PLAN, forma: "linea" },
              { etiqueta: "Ejecutado", color: COLOR_EJEC, forma: "linea" },
            ]}
            vacio={sinPlan ? "Sin datos para este mes." : null}
            tabla={{
              columnas: ["Día", "Planificado acumulado", "Ejecutado acumulado"],
              filas: m.acumulado.map((d) => [d.dia, d.planificado, d.ejecutado ?? "—"]),
            }}
          >
            <GraficoAcumulado
              // Más alto cuando a la derecha van dos tarjetas (resultado + efectividad por rol).
              alto={filtros.rol ? 260 : 300}
              dias={m.totalDias}
              diaHoy={mesEnCurso ? m.corte : 0}
              series={[
                { etiqueta: "Planificado", color: COLOR_PLAN, valores: m.acumulado.map((d) => d.planificado) },
                { etiqueta: "Ejecutado", color: COLOR_EJEC, valores: m.acumulado.map((d) => d.ejecutado) },
              ]}
            />
          </TarjetaGrafico>
        </div>

        <div className="flex flex-col gap-4">
          <TarjetaGrafico
            className="flex-1"
            titulo="Resultado de lo planificado"
            subtitulo={mesEnCurso ? "Inspecciones planificadas hasta hoy" : "Inspecciones planificadas del mes"}
            vacio={t.planificadasALaFecha === 0 ? "Aún no hay inspecciones planificadas vencidas." : null}
            tabla={{
              columnas: ["Resultado", "Inspecciones"],
              filas: [
                ["Ejecutadas", m.resultadoPlan.ejecutadas],
                ["Sin registrar", m.resultadoPlan.sinRegistro],
                ["No ejecutadas (N)", m.resultadoPlan.noEjecutadas],
              ],
            }}
          >
            <BarraSegmentada
              partes={[
                { etiqueta: "Ejecutadas", valor: m.resultadoPlan.ejecutadas, color: "var(--viz-good)" },
                { etiqueta: "Sin registrar", valor: m.resultadoPlan.sinRegistro, color: "var(--viz-warning)", textoOscuro: true },
                { etiqueta: "No ejecutadas (N)", valor: m.resultadoPlan.noEjecutadas, color: "var(--viz-critical)" },
              ]}
            />
          </TarjetaGrafico>

          {filtros.rol ? (
            tarjetaInspectores("flex-1")
          ) : (
            <TarjetaGrafico
              className="flex-1"
              titulo="Efectividad por rol"
              subtitulo="Ejecutadas ÷ planificadas a la fecha"
              vacio={m.roles.length === 0 ? "Sin datos para este mes." : null}
              tabla={{
                columnas: ["Rol", "Planificadas", "Ejecutadas", "Efectividad"],
                filas: m.roles.map((r) => [r.rol, r.pALaFecha, r.eALaFecha, formatoPorcentaje(r.efectividad)]),
              }}
            >
              <div className="space-y-4">
                {m.roles.map((r) => (
                  <Medidor
                    key={r.rol}
                    etiqueta={r.rol}
                    valor={r.efectividad}
                    detalle={`${formatoNumero(r.eALaFecha)} de ${formatoNumero(r.pALaFecha)}`}
                  />
                ))}
              </div>
            </TarjetaGrafico>
          )}
        </div>
      </div>

      {/* Tendencia + carga por día de la semana */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TarjetaGrafico
            className="h-full"
            titulo={`Planificadas vs. ejecutadas · últimos ${MESES_TENDENCIA} meses`}
            subtitulo="Total de inspecciones por mes"
            leyenda={[
              { etiqueta: "Planificadas", color: COLOR_PLAN, forma: "barra" },
              { etiqueta: "Ejecutadas", color: COLOR_EJEC, forma: "barra" },
            ]}
            vacio={tendencia.every((p) => p.planificadas === 0 && p.ejecutadas === 0) ? "Sin datos en los últimos meses." : null}
            tabla={{
              columnas: ["Mes", "Planificadas", "Ejecutadas", "Efectividad"],
              filas: tendencia.map((p) => [
                `${p.mes} ${p.anio}`,
                p.planificadas,
                p.ejecutadas,
                formatoPorcentaje(razon(p.ejecutadas, p.planificadas)),
              ]),
            }}
          >
            <GraficoColumnas
              etiquetaEje="Inspecciones por mes"
              categorias={tendencia.map((p) => `${p.mes.slice(0, 3)} ${String(p.anio).slice(2)}`)}
              series={[
                { etiqueta: "Planificadas", color: COLOR_PLAN, valores: tendencia.map((p) => p.planificadas) },
                { etiqueta: "Ejecutadas", color: COLOR_EJEC, valores: tendencia.map((p) => p.ejecutadas) },
              ]}
            />
          </TarjetaGrafico>
        </div>

        <TarjetaGrafico
          className="h-full"
          titulo="Carga por día de la semana"
          subtitulo="Inspecciones planificadas en el mes, de lunes a viernes"
          vacio={t.planificadas === 0 ? "Sin inspecciones planificadas." : null}
          tabla={{
            columnas: ["Día", "Planificadas", "Ejecutadas"],
            filas: m.cargaSemanal.map((d) => [d.etiqueta, d.p, d.e]),
          }}
        >
          <GraficoColumnas
            etiquetaEje="Inspecciones planificadas por día de la semana"
            categorias={m.cargaSemanal.map((d) => d.etiqueta)}
            series={[{ etiqueta: "Planificadas", color: COLOR_PLAN, valores: m.cargaSemanal.map((d) => d.p) }]}
          />
        </TarjetaGrafico>
      </div>

      {/* Efectividad por inspector + pendientes de registrar (lado a lado, mismo alto).
          Con un rol filtrado, la efectividad por inspector sube junto al resultado y los pendientes
          ocupan toda la fila. */}
      <div className="grid gap-4 lg:grid-cols-3">
        {!filtros.rol && tarjetaInspectores("h-full")}

        <section
          className={`viz-root h-full rounded-lg border border-black/10 bg-[var(--viz-surface)] p-4 shadow-sm ${
            filtros.rol ? "lg:col-span-3" : "lg:col-span-2"
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--viz-text-primary)]">Pendientes de registrar</h3>
            <span className="text-2xl font-semibold tabular-nums text-[var(--viz-text-primary)]">
              {formatoNumero(t.pendientes)} <span className="text-xs font-normal text-[var(--viz-muted)]">en total</span>
            </span>
          </div>
          <p className="mb-3 text-xs text-[var(--viz-text-secondary)]">
            Inspecciones planificadas en días ya pasados que no tienen cantidad ejecutada ni &quot;N&quot;
          </p>
          {m.pendientes.length === 0 ? (
            <p className="rounded border border-dashed border-black/10 px-4 py-6 text-center text-sm text-[var(--viz-text-secondary)]">
              No hay registros pendientes.
            </p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[var(--viz-text-secondary)]">
                <tr className="border-b border-[var(--viz-grid)]">
                  <th className="py-1.5 pr-2 font-semibold">Inspector</th>
                  <th className="px-2 py-1.5 font-semibold">Formato</th>
                  <th className="px-2 py-1.5 font-semibold">Días</th>
                  <th className="py-1.5 pl-2 text-right font-semibold">Pendientes</th>
                </tr>
              </thead>
              <tbody className="text-[var(--viz-text-primary)]">
                {m.pendientes.map((p) => (
                  <tr key={`${p.inspector}|${p.codigo}|${p.elemento}`} className="border-b border-[var(--viz-grid)]/60">
                    <td className="py-1.5 pr-2 font-medium">{p.inspector}</td>
                    <td className="px-2 py-1.5">
                      {p.elemento} <span className="text-[10px] text-[var(--viz-muted)]">{p.codigo}</span>
                    </td>
                    <td className="px-2 py-1.5 tabular-nums text-[var(--viz-text-secondary)]">
                      {p.dias.slice(0, 10).join(", ")}
                      {p.dias.length > 10 ? "…" : ""}
                    </td>
                    <td className="py-1.5 pl-2 text-right font-semibold tabular-nums">{p.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* Observaciones de los inspectores */}
      <section className="viz-root rounded-lg border border-black/10 bg-[var(--viz-surface)] p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--viz-text-primary)]">Observaciones recientes</h3>
        <p className="mb-3 text-xs text-[var(--viz-text-secondary)]">
          Hallazgos que registraron los inspectores al ejecutar (los 10 más recientes del mes)
        </p>
        {datos.observaciones.length === 0 ? (
          <p className="rounded border border-dashed border-black/10 px-4 py-6 text-center text-sm text-[var(--viz-text-secondary)]">
            Sin observaciones en este mes.
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-[var(--viz-text-secondary)]">
              <tr className="border-b border-[var(--viz-grid)]">
                <th className="py-1.5 pr-2 font-semibold">Inspector</th>
                <th className="px-2 py-1.5 font-semibold">Formato</th>
                <th className="px-2 py-1.5 font-semibold">Día</th>
                <th className="px-2 py-1.5 font-semibold">Resultado</th>
                <th className="py-1.5 pl-2 font-semibold">Observación</th>
              </tr>
            </thead>
            <tbody className="text-[var(--viz-text-primary)]">
              {datos.observaciones.map((o, i) => (
                <tr key={`${o.inspector}|${o.codigo}|${o.fecha}|${i}`} className="border-b border-[var(--viz-grid)]/60 align-top">
                  <td className="py-1.5 pr-2 font-medium">{o.inspector}</td>
                  <td className="px-2 py-1.5">
                    {o.elemento} <span className="text-[10px] text-[var(--viz-muted)]">{o.codigo}</span>
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">{diaDeFecha(o.fecha)}</td>
                  <td className="px-2 py-1.5">{o.noEjecutado ? "N" : o.ejecutado ? `${o.ejecutado} ejec.` : "—"}</td>
                  <td className="py-1.5 pl-2 whitespace-pre-line">{o.observacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

import { connection } from "next/server";
import { ROLES_OPERATIVOS } from "@/db/roles";
import { requerirAdmin } from "@/modules/auth/dal";
import { obtenerUsuariosGestion } from "../queries";
import GestionInspectores from "./GestionInspectores";

// Fecha legible calculada en el servidor (evita diferencias de formato entre servidor y navegador).
function textoFecha(fecha) {
  if (!fecha) return null;
  const d = new Date(fecha);
  const dos = (n) => String(n).padStart(2, "0");
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

async function cargarUsuarios() {
  try {
    const filas = await obtenerUsuariosGestion();
    const ahora = new Date();
    return {
      ok: true,
      usuarios: filas.map(({ bloqueadoHasta, ultimoAcceso, ...u }) => ({
        ...u,
        bloqueado: Boolean(bloqueadoHasta && new Date(bloqueadoHasta) > ahora),
        ultimoAcceso: textoFecha(ultimoAcceso),
      })),
    };
  } catch (error) {
    console.error("[usuarios] Error consultando usuarios:", error);
    return { ok: false, detalle: error?.code ?? error?.message ?? "Error desconocido" };
  }
}

// Server Component: solo administradores. Debe ir dentro de <Suspense>.
export default async function ListadoInspectores({ searchParams }) {
  await connection();
  const admin = await requerirAdmin();

  const params = await searchParams;
  const rolParam = Array.isArray(params?.rol) ? params.rol[0] : params?.rol;
  const rolInicial = ROLES_OPERATIVOS.includes(rolParam) ? rolParam : ROLES_OPERATIVOS[0];

  const resultado = await cargarUsuarios();

  if (!resultado.ok) {
    return (
      <section className="rounded border border-red-300 bg-red-50 p-6">
        <h2 className="text-base font-bold text-red-900">No se pudo conectar con la base de datos.</h2>
        <p className="mt-2 font-mono text-xs text-red-700">{resultado.detalle}</p>
      </section>
    );
  }

  return <GestionInspectores inspectores={resultado.usuarios} rolInicial={rolInicial} usuarioActualId={admin.id} />;
}

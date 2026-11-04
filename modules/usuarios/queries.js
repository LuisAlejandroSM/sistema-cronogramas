import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ROLES_OPERATIVOS } from "@/db/roles";
import { usuarios } from "@/db/schema";

const columnas = {
  id: usuarios.id,
  alias: usuarios.alias,
  nombre: usuarios.nombre,
  correo: usuarios.correo,
  rol: usuarios.rol,
  cargo: usuarios.cargo,
  activo: usuarios.activo,
};

/**
 * Inspectores de los roles operativos.
 * - `rol`: limita a un rol (Inspector SIHO, Paramédico o Rescatista).
 * - `incluirInactivos`: también devuelve los desactivados (pantalla de gestión).
 */
export async function obtenerInspectores({ rol = null, incluirInactivos = false } = {}) {
  const filtroRol = rol ? eq(usuarios.rol, rol) : inArray(usuarios.rol, ROLES_OPERATIVOS);
  return db
    .select(columnas)
    .from(usuarios)
    .where(and(filtroRol, incluirInactivos ? undefined : eq(usuarios.activo, true)))
    .orderBy(asc(usuarios.rol), asc(usuarios.nombre));
}

/**
 * Todos los usuarios para la pantalla de gestión (inspectores y administradores),
 * con datos de acceso. Nunca incluye el hash de la contraseña.
 */
export async function obtenerUsuariosGestion() {
  return db
    .select({
      ...columnas,
      esAdmin: usuarios.esAdmin,
      tieneAcceso: sql`${usuarios.claveHash} is not null`.mapWith(Boolean),
      debeCambiarClave: usuarios.debeCambiarClave,
      bloqueadoHasta: usuarios.bloqueadoHasta,
      ultimoAcceso: usuarios.ultimoAcceso,
    })
    .from(usuarios)
    .orderBy(asc(usuarios.rol), asc(usuarios.nombre));
}

export async function obtenerUsuarioPorId(id) {
  const [usuario] = await db
    .select(columnas)
    .from(usuarios)
    .where(and(eq(usuarios.id, id), eq(usuarios.activo, true)))
    .limit(1);
  return usuario ?? null;
}

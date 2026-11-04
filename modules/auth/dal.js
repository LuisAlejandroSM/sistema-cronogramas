import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { leerSesion } from "./session";

/**
 * Capa de acceso: toda página y Server Action protegida obtiene al usuario desde aquí.
 * Lee la cookie y SIEMPRE confirma en la base de datos que el usuario existe, está activo
 * y conserva sus permisos (si el admin lo desactiva, pierde el acceso de inmediato).
 * @returns {Promise<{ id: string, nombre: string, correo: string|null, rol: string, cargo: string|null, esAdmin: boolean, debeCambiarClave: boolean } | null>}
 */
export async function obtenerUsuarioActual() {
  const sesion = await leerSesion();
  if (!sesion) return null;

  const [usuario] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      correo: usuarios.correo,
      rol: usuarios.rol,
      cargo: usuarios.cargo,
      esAdmin: usuarios.esAdmin,
      debeCambiarClave: usuarios.debeCambiarClave,
      activo: usuarios.activo,
      claveHash: usuarios.claveHash,
    })
    .from(usuarios)
    .where(eq(usuarios.id, sesion.id))
    .limit(1);

  if (!usuario || !usuario.activo || !usuario.claveHash) return null;
  const { activo: _activo, claveHash: _claveHash, ...publico } = usuario;
  return publico;
}

/** Página o acción para cualquier usuario con sesión. */
export async function requerirUsuario() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.debeCambiarClave) redirect("/cambiar-clave");
  return usuario;
}

/** Página o acción solo para administradores. */
export async function requerirAdmin() {
  const usuario = await requerirUsuario();
  if (!usuario.esAdmin) redirect("/mi-cronograma");
  return usuario;
}

/**
 * Variante para Server Actions que devuelven un resultado en vez de redirigir.
 * @returns {Promise<{ usuario: object } | { error: string }>}
 */
export async function autorizarAccion({ soloAdmin = false } = {}) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario || usuario.debeCambiarClave) {
    return { error: "Su sesión expiró. Vuelva a iniciar sesión." };
  }
  if (soloAdmin && !usuario.esAdmin) {
    return { error: "No tiene permiso para realizar esta acción." };
  }
  return { usuario };
}

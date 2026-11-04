"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ROL_ADMINISTRACION, ROLES_OPERATIVOS } from "@/db/roles";
import { usuarios } from "@/db/schema";
import { generarClaveTemporal, hashearClave } from "@/modules/auth/clave";
import { autorizarAccion } from "@/modules/auth/dal";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Roles que se pueden asignar desde la pantalla de gestión.
const ROLES_ASIGNABLES = [...ROLES_OPERATIVOS, ROL_ADMINISTRACION];

function texto(valor, maximo) {
  const limpio = String(valor ?? "").replace(/\s+/g, " ").trim();
  return limpio.slice(0, maximo);
}

function revalidar() {
  revalidatePath("/");
  revalidatePath("/inspectores");
  revalidatePath("/dashboard");
}

// Cantidad de administradores activos distintos de `excluirId`.
async function otrosAdminsActivos(excluirId) {
  const [fila] = await db
    .select({ n: sql`count(*)`.mapWith(Number) })
    .from(usuarios)
    .where(and(eq(usuarios.esAdmin, true), eq(usuarios.activo, true), ne(usuarios.id, excluirId)));
  return fila?.n ?? 0;
}

/**
 * Registra un usuario y le genera una contraseña temporal (se muestra una sola vez al admin).
 * El rol "Administración" crea un administrador que no ejecuta inspecciones.
 * @param {{ nombre: string, rol: string, correo: string, cargo?: string }} entrada
 */
export async function crearInspector(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const nombre = texto(entrada?.nombre, 100);
  const rol = String(entrada?.rol ?? "");
  const correo = texto(entrada?.correo, 150).toLowerCase();
  const cargo = texto(entrada?.cargo, 100) || null;

  if (nombre.length < 3) {
    return { success: false, error: "Escriba el nombre completo (mínimo 3 caracteres)." };
  }
  if (!ROLES_ASIGNABLES.includes(rol)) {
    return { success: false, error: "Seleccione un rol válido." };
  }
  if (!CORREO_RE.test(correo)) {
    return { success: false, error: "Escriba un correo válido: es el usuario para iniciar sesión." };
  }

  const claveTemporal = generarClaveTemporal();
  try {
    const [creado] = await db
      .insert(usuarios)
      .values({
        nombre,
        rol,
        correo,
        cargo,
        activo: true,
        esAdmin: rol === ROL_ADMINISTRACION,
        claveHash: await hashearClave(claveTemporal),
        debeCambiarClave: true,
      })
      .returning({ id: usuarios.id });
    revalidar();
    return { success: true, id: creado.id, claveTemporal };
  } catch (error) {
    // 23505 = unique_violation (correo repetido).
    if (error?.cause?.code === "23505" || error?.code === "23505") {
      return { success: false, error: "Ya existe un usuario con ese correo." };
    }
    console.error("[usuarios] Error al crear usuario:", error);
    return { success: false, error: "No se pudo guardar el usuario." };
  }
}

/**
 * Activa o desactiva un usuario. Desactivar corta su acceso y lo oculta de los cronogramas
 * sin borrar su historial. No se puede desactivar a uno mismo ni al último administrador.
 * @param {{ id: string, activo: boolean }} entrada
 */
export async function cambiarEstadoInspector(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const id = String(entrada?.id ?? "");
  const activo = entrada?.activo === true;
  if (!UUID_RE.test(id)) return { success: false, error: "Usuario inválido." };
  if (!activo && id === auth.usuario.id) {
    return { success: false, error: "No puede desactivar su propia cuenta." };
  }

  try {
    const [objetivo] = await db.select({ esAdmin: usuarios.esAdmin }).from(usuarios).where(eq(usuarios.id, id));
    if (!objetivo) return { success: false, error: "El usuario no existe." };
    if (!activo && objetivo.esAdmin && (await otrosAdminsActivos(id)) === 0) {
      return { success: false, error: "No se puede desactivar al único administrador." };
    }

    await db.update(usuarios).set({ activo }).where(eq(usuarios.id, id));
    revalidar();
    return { success: true };
  } catch (error) {
    console.error("[usuarios] Error al cambiar estado:", error);
    return { success: false, error: "No se pudo actualizar el usuario." };
  }
}

/**
 * Genera una nueva contraseña temporal (se muestra una sola vez) y obliga a cambiarla.
 * También desbloquea la cuenta si estaba bloqueada por intentos fallidos.
 * @param {{ id: string }} entrada
 */
export async function restablecerClave(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const id = String(entrada?.id ?? "");
  if (!UUID_RE.test(id)) return { success: false, error: "Usuario inválido." };
  if (id === auth.usuario.id) {
    return { success: false, error: "Para cambiar su propia contraseña use su sesión." };
  }

  const claveTemporal = generarClaveTemporal();
  try {
    const actualizados = await db
      .update(usuarios)
      .set({
        claveHash: await hashearClave(claveTemporal),
        debeCambiarClave: true,
        intentosFallidos: 0,
        bloqueadoHasta: null,
      })
      .where(eq(usuarios.id, id))
      .returning({ id: usuarios.id });
    if (actualizados.length === 0) return { success: false, error: "El usuario no existe." };
    revalidar();
    return { success: true, claveTemporal };
  } catch (error) {
    console.error("[usuarios] Error al restablecer clave:", error);
    return { success: false, error: "No se pudo restablecer la contraseña." };
  }
}

/**
 * Da o quita permiso de administrador. No se lo puede quitar uno mismo ni dejar el sistema sin admins.
 * @param {{ id: string, esAdmin: boolean }} entrada
 */
export async function cambiarAdministrador(entrada) {
  const auth = await autorizarAccion({ soloAdmin: true });
  if (auth.error) return { success: false, error: auth.error };

  const id = String(entrada?.id ?? "");
  const esAdmin = entrada?.esAdmin === true;
  if (!UUID_RE.test(id)) return { success: false, error: "Usuario inválido." };
  if (!esAdmin && id === auth.usuario.id) {
    return { success: false, error: "No puede quitarse a sí mismo el permiso de administrador." };
  }

  try {
    const [objetivo] = await db.select({ rol: usuarios.rol }).from(usuarios).where(eq(usuarios.id, id));
    if (!objetivo) return { success: false, error: "El usuario no existe." };
    if (!esAdmin && objetivo.rol === ROL_ADMINISTRACION) {
      return { success: false, error: "Un usuario con rol Administración siempre es administrador." };
    }
    if (!esAdmin && (await otrosAdminsActivos(id)) === 0) {
      return { success: false, error: "Debe quedar al menos un administrador." };
    }

    await db.update(usuarios).set({ esAdmin }).where(eq(usuarios.id, id));
    revalidar();
    return { success: true };
  } catch (error) {
    console.error("[usuarios] Error al cambiar administrador:", error);
    return { success: false, error: "No se pudo actualizar el permiso." };
  }
}

"use server";

import { eq, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { hashearClave, LARGO_MINIMO_CLAVE, verificarClave } from "./clave";
import { obtenerUsuarioActual } from "./dal";
import { borrarSesion, crearSesion } from "./session";

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;
const ERROR_GENERICO = "Usuario o contraseña incorrectos.";
// Hash ficticio para que un usuario inexistente tarde lo mismo que uno real.
const HASH_FICTICIO = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

function destinoInicial(usuario) {
  if (usuario.debeCambiarClave) return "/cambiar-clave";
  return usuario.esAdmin ? "/dashboard" : "/mi-cronograma";
}

/** Inicio de sesión con usuario (o correo) y contraseña. Para usar con useActionState. */
export async function iniciarSesion(_estadoPrevio, formData) {
  const identificador = String(formData.get("identificador") ?? formData.get("usuario") ?? formData.get("correo") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 150);
  const clave = String(formData.get("clave") ?? "").slice(0, 200);
  if (!identificador || !clave) {
    return { error: "Escriba su usuario y su contraseña.", identificador };
  }

  const [usuario] = await db
    .select({
      id: usuarios.id,
      activo: usuarios.activo,
      claveHash: usuarios.claveHash,
      esAdmin: usuarios.esAdmin,
      debeCambiarClave: usuarios.debeCambiarClave,
      intentosFallidos: usuarios.intentosFallidos,
      bloqueadoHasta: usuarios.bloqueadoHasta,
    })
    .from(usuarios)
    .where(
      or(
        eq(sql`lower(${usuarios.alias})`, identificador),
        eq(sql`lower(${usuarios.correo})`, identificador)
      )
    )
    .limit(1);

  if (!usuario || !usuario.activo || !usuario.claveHash) {
    await verificarClave(clave, HASH_FICTICIO);
    return { error: ERROR_GENERICO, identificador };
  }

  if (usuario.bloqueadoHasta && new Date(usuario.bloqueadoHasta) > new Date()) {
    const minutos = Math.ceil((new Date(usuario.bloqueadoHasta) - new Date()) / 60000);
    return {
      error: `Demasiados intentos fallidos. Intente de nuevo en ${minutos} minuto(s).`,
      identificador,
    };
  }

  const valida = await verificarClave(clave, usuario.claveHash);
  if (!valida) {
    const intentos = usuario.intentosFallidos + 1;
    const bloquear = intentos >= MAX_INTENTOS;
    await db
      .update(usuarios)
      .set({
        intentosFallidos: bloquear ? 0 : intentos,
        bloqueadoHasta: bloquear ? new Date(Date.now() + MINUTOS_BLOQUEO * 60000) : null,
      })
      .where(eq(usuarios.id, usuario.id));
    return {
      error: bloquear
        ? `Demasiados intentos fallidos. La cuenta queda bloqueada ${MINUTOS_BLOQUEO} minutos.`
        : ERROR_GENERICO,
      identificador,
    };
  }

  await db
    .update(usuarios)
    .set({ intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: new Date() })
    .where(eq(usuarios.id, usuario.id));

  await crearSesion(usuario);
  redirect(destinoInicial(usuario));
}

export async function cerrarSesion() {
  await borrarSesion();
  redirect("/login");
}

/** Cambio de contraseña (obligatorio en el primer ingreso). Para usar con useActionState. */
export async function cambiarClave(_estadoPrevio, formData) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");

  const actual = String(formData.get("actual") ?? "");
  const nueva = String(formData.get("nueva") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  if (nueva.length < LARGO_MINIMO_CLAVE || nueva.length > 200) {
    return { error: `La nueva contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.` };
  }
  if (nueva !== confirmacion) {
    return { error: "La confirmación no coincide con la nueva contraseña." };
  }
  if (nueva === actual) {
    return { error: "La nueva contraseña debe ser distinta de la actual." };
  }

  const [fila] = await db
    .select({ claveHash: usuarios.claveHash })
    .from(usuarios)
    .where(eq(usuarios.id, usuario.id))
    .limit(1);
  if (!(await verificarClave(actual, fila?.claveHash))) {
    return { error: "La contraseña actual no es correcta." };
  }

  await db
    .update(usuarios)
    .set({ claveHash: await hashearClave(nueva), debeCambiarClave: false })
    .where(eq(usuarios.id, usuario.id));

  const actualizado = { ...usuario, debeCambiarClave: false };
  await crearSesion(actualizado);
  redirect(destinoInicial(actualizado));
}

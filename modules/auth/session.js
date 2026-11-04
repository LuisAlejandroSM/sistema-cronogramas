import "server-only";

import { cookies } from "next/headers";
import { DURACION_SESION_SEG, firmarSesion, NOMBRE_COOKIE, verificarSesion } from "./token";

/** Crea (o renueva) la cookie de sesión. */
export async function crearSesion({ id, esAdmin, debeCambiarClave }) {
  const token = await firmarSesion({ id, esAdmin, debeCambiarClave });
  const almacen = await cookies();
  almacen.set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSEGURA !== "1",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_SEG,
  });
}

export async function leerSesion() {
  const almacen = await cookies();
  return verificarSesion(almacen.get(NOMBRE_COOKIE)?.value);
}

export async function borrarSesion() {
  const almacen = await cookies();
  almacen.delete(NOMBRE_COOKIE);
}

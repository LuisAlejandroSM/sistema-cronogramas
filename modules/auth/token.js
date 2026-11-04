// Firma y verificación del token de sesión (JWT HS256 con jose).
// Sin dependencias de Next: lo usan tanto proxy.js como modules/auth/session.js.
// El payload es mínimo: id del usuario y banderas de acceso. Nunca correo ni contraseña.

import { jwtVerify, SignJWT } from "jose";

export const NOMBRE_COOKIE = "sesion";
export const DURACION_SESION_SEG = 8 * 60 * 60; // 8 horas (una jornada)

function clave() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error("SESSION_SECRET no está definida en .env.local (mínimo 32 caracteres).");
  }
  return new TextEncoder().encode(secreto);
}

/** @param {{ id: string, esAdmin: boolean, debeCambiarClave: boolean }} datos */
export async function firmarSesion(datos) {
  return new SignJWT({ esAdmin: Boolean(datos.esAdmin), debeCambiarClave: Boolean(datos.debeCambiarClave) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(datos.id))
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEG}s`)
    .sign(clave());
}

/** @returns {Promise<{ id: string, esAdmin: boolean, debeCambiarClave: boolean } | null>} */
export async function verificarSesion(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      esAdmin: payload.esAdmin === true,
      debeCambiarClave: payload.debeCambiarClave === true,
    };
  } catch {
    return null;
  }
}

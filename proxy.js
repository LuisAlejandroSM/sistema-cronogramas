// Chequeo optimista de acceso (solo lee y verifica la cookie firmada, sin base de datos).
// La autorización real se repite en cada página y Server Action (modules/auth/dal.js).

import { NextResponse } from "next/server";
import { NOMBRE_COOKIE, verificarSesion } from "./modules/auth/token";

const RUTAS_PUBLICAS = ["/login"];
const RUTAS_ADMIN = ["/", "/dashboard", "/inspectores", "/formularios"];

function esRutaAdmin(ruta) {
  return RUTAS_ADMIN.some((r) => (r === "/" ? ruta === "/" : ruta === r || ruta.startsWith(`${r}/`)));
}

export async function proxy(request) {
  const ruta = request.nextUrl.pathname;
  const sesion = await verificarSesion(request.cookies.get(NOMBRE_COOKIE)?.value);
  const ir = (destino) => NextResponse.redirect(new URL(destino, request.nextUrl));

  if (!sesion) {
    return RUTAS_PUBLICAS.includes(ruta) ? NextResponse.next() : ir("/login");
  }

  if (sesion.debeCambiarClave) {
    return ruta === "/cambiar-clave" ? NextResponse.next() : ir("/cambiar-clave");
  }

  if (RUTAS_PUBLICAS.includes(ruta) || ruta === "/cambiar-clave") {
    return ir(sesion.esAdmin ? "/dashboard" : "/mi-cronograma");
  }

  if (!sesion.esAdmin && esRutaAdmin(ruta)) {
    return ir("/mi-cronograma");
  }

  return NextResponse.next();
}

export const config = {
  // Todo excepto archivos internos de Next y estáticos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

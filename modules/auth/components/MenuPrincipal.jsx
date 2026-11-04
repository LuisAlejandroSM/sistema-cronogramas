import { cookies } from "next/headers";
import { contarPendientes } from "@/modules/formularios/queries";
import { obtenerUsuarioActual } from "../dal";
import { COOKIE_BARRA } from "../preferencias";
import BarraLateral from "./BarraLateral";

// Navegación según el perfil. Lee la sesión, por eso va dentro de <Suspense> en el layout.
export default async function MenuPrincipal() {
  const usuario = await obtenerUsuarioActual();
  // Sin sesión (login, cambio de contraseña): sin barra, el fondo queda limpio.
  if (!usuario || usuario.debeCambiarClave) return null;

  // El estado de la barra se guarda en una cookie para pintarla igual desde el servidor (sin saltos).
  const colapsada = (await cookies()).get(COOKIE_BARRA)?.value === "colapsada";

  // Contador de formularios por llenar (solo inspectores). Si la consulta falla, el menú sigue.
  let pendientes = 0;
  if (!usuario.esAdmin) {
    try {
      pendientes = await contarPendientes(usuario.id);
    } catch (error) {
      console.error("[menu] No se pudo contar formularios pendientes:", error.message);
    }
  }

  return (
    <BarraLateral
      usuario={{ nombre: usuario.nombre, rol: usuario.rol, esAdmin: usuario.esAdmin, pendientes }}
      colapsadaInicial={colapsada}
    />
  );
}

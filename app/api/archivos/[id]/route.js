import { obtenerUsuarioActual } from "@/modules/auth/dal";
import { leerArchivo } from "@/modules/formularios/almacenamiento";
import { obtenerArchivoConDueno } from "@/modules/formularios/queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sirve una foto de formulario solo al inspector dueño de la asignación o a un administrador.
export async function GET(_request, { params }) {
  const { id } = await params;
  if (!UUID_RE.test(String(id))) return new Response("No encontrado", { status: 404 });

  const usuario = await obtenerUsuarioActual();
  if (!usuario || usuario.debeCambiarClave) return new Response("No autorizado", { status: 401 });

  const archivo = await obtenerArchivoConDueno(id);
  if (!archivo || (!usuario.esAdmin && archivo.usuarioId !== usuario.id)) {
    return new Response("No encontrado", { status: 404 });
  }

  try {
    const contenido = await leerArchivo(archivo.ruta);
    return new Response(contenido, {
      headers: {
        "Content-Type": archivo.tipoMime,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }
}

import "server-only";

import { obtenerPlantillas } from "@/modules/plantillas/queries";
import { listarFormatosVinculados } from "./queries";

/**
 * Formatos del catálogo para vincular un formulario al cronograma, con el formulario que ya
 * usa cada uno (un formato solo puede estar vinculado a un formulario).
 * @returns {Promise<{ id: string, nombre: string, codigo: string, rol: string, periodicidad: string, vinculadoA: { id: string, titulo: string } | null }[]>}
 */
export async function cargarFormatosParaVincular() {
  const [plantillas, vinculados] = await Promise.all([obtenerPlantillas(), listarFormatosVinculados()]);
  const porPlantilla = new Map(vinculados.map((v) => [v.plantillaId, { id: v.id, titulo: v.titulo }]));
  return plantillas.map((p) => ({
    id: p.id,
    nombre: p.elementoNombre,
    codigo: p.codigoFormato,
    rol: p.rol,
    periodicidad: p.periodicidad,
    vinculadoA: porPlantilla.get(p.id) ?? null,
  }));
}

import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Carpeta de archivos subidos (fuera de /public: solo se sirven por /api/archivos con permiso).
// turbopackIgnore: carpeta de datos elegida en tiempo de ejecución (no debe incluirse en el build).
const BASE = path.resolve(/*turbopackIgnore: true*/ process.env.ARCHIVOS_DIR || path.join(process.cwd(), "almacenamiento"));

export const MAX_BYTES_IMAGEN = 3 * 1024 * 1024;

// Reconoce el formato por sus primeros bytes (no confía en el nombre ni en el tipo declarado).
function detectarImagen(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: "image/png", ext: "png" };
  }
  if (buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

function rutaAbsoluta(rutaRelativa) {
  const absoluta = path.resolve(/*turbopackIgnore: true*/ BASE, rutaRelativa);
  if (!absoluta.startsWith(BASE + path.sep)) throw new Error("Ruta de archivo fuera del almacenamiento.");
  return absoluta;
}

/**
 * Guarda una imagen validada. La ruta la decide el servidor (nunca el cliente).
 * @returns {Promise<{ ok: true, ruta: string, mime: string, tamano: number } | { ok: false, error: string }>}
 */
export async function guardarImagen(buffer, carpeta) {
  if (!buffer?.length) return { ok: false, error: "El archivo está vacío." };
  if (buffer.length > MAX_BYTES_IMAGEN) return { ok: false, error: "La foto supera 3 MB." };
  const tipo = detectarImagen(buffer);
  if (!tipo) return { ok: false, error: "Solo se aceptan fotos JPG, PNG o WEBP." };

  const relativa = path.posix.join("formularios", carpeta, `${randomUUID()}.${tipo.ext}`);
  const absoluta = rutaAbsoluta(relativa);
  await mkdir(/*turbopackIgnore: true*/ path.dirname(absoluta), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ absoluta, buffer);
  return { ok: true, ruta: relativa, mime: tipo.mime, tamano: buffer.length };
}

export async function leerArchivo(rutaRelativa) {
  return readFile(/*turbopackIgnore: true*/ rutaAbsoluta(rutaRelativa));
}

export async function borrarArchivo(rutaRelativa) {
  try {
    await rm(/*turbopackIgnore: true*/ rutaAbsoluta(rutaRelativa), { force: true });
  } catch (error) {
    console.error("[formularios] No se pudo borrar el archivo:", error.message);
  }
}

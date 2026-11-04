// Hash y verificación de contraseñas con scrypt (node:crypto, sin dependencias externas).
// Formato guardado: "scrypt$<sal base64>$<hash base64>".
// Archivo sin "server-only" para poder usarlo también desde db/crear-admin.js (Bun).

import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const LARGO_HASH = 64;

export async function hashearClave(clave) {
  const sal = randomBytes(16);
  const hash = await scryptAsync(String(clave), sal, LARGO_HASH);
  return `scrypt$${sal.toString("base64")}$${hash.toString("base64")}`;
}

export async function verificarClave(clave, guardado) {
  if (!guardado || typeof guardado !== "string") return false;
  const [algoritmo, salB64, hashB64] = guardado.split("$");
  if (algoritmo !== "scrypt" || !salB64 || !hashB64) return false;
  const esperado = Buffer.from(hashB64, "base64");
  const calculado = await scryptAsync(String(clave), Buffer.from(salB64, "base64"), esperado.length);
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

// Contraseña temporal legible (sin caracteres ambiguos como 0/O, 1/l/I).
export function generarClaveTemporal(largo = 10) {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let clave = "";
  for (let i = 0; i < largo; i++) clave += alfabeto[randomInt(alfabeto.length)];
  return clave;
}

export const LARGO_MINIMO_CLAVE = 8;

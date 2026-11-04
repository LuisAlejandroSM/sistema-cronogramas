// Crea o actualiza el primer administrador con los datos de .env.local:
//   ADMIN_NOMBRE, ADMIN_CORREO, ADMIN_CLAVE
// La clave solo sirve para el primer ingreso: el sistema obliga a cambiarla.
// Si ya existe un usuario con ese correo, se le da permiso de administrador y se le asigna esa clave.
// Uso: bun run db/crear-admin.js

import { eq, sql } from "drizzle-orm";
import { hashearClave, LARGO_MINIMO_CLAVE } from "../modules/auth/clave.js";
import { db } from "./index.js";
import { ROL_ADMINISTRACION } from "./roles.js";
import { usuarios } from "./schema.js";

async function crearAdmin() {
  const nombre = (process.env.ADMIN_NOMBRE ?? "Administrador").trim();
  const correo = (process.env.ADMIN_CORREO ?? "").trim().toLowerCase();
  const clave = process.env.ADMIN_CLAVE ?? "";

  if (!correo || !correo.includes("@")) throw new Error("Defina ADMIN_CORREO en .env.local");
  if (clave.length < LARGO_MINIMO_CLAVE) {
    throw new Error(`ADMIN_CLAVE debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`);
  }

  const claveHash = await hashearClave(clave);
  const [existente] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(sql`lower(${usuarios.correo})`, correo))
    .limit(1);

  const acceso = {
    claveHash,
    esAdmin: true,
    activo: true,
    debeCambiarClave: true,
    intentosFallidos: 0,
    bloqueadoHasta: null,
  };

  if (existente) {
    await db.update(usuarios).set(acceso).where(eq(usuarios.id, existente.id));
    console.log(`Usuario existente ${correo}: ahora es administrador.`);
  } else {
    await db.insert(usuarios).values({ nombre, correo, rol: ROL_ADMINISTRACION, ...acceso });
    console.log(`Administrador creado: ${correo}`);
  }
  console.log("Inicie sesión con ese correo y la clave de ADMIN_CLAVE; el sistema le pedirá cambiarla.");
}

crearAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });

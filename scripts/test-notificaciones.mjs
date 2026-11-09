import { config } from "dotenv";
config({ path: ".env.local" });

import assert from "node:assert/strict";
import { db } from "../db/index.js";
import { notificaciones, usuarios, plantillasInspeccion } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  contarNotificacionesNoLeidas,
  obtenerNotificaciones,
  obtenerEstadisticasNotificaciones,
} from "../modules/notificaciones/queries.js";

async function run() {
  console.log("🧪 Iniciando pruebas del sistema de notificaciones...");

  // 1. Obtener un inspector y una plantilla existentes para la prueba
  const [inspector] = await db.select().from(usuarios).where(eq(usuarios.esAdmin, false)).limit(1);
  const [plantilla] = await db.select().from(plantillasInspeccion).limit(1);

  assert(inspector, "Debe existir al menos un inspector en la BD");
  assert(plantilla, "Debe existir al menos una plantilla en la BD");

  console.log(`Inspector de prueba: ${inspector.nombre} (${inspector.id})`);
  console.log(`Plantilla de prueba: ${plantilla.elementoNombre} (${plantilla.id})`);

  // 2. Limpiar notificaciones de prueba previas para este inspector
  await db.delete(notificaciones).where(eq(notificaciones.inspectorId, inspector.id));

  const inicialNoLeidas = await contarNotificacionesNoLeidas();
  console.log(`Notificaciones no leídas iniciales: ${inicialNoLeidas}`);

  // 3. Crear una notificación de inspección no ejecutada
  const [creada] = await db
    .insert(notificaciones)
    .values({
      tipo: "inspeccion_no_ejecutada",
      titulo: `Inspección no realizada: ${inspector.nombre}`,
      mensaje: `El inspector ${inspector.nombre} (${inspector.rol}) reportó que NO ejecutó la inspección "${plantilla.elementoNombre}" [${plantilla.codigoFormato}] programada para el día 9 de Noviembre de 2026. Motivo: "Área sin acceso por trabajo de alto voltaje y lluvia"`,
      inspectorId: inspector.id,
      datos: {
        inspectorNombre: inspector.nombre,
        inspectorRol: inspector.rol,
        elementoNombre: plantilla.elementoNombre,
        codigoFormato: plantilla.codigoFormato,
        fecha: "2026-11-09",
        mes: "Noviembre",
        anio: 2026,
        dia: 9,
        observacion: "Área sin acceso por trabajo de alto voltaje y lluvia",
      },
    })
    .returning({ id: notificaciones.id });

  assert(creada.id, "Debe retornar el ID de la notificación");
  console.log(`✓ Notificación creada exitosamente con ID: ${creada.id}`);

  // 4. Verificar contador de no leídas
  const postCrearNoLeidas = await contarNotificacionesNoLeidas();
  assert.equal(postCrearNoLeidas, inicialNoLeidas + 1, "El contador de no leídas debe haber aumentado en 1");
  console.log(`✓ Contador incrementado: ${postCrearNoLeidas}`);

  // 5. Verificar consulta de lista
  const lista = await obtenerNotificaciones({ limite: 10, soloNoLeidas: true });
  const encontrada = lista.find((n) => n.id === creada.id);
  assert(encontrada, "La notificación creada debe estar en la lista de no leídas");
  assert.equal(encontrada.tipo, "inspeccion_no_ejecutada");
  assert.equal(encontrada.inspectorNombre, inspector.nombre);
  assert(encontrada.mensaje.includes("NO ejecutó"), "El mensaje debe indicar que no se ejecutó");
  assert(encontrada.datos.observacion.includes("alto voltaje"), "Debe contener la observación del inspector");
  console.log("✓ Notificación contiene todos los datos y justificación del inspector");

  // 6. Verificar estadísticas
  const stats = await obtenerEstadisticasNotificaciones();
  assert(stats.noLeidas >= 1, "Estadísticas debe reportar al menos 1 no leída");
  assert(stats.noEjecutadas >= 1, "Estadísticas debe reportar al menos 1 no ejecutada");
  console.log(`✓ Estadísticas calculadas:`, stats);

  // 7. Marcar como leída
  await db.update(notificaciones).set({ leida: true, leidaEn: new Date() }).where(eq(notificaciones.id, creada.id));
  const postLeida = await contarNotificacionesNoLeidas();
  assert.equal(postLeida, inicialNoLeidas, "Al leerse debe volver al contador previo");
  console.log("✓ Notificación marcada como leída exitosamente");

  // 8. Limpiar datos de prueba
  await db.delete(notificaciones).where(eq(notificaciones.id, creada.id));
  console.log("✓ Limpieza final completada");

  console.log("\n🎉 TODAS LAS PRUEBAS DE NOTIFICACIONES PASARON EXITOSAMENTE.");
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Falló la prueba:", e);
  process.exit(1);
});

import fs from "fs";
import path from "path";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:1234@localhost:5432/cronogramas";

console.log("Conectando a la base de datos:", connectionString.replace(/:[^:@]+@/, ":****@"));

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});

async function main() {
  const possiblePaths = [
    path.join(process.cwd(), "db", "data", "formularios-migrados.json"),
    path.join(process.cwd(), "migracion", "formularios_migrados.json"),
  ];

  const jsonPath = possiblePaths.find((p) => fs.existsSync(p));
  if (!jsonPath) {
    console.error(`[ERROR] No se encontró el archivo de formularios en ninguna de las rutas esperadas:`);
    possiblePaths.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }

  const formularios = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Cargando ${formularios.length} formularios en la base de datos desde ${path.basename(jsonPath)}...`);

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error("[ERROR] No se pudo conectar a la base de datos:", err.message);
    console.log("Asegúrate de que PostgreSQL esté corriendo y que DATABASE_URL sea correcta.");
    process.exit(1);
  }

  try {
    await client.query("BEGIN");

    let cargados = 0;
    for (const f of formularios) {
      // Si la plantilla ya está asignada a otro formulario, la liberamos para evitar conflicto UNIQUE
      if (f.plantilla_id) {
        await client.query(
          `UPDATE formularios SET plantilla_id = NULL WHERE plantilla_id = $1 AND id != $2`,
          [f.plantilla_id, f.id]
        );
      }

      await client.query(
        `INSERT INTO formularios (
          id,
          titulo,
          descripcion,
          codigo,
          emision,
          revision,
          rol,
          plantilla_id,
          campos,
          activo,
          actualizado_en
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
        ON CONFLICT (id) DO UPDATE SET
          titulo = EXCLUDED.titulo,
          descripcion = EXCLUDED.descripcion,
          codigo = EXCLUDED.codigo,
          emision = EXCLUDED.emision,
          revision = EXCLUDED.revision,
          rol = EXCLUDED.rol,
          plantilla_id = EXCLUDED.plantilla_id,
          campos = EXCLUDED.campos,
          activo = true,
          actualizado_en = NOW()`,
        [
          f.id,
          f.titulo,
          f.descripcion,
          f.codigo,
          f.emision,
          f.revision,
          f.rol,
          f.plantilla_id || null,
          JSON.stringify(f.campos),
        ]
      );
      cargados++;
      console.log(`[OK] (${cargados}/${formularios.length}) ${f.codigo}: ${f.titulo}`);
    }

    await client.query("COMMIT");
    console.log(`\n¡Éxito! Se cargaron correctamente los ${cargados} formularios en la base de datos.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[ERROR] Falló la carga de formularios:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

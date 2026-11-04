// Crea el formulario de ejemplo "Constancia de inspección de vehículos livianos" (CVC-SST-FT-00),
// transcrito del formato Word, para usarlo como base o modelo en el constructor de formularios.
// No hace nada si ya existe un formulario con ese código.
// Uso: bun run db/ejemplos/formulario-vehiculos-livianos.js

import { eq } from "drizzle-orm";
import { normalizarCampos, nuevoIdCampo } from "../../modules/formularios/campos.js";
import { db } from "../index.js";
import { formularios } from "../schema.js";

const CODIGO = "CVC-SST-FT-00";

const seccion = (etiqueta, ayuda = "") => ({ tipo: "seccion", etiqueta, ayuda });
const texto = (etiqueta, ancho = "tercio", obligatorio = true) => ({ tipo: "texto", etiqueta, ancho, obligatorio });
const numero = (etiqueta, ancho = "tercio", obligatorio = false) => ({ tipo: "numero", etiqueta, ancho, obligatorio });
const fecha = (etiqueta, ancho = "tercio", obligatorio = true, hoyPorDefecto = false) => ({ tipo: "fecha", etiqueta, ancho, obligatorio, hoyPorDefecto });
const siNo = (etiqueta, ancho = "tercio", obligatorio = true) => ({ tipo: "si_no", etiqueta, ancho, obligatorio });
const lista = (etiqueta, filas, columnas = ["B", "M", "N/A"], ayuda = "") => ({
  tipo: "tabla_verificacion",
  etiqueta,
  ayuda,
  filas,
  columnas,
  obligatorio: true,
});
const firma = (etiqueta, obligatorio) => ({ tipo: "firma", etiqueta, obligatorio });

const B_M_NA = "B = Bueno · M = Malo · N/A = No aplica";

const definicion = [
  seccion("1. Datos generales"),
  fecha("Fecha", "tercio", true, true),
  { ...texto("Centro de trabajo", "mitad"), ayuda: "Ej. COB" },

  seccion("2. Datos del conductor y documentación"),
  texto("Nombres y apellidos", "mitad"),
  texto("Nº de licencia", "tercio"),
  texto("Tipo de licencia", "tercio"),
  fecha("Vigencia de la licencia"),
  fecha("Vigencia del certificado médico"),
  siNo("Manejo defensivo"),
  fecha("Manejo defensivo: vence", "tercio", false),

  seccion("3. Datos del vehículo"),
  texto("Marca"),
  texto("Clase"),
  texto("Modelo"),
  texto("Color"),
  numero("Año", "tercio", true),
  texto("Placa"),
  texto("Capacidad", "tercio", false),
  numero("Kilometraje (km)", "tercio", true),
  texto("Póliza de seguro Nº", "tercio", false),

  lista("Fluidos", ["COMBUSTIBLE", "REFRIGERANTE", "LIGA DE FRENOS", "ACEITE DE MOTOR", "HIDRÁULICO", "ACEITE DE CAJA"], ["B", "M", "N/A"], B_M_NA),

  seccion("4. Elementos de emergencia y seguridad"),
  { tipo: "opcion_unica", etiqueta: "Tipo de extintor", opciones: ["PQS", "CO2"], ancho: "tercio", obligatorio: true },
  numero("Capacidad del extintor (LBS)", "tercio", true),
  fecha("Fecha de vencimiento del extintor"),
  lista(
    "Elementos de emergencia",
    [
      "TRIÁNGULOS / CONOS",
      "LLAVE DE AJUSTE",
      "GATO",
      "MANGA DE VIENTO",
      "LINTERNA",
      "BOTIQUÍN",
      "DIM'S (IDENTIFICADOR DE CONDUCTOR)",
      "CÁMARA DE FATIGA",
      "CAJA DE HERRAMIENTAS O MALLA DE RESTRICCIÓN",
      "CHALECOS REFLECTIVOS",
    ],
    ["SI", "NO"]
  ),

  lista(
    "5. Sistema eléctrico",
    [
      "LUCES DE ALTA Y BAJAS",
      "LUCES DE FRENO",
      "LUCES DE CRUCE O GIRO",
      "LUCES DE RETROCESO",
      "LUCES INTERMITENTES",
      "LUZ DE CABINA",
      "BOCINA O CORNETA",
      "ALARMA DE RETROCESO",
      "AIRE ACONDICIONADO",
      "LIMPIAPARABRISAS",
      "INDICADORES DE COMBUSTIBLE Y OTROS",
    ],
    ["B", "M", "N/A"],
    B_M_NA
  ),
  lista(
    "6. Sistema mecánico",
    ["VELOCÍMETRO / ODÓMETRO", "RADIADOR", "DEPÓSITO DE AGUA DEL MOTOR", "CAÑO DE ESCAPE / SILENCIADOR", "SISTEMA DE DIRECCIÓN"],
    ["B", "M", "N/A"],
    B_M_NA
  ),
  lista(
    "7. Neumáticos",
    ["DELANTERO DERECHO", "DELANTERO IZQUIERDO", "TRASERO DERECHO", "TRASERO IZQUIERDO", "REPUESTO 1", "CUÑAS DE SEGURIDAD"],
    ["B", "M", "N/A"],
    B_M_NA
  ),
  lista(
    "8. Tapicería",
    ["ASIENTO DEL CONDUCTOR", "ASIENTO DEL COPILOTO / ACOMPAÑANTE", "ASIENTO TRASERO", "TODOS LOS ASIENTOS CON APOYA CABEZA"],
    ["B", "M", "N/A"],
    B_M_NA
  ),
  lista(
    "9. Cristalería",
    ["PARABRISAS", "VIDRIOS PUERTAS DELANTERAS", "VIDRIOS PUERTAS TRASERAS", "VIDRIO TRASERO", "ESPEJOS RETROVISORES LATERALES"],
    ["B", "M", "N/A"],
    B_M_NA
  ),
  lista(
    "10. Especificaciones especiales",
    [
      "CINTURÓN DE SEGURIDAD DE 3 PUNTOS PARA TODOS LOS OCUPANTES",
      "ASIENTOS CON REPOSACABEZAS",
      "RECORDATORIO DE USO DEL CINTURÓN DE SEGURIDAD",
      "ANCLAJES DE CINTURONES DE SEGURIDAD SEGÚN REQUISITOS DE LA INDUSTRIA",
      "SISTEMA DE FRENOS ANTIBLOQUEO QUE CUMPLA CON LOS REQUISITOS DE LA INDUSTRIA",
      "PROTECCIÓN ACTIVA ANTIVUELCO (ARP) EN EL REMOLQUE",
      "PROTECCIÓN CONTRA VUELCOS SEGÚN LOS REQUISITOS DE LA INDUSTRIA",
      "LOS NEUMÁTICOS DEBEN SER DEL MISMO TAMAÑO / MISMO FABRICANTE POR EJE",
      "NEUMÁTICOS ADECUADOS A LA CARGA/VELOCIDAD, INFLADOS CORRECTAMENTE, PROFUNDIDAD MÍNIMA DE LA BANDA DE RODADURA 1,6 MM (75 %)",
      "INDICADORES DE POSICIÓN EN LAS TUERCAS DE LOS NEUMÁTICOS",
      "NEUMÁTICOS DELANTEROS CON BANDA DE RODADURA MÍNIMA DE 3,0 MM Y EL MISMO TAMAÑO/MARCA",
      "GUARDABARROS EN TODOS LOS NEUMÁTICOS",
      "NO SE PERMITEN NEUMÁTICOS RECONSTRUIDOS (PRINCIPALMENTE EN EL EJE DELANTERO)",
      "CABINA QUE CUMPLE CON LOS REQUISITOS DE LA INDUSTRIA",
      "PROTECCIÓN ANTIEMPOTRAMIENTO DELANTERA Y TRASERA PARA EL REMOLQUE",
      "PROTECCIÓN LATERAL CONTRA COLISIÓN",
      "VIDRIO DE SEGURIDAD PARA PARABRISAS",
      "DOS CALZAS PARA RUEDAS",
      "SISTEMA DE CONTROL ELECTRÓNICO DE ESTABILIDAD",
      "TODOS LOS ACCESORIOS Y ESCOTILLAS ASEGURADOS SIN FUGAS EN CASO DE VUELCO",
      "2 EXTINTORES MÍNIMO (UNO DE 2 KG EN CABINA Y OTRO DE 6 KG MÍNIMO EN REMOLQUE)",
      "CINTURONES DE SEGURIDAD Y SISTEMAS DE RETENCIÓN SEGÚN REQUISITOS DE LA INDUSTRIA",
      "MÍNIMO 2 PUERTAS (UNA NORMAL Y UNA DE EMERGENCIA)",
      "PUERTA(S) DE EMERGENCIA CLARAMENTE MARCADAS",
      "MARCAS REFLECTANTES EN LA PARTE TRASERA Y EN LOS LATERALES",
      "DIMS SEGÚN CONTRATO",
      "ALARMA SONORA DE MARCHA ATRÁS",
    ],
    ["SI", "NO", "N/A"],
    "Varios ítems aplican solo a vehículos con remolque: marque N/A cuando no correspondan."
  ),

  seccion("11. Hallazgos y observaciones"),
  { tipo: "parrafo", etiqueta: "Hallazgos y observaciones", obligatorio: false },
  { tipo: "foto", etiqueta: "Evidencia fotográfica", maxFotos: 5, obligatorio: false },

  seccion("Validación de la inspección"),
  texto("Inspector: nombre y apellido"),
  texto("Inspector: cédula"),
  texto("Inspector: cargo"),
  firma("Inspector: firma", true),
  texto("Conductor: nombre y apellido"),
  texto("Conductor: cédula"),
  texto("Conductor: cargo", "tercio", false),
  firma("Conductor: firma", true),
  texto("Supervisor: nombre y apellido", "tercio", false),
  texto("Supervisor: cédula", "tercio", false),
  texto("Supervisor: cargo", "tercio", false),
  firma("Supervisor: firma", false),
];

async function crear() {
  const [existente] = await db.select({ id: formularios.id }).from(formularios).where(eq(formularios.codigo, CODIGO)).limit(1);
  if (existente) {
    console.log(`Ya existe un formulario con código ${CODIGO} (${existente.id}); no se crea otro.`);
    return;
  }

  const normalizados = normalizarCampos(definicion.map((c) => ({ id: nuevoIdCampo(), ayuda: "", ...c })));
  if (!normalizados.ok) throw new Error(normalizados.error);

  const [creado] = await db
    .insert(formularios)
    .values({
      titulo: "Constancia de inspección de vehículos livianos",
      descripcion:
        "Inspección del vehículo liviano antes de su uso. Marque cada ítem como Bueno (B), Malo (M) o No aplica (N/A) y registre los hallazgos al final.",
      codigo: CODIGO,
      emision: "Jun-2026",
      revision: "02",
      campos: normalizados.campos,
    })
    .returning({ id: formularios.id });

  const preguntas = normalizados.campos.filter((c) => c.tipo !== "seccion");
  const items = normalizados.campos.filter((c) => c.tipo === "tabla_verificacion").reduce((n, c) => n + c.filas.length, 0);
  console.log(`Formulario creado (${creado.id}): ${preguntas.length} preguntas, ${items} ítems en listas de verificación.`);
}

crear()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });

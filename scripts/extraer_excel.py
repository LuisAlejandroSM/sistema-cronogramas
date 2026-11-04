"""
Extrae el catálogo oficial de formatos CVC-SST-FT-11 del Excel y genera db/data/cvc-sst-ft-11.js,
que consume db/seed.js.

Solo se extrae el CATÁLOGO (elementos a inspeccionar por rol). Los inspectores y las marcas P/E
del Excel son datos de ejemplo y no se importan: los inspectores y sus cronogramas se crean
dentro del sistema.

Uso (desde la raíz del proyecto):
    python -m pip install openpyxl
    python scripts/extraer_excel.py "CVC-SST-FT-11. HERRAMIENTA DE ADMINISTRACION DE LAS INSPECCIONES. inspecciones siho actualizado (2).xlsx"

Estructura del formato (verificada en todas las hojas operativas):
  - Fila 5: CENTRO DE TRABAJO (C5), RESPONSABLE (L5), MES (R5), AÑO (AG5).
  - Fila 7: encabezados (N°, ELEMENTO A INSPECCIONAR, CANTIDAD, PERIORICIDAD, CODIGO DEL FORMATO,
            días de la semana I..AE, EFECTIVIDAD DE LA EJECUCCION en AF).
  - Cada elemento ocupa 2 filas: superior "P" (planificado), inferior número de inspecciones
    ejecutadas o "N" (no ejecutada).
  - AF superior = COUNTIF(P), AF inferior = SUM(ejecuciones), AG = IF(P>0, E/P, 1).
  - Las fórmulas tienen referencias rotas (#REF!), por eso se leen los valores en caché.
"""

import json
import sys
from datetime import date

import openpyxl

# Hoja maestra de cada rol operativo.
HOJAS_MAESTRAS = {
    "AGOSTO": "Inspector SIHO",
    "PARAMEDICOS": "Paramédico",
    "RESCATISTAS": "Rescatista",
}

FILA_ENCABEZADO = 7


def limpiar(valor):
    if valor is None:
        return None
    texto = " ".join(str(valor).split())
    return texto or None


def entero(valor, defecto=0):
    try:
        return int(round(float(valor)))
    except (TypeError, ValueError):
        return defecto


def leer_elementos(ws):
    elementos = []
    fila = FILA_ENCABEZADO + 2
    orden = 0
    while fila < 120:
        # Las filas ocultas en el Excel no forman parte del formato vigente
        # (p. ej. "INSPECCIÓN DE GRILLETES" en PARAMEDICOS y RESCATISTAS).
        if ws.row_dimensions[fila].hidden:
            fila += 1
            continue
        nombre = limpiar(ws.cell(fila, 2).value)
        if nombre and nombre.upper() == "SEMANA":
            break
        if nombre and ws.cell(fila, 5).value is not None:
            orden += 1
            elementos.append(
                {
                    "orden": orden,
                    "numero": entero(ws.cell(fila, 1).value, None),
                    "elementoNombre": nombre,
                    "cantidadPlanificada": entero(ws.cell(fila, 5).value, 1),
                    "periodicidad": limpiar(ws.cell(fila, 6).value) or "Semanal",
                    "codigoFormato": limpiar(ws.cell(fila, 8).value) or "N/A",
                }
            )
            fila += 2
        else:
            fila += 1
    return elementos


def main(ruta):
    wb = openpyxl.load_workbook(ruta, data_only=True)

    plantillas = {rol: leer_elementos(wb[hoja]) for hoja, rol in HOJAS_MAESTRAS.items()}

    salida = [
        "// ARCHIVO GENERADO por scripts/extraer_excel.py — no editar a mano.",
        f"// Fuente: {ruta}",
        f"// Generado: {date.today().isoformat()}",
        "",
        "export const FORMATO = " + json.dumps(
            {
                "codigo": "CVC-SST-FT-11",
                "titulo": "ANEXO B - PLANIFICACIÓN Y CONTROL DE INSPECCIONES PREVENTIVAS",
                "programa": "PROGRAMA DE SEGURIDAD Y SALUD EN EL TRABAJO",
                "emision": "Feb-2022",
                "revision": "01",
                "centroTrabajo": limpiar(wb["AGOSTO"]["C5"].value),
            },
            ensure_ascii=False,
            indent=2,
        ) + ";",
        "",
        "export const PLANTILLAS_POR_ROL = " + json.dumps(plantillas, ensure_ascii=False, indent=2) + ";",
        "",
    ]

    with open("db/data/cvc-sst-ft-11.js", "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(salida))

    for rol, items in plantillas.items():
        print(f"{rol}: {len(items)} formatos")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1])

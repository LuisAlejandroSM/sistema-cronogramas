import json
import uuid
import random
import string
import os

random.seed(42)

def uid():
    chars = string.ascii_lowercase + string.digits
    return 'c_' + ''.join(random.choices(chars, k=8))

def build_datos_generales(equipo_fields=None, operador_label="Operador"):
    campos = [
        {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "1. Datos generales", "obligatorio": False},
        {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha", "obligatorio": True, "hoyPorDefecto": True},
        {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "Ej. COB / Planta / Proyecto", "etiqueta": "Centro de trabajo", "obligatorio": True},
    ]
    if operador_label:
        campos.extend([
            {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": f"2. Datos del {operador_label.lower()} y documentación", "obligatorio": False},
            {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": f"{operador_label}: nombres y apellidos", "obligatorio": True},
            {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Nº de licencia", "obligatorio": True},
            {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de licencia", "obligatorio": True},
            {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vigencia de la licencia", "obligatorio": True, "hoyPorDefecto": False},
            {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vigencia carta médica / certificado", "obligatorio": True, "hoyPorDefecto": False},
            {"id": uid(), "tipo": "si_no", "ancho": "tercio", "ayuda": "", "etiqueta": "Manejo defensivo", "obligatorio": True},
            {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Manejo defensivo: vencimiento", "obligatorio": False, "hoyPorDefecto": False},
        ])
    if equipo_fields:
        campos.append({"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "3. Datos del equipo / vehículo", "obligatorio": False})
        for f in equipo_fields:
            campos.append({
                "id": uid(),
                "tipo": f.get("tipo", "texto"),
                "ancho": f.get("ancho", "tercio"),
                "ayuda": f.get("ayuda", ""),
                "etiqueta": f["etiqueta"],
                "obligatorio": f.get("obligatorio", True)
            })
    return campos

def build_certificacion_auxiliares():
    return [
        {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "Certificación y equipos auxiliares", "obligatorio": False},
        {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Certificación número", "obligatorio": False},
        {"id": uid(), "tipo": "fecha", "ancho": "mitad", "ayuda": "", "etiqueta": "Fecha de realización", "obligatorio": False, "hoyPorDefecto": False},
        {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Empresa certificadora", "obligatorio": False},
        {"id": uid(), "tipo": "fecha", "ancho": "mitad", "ayuda": "", "etiqueta": "Fecha de vencimiento certificación", "obligatorio": False, "hoyPorDefecto": False},
        {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de extintor", "opciones": ["PQS", "CO2"], "obligatorio": True},
        {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "", "etiqueta": "Capacidad extintor (Lbs)", "obligatorio": True},
        {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vencimiento del extintor", "obligatorio": True, "hoyPorDefecto": False},
    ]

def build_findings():
    return [
        {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "Hallazgos y observaciones", "obligatorio": False},
        {"id": uid(), "tipo": "parrafo", "ancho": "completo", "ayuda": "", "etiqueta": "Hallazgos y observaciones", "obligatorio": False},
        {"id": uid(), "tipo": "foto", "ancho": "completo", "ayuda": "Adjunte fotos del equipo o hallazgos encontrados", "etiqueta": "Evidencia fotográfica", "maxFotos": 5, "obligatorio": False}
    ]

def build_validation(firmas):
    campos = [{"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "Validación de la inspección", "obligatorio": False}]
    for f in firmas:
        rol = f["rol"]
        req = f.get("obligatorio", True)
        campos.extend([
            {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": f"{rol}: nombre y apellido", "obligatorio": req},
            {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": f"{rol}: cédula", "obligatorio": req},
            {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": f"{rol}: cargo", "obligatorio": False},
            {"id": uid(), "tipo": "firma", "ancho": "completo", "ayuda": "", "etiqueta": f"{rol}: firma", "obligatorio": req},
        ])
    return campos

def tabla(etiqueta, filas, columnas=None, ayuda="B = Bueno · M = Malo · N/A = No aplica"):
    if columnas is None:
        columnas = ["B", "M", "N/A"]
    return {
        "id": uid(),
        "tipo": "tabla_verificacion",
        "ancho": "completo",
        "etiqueta": etiqueta,
        "ayuda": ayuda,
        "filas": filas,
        "columnas": columnas,
        "obligatorio": True
    }

formularios = []

# =========================================================================
# 2. INSPECCION DE ESLINGAS (CVC-SST-FT-107)
# =========================================================================
f2_campos = [
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "1. Datos generales", "obligatorio": False},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha", "obligatorio": True, "hoyPorDefecto": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Centro de trabajo / Proyecto", "obligatorio": True},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Ubicación", "opciones": ["Almacén", "Vehículo"], "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "Solo si aplica", "etiqueta": "Placas del vehículo", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Usuario / Custodio", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Validado por", "obligatorio": True},
    tabla("2. Verificación del estado de las eslingas", [
        "¿Cuentan con etiqueta con la información legible o etiqueta de certificación?",
        "¿Se visualiza libre de elementos desgastados y/o desgarrados?",
        "¿Se visualiza libre de cortes o rotura del tejido, costura o del cable?",
        "¿Se visualiza libre de deformaciones y/o dobladuras?",
        "¿Se visualiza libre de daños producidos por calor (quemaduras, etc.)?",
        "¿Se visualiza libre de sustancias químicas?",
        "¿Están resguardadas de la intemperie y de contacto con sustancias y materiales?",
        "¿Está apta para su uso?"
    ], ["SI", "NO", "N/A"], ayuda="Marque SI, NO o N/A según la condición observada"),
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "3. Especificaciones técnicas de las eslingas", "obligatorio": False},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Material de la eslinga", "opciones": ["Sintética", "Cuerda de acero", "Cadena"], "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Serial / Código", "obligatorio": True},
    {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "En toneladas o kg", "etiqueta": "Capacidad máxima (Vertical)", "obligatorio": True},
    {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "", "etiqueta": "Ancho (pulg / mm)", "obligatorio": False},
    {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "Metros", "etiqueta": "Largo (mts)", "obligatorio": True},
    {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "", "etiqueta": "Nº de capas", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "Ej. 5:1 o 7:1", "etiqueta": "Factor de seguridad", "obligatorio": False},
] + build_findings() + build_validation([{"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "01eb09e2-0417-48da-9a53-6b69c8bcdac8",
    "titulo": "Inspección de eslingas",
    "descripcion": "Verificación del estado físico, tejido, costuras y capacidad de carga de las eslingas de izaje antes de su uso.",
    "codigo": "CVC-SST-FT-107",
    "emision": "Jun-2026",
    "revision": "01",
    "rol": "Inspector SIHO",
    "plantilla_id": "1d2afbce-e1f9-4506-806a-c3103b9d5761",
    "campos": f2_campos
})

# =========================================================================
# 3. INSPECCION DE TRACTOR (CVC-SST-FT-00)
# =========================================================================
f3_campos = build_datos_generales([
    {"etiqueta": "Tipo de equipo"}, {"etiqueta": "Marca"}, {"etiqueta": "Modelo"},
    {"etiqueta": "Serial"}, {"etiqueta": "Año", "tipo": "numero"}, {"etiqueta": "Placa", "obligatorio": False},
    {"etiqueta": "Capacidad"}, {"etiqueta": "Hrs / Km", "tipo": "numero"}, {"etiqueta": "Póliza de seguro Nº", "obligatorio": False}
]) + build_certificacion_auxiliares() + [
    tabla("4. Sistema eléctrico", [
        "Luces delanteras", "Luz de cabina", "Bocina o corneta", "Alarma de retroceso",
        "Aire acondicionado", "Limpiaparabrisas", "Indicadores de combustible y otros",
        "Velocímetro / odómetro", "Tubo de escape"
    ]),
    tabla("5. Sistema mecánico e hidráulico", [
        "Gatos hidráulicos delanteros", "Mangueras hidráulicas delanteras",
        "Gatos hidráulicos traseros", "Mangueras hidráulicas traseras",
        "Pasadores y pernos", "Tanque hidráulico", "Brazo lado derecho", "Brazo lado izquierdo"
    ]),
    tabla("6. Batería, accesorios y seguridad", [
        "Batería limpia, seca y asegurada", "Nivel de electrolitos en batería",
        "Estado de los cables de batería", "Estado y ajuste de los bornes",
        "Escalera y rampa de acceso antirresbalante", "Tanque de combustible con tapa",
        "Señalizaciones de prevención"
    ]),
    tabla("7. Tren de rodaje (Orugas)", [
        "Orugas (tensión y desgaste)", "Ruedas dentadas lado izquierdo", "Ruedas dentadas lado derecho",
        "Ruedas guías derecha", "Ruedas guías izquierda", "Rodillos lado derecho", "Rodillos lado izquierdo"
    ]),
    tabla("8. Elementos de trabajo (Pala y Escarificador)", [
        "Pala frontal (desgaste y fisuras)", "Pasadores de la pala", "Coplillas de seguridad", "Escarificador / Ripper"
    ]),
    tabla("9. Cabina, tapicería y cristalería", [
        "Asiento del conductor", "Ajustes del asiento", "Cinturón de seguridad",
        "Parabrisas", "Vidrios puertas laterales", "Vidrio trasero"
    ])
] + build_findings() + build_validation([{"rol": "Operador"}, {"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "a8cc090a-4531-482f-803c-a021da81710b",
    "titulo": "Inspección de tractor",
    "descripcion": "Revisión preoperacional de tractor de oruga: sistema hidráulico, tren de rodaje, pala, escarificador y cabina.",
    "codigo": "CVC-SST-FT-00",
    "emision": "Jun-2026",
    "revision": "01",
    "rol": "Inspector SIHO",
    "plantilla_id": None,
    "campos": f3_campos
})

# =========================================================================
# 4. INSPECCION DE EXCAVADORA (CVC-SST-FT-110)
# =========================================================================
f4_campos = build_datos_generales([
    {"etiqueta": "Tipo de equipo"}, {"etiqueta": "Marca"}, {"etiqueta": "Modelo"},
    {"etiqueta": "Serial"}, {"etiqueta": "Año", "tipo": "numero"}, {"etiqueta": "Placa", "obligatorio": False},
    {"etiqueta": "Capacidad del balde"}, {"etiqueta": "Hrs / Km", "tipo": "numero"}, {"etiqueta": "Póliza de seguro Nº", "obligatorio": False}
]) + build_certificacion_auxiliares() + [
    tabla("4. Sistema eléctrico", [
        "Luces delanteras", "Luces de freno", "Luces de cruce o giro", "Luces de retroceso",
        "Luz del tablero", "Luz de cabina", "Bocina o corneta", "Alarma de retroceso",
        "Aire acondicionado", "Limpiaparabrisas", "Indicadores de combustible y otros", "Velocímetro / horómetro"
    ]),
    tabla("5. Sistema mecánico e hidráulico", [
        "Gato de penetración", "Gatos de recoger", "Gato de elevación",
        "Sistema eléctrico del equipo", "Mangueras hidráulicas del brazo",
        "Pala o balde de excavación", "Dientes del balde de excavación",
        "Pasador con pin de sujeción", "Brazo aguilón del balde",
        "Cilindros hidráulicos de vuelco del balde", "Mangueras hidráulicas del boom",
        "Cilindros hidráulicos de giro", "Mangueras de alimentación hidráulica",
        "Funcionabilidad de mandos y controles de excavación"
    ]),
    tabla("6. Batería, orugas y cristalería", [
        "Batería limpia, seca y asegurada", "Nivel de electrolitos", "Cables y bornes",
        "Escalera y rampa de acceso", "Tanque de combustible con tapa", "Señalizaciones de prevención",
        "Asiento del conductor", "Ajustes de asiento", "Cinturón de seguridad",
        "Parabrisas", "Vidrios puertas laterales", "Vidrio trasero", "Espejos retrovisores",
        "Orugas izquierdas", "Orugas derechas", "Rodillos superiores e inferiores"
    ])
] + build_findings() + build_validation([{"rol": "Operador"}, {"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "bbc3a4a8-0042-4776-bbe3-9500ad83d33f",
    "titulo": "Inspección de excavadora",
    "descripcion": "Verificación preoperacional del sistema hidráulico, brazo aguilón, balde, giro y orugas de excavadora.",
    "codigo": "CVC-SST-FT-110",
    "emision": "Jun-2026",
    "revision": "01",
    "rol": "Inspector SIHO",
    "plantilla_id": "7c82eca5-72a0-44b3-b4c4-5322957e84e6",
    "campos": f4_campos
})

# =========================================================================
# 5. INSPECCION DE SIDE BOOM (CVC-SST-FT-121)
# =========================================================================
f5_campos = build_datos_generales([
    {"etiqueta": "Tipo de equipo"}, {"etiqueta": "Marca"}, {"etiqueta": "Modelo"},
    {"etiqueta": "Serial"}, {"etiqueta": "Año", "tipo": "numero"}, {"etiqueta": "Capacidad máxima (ton)"},
    {"etiqueta": "Horómetro (Hrs)", "tipo": "numero"}, {"etiqueta": "Póliza de seguro Nº", "obligatorio": False}
]) + build_certificacion_auxiliares() + [
    tabla("4. Sistema eléctrico y de control", [
        "Luces delanteras y de trabajo", "Bocina o corneta", "Alarma de retroceso",
        "Indicadores de combustible y presión", "Velocímetro / horómetro",
        "Batería limpia, seca y asegurada", "Cables y bornes de batería",
        "Sistema de bloqueo de seguridad", "Switch cortacorriente", "Sistema de bloqueo de winche"
    ]),
    tabla("5. Sistema mecánico e izaje (Side Boom)", [
        "Freno de cabina, pedal y de mano", "Funcionamiento del motor", "Filtros y válvulas",
        "Tanque de combustible y aceite", "Estado de orugas",
        "Cilindro hidráulico del estabilizador", "Mangueras y conexiones del estabilizador",
        "Pasadores, pernos y tuercas de pluma", "Funcionamiento de winche",
        "Estado de las guayas / cables de izaje", "Poleas de pluma y pasteca", "Sistema de escape",
        "Estado y funcionamiento de contrapesos", "Estado de gancho de izaje de carga y pestillo de seguridad"
    ]),
    tabla("6. Cabina y señalética", [
        "Asiento del conductor", "Cinturón de seguridad",
        "Capacidad máxima visible en pluma", "Tabla de carga visible y legible", "Avisos de advertencia"
    ])
] + build_findings() + build_validation([{"rol": "Operador"}, {"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "f53129a2-8500-4d19-9162-dd61a55c7720",
    "titulo": "Inspección de side boom",
    "descripcion": "Verificación del tiendetubos (Side Boom): guayas, pluma, winches, contrapesos, gancho de izaje y frenos.",
    "codigo": "CVC-SST-FT-121",
    "emision": "Jun-2026",
    "revision": "02",
    "rol": "Inspector SIHO",
    "plantilla_id": "4eb71f6d-13be-4126-bb6c-b4c265b07ab4",
    "campos": f5_campos
})

# =========================================================================
# 6. INSPECCION DE MAQUINA DE SOLDAR (CVC-SST-FT-105)
# =========================================================================
f6_campos = [
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "1. Datos generales", "obligatorio": False},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha", "obligatorio": True, "hoyPorDefecto": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Centro de trabajo", "obligatorio": True},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "2. Datos del soldador", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Soldador: nombres y apellidos", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Cédula de identidad", "obligatorio": True},
    {"id": uid(), "tipo": "si_no", "ancho": "tercio", "ayuda": "", "etiqueta": "Certificación del soldador", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vencimiento certificación", "obligatorio": False, "hoyPorDefecto": False},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Nº de certificado", "obligatorio": False},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "3. Datos de la máquina", "obligatorio": False},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de máquina", "opciones": ["Eléctrica", "Gasoil / Diésel"], "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Marca", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Modelo", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Color", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Serial", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "Ej. 400 Amp", "etiqueta": "Capacidad (Amperaje)", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Última calibración", "obligatorio": False, "hoyPorDefecto": False},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Empresa certificadora", "obligatorio": False},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de extintor", "opciones": ["PQS", "CO2"], "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "Ej. 10 lbs o 20 lbs", "etiqueta": "Capacidad extintor", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vencimiento extintor", "obligatorio": True, "hoyPorDefecto": False},
    {"id": uid(), "tipo": "si_no", "ancho": "tercio", "ayuda": "", "etiqueta": "Ubicado en vehículo", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "Si está en vehículo", "etiqueta": "Placa del vehículo", "obligatorio": False},
    tabla("4. Ítems a inspeccionar de la máquina de soldar", [
        "Carcasa de la máquina", "Manilla de transporte", "Topes de apoyo de base", "Limpieza general",
        "Cables conductores (aislamiento)", "Cable de conexión a tierra", "Enchufe / clavija",
        "Cable portaelectrodo", "Regulador de amperaje", "Interruptor de encendido",
        "Luz piloto de encendido", "Funcionamiento del ventilador", "Selector de cambio de función",
        "Portaelectrodo (aislamiento y mordaza)", "Sistema de puesta a tierra (barra o cable)", "Pinza de tierra",
        "Nivel de combustible (si aplica)", "Nivel de agua / refrigerante", "Nivel de aceite de motor",
        "Tapa de depósito de combustible", "Tapa de depósito de aceite", "Tapa de depósito de agua",
        "Silenciador de escape", "Matachispas", "Cadenas y conos (Zona de exclusión)"
    ])
] + build_findings() + build_validation([{"rol": "Soldador"}, {"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "d1eb02b5-31b8-44ab-96af-3be1e9dfcf53",
    "titulo": "Inspección de máquina de soldar",
    "descripcion": "Verificación eléctrica y mecánica de motosoldadoras y máquinas de soldar eléctricas portátiles.",
    "codigo": "CVC-SST-FT-105",
    "emision": "Jun-2026",
    "revision": "02",
    "rol": "Inspector SIHO",
    "plantilla_id": "2a92382a-62d5-4878-88b5-51877f29e511",
    "campos": f6_campos
})

# =========================================================================
# 7. INSPECCION A BRAZO ARTICULADO (CVC-SST-FT-101)
# =========================================================================
f7_campos = [
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "1. Datos generales", "obligatorio": False},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha", "obligatorio": True, "hoyPorDefecto": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Centro de trabajo", "obligatorio": True},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de equipo", "opciones": ["Propio", "Contratado"], "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Empresa", "obligatorio": False},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "2. Datos del conductor / operador", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Conductor: nombres y apellidos", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Nº Licencia", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de licencia", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vigencia de la licencia", "obligatorio": True, "hoyPorDefecto": False},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vigencia certificado médico", "obligatorio": True, "hoyPorDefecto": False},
    {"id": uid(), "tipo": "si_no", "ancho": "tercio", "ayuda": "", "etiqueta": "Manejo defensivo flota pesada", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Manejo defensivo: vencimiento", "obligatorio": False, "hoyPorDefecto": False},
    {"id": uid(), "tipo": "si_no", "ancho": "tercio", "ayuda": "", "etiqueta": "Certificado de operador brazo hidráulico", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Certificado operador: vencimiento", "obligatorio": False, "hoyPorDefecto": False},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "3. Datos del camión y del brazo hidráulico", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Marca del camión", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Placa del camión", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Marca del brazo hidráulico", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Modelo del brazo", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Serial del brazo", "obligatorio": True},
    {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "En toneladas", "etiqueta": "Capacidad máxima brazo (ton)", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Certificación número", "obligatorio": False},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha vencimiento certificación", "obligatorio": False, "hoyPorDefecto": False},
    tabla("4. Estructura y anclajes", [
        "Acoples de la base del brazo al chasis del camión", "Base del brazo hidráulico",
        "Extensiones del estabilizador", "Patas del estabilizador", "Mecanismo de giro",
        "Columna del brazo", "Brazo principal", "Brazo articulado", "Prolongadas hidráulicas",
        "Prolongado manual", "Gancho de izaje y pestillo de seguridad", "Palancas de control de mandos"
    ]),
    tabla("5. Sistema hidráulico y seguridad", [
        "Bomba hidráulica", "Sellos y mangueras de bomba", "Filtro de alta presión",
        "Cilindros de controles de mando", "Cilindro de elevación", "Válvula de retención cilindro elevación",
        "Cilindro de articulación", "Válvula de retención cilindro articulación",
        "Cilindro de prolongadas", "Válvula de retención cilindro prolongadas",
        "Mangueras de extensores y estabilizadores", "Mangueras del brazo principal y articulado",
        "Mangueras de las prolongadas", "Switch de conexión bomba hidráulica",
        "Manómetro de revoluciones / presión", "Botón de parada de emergencia",
        "Tabla de carga visible y legible", "Señalizaciones de advertencia"
    ])
] + build_findings() + build_validation([{"rol": "Operador"}, {"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "f218859d-6a56-4748-9855-1d600b8895c8",
    "titulo": "Inspección de brazo articulado",
    "descripcion": "Verificación de camión grúa / brazo hidráulico articulado: estabilizadores, cilindros, válvulas de bloqueo, gancho y tabla de carga.",
    "codigo": "CVC-SST-FT-101",
    "emision": "Jun-2026",
    "revision": "02",
    "rol": "Inspector SIHO",
    "plantilla_id": "d8dcbb51-2181-45ed-9527-4e5aaff8cb6c",
    "campos": f7_campos
})

# =========================================================================
# 8. INSPECCION CARGADOR FRONTAL (CVC-SST-FT-00)
# =========================================================================
f8_campos = build_datos_generales([
    {"etiqueta": "Tipo de equipo"}, {"etiqueta": "Marca"}, {"etiqueta": "Modelo"},
    {"etiqueta": "Serial"}, {"etiqueta": "Año", "tipo": "numero"}, {"etiqueta": "Placa", "obligatorio": False},
    {"etiqueta": "Capacidad pala (m³)"}, {"etiqueta": "Horómetro (Hrs)", "tipo": "numero"}, {"etiqueta": "Póliza de seguro Nº", "obligatorio": False}
]) + build_certificacion_auxiliares() + [
    tabla("4. Sistema eléctrico", [
        "Luces delanteras", "Luces de freno", "Luces de cruce o giro", "Luces de retroceso",
        "Luz del tablero", "Luz de cabina", "Bocina o corneta", "Alarma de retroceso",
        "Aire acondicionado", "Limpiaparabrisas", "Indicadores de combustible y otros", "Velocímetro / horómetro"
    ]),
    tabla("5. Sistema mecánico, pala y articulación", [
        "Pala frontal (desgaste y fisuras)", "Cuchilla de pala frontal", "Tornillos de acople de cuchilla",
        "Cilindro hidráulico de vuelco de la pala", "Mangueras hidráulicas de vuelco",
        "Brazo de pala frontal", "Mandos y controles de pala frontal", "Pasador con pin de sujeción",
        "Cruceta y cardán", "Tubo de escape", "Gatos principales de cintura / dirección",
        "Jaiba (pasadores y certificación)", "Batería limpia, cables y bornes",
        "Tanque de combustible con tapa", "Escalera y pasamanos de acceso"
    ]),
    tabla("6. Neumáticos, cabina y cristalería", [
        "Delantero derecho (estado y presión)", "Delantero izquierdo (estado y presión)",
        "Trasero derecho (estado y presión)", "Trasero izquierdo (estado y presión)",
        "Asiento del conductor", "Ajustes del asiento", "Cinturón de seguridad",
        "Parabrisas", "Vidrios puertas laterales", "Vidrio trasero", "Espejos retrovisores"
    ])
] + build_findings() + build_validation([{"rol": "Operador"}, {"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "35368a29-41bf-4a89-bbbc-e801a0261f7d",
    "titulo": "Inspección de cargador frontal",
    "descripcion": "Verificación preoperacional de cargador frontal sobre neumáticos: articulación de cintura, pala frontal, hidráulico y frenos.",
    "codigo": "CVC-SST-FT-00",
    "emision": "Jun-2026",
    "revision": "02",
    "rol": "Inspector SIHO",
    "plantilla_id": None,
    "campos": f8_campos
})

# =========================================================================
# 9. INSPECCION VEHICULOS NO LIVIANOS (CVC-SST-FT-118)
# =========================================================================
f9_campos = build_datos_generales([
    {"etiqueta": "Clase de vehículo (Chuto / Volqueta / Batea / Cisterna)"}, {"etiqueta": "Marca"}, {"etiqueta": "Modelo"},
    {"etiqueta": "Color"}, {"etiqueta": "Año", "tipo": "numero"}, {"etiqueta": "Placa chuto / cabina"},
    {"etiqueta": "Placa batea / remolque", "obligatorio": False}, {"etiqueta": "Kilometraje (Km)", "tipo": "numero"}, {"etiqueta": "Póliza de seguro Nº", "obligatorio": False}
], operador_label="Conductor") + [
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "Elementos de emergencia y seguridad", "obligatorio": False},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de extintor", "opciones": ["PQS", "CO2"], "obligatorio": True},
    {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "", "etiqueta": "Capacidad extintor (Lbs)", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vencimiento extintor", "obligatorio": True, "hoyPorDefecto": False},
    tabla("Elementos de seguridad requeridos", [
        "Triángulos / conos de seguridad", "Llave de ajuste de ruedas", "Gato hidráulico de capacidad adecuada",
        "Manga de viento", "Linterna operativa", "Botiquín de primeros auxilios",
        "DIM'S (Identificador de conductor)", "Cámara de fatiga operativa",
        "Caja de herramientas o malla de restricción", "Chalecos reflectivos"
    ], ["SI", "NO"]),
    tabla("4. Sistema eléctrico y mecánico", [
        "Luces de alta y bajas", "Luces de freno", "Luces de cruce o giro", "Luces de retroceso",
        "Luces intermitentes / emergencia", "Luz de cabina", "Bocina o corneta", "Alarma de retroceso",
        "Aire acondicionado", "Limpiaparabrisas", "Indicadores de tablero", "Velocímetro / odómetro",
        "Radiador y mangueras", "Depósito de agua de motor", "Caño de escape / silenciador", "Sistema de dirección"
    ]),
    tabla("5. Neumáticos, frenos y acoples", [
        "Neumáticos delanteros (mínimo 3.0 mm de huella)", "Neumáticos traseros tracción (mínimo 1.6 mm de huella)",
        "Neumáticos de batea / remolque", "Indicadores de tuercas de neumáticos", "Neumático de repuesto",
        "Cuñas de seguridad (2 mínimo)", "Quinta rueda / plato de enganche y perno rey",
        "Mangueras de aire de freno y cables de luces de remolque", "Frenos de aire (sin fugas perceptibles)",
        "Freno de estacionamiento (Maxi-brake)"
    ]),
    tabla("6. Tapicería, cristalería y especificaciones", [
        "Asiento del conductor y copiloto con apoyacabezas", "Cinturones de 3 puntos en todos los asientos",
        "Parabrisas sin roturas", "Vidrios laterales y trasero", "Espejos retrovisores convexos y laterales",
        "Protección antiempotramiento delantera y trasera", "Protección lateral contra colisión",
        "Cintas reflectivas laterales y traseras reglamentarias"
    ])
] + build_findings() + build_validation([{"rol": "Conductor"}, {"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "8a576fe6-0026-48f3-b7f4-ac8c1a266603",
    "titulo": "Inspección de vehículos no livianos (Pesados / Chuto / Batea)",
    "descripcion": "Inspección integral preoperacional de unidades de carga pesada: chuto, volqueta, batea y lowboy.",
    "codigo": "CVC-SST-FT-118",
    "emision": "Jun-2026",
    "revision": "01",
    "rol": "Inspector SIHO",
    "plantilla_id": "6f8aa883-112f-412b-8f1d-fe8bac5df849",
    "campos": f9_campos
})

# =========================================================================
# 10. INSPECCION DE ZANJADORA (CVC-SST-FT-120)
# =========================================================================
f10_campos = build_datos_generales([
    {"etiqueta": "Tipo de zanjadora"}, {"etiqueta": "Marca"}, {"etiqueta": "Modelo"},
    {"etiqueta": "Serial"}, {"etiqueta": "Año", "tipo": "numero"}, {"etiqueta": "Placa", "obligatorio": False},
    {"etiqueta": "Capacidad / Profundidad máx."}, {"etiqueta": "Horómetro (Hrs)", "tipo": "numero"}, {"etiqueta": "Póliza de seguro Nº", "obligatorio": False}
]) + build_certificacion_auxiliares() + [
    tabla("4. Componentes principales y motor", [
        "Identificación del equipo", "Chasis del vehículo", "Motor",
        "Órgano de accionamiento voluntario (llave / pulsador de marcha)",
        "Dispositivo de parada de emergencia del motor", "Transmisión y embrague", "Frenos",
        "Neumáticos / rines o tren de oruga", "Sistema hidráulico y bombas", "Cilindros hidráulicos"
    ]),
    tabla("5. Mecanismo de zanjado y seguridad", [
        "Cilindro de levante del brazo de zanjado", "Contrapeso", "Soldaduras de la estructura",
        "Dispositivos de bloqueo del brazo en posición fija", "Palanca de bloqueo de mandos",
        "Dispositivo adicional de bloqueo para pendientes", "Mangueras y conexiones hidráulicas",
        "Cadena o disco de zanjado (dientes y desgaste)", "Tornillo sinfín de evacuación de tierra",
        "Batería limpia, cables y bornes", "Estructura antivuelco (ROPS)",
        "Dispositivo de remolque con doble seguro", "Luces y señales de advertencia", "Cinturón de seguridad"
    ]),
    tabla("6. Cabina y cristalería", [
        "Asiento del conductor", "Ajustes del asiento", "Cinturón de seguridad",
        "Parabrisas", "Vidrios puertas laterales", "Vidrio trasero"
    ])
] + build_findings() + build_validation([{"rol": "Operador"}, {"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "d58f6f77-796d-48aa-9bf6-1b8db501f174",
    "titulo": "Inspección de zanjadora",
    "descripcion": "Verificación preoperacional de zanjadora: cadena de zanja, sinfín, frenos, paradas de emergencia y sistema hidráulico.",
    "codigo": "CVC-SST-FT-120",
    "emision": "Jun-2026",
    "revision": "01",
    "rol": "Inspector SIHO",
    "plantilla_id": "dbdbaea7-0ba8-4367-89d1-734cedefaca7",
    "campos": f10_campos
})

# =========================================================================
# 11. INSPECCION DE GRILLETES (CVC-SST-FT-102)
# =========================================================================
f11_campos = [
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "1. Datos generales", "obligatorio": False},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha", "obligatorio": True, "hoyPorDefecto": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Centro de trabajo / Proyecto", "obligatorio": True},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Ubicación", "opciones": ["Almacén", "Vehículo"], "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "Solo si aplica", "etiqueta": "Placas del vehículo", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Usuario / Custodio", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Validado por", "obligatorio": True},
    tabla("2. Información del estado de los grilletes", [
        "¿Está libre de deformidades?",
        "¿Está libre de desgastes visibles?",
        "¿Está libre de pintura que evite visualizar su estado original?",
        "¿El tipo de grillete es el adecuado para el izamiento a realizar?",
        "¿El dispositivo de seguridad está libre de desgastes?",
        "¿Es legible la información del fabricante, serial y capacidad?",
        "¿Cuenta con todos sus elementos ORIGINALES? (pasador, tuerca, pasador aletado)",
        "¿Están resguardados de la intemperie y de sustancias corrosivas?",
        "¿Cuenta con certificado de inspección vigente?",
        "¿Está apto para su uso?"
    ], ["SI", "NO", "N/A"], ayuda="Marque SI, NO o N/A según la condición observada"),
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "3. Datos técnicos del grillete", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "Ej. Crosby / Green Pin", "etiqueta": "Marca del grillete", "obligatorio": True},
    {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "En toneladas", "etiqueta": "Capacidad máxima (ton)", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "Pulgadas (ej. 3/4\", 1\")", "etiqueta": "Diámetro", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Lote / Serial", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Nº de certificado", "obligatorio": False},
] + build_findings() + build_validation([{"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "862bd6b6-2385-4f26-a3ea-2206b77e175d",
    "titulo": "Inspección de grilletes",
    "descripcion": "Inspección de elementos de izaje: grilletes tipo lira o rectos, pasadores roscados, tuercas y desgaste de cuerpo.",
    "codigo": "CVC-SST-FT-102",
    "emision": "Jun-2026",
    "revision": "01",
    "rol": "Inspector SIHO",
    "plantilla_id": "bf854228-3bf0-4761-a8a5-f8d330d829ce",
    "campos": f11_campos
})

# =========================================================================
# 12. INSPECCION EQUIPO OXIACETILENO (CVC-SST-FT-104)
# =========================================================================
f12_campos = [
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "1. Datos generales", "obligatorio": False},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha", "obligatorio": True, "hoyPorDefecto": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Centro de trabajo", "obligatorio": True},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "2. Datos del soldador / fabricador", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Soldador / Fabricador: nombres y apellidos", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Cédula de identidad", "obligatorio": True},
    {"id": uid(), "tipo": "si_no", "ancho": "tercio", "ayuda": "", "etiqueta": "Certificación del soldador", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vencimiento certificación", "obligatorio": False, "hoyPorDefecto": False},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Nº Certificado", "obligatorio": False},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "3. Datos de los cilindros y equipos auxiliares", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Capacidad cilindro Acetileno (C2H2)", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "Identificación de color", "etiqueta": "Color cilindro Acetileno", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Serial cilindro Acetileno", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Capacidad cilindro Oxígeno (O2)", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Color cilindro Oxígeno", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Serial cilindro Oxígeno", "obligatorio": True},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de extintor", "opciones": ["PQS", "CO2"], "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "Ej. 10 lbs o 20 lbs", "etiqueta": "Capacidad del extintor", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vencimiento del extintor", "obligatorio": True, "hoyPorDefecto": False},
    {"id": uid(), "tipo": "si_no", "ancho": "tercio", "ayuda": "", "etiqueta": "Conos de seguridad para acordonar", "obligatorio": True},
    {"id": uid(), "tipo": "si_no", "ancho": "tercio", "ayuda": "", "etiqueta": "Sistema de puesta a tierra (barra / cable)", "obligatorio": True},
    tabla("4. Componentes y condiciones de seguridad del equipo", [
        "¿Los cilindros están en posición vertical asegurados con cadena?",
        "¿Están bien asegurados y protegidos en su carrito de transporte?",
        "¿Los cilindros están libres de golpes, abolladuras o corrosión?",
        "¿Existen avisos de advertencia 'No Fumar' y 'Gases Inflamables'?",
        "¿Las válvulas de los cilindros están libres de fugas?",
        "¿Las válvulas cierran adecuadamente?",
        "¿Las roscas y conexiones están limpias y sin deformaciones?",
        "¿Se encuentran los cilindros libres de grasa, aceite o suciedad?",
        "¿Están en buenas condiciones los reguladores de presión?",
        "¿Están en buenas condiciones los manómetros de alta y baja presión?",
        "¿Las mangueras (verde y roja) están sin empates, grietas ni quemaduras?",
        "¿Están las abrazaderas crimpadas o ajustadas correctamente?",
        "¿Posee arrestallamas (válvulas antirretorno) en el soplete?",
        "¿Posee arrestallamas en la salida de los reguladores?",
        "¿El soplete y sus válvulas de corte están en perfecto estado?",
        "¿El pico del soplete está limpio y sin deformaciones?",
        "¿Se utiliza encendedor de cazoleta (yesquero chispero) apropiado?",
        "¿Existen agujas limpia-picos?",
        "¿Posee los casquetes / caperuzas de protección para transporte?"
    ])
] + build_findings() + build_validation([{"rol": "Soldador / Oxicortador"}, {"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "8e638f41-b3c9-4fab-a7c2-1774a451c654",
    "titulo": "Inspección de equipo de corte oxiacetileno",
    "descripcion": "Verificación de seguridad en cilindros de O2 y C2H2: reguladores, manómetros, mangueras, arrestallamas y soplete.",
    "codigo": "CVC-SST-FT-104",
    "emision": "Jun-2026",
    "revision": "02",
    "rol": "Inspector SIHO",
    "plantilla_id": "b09d5b1c-74a3-45ce-bb26-9037174d0f3b",
    "campos": f12_campos
})

# =========================================================================
# 13. INSPECCION DE AMBULANCIA (CVC-SST-FT-117)
# =========================================================================
f13_campos = [
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "1. Datos generales", "obligatorio": False},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha", "obligatorio": True, "hoyPorDefecto": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Centro de trabajo", "obligatorio": True},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "2. Datos del conductor y documentación", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Conductor: nombres y apellidos", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Nº Licencia", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de licencia", "obligatorio": True},
    {"id": uid(), "tipo": "si_no", "ancho": "tercio", "ayuda": "", "etiqueta": "Manejo defensivo", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vencimiento manejo defensivo", "obligatorio": False, "hoyPorDefecto": False},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "3. Datos del vehículo y equipos auxiliares", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Marca de la ambulancia", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Modelo", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Placa", "obligatorio": True},
    {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "", "etiqueta": "Kilometraje (Km)", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Póliza de seguro Nº", "obligatorio": False},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de extintor", "opciones": ["PQS", "CO2"], "obligatorio": True},
    {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "", "etiqueta": "Capacidad extintor (Lbs)", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vencimiento extintor", "obligatorio": True, "hoyPorDefecto": False},
    tabla("Auxiliares de carretera", [
        "Triángulos / conos de seguridad", "Llave de ajuste de ruedas", "Gato hidráulico",
        "DIM'S (Identificador de conductor)", "Cámara de fatiga"
    ], ["SI", "NO"]),
    tabla("4. Equipos e insumos médicos asistenciales", [
        "Bombona de O2 principal fija (1500 lbs)", "Tomas de O2 con humidificador operativas",
        "Tanque de oxígeno portátil tamaño D (300 lbs) con manómetro y flujómetro",
        "Aspirador de secreciones / vacío de 300 mmHg", "Tensiómetros de adulto y pediátrico",
        "Estetoscopio biauricular", "Termómetro clínico", "Gancho portasuero doble",
        "Estuche de diagnóstico (oftalmoscopio / otoscopio)", "Collarines cervicales semirrígidos (pequeño, mediano, grande)",
        "Inmovilizadores laterales de cabeza / cráneo", "Balón autoinsuflable (AMBU) adulto y pediátrico con mascarillas",
        "Tabla espinal larga con bandas de sujeción (araña)", "Tabla espinal corta / chaleco de extricación",
        "Equipo de cirugía menor / curación estéril", "Férulas neumáticas o rígidas para extremidades",
        "Camilla principal telescópica con anclaje a piso", "Camilla plegable de lona", "Camilla de cuchara / clínica",
        "Monitor desfibrilador (DEA) con parches y batería cargada", "Laringoscopio con valvas y bombillos operativos",
        "Oxímetro de pulso (saturómetro)", "Gabinetes, gavetas y maletín de soporte vital",
        "Silla de ruedas plegable", "Asiento de paramédico con cinturón de seguridad"
    ]),
    tabla("5. Carrocería y señalización de emergencia", [
        "Pintura blanca con emblemas y cruz de la vida", "Sirena electrónica operativa",
        "Barra de luces de emergencia (coctelera / estrobos)", "Aire acondicionado cabina médica",
        "Piso antiresbalante y lavable", "Puertas traseras y laterales de apertura correcta",
        "Comunicación efectiva (Radio / Teléfono / Internet)", "Números de emergencia rotulados visibles"
    ])
] + build_findings() + build_validation([{"rol": "Paramédico"}, {"rol": "Conductor"}, {"rol": "Supervisor SST", "obligatorio": False}])

formularios.append({
    "id": "d5229fd7-f208-4df1-9935-b1e5841a4d58",
    "titulo": "Inspección de ambulancia",
    "descripcion": "Verificación diaria/semanal de ambulancia: soporte vital, oxigenoterapia, monitor DEA, camillas e insumos médicos.",
    "codigo": "CVC-SST-FT-117",
    "emision": "Jun-2026",
    "revision": "02",
    "rol": "Paramédico",
    "plantilla_id": "e17b2536-f7cb-4b72-b209-970f31ac709b",
    "campos": f13_campos
})

# =========================================================================
# 14. INSPECCION TRANSPORTE DE PERSONAL (CVC-SST-FT-000)
# =========================================================================
f14_campos = build_datos_generales([
    {"etiqueta": "Clase de vehículo (Autobús / Minibús / Van)"}, {"etiqueta": "Marca"}, {"etiqueta": "Modelo"},
    {"etiqueta": "Color"}, {"etiqueta": "Año", "tipo": "numero"}, {"etiqueta": "Placa"},
    {"etiqueta": "Capacidad de pasajeros (puestos)", "tipo": "numero"}, {"etiqueta": "Kilometraje (Km)", "tipo": "numero"}, {"etiqueta": "Póliza de seguro Nº", "obligatorio": False}
], operador_label="Conductor") + [
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "Elementos de emergencia y seguridad", "obligatorio": False},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de extintor", "opciones": ["PQS", "CO2"], "obligatorio": True},
    {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "", "etiqueta": "Capacidad extintor (Lbs)", "obligatorio": True},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vencimiento extintor", "obligatorio": True, "hoyPorDefecto": False},
    tabla("Elementos de seguridad requeridos", [
        "Triángulos / conos de seguridad", "Llave de ajuste de ruedas", "Gato hidráulico de capacidad",
        "Linterna operativa", "Botiquín de primeros auxilios dotado", "DIM'S (Identificador de conductor)",
        "Cámara de fatiga operativa", "Caja de herramientas", "Chalecos reflectivos"
    ], ["SI", "NO"]),
    tabla("4. Sistema eléctrico, mecánico y salidas", [
        "Luces de alta y bajas", "Luces de freno", "Luces de cruce o giro", "Luces de retroceso",
        "Luces intermitentes de emergencia", "Luz del tablero", "Luz de cabina y pasillo de pasajeros",
        "Bocina o corneta", "Alarma de retroceso", "Aire acondicionado", "Limpiaparabrisas",
        "Indicadores de tablero", "Velocímetro / odómetro",
        "Puerta de emergencia operativa y claramente señalizada", "Martillos para rotura de cristales en emergencia",
        "Radiador y depósito de agua", "Caño de escape / silenciador", "Sistema de dirección"
    ]),
    tabla("5. Asientos, cinturones de seguridad y neumáticos", [
        "Asientos de pasajeros en buenas condiciones (sin filos ni roturas)",
        "100% de los asientos con cinturones de seguridad de 3 puntos",
        "100% de los cinturones con anclajes originales de fábrica",
        "100% de los asientos con apoyacabezas",
        "Indicativos visibles sobre el uso obligatorio del cinturón",
        "Neumáticos del mismo tamaño y marca por eje",
        "Neumáticos inflados correctamente con profundidad mínima 3.0 mm (delanteros) y 1.6 mm (traseros)",
        "Indicadores de posición en tuercas de neumáticos", "Guardabarros en todas las ruedas",
        "Neumático de repuesto en buen estado", "Cuñas de seguridad para estacionamiento",
        "Funcionamiento de frenos de servicio y freno de mano"
    ])
] + build_findings() + build_validation([{"rol": "Conductor"}, {"rol": "Inspector SIHO"}, {"rol": "Supervisor", "obligatorio": False}])

formularios.append({
    "id": "92fb17d7-5398-4a29-9263-e595b8ea2221",
    "titulo": "Inspección de transporte de personal",
    "descripcion": "Verificación preoperacional para unidades de transporte de personal: cinturones, salidas de emergencia, frenos y neumáticos.",
    "codigo": "CVC-SST-FT-000",
    "emision": "Jun-2026",
    "revision": "00",
    "rol": "Inspector SIHO",
    "plantilla_id": None,
    "campos": f14_campos
})

# =========================================================================
# 15. CERTIFICADO DE SALUD OCUPACIONAL (CVC-SST-FT-000)
# =========================================================================
f15_campos = [
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "1. Datos del paciente / trabajador", "obligatorio": False},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha de la evaluación", "obligatorio": True, "hoyPorDefecto": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "Ciudad o centro de salud", "etiqueta": "Lugar de expedición", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Nombre y apellido del paciente", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Cédula de identidad", "obligatorio": True},
    {"id": uid(), "tipo": "numero", "ancho": "tercio", "ayuda": "Años cumplidos", "etiqueta": "Edad", "obligatorio": True},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Grupo sanguíneo y factor Rh", "opciones": ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"], "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Cargo u ocupación", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "Proyecto o departamento", "etiqueta": "Obra o centro adscrito", "obligatorio": True},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "2. Tipo de evaluación médica", "obligatorio": False},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "mitad", "ayuda": "", "etiqueta": "Tipo de examen", "opciones": [
        "De Ingreso (Pre-empleo)", "Periódico anual", "Post-Vacacional", "Pre-Vacacional", "De Egreso (Retiro)", "Especiales / Reubicación"
    ], "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "completo", "ayuda": "Si aplica", "etiqueta": "Detalle o motivo del examen", "obligatorio": False},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "3. Exposición a riesgos y exámenes paraclínicos", "obligatorio": False},
    {"id": uid(), "tipo": "opcion_multiple", "ancho": "completo", "ayuda": "Marque los factores de riesgo del puesto", "etiqueta": "Riesgos ocupacionales según proceso peligroso", "opciones": [
        "Ergonómico / Postural", "Físico (Ruido, vibración, calor)", "Químico (Polvo, vapores, humos)", "Biológico", "Psicosocial", "Mecánico / Caídas"
    ], "obligatorio": True},
    {"id": uid(), "tipo": "opcion_multiple", "ancho": "completo", "ayuda": "Marque los estudios efectuados", "etiqueta": "Procedimientos y paraclínicos realizados", "opciones": [
        "Espirometría", "Audiometría", "Examen de laboratorio (perfil 20)", "Electrocardiograma (EKG)",
        "Visiometría / Optometría", "Rx de Tórax", "Rx lumbosacra", "Examen físico integral", "Goniometría articular"
    ], "obligatorio": True},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "4. Concepto de aptitud y observaciones médicas", "obligatorio": False},
    {"id": uid(), "tipo": "opcion_unica", "ancho": "mitad", "ayuda": "", "etiqueta": "Conclusión de aptitud médica", "opciones": [
        "Apto / Elegible sin restricciones", "Apto / Elegible con restricciones", "No Elegible temporalmente", "No Elegible permanente"
    ], "obligatorio": True},
    {"id": uid(), "tipo": "parrafo", "ancho": "completo", "ayuda": "Detalle recomendaciones médicas, ergonomía o medicamentos requeridos", "etiqueta": "Observaciones y recomendaciones médicas", "obligatorio": False},
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "5. Certificación médica profesional", "obligatorio": False},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Médico tratante: nombre y apellido", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Cédula de identidad", "obligatorio": True},
    {"id": uid(), "tipo": "texto", "ancho": "tercio", "ayuda": "Nº MPPS / Colegio Médico", "etiqueta": "Registro médico / MPPS", "obligatorio": True},
    {"id": uid(), "tipo": "firma", "ancho": "completo", "ayuda": "Firma del médico ocupacional", "etiqueta": "Firma y sello del médico", "obligatorio": True},
]

formularios.append({
    "id": "2db300b8-76e9-4342-91ad-8e91a2355561",
    "titulo": "Certificado de salud ocupacional",
    "descripcion": "Certificado médico de aptitud laboral para ingresos, periódicos, reintegros y egresos con paraclínicos.",
    "codigo": "CVC-SST-FT-000",
    "emision": "Jun-2026",
    "revision": "01",
    "rol": "Paramédico",
    "plantilla_id": None,
    "campos": f15_campos
})

# =========================================================================
# 16. INSPECCION EQUIPOS DE PROTECCION (CVC-SST-FT-00)
# =========================================================================
f16_campos = [
    {"id": uid(), "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "1. Datos generales", "obligatorio": False},
    {"id": uid(), "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha", "obligatorio": True, "hoyPorDefecto": True},
    {"id": uid(), "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Centro de trabajo / Proyecto", "obligatorio": True},
    tabla("2. Inspección de equipos de protección personal (EPP)", [
        "1.1 Casco: Se observan averías, fisuras o deformaciones en el casco",
        "1.2 Casco: Se utiliza el casco apropiado para la actividad que realizan",
        "1.3 Casco: Posee sistema de suspensión y tafilete instalado correctamente",
        "2.1 Lentes: Presentan ralladuras o manchas en el visor que dificulten la visión",
        "2.2 Lentes: Se utilizan lentes o gafas de seguridad adecuados al riesgo",
        "3.1 Calzado: Se encuentran los zapatos de seguridad con puntera en buenas condiciones",
        "3.2 Calzado: La suela y el diseño son los adecuados para la actividad",
        "4.1 Careta de soldar: Se encuentra en buen estado mecánico y sin fisuras",
        "4.2 Careta de soldar: El vidrio / visor oscuro utilizado es el grado apropiado",
        "5.1 Soldadura: Se encuentran los guantes y mangas de soldador en buen estado",
        "6.1 Guantes de carnaza / tela: Están sin roturas, deshilachados o deteriorados",
        "7.1 Guantes de neopreno / químicos: Son los apropiados contra las sustancias manipuladas",
        "7.2 Señalización: Existen avisos preventivos alusivos al uso de guantes específicos",
        "8.1 Mascarillas contra polvo: Las mascarillas utilizadas son las apropiadas (N95 / FFP2)",
        "9.1 Respiradores: Los respiradores de media cara son los apropiados al contaminante",
        "9.2 Respiradores: Los cartuchos / filtros y bandas elásticas están en óptimas condiciones",
        "10.1 Arnés de seguridad: Todas las cintas y bandas del arnés están en buenas condiciones",
        "10.2 Arnés de seguridad: Posee cabo de vida (eslinga) con amortiguador de impacto",
        "10.3 Arnés de seguridad: Los ganchos y mosquetones poseen pasador con doble seguro",
        "10.4 Arnés de seguridad: Costuras intactas sin decoloración ni daño químico",
        "11.1 Protección auditiva: Se evidencia la utilización de tapones auditivos donde aplica",
        "11.2 Protección auditiva: Los tapones tienen la tasa de reducción de ruido necesaria",
        "12.1 Orejeras: En áreas de más de 85 dB se utiliza protección auditiva tipo copa / orejera",
        "12.2 Orejeras: Las almohadillas y diadema se encuentran en buen estado"
    ], ["SI", "NO", "N/A"], ayuda="Marque SI si cumple, NO si presenta falla o N/A si no aplica"),
] + build_findings() + build_validation([{"rol": "Inspector SIHO"}, {"rol": "Supervisor SST", "obligatorio": False}])

formularios.append({
    "id": "8dc98422-4689-4a0b-a49d-69ea3919ba3d",
    "titulo": "Inspección de equipos de protección personal (EPP)",
    "descripcion": "Verificación periódica del estado, certificación y uso adecuado de cascos, lentes, calzado, arneses y respiradores.",
    "codigo": "CVC-SST-FT-00",
    "emision": "Jun-2026",
    "revision": "01",
    "rol": "Inspector SIHO",
    "plantilla_id": None,
    "campos": f16_campos
})

# Guardar en db/data/formularios-migrados.json y migracion/formularios_migrados.json
os.makedirs("db/data", exist_ok=True)
os.makedirs("migracion", exist_ok=True)

for path in ["db/data/formularios-migrados.json", "migracion/formularios_migrados.json"]:
    with open(path, "w", encoding="utf-8") as out:
        json.dump(formularios, out, ensure_ascii=False, indent=2)

print(f"Exito: Se generaron {len(formularios)} formularios estructurados.")
for f in formularios:
    print(f"- {f['codigo']}: {f['titulo']} ({len(f['campos'])} campos) [Rol: {f['rol']}]")

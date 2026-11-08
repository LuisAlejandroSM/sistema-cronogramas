--
-- PostgreSQL database dump
--

\restrict ccvdIwEuEGiZLFwfqNDyj6O5LxSAXI2ZwdzXh6dwaDXxmsLpvznVhveU7IEqe8g

-- Dumped from database version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)
-- Dumped by pg_dump version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: plantillas_inspeccion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plantillas_inspeccion (id, codigo_formato, elemento_nombre, rol, periodicidad, cantidad_planificada, activo, creado_en, numero, orden) FROM stdin;
2a92382a-62d5-4878-88b5-51877f29e511	CVC-SST-FT-105	INSPECCION DE MAQUINA DEL SOLDAR	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	5	1
b09d5b1c-74a3-45ce-bb26-9037174d0f3b	CVC-SST-FT-104	INSPECCION DE EQUIPO OXIACETILENO	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	6	2
97719af5-c5a4-44fb-81e8-62280e868ed4	CVC-SST-FT-114	INSPECCION DE ESMERIL	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	7	3
56d1c50d-5f82-41b6-b062-cdda4be8e62b	CVC-SST-FT-109	INSPECCION DE TERMOS	Inspector SIHO	Diaria	1	t	2026-11-02 09:01:06.606578-04	8	4
7c82eca5-72a0-44b3-b4c4-5322957e84e6	CVC-SST-FT-110	INSPECCION DE RETROEXCAVADORA	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	9	5
72c5a089-82fb-4c6d-9cf0-62ea9cef9a42	CVC-SST-FT-115	INSPECCION DE HERRAMIENTAS	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	10	6
2832f488-1905-41f3-9484-6ad69f796aef	CVC-SST-FT-111	AUDITORIA DE ART	Inspector SIHO	Diaria	1	t	2026-11-02 09:01:06.606578-04	11	7
f2e36166-12ca-41be-9c11-92888523ccd7	CVC-SST-FT-112	AUDITORIA DE PDT	Inspector SIHO	Diaria	1	t	2026-11-02 09:01:06.606578-04	12	8
bc17e203-cbcb-44bc-a36a-6d3fb0fb065c	N/A	ELABORACIÓN DE CACERIA DE PELIGRO. TÓPICOS: SEGURIDAD CON LAS MANOS Y PIES(CAIDAS/TROPIEZOS/RESBALANES , SEGURIDAD VEHICULAR, SEGURIDAD OPERACIONES.	Inspector SIHO	ENTREGAR LA PRIMERA QUINCENA DEL MES	4	t	2026-11-02 09:01:06.606578-04	14	9
06a9bb44-cd55-407a-a308-da7c4eadaff2	CVC-SST-FT-37	ELABORACION DE TARJETAS T.O.S (30 UNIDADES POR SUP. SIHO)	Inspector SIHO	ENTREGAR LA PRIMERA QUINCENA DEL MES	30	t	2026-11-02 09:01:06.606578-04	16	11
db9b472a-9ad8-4be1-bbeb-3e275b5a714f	N/A	EVALUACIÓN ERGONOMICA (EPR) 5 SEMANAL (IDENTIFICAR AL TRABAJADOR CON NOMBRE Y APELLIDO EN EVIDENCIA FOTOGRAFICA)	Inspector SIHO	Semanal	5	t	2026-11-02 09:01:06.606578-04	15	10
6f8aa883-112f-412b-8f1d-fe8bac5df849	CVC-SST-FT-118	INSPECCIÓN DE CHUTO	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	17	12
dbdbaea7-0ba8-4367-89d1-734cedefaca7	CVC-SST-FT	INSPECCIÓN DE ZANJADORA	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	18	13
4eb71f6d-13be-4126-bb6c-b4c265b07ab4	CVC-SST-FT-121	INSPECCIÓN DE SIDE BOOM	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	19	14
ee164a9b-f8fe-4095-b1ca-1a86342dc44c	CVC-SST-FT-119	INSPECCIÓN DE BATEA O LOWBOY	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	20	15
ba5ba5e5-1e27-4626-b369-dbccc674e3eb	CVC-SST-FT-110	INSPECCIÓN DE JUMBO	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	21	16
d8dcbb51-2181-45ed-9527-4e5aaff8cb6c	CVC-SST-FT-101	INSPECCIÓN DE BRAZO ARTICULADO	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	22	17
1d2afbce-e1f9-4506-806a-c3103b9d5761	CVC-SST-FT-107	INSPECCIÓN DE ESLINGA	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	23	18
bf854228-3bf0-4761-a8a5-f8d330d829ce	CVC-SST-FT-102	INSPECCIÓN DE GRILLETES	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	24	19
bb4abc0e-00cc-4cc7-8a8a-17fd9bd14c4d	CVC-SST-FT-102	INSPECCCION DE BOTIQUIN DE PRIMEROS AUXILIOS	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	24	20
9d42dfac-96cb-476d-a3e2-131dc39610e5	CVC-SST-FT-102	SIMULACRO EN CASO DE INSPECCION DE VEHICULOS LIVIANO	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	24	21
43d04649-9352-45cf-8548-967b6b70361d	CVC-SST-FT-116	INSPECCION DE EXTINTOR PORTATIL	Inspector SIHO	Semanal	4	t	2026-11-02 09:01:06.606578-04	27	22
9b0b5256-5888-4a5b-ad23-a763c9e56901	CVC-SST-FT-103	INSPECCCION DE BOTIQUIN DE PRIMEROS AUXILIOS	Paramédico	Semanal	4	t	2026-11-02 09:01:06.606578-04	1	1
e17b2536-f7cb-4b72-b209-970f31ac709b	CVC-SST-FT-117	INSPECCIÓN DE AMBULANCIA	Paramédico	Diaria	1	t	2026-11-02 09:01:06.606578-04	2	2
0281ad07-7a9f-45e3-9996-ad87e6edf62f	CVC-SST-FT-116	INSPECCION DE EXTINTOR PORTATIL	Paramédico	Semanal	4	t	2026-11-02 09:01:06.606578-04	3	3
9adaab93-db2c-4a34-9941-26f2c6bdc2be	CVC-SST-FT-100	INSPECCION DE VEHICULOS LIVIANO	Paramédico	Semanal	4	t	2026-11-02 09:01:06.606578-04	4	4
84bef891-c1ba-4b30-b2d3-a9662f1f9a34	N/A	SIMULACRO EN CASO DE PRESENCIA DE H2S, INCENDIO, DERRAME EN AREA OPERACIONAL .	Paramédico	(ENTREGAR LA PRIMERA QUINCENA DEL MES) REALIZAR UN SIMULACRO DE CADA UNO.	4	t	2026-11-02 09:01:06.606578-04	13	5
298c4fba-5f14-4820-9b99-325d306d5ba6	CVC-SST-FT-103	INSPECCCION DE BOTIQUIN DE PRIMEROS AUXILIOS	Rescatista	Semanal	4	t	2026-11-02 09:01:06.606578-04	1	1
5af19069-481a-4e3d-895b-181cc1924c37	CVC-SST-FT-116	INSPECCION DE EXTINTOR PORTATIL	Rescatista	Semanal	4	t	2026-11-02 09:01:06.606578-04	3	2
0d5ed694-2337-40df-bc5a-90f0638543dd	CVC-SST-FT-100	INSPECCION DE VEHICULOS LIVIANO	Rescatista	Semanal	4	t	2026-11-02 09:01:06.606578-04	4	3
a4b986f0-e1f0-43ee-bd43-0f7ba4b50494	N/A	SIMULACRO EN CASO DE PRESENCIA DE H2S, INCENDIO, DERRAME EN AREA OPERACIONAL .	Rescatista	(ENTREGAR LA PRIMERA QUINCENA DEL MES) REALIZAR UN SIMULACRO DE CADA UNO.	4	t	2026-11-02 09:01:06.606578-04	13	4
e21cecf4-297d-416e-9c4c-9e70257b3ab0	CVC-SST-FT	INSPECCIÓN DE EPRAC	Rescatista	Semanal	4	t	2026-11-02 09:01:06.606578-04	25	5
f3fa519c-ea0a-4607-aa99-3be902e624d4	CVC-SST-FT	INSPECCION DE EQUIPO RETRACTIL	Rescatista	Semanal	4	t	2026-11-02 09:01:06.606578-04	26	6
250831ed-a8e0-4ae1-951a-d654088f7d44	CVC-SST-FT	INSPECCION DE TRIPODE	Rescatista	Semanal	4	t	2026-11-02 09:01:06.606578-04	27	7
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, nombre, correo, rol, activo, creado_en, alias, cargo, clave_hash, es_admin, debe_cambiar_clave, intentos_fallidos, bloqueado_hasta, ultimo_acceso) FROM stdin;
fc302815-3960-40c9-83d1-36242f8edace	Administrador	admin@cronogramas.local	Administración	t	2026-11-02 10:19:17.796576-04	\N	\N	scrypt$rDqAMDBoGALG9DkEf+2PkA==$MqBus+b7khhdliytCu3SDqxVtnVlSTxtjalop8Dk0zxBmSMvKHHMUWCpPOJJINrO4cCvcI8OG/wC/2GLe6hnjQ==	t	f	0	\N	\N
\.


--
-- Data for Name: formularios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.formularios (id, titulo, descripcion, campos, activo, creado_por, creado_en, actualizado_en, codigo, emision, revision, rol, plantilla_id) FROM stdin;
387340ad-b5d2-4947-9cab-f23c459aa213	Constancia de inspección de vehículos livianos	Inspección del vehículo liviano antes de su uso. Marque cada ítem como Bueno (B), Malo (M) o No aplica (N/A) y registre los hallazgos al final.	[{"id": "c_scbo7e6x", "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "1. Datos generales", "obligatorio": false}, {"id": "c_swpm38sx", "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha", "obligatorio": true, "hoyPorDefecto": true}, {"id": "c_x0c7wfy9", "tipo": "texto", "ancho": "mitad", "ayuda": "Ej. COB", "etiqueta": "Centro de trabajo", "obligatorio": true}, {"id": "c_qnjko39f", "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "2. Datos del conductor y documentación", "obligatorio": false}, {"id": "c_yhingere", "tipo": "texto", "ancho": "mitad", "ayuda": "", "etiqueta": "Nombres y apellidos", "obligatorio": true}, {"id": "c_vrzamvru", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Nº de licencia", "obligatorio": true}, {"id": "c_oy9qzw8z", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de licencia", "obligatorio": true}, {"id": "c_qeswpwj4", "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vigencia de la licencia", "obligatorio": true, "hoyPorDefecto": false}, {"id": "c_ra9sgx5b", "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Vigencia del certificado médico", "obligatorio": true, "hoyPorDefecto": false}, {"id": "c_i9dbvums", "tipo": "si_no", "ancho": "tercio", "ayuda": "", "etiqueta": "Manejo defensivo", "obligatorio": true}, {"id": "c_gwj57hbm", "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Manejo defensivo: vence", "obligatorio": false, "hoyPorDefecto": false}, {"id": "c_17791tt8", "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "3. Datos del vehículo", "obligatorio": false}, {"id": "c_2s9gcm19", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Marca", "obligatorio": true}, {"id": "c_jnii55kb", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Clase", "obligatorio": true}, {"id": "c_g4upztdd", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Modelo", "obligatorio": true}, {"id": "c_5gbx0gc1", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Color", "obligatorio": true}, {"id": "c_fl242y74", "tipo": "numero", "ancho": "tercio", "ayuda": "", "etiqueta": "Año", "obligatorio": true}, {"id": "c_v4vwgcyi", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Placa", "obligatorio": true}, {"id": "c_bpa7bp66", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Capacidad", "obligatorio": false}, {"id": "c_33oeznci", "tipo": "numero", "ancho": "tercio", "ayuda": "", "etiqueta": "Kilometraje (km)", "obligatorio": true}, {"id": "c_dxxrrg81", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Póliza de seguro Nº", "obligatorio": false}, {"id": "c_j7j00nu1", "tipo": "tabla_verificacion", "ancho": "completo", "ayuda": "B = Bueno · M = Malo · N/A = No aplica", "filas": ["COMBUSTIBLE", "REFRIGERANTE", "LIGA DE FRENOS", "ACEITE DE MOTOR", "HIDRÁULICO", "ACEITE DE CAJA"], "columnas": ["B", "M", "N/A"], "etiqueta": "Fluidos", "obligatorio": true}, {"id": "c_qxwf8ldy", "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "4. Elementos de emergencia y seguridad", "obligatorio": false}, {"id": "c_8mtvcx18", "tipo": "opcion_unica", "ancho": "tercio", "ayuda": "", "etiqueta": "Tipo de extintor", "opciones": ["PQS", "CO2"], "obligatorio": true}, {"id": "c_ykr21lta", "tipo": "numero", "ancho": "tercio", "ayuda": "", "etiqueta": "Capacidad del extintor (LBS)", "obligatorio": true}, {"id": "c_sl4rckjt", "tipo": "fecha", "ancho": "tercio", "ayuda": "", "etiqueta": "Fecha de vencimiento del extintor", "obligatorio": true, "hoyPorDefecto": false}, {"id": "c_m5norcxi", "tipo": "tabla_verificacion", "ancho": "completo", "ayuda": "", "filas": ["TRIÁNGULOS / CONOS", "LLAVE DE AJUSTE", "GATO", "MANGA DE VIENTO", "LINTERNA", "BOTIQUÍN", "DIM'S (IDENTIFICADOR DE CONDUCTOR)", "CÁMARA DE FATIGA", "CAJA DE HERRAMIENTAS O MALLA DE RESTRICCIÓN", "CHALECOS REFLECTIVOS"], "columnas": ["SI", "NO"], "etiqueta": "Elementos de emergencia", "obligatorio": true}, {"id": "c_idnx0mys", "tipo": "tabla_verificacion", "ancho": "completo", "ayuda": "B = Bueno · M = Malo · N/A = No aplica", "filas": ["LUCES DE ALTA Y BAJAS", "LUCES DE FRENO", "LUCES DE CRUCE O GIRO", "LUCES DE RETROCESO", "LUCES INTERMITENTES", "LUZ DE CABINA", "BOCINA O CORNETA", "ALARMA DE RETROCESO", "AIRE ACONDICIONADO", "LIMPIAPARABRISAS", "INDICADORES DE COMBUSTIBLE Y OTROS"], "columnas": ["B", "M", "N/A"], "etiqueta": "5. Sistema eléctrico", "obligatorio": true}, {"id": "c_w04daz33", "tipo": "tabla_verificacion", "ancho": "completo", "ayuda": "B = Bueno · M = Malo · N/A = No aplica", "filas": ["VELOCÍMETRO / ODÓMETRO", "RADIADOR", "DEPÓSITO DE AGUA DEL MOTOR", "CAÑO DE ESCAPE / SILENCIADOR", "SISTEMA DE DIRECCIÓN"], "columnas": ["B", "M", "N/A"], "etiqueta": "6. Sistema mecánico", "obligatorio": true}, {"id": "c_d16fud31", "tipo": "tabla_verificacion", "ancho": "completo", "ayuda": "B = Bueno · M = Malo · N/A = No aplica", "filas": ["DELANTERO DERECHO", "DELANTERO IZQUIERDO", "TRASERO DERECHO", "TRASERO IZQUIERDO", "REPUESTO 1", "CUÑAS DE SEGURIDAD"], "columnas": ["B", "M", "N/A"], "etiqueta": "7. Neumáticos", "obligatorio": true}, {"id": "c_d260bqkq", "tipo": "tabla_verificacion", "ancho": "completo", "ayuda": "B = Bueno · M = Malo · N/A = No aplica", "filas": ["ASIENTO DEL CONDUCTOR", "ASIENTO DEL COPILOTO / ACOMPAÑANTE", "ASIENTO TRASERO", "TODOS LOS ASIENTOS CON APOYA CABEZA"], "columnas": ["B", "M", "N/A"], "etiqueta": "8. Tapicería", "obligatorio": true}, {"id": "c_l1ug7b3f", "tipo": "tabla_verificacion", "ancho": "completo", "ayuda": "B = Bueno · M = Malo · N/A = No aplica", "filas": ["PARABRISAS", "VIDRIOS PUERTAS DELANTERAS", "VIDRIOS PUERTAS TRASERAS", "VIDRIO TRASERO", "ESPEJOS RETROVISORES LATERALES"], "columnas": ["B", "M", "N/A"], "etiqueta": "9. Cristalería", "obligatorio": true}, {"id": "c_oerd0xpd", "tipo": "tabla_verificacion", "ancho": "completo", "ayuda": "Varios ítems aplican solo a vehículos con remolque: marque N/A cuando no correspondan.", "filas": ["CINTURÓN DE SEGURIDAD DE 3 PUNTOS PARA TODOS LOS OCUPANTES", "ASIENTOS CON REPOSACABEZAS", "RECORDATORIO DE USO DEL CINTURÓN DE SEGURIDAD", "ANCLAJES DE CINTURONES DE SEGURIDAD SEGÚN REQUISITOS DE LA INDUSTRIA", "SISTEMA DE FRENOS ANTIBLOQUEO QUE CUMPLA CON LOS REQUISITOS DE LA INDUSTRIA", "PROTECCIÓN ACTIVA ANTIVUELCO (ARP) EN EL REMOLQUE", "PROTECCIÓN CONTRA VUELCOS SEGÚN LOS REQUISITOS DE LA INDUSTRIA", "LOS NEUMÁTICOS DEBEN SER DEL MISMO TAMAÑO / MISMO FABRICANTE POR EJE", "NEUMÁTICOS ADECUADOS A LA CARGA/VELOCIDAD, INFLADOS CORRECTAMENTE, PROFUNDIDAD MÍNIMA DE LA BANDA DE RODADURA 1,6 MM (75 %)", "INDICADORES DE POSICIÓN EN LAS TUERCAS DE LOS NEUMÁTICOS", "NEUMÁTICOS DELANTEROS CON BANDA DE RODADURA MÍNIMA DE 3,0 MM Y EL MISMO TAMAÑO/MARCA", "GUARDABARROS EN TODOS LOS NEUMÁTICOS", "NO SE PERMITEN NEUMÁTICOS RECONSTRUIDOS (PRINCIPALMENTE EN EL EJE DELANTERO)", "CABINA QUE CUMPLE CON LOS REQUISITOS DE LA INDUSTRIA", "PROTECCIÓN ANTIEMPOTRAMIENTO DELANTERA Y TRASERA PARA EL REMOLQUE", "PROTECCIÓN LATERAL CONTRA COLISIÓN", "VIDRIO DE SEGURIDAD PARA PARABRISAS", "DOS CALZAS PARA RUEDAS", "SISTEMA DE CONTROL ELECTRÓNICO DE ESTABILIDAD", "TODOS LOS ACCESORIOS Y ESCOTILLAS ASEGURADOS SIN FUGAS EN CASO DE VUELCO", "2 EXTINTORES MÍNIMO (UNO DE 2 KG EN CABINA Y OTRO DE 6 KG MÍNIMO EN REMOLQUE)", "CINTURONES DE SEGURIDAD Y SISTEMAS DE RETENCIÓN SEGÚN REQUISITOS DE LA INDUSTRIA", "MÍNIMO 2 PUERTAS (UNA NORMAL Y UNA DE EMERGENCIA)", "PUERTA(S) DE EMERGENCIA CLARAMENTE MARCADAS", "MARCAS REFLECTANTES EN LA PARTE TRASERA Y EN LOS LATERALES", "DIMS SEGÚN CONTRATO", "ALARMA SONORA DE MARCHA ATRÁS"], "columnas": ["SI", "NO", "N/A"], "etiqueta": "10. Especificaciones especiales", "obligatorio": true}, {"id": "c_95qo9nbu", "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "11. Hallazgos y observaciones", "obligatorio": false}, {"id": "c_wzwcoubo", "tipo": "parrafo", "ancho": "completo", "ayuda": "", "etiqueta": "Hallazgos y observaciones", "obligatorio": false}, {"id": "c_a14xhz9w", "tipo": "foto", "ancho": "completo", "ayuda": "", "etiqueta": "Evidencia fotográfica", "maxFotos": 5, "obligatorio": false}, {"id": "c_u16854vn", "tipo": "seccion", "ancho": "completo", "ayuda": "", "etiqueta": "Validación de la inspección", "obligatorio": false}, {"id": "c_h7mghuwa", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Inspector: nombre y apellido", "obligatorio": true}, {"id": "c_tvz7xcra", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Inspector: cédula", "obligatorio": true}, {"id": "c_80r94m4y", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Inspector: cargo", "obligatorio": true}, {"id": "c_2rnvdi8g", "tipo": "firma", "ancho": "completo", "ayuda": "", "etiqueta": "Inspector: firma", "obligatorio": true}, {"id": "c_4txg3xee", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Conductor: nombre y apellido", "obligatorio": true}, {"id": "c_lw4nyyfk", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Conductor: cédula", "obligatorio": true}, {"id": "c_3441r8uh", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Conductor: cargo", "obligatorio": false}, {"id": "c_wq98tzb3", "tipo": "firma", "ancho": "completo", "ayuda": "", "etiqueta": "Conductor: firma", "obligatorio": true}, {"id": "c_qwnmyhnl", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Supervisor: nombre y apellido", "obligatorio": false}, {"id": "c_n0epsyhd", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Supervisor: cédula", "obligatorio": false}, {"id": "c_nw9ejrck", "tipo": "texto", "ancho": "tercio", "ayuda": "", "etiqueta": "Supervisor: cargo", "obligatorio": false}, {"id": "c_i7b95dxh", "tipo": "firma", "ancho": "completo", "ayuda": "", "etiqueta": "Supervisor: firma", "obligatorio": false}]	t	\N	2026-11-02 11:26:38.73479-04	2026-11-02 11:26:38.73479-04	CVC-SST-FT-00	Jun-2026	02	Inspector SIHO	\N
bb9957a8-2f5f-40e3-9eb2-19dfbf39b75a	paramedicos	\N	[{"id": "c_t2dhw5g3", "tipo": "opcion_unica", "ancho": "completo", "ayuda": "", "etiqueta": "a", "opciones": ["Opción 1", "Opción 2"], "obligatorio": true}]	t	fc302815-3960-40c9-83d1-36242f8edace	2026-11-02 21:35:28.125484-04	2026-11-02 21:35:28.125484-04	\N	\N	\N	Paramédico	\N
\.


--
-- PostgreSQL database dump complete
--

\unrestrict ccvdIwEuEGiZLFwfqNDyj6O5LxSAXI2ZwdzXh6dwaDXxmsLpvznVhveU7IEqe8g


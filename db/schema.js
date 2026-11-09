import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// 1. Usuarios / Inspectores
// rol: ver db/roles.js (Inspector SIHO, Paramédico, Rescatista, Administración).
// esAdmin: puede ver todo y asignar cronogramas (independiente del rol).
export const usuarios = pgTable("usuarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Identificador estable: nombre de la pestaña del Excel CVC-SST-FT-11 (p. ej. "ENGLIS H").
  alias: varchar("alias", { length: 50 }).unique(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  correo: varchar("correo", { length: 150 }).unique(),
  rol: varchar("rol", { length: 50 }).notNull(),
  cargo: varchar("cargo", { length: 100 }),
  activo: boolean("activo").default(true),
  // Acceso al sistema. claveHash null = el usuario aún no puede iniciar sesión.
  claveHash: varchar("clave_hash", { length: 255 }),
  esAdmin: boolean("es_admin").notNull().default(false),
  debeCambiarClave: boolean("debe_cambiar_clave").notNull().default(true),
  intentosFallidos: integer("intentos_fallidos").notNull().default(0),
  bloqueadoHasta: timestamp("bloqueado_hasta", { withTimezone: true }),
  ultimoAcceso: timestamp("ultimo_acceso", { withTimezone: true }),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

// 2. Plantillas maestras de inspección (filas del formato CVC-SST-FT-11)
// rol: Inspector SIHO, Paramédico, Rescatista o General (común a todos).
export const plantillasInspeccion = pgTable(
  "plantillas_inspeccion",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // N° tal como figura en el Excel (puede repetirse, por eso existe `orden`).
    numero: integer("numero"),
    // Posición de la fila dentro de la hoja del rol; define el orden de la matriz.
    orden: integer("orden").notNull().default(0),
    codigoFormato: varchar("codigo_formato", { length: 50 }).notNull(),
    elementoNombre: varchar("elemento_nombre", { length: 255 }).notNull(),
    rol: varchar("rol", { length: 50 }).notNull(),
    periodicidad: varchar("periodicidad", { length: 120 }).default("Semanal"),
    cantidadPlanificada: integer("cantidad_planificada").default(1),
    activo: boolean("activo").default(true),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  },
  (table) => [unique("plantilla_rol_orden").on(table.rol, table.orden)]
);

// 3. Registros de la matriz mensual (una fila por usuario + plantilla + día)
// planificado: 1 si la fila superior tiene "P".
// ejecutado: número de inspecciones realizadas ese día (fila inferior).
// noEjecutado: 1 si la fila inferior tiene "N" (planificada y no ejecutada).
export const registrosCronograma = pgTable(
  "registros_cronograma",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: uuid("usuario_id")
      .references(() => usuarios.id, { onDelete: "cascade" })
      .notNull(),
    plantillaId: uuid("plantilla_id")
      .references(() => plantillasInspeccion.id, { onDelete: "cascade" })
      .notNull(),
    fecha: date("fecha").notNull(),
    mes: varchar("mes", { length: 20 }).notNull(),
    anio: integer("anio").default(2026).notNull(),
    semanaMes: varchar("semana_mes", { length: 20 }).notNull(),
    planificado: integer("planificado").default(0),
    ejecutado: integer("ejecutado").default(0),
    noEjecutado: integer("no_ejecutado").default(0),
    // Hallazgo u observación que registra el inspector al ejecutar.
    observacion: text("observacion"),
    actualizadoPor: uuid("actualizado_por").references(() => usuarios.id, { onDelete: "set null" }),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("unicidad_registro").on(table.usuarioId, table.plantillaId, table.fecha),
  ]
);

// 4. Formularios creados por el administrador (constructor tipo Tally).
// campos: arreglo JSON [{ id, tipo, etiqueta, ayuda, obligatorio, opciones }]
// tipos: ver modules/formularios/campos.js
export const formularios = pgTable("formularios", {
  id: uuid("id").defaultRandom().primaryKey(),
  titulo: varchar("titulo", { length: 200 }).notNull(),
  descripcion: text("descripcion"),
  // Encabezado del formato oficial (p. ej. "CVC-SST-FT-00" · "Jun-2026" · "02").
  codigo: varchar("codigo", { length: 50 }),
  emision: varchar("emision", { length: 30 }),
  revision: varchar("revision", { length: 20 }),
  // Rol al que va dirigido (Inspector SIHO, Paramédico o Rescatista): solo se asigna a ese rol.
  // null = formulario anterior a esta regla; debe elegirse el rol antes de asignarlo.
  rol: varchar("rol", { length: 50 }),
  // Formato del cronograma vinculado (opcional). Si existe, cada "P" de ese formato en el
  // cronograma de un inspector genera una asignación de este formulario con límite ese día.
  plantillaId: uuid("plantilla_id")
    .references(() => plantillasInspeccion.id, { onDelete: "set null" })
    .unique(),
  campos: jsonb("campos").notNull().default([]),
  activo: boolean("activo").notNull().default(true),
  creadoPor: uuid("creado_por").references(() => usuarios.id, { onDelete: "set null" }),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow(),
});

// 5. Asignación de un formulario a un inspector (una asignación = una respuesta esperada).
// estado: "pendiente" | "completada"
export const asignacionesFormulario = pgTable(
  "asignaciones_formulario",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formularioId: uuid("formulario_id")
      .references(() => formularios.id, { onDelete: "cascade" })
      .notNull(),
    usuarioId: uuid("usuario_id")
      .references(() => usuarios.id, { onDelete: "cascade" })
      .notNull(),
    fechaLimite: date("fecha_limite"),
    nota: varchar("nota", { length: 300 }),
    estado: varchar("estado", { length: 20 }).notNull().default("pendiente"),
    asignadoPor: uuid("asignado_por").references(() => usuarios.id, { onDelete: "set null" }),
    // "manual" (la asignó un administrador) | "cronograma" (generada por una "P" del cronograma).
    origen: varchar("origen", { length: 20 }).notNull().default("manual"),
    // Celda del cronograma que la generó (solo origen "cronograma"). Al enviar el formulario se
    // registra la ejecución en esa celda. Única: una "P" genera como máximo una asignación.
    registroId: uuid("registro_id")
      .references(() => registrosCronograma.id, { onDelete: "set null" })
      .unique(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
    completadaEn: timestamp("completada_en", { withTimezone: true }),
  },
  (table) => [
    index("asignacion_usuario_estado").on(table.usuarioId, table.estado),
    index("asignacion_formulario").on(table.formularioId),
  ]
);

// 6. Respuesta enviada por el inspector. Guarda una copia de los campos tal como estaban
// al responder, para que editar el formulario después no altere respuestas antiguas.
export const respuestasFormulario = pgTable("respuestas_formulario", {
  id: uuid("id").defaultRandom().primaryKey(),
  asignacionId: uuid("asignacion_id")
    .references(() => asignacionesFormulario.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  formularioId: uuid("formulario_id")
    .references(() => formularios.id, { onDelete: "cascade" })
    .notNull(),
  usuarioId: uuid("usuario_id")
    .references(() => usuarios.id, { onDelete: "cascade" })
    .notNull(),
  camposSnapshot: jsonb("campos_snapshot").notNull(),
  respuestas: jsonb("respuestas").notNull(),
  enviadaEn: timestamp("enviada_en", { withTimezone: true }).defaultNow(),
});

// 7. Fotos subidas en campos de tipo "foto". Se suben una por una mientras se llena el
// formulario (ligadas a la asignación) y quedan asociadas a la respuesta al enviarla.
// El archivo vive en disco (ARCHIVOS_DIR); aquí solo la ruta relativa y metadatos.
export const archivosFormulario = pgTable(
  "archivos_formulario",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    asignacionId: uuid("asignacion_id")
      .references(() => asignacionesFormulario.id, { onDelete: "cascade" })
      .notNull(),
    campoId: varchar("campo_id", { length: 40 }).notNull(),
    ruta: varchar("ruta", { length: 300 }).notNull(),
    tipoMime: varchar("tipo_mime", { length: 50 }).notNull(),
    tamano: integer("tamano").notNull(),
    subidoPor: uuid("subido_por").references(() => usuarios.id, { onDelete: "set null" }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("archivo_asignacion").on(table.asignacionId)]
);

// 8. Notificaciones a administradores cuando un inspector no completa una inspección
// (marcada como "N" o vencida sin ejecutar).
export const notificaciones = pgTable(
  "notificaciones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tipo: varchar("tipo", { length: 50 }).notNull().default("inspeccion_no_ejecutada"),
    titulo: varchar("titulo", { length: 255 }).notNull(),
    mensaje: text("mensaje").notNull(),
    inspectorId: uuid("inspector_id")
      .references(() => usuarios.id, { onDelete: "cascade" }),
    registroId: uuid("registro_id")
      .references(() => registrosCronograma.id, { onDelete: "cascade" }),
    asignacionId: uuid("asignacion_id")
      .references(() => asignacionesFormulario.id, { onDelete: "cascade" }),
    datos: jsonb("datos"),
    adminId: uuid("admin_id")
      .references(() => usuarios.id, { onDelete: "cascade" }),
    leida: boolean("leida").notNull().default(false),
    leidaEn: timestamp("leida_en", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("notificacion_leida").on(table.leida),
    index("notificacion_inspector").on(table.inspectorId),
    index("notificacion_creado_en").on(table.creadoEn),
  ]
);

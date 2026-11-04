CREATE TABLE "archivos_formulario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asignacion_id" uuid NOT NULL,
	"campo_id" varchar(40) NOT NULL,
	"ruta" varchar(300) NOT NULL,
	"tipo_mime" varchar(50) NOT NULL,
	"tamano" integer NOT NULL,
	"subido_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asignaciones_formulario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formulario_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"fecha_limite" date,
	"nota" varchar(300),
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"asignado_por" uuid,
	"origen" varchar(20) DEFAULT 'manual' NOT NULL,
	"registro_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now(),
	"completada_en" timestamp with time zone,
	CONSTRAINT "asignaciones_formulario_registro_id_unique" UNIQUE("registro_id")
);
--> statement-breakpoint
CREATE TABLE "formularios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descripcion" text,
	"codigo" varchar(50),
	"emision" varchar(30),
	"revision" varchar(20),
	"rol" varchar(50),
	"plantilla_id" uuid,
	"campos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now(),
	"actualizado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "formularios_plantilla_id_unique" UNIQUE("plantilla_id")
);
--> statement-breakpoint
CREATE TABLE "plantillas_inspeccion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" integer,
	"orden" integer DEFAULT 0 NOT NULL,
	"codigo_formato" varchar(50) NOT NULL,
	"elemento_nombre" varchar(255) NOT NULL,
	"rol" varchar(50) NOT NULL,
	"periodicidad" varchar(120) DEFAULT 'Semanal',
	"cantidad_planificada" integer DEFAULT 1,
	"activo" boolean DEFAULT true,
	"creado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "plantilla_rol_orden" UNIQUE("rol","orden")
);
--> statement-breakpoint
CREATE TABLE "registros_cronograma" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"plantilla_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"mes" varchar(20) NOT NULL,
	"anio" integer DEFAULT 2026 NOT NULL,
	"semana_mes" varchar(20) NOT NULL,
	"planificado" integer DEFAULT 0,
	"ejecutado" integer DEFAULT 0,
	"no_ejecutado" integer DEFAULT 0,
	"observacion" text,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unicidad_registro" UNIQUE("usuario_id","plantilla_id","fecha")
);
--> statement-breakpoint
CREATE TABLE "respuestas_formulario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asignacion_id" uuid NOT NULL,
	"formulario_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"campos_snapshot" jsonb NOT NULL,
	"respuestas" jsonb NOT NULL,
	"enviada_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "respuestas_formulario_asignacion_id_unique" UNIQUE("asignacion_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alias" varchar(50),
	"nombre" varchar(100) NOT NULL,
	"correo" varchar(150),
	"rol" varchar(50) NOT NULL,
	"cargo" varchar(100),
	"activo" boolean DEFAULT true,
	"clave_hash" varchar(255),
	"es_admin" boolean DEFAULT false NOT NULL,
	"debe_cambiar_clave" boolean DEFAULT true NOT NULL,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	"ultimo_acceso" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now(),
	CONSTRAINT "usuarios_alias_unique" UNIQUE("alias"),
	CONSTRAINT "usuarios_correo_unique" UNIQUE("correo")
);
--> statement-breakpoint
ALTER TABLE "archivos_formulario" ADD CONSTRAINT "archivos_formulario_asignacion_id_asignaciones_formulario_id_fk" FOREIGN KEY ("asignacion_id") REFERENCES "public"."asignaciones_formulario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archivos_formulario" ADD CONSTRAINT "archivos_formulario_subido_por_usuarios_id_fk" FOREIGN KEY ("subido_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignaciones_formulario" ADD CONSTRAINT "asignaciones_formulario_formulario_id_formularios_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignaciones_formulario" ADD CONSTRAINT "asignaciones_formulario_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignaciones_formulario" ADD CONSTRAINT "asignaciones_formulario_asignado_por_usuarios_id_fk" FOREIGN KEY ("asignado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignaciones_formulario" ADD CONSTRAINT "asignaciones_formulario_registro_id_registros_cronograma_id_fk" FOREIGN KEY ("registro_id") REFERENCES "public"."registros_cronograma"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formularios" ADD CONSTRAINT "formularios_plantilla_id_plantillas_inspeccion_id_fk" FOREIGN KEY ("plantilla_id") REFERENCES "public"."plantillas_inspeccion"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formularios" ADD CONSTRAINT "formularios_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_cronograma" ADD CONSTRAINT "registros_cronograma_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_cronograma" ADD CONSTRAINT "registros_cronograma_plantilla_id_plantillas_inspeccion_id_fk" FOREIGN KEY ("plantilla_id") REFERENCES "public"."plantillas_inspeccion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros_cronograma" ADD CONSTRAINT "registros_cronograma_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuestas_formulario" ADD CONSTRAINT "respuestas_formulario_asignacion_id_asignaciones_formulario_id_fk" FOREIGN KEY ("asignacion_id") REFERENCES "public"."asignaciones_formulario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuestas_formulario" ADD CONSTRAINT "respuestas_formulario_formulario_id_formularios_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuestas_formulario" ADD CONSTRAINT "respuestas_formulario_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "archivo_asignacion" ON "archivos_formulario" USING btree ("asignacion_id");--> statement-breakpoint
CREATE INDEX "asignacion_usuario_estado" ON "asignaciones_formulario" USING btree ("usuario_id","estado");--> statement-breakpoint
CREATE INDEX "asignacion_formulario" ON "asignaciones_formulario" USING btree ("formulario_id");
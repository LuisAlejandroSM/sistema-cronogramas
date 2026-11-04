"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ROL_GENERAL, ROLES_OPERATIVOS } from "@/db/roles";
import { guardarFormulario } from "../actions";
import {
  campoVacio,
  COLUMNAS_PREDEFINIDAS,
  MAX_COLUMNAS_TABLA,
  MAX_FILAS_TABLA,
  MAX_FOTOS_POR_CAMPO,
  MAX_OPCIONES,
  nuevoIdCampo,
  TIPOS_CAMPO,
} from "../campos";
import CampoFormulario from "./CampoFormulario";
import { CLASE_REJILLA } from "./diseno";
import EncabezadoFormato from "./EncabezadoFormato";

// Ítems que se muestran de una lista de verificación cuando su tarjeta no está seleccionada.
const FILAS_RESUMEN = 6;

const TRAZOS = {
  mas: "M12 5v14M5 12h14",
  seccion: "M4 5h16v5H4zM4 14h16M4 19h10",
  lista: "M10 6h10M10 12h10M10 18h10M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5",
  foto: "M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8ZM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  firma: "M3 17c2.5-3.5 4.5-6 6-4.5s-2 5.5 0 6 4-5 6-5 1 3 3 3 2.5-1.5 3-2M3 21h18",
  copiar: "M9 9h11v11H9zM5 15H4V4h11v1",
  borrar: "M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 13h10l1-13",
  arriba: "M12 19V5M6 11l6-6 6 6",
  abajo: "M12 5v14M6 13l6 6 6-6",
  cerrar: "M6 6l12 12M18 6 6 18",
};

function Icono({ nombre, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

function BotonIcono({ icono, etiqueta, onClick, disabled = false, peligro = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={etiqueta}
      aria-label={etiqueta}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition disabled:opacity-30 ${
        peligro ? "text-slate-500 hover:bg-red-50 hover:text-red-600" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      <Icono nombre={icono} />
    </button>
  );
}

function Interruptor({ activo, onCambiar, etiqueta }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
      {etiqueta}
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={() => onCambiar(!activo)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${activo ? "bg-blue-600" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${activo ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

// Cómo se verá la respuesta (solo ilustrativo, como en Google Forms).
function RespuestaSimulada({ texto, ancho = "sm:w-1/2" }) {
  return <div className={`w-full border-b border-dotted border-slate-300 py-2 text-sm text-slate-400 ${ancho}`}>{texto}</div>;
}

function Marcador({ tipo, indice }) {
  if (tipo === "numero") return <span className="w-7 shrink-0 text-right text-xs tabular-nums text-slate-400">{indice + 1}.</span>;
  return <span className={`h-4 w-4 shrink-0 border-2 border-slate-300 ${tipo === "radio" ? "rounded-full" : "rounded-sm"}`} />;
}

/**
 * Lista editable de textos (opciones o ítems), una fila por elemento como en Google Forms.
 * Enter agrega una fila debajo, Retroceso en una fila vacía la quita y pegar varias líneas
 * crea una fila por línea (sirve para pegar la lista copiada del formato en Word).
 */
function EditorLista({ items, onCambiar, marcador, textoFila, textoAgregar, maximo }) {
  const refs = useRef([]);
  const foco = useRef(null);

  // Mueve el cursor a la fila indicada después de que React pinta la lista nueva.
  useEffect(() => {
    if (foco.current === null) return;
    const el = refs.current[foco.current];
    foco.current = null;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  });

  const conteo = items.reduce((acc, t) => {
    const clave = t.trim().toLocaleLowerCase("es");
    if (clave) acc.set(clave, (acc.get(clave) ?? 0) + 1);
    return acc;
  }, new Map());

  const insertarDespues = (i, textos) => {
    const espacio = Math.max(0, maximo - items.length);
    const nuevos = textos.slice(0, espacio);
    if (nuevos.length === 0) return;
    foco.current = i + nuevos.length;
    onCambiar([...items.slice(0, i + 1), ...nuevos, ...items.slice(i + 1)]);
  };

  const quitar = (i) => {
    foco.current = Math.max(0, i - 1);
    onCambiar(items.filter((_, j) => j !== i));
  };

  const pegar = (e, i) => {
    const lineas = e.clipboardData
      .getData("text")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lineas.length < 2) return;
    e.preventDefault();
    if (i === null) {
      insertarDespues(items.length - 1, lineas);
    } else if (!items[i].trim()) {
      const espacio = Math.max(0, maximo - items.length + 1);
      const nuevos = lineas.slice(0, espacio);
      foco.current = i + nuevos.length - 1;
      onCambiar([...items.slice(0, i), ...nuevos, ...items.slice(i + 1)]);
    } else {
      insertarDespues(i, lineas);
    }
  };

  return (
    <div className="space-y-0.5">
      {items.map((texto, i) => {
        const repetida = texto.trim() && conteo.get(texto.trim().toLocaleLowerCase("es")) > 1;
        return (
          <div key={i} className="group flex items-center gap-3">
            <Marcador tipo={marcador} indice={i} />
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={texto}
              maxLength={300}
              placeholder={`${textoFila} ${i + 1}`}
              onChange={(e) => onCambiar(items.map((t, j) => (j === i ? e.target.value : t)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertarDespues(i, [""]);
                } else if (e.key === "Backspace" && texto === "" && items.length > 1) {
                  e.preventDefault();
                  quitar(i);
                }
              }}
              onPaste={(e) => pegar(e, i)}
              className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1.5 text-sm text-slate-800 hover:border-slate-200 focus:border-blue-600 focus:outline-none"
            />
            {repetida && <span className="text-[11px] font-semibold text-amber-600">Repetida</span>}
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label={`Quitar ${textoFila.toLowerCase()} ${i + 1}`}
                title="Quitar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Icono nombre="cerrar" className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
      {items.length < maximo && (
        <div className="flex items-center gap-3">
          <Marcador tipo={marcador} indice={items.length} />
          <input
            value=""
            placeholder={textoAgregar}
            onChange={(e) => insertarDespues(items.length - 1, [e.target.value])}
            onPaste={(e) => pegar(e, null)}
            className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1.5 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-200 focus:border-blue-600 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

// Columnas de una lista de verificación: juegos predefinidos o personalizadas.
function EditorColumnas({ columnas, onCambiar }) {
  const actual = columnas.join(" / ");
  const predefinida = COLUMNAS_PREDEFINIDAS.find((c) => c.join(" / ") === actual);
  const [personalizado, setPersonalizado] = useState(!predefinida);
  const claseBoton = (activo) =>
    `rounded-full border px-3 py-1 text-xs font-semibold transition ${
      activo ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3">
      <span className="block text-xs font-semibold text-slate-600">Columnas para marcar</span>
      <div className="flex flex-wrap gap-1.5">
        {COLUMNAS_PREDEFINIDAS.map((c) => (
          <button
            key={c.join("/")}
            type="button"
            onClick={() => {
              setPersonalizado(false);
              onCambiar([...c]);
            }}
            className={claseBoton(!personalizado && c.join(" / ") === actual)}
          >
            {c.join(" / ")}
          </button>
        ))}
        <button type="button" onClick={() => setPersonalizado(true)} className={claseBoton(personalizado)}>
          Personalizadas…
        </button>
      </div>
      {personalizado && (
        <input
          value={columnas.join(", ")}
          onChange={(e) => onCambiar(e.target.value.split(",").map((x) => x.trimStart()).slice(0, MAX_COLUMNAS_TABLA))}
          placeholder="Separadas por coma. Ej.: Bueno, Regular, Malo"
          className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
        />
      )}
    </div>
  );
}

// Cambia el tipo de una pregunta conservando lo que se pueda (texto, ayuda, opciones).
function convertirCampo(campo, tipo) {
  const nuevo = { ...campoVacio(tipo), id: campo.id, etiqueta: campo.etiqueta, ayuda: campo.ayuda, ancho: campo.ancho };
  if (TIPOS_CAMPO[tipo].esPregunta && TIPOS_CAMPO[campo.tipo].esPregunta) nuevo.obligatorio = campo.obligatorio;
  const conOpciones = (t) => t === "opcion_unica" || t === "opcion_multiple";
  if (conOpciones(tipo) && conOpciones(campo.tipo)) nuevo.opciones = campo.opciones;
  if (conOpciones(tipo) && campo.tipo === "tabla_verificacion") nuevo.opciones = campo.filas.slice(0, MAX_OPCIONES);
  if (tipo === "tabla_verificacion" && conOpciones(campo.tipo)) nuevo.filas = campo.opciones;
  return nuevo;
}

// Limpia líneas vacías para la vista previa (el servidor normaliza al guardar).
function paraVistaPrevia(c) {
  const limpio = { ...c };
  if (c.opciones) limpio.opciones = [...new Set(c.opciones.map((o) => o.trim()).filter(Boolean))];
  if (c.filas) limpio.filas = [...new Set(c.filas.map((o) => o.trim()).filter(Boolean))];
  if (c.columnas) limpio.columnas = [...new Set(c.columnas.map((o) => o.trim()).filter(Boolean))];
  return limpio;
}

/** Contenido de la tarjeta seleccionada: todo lo que se puede editar de la pregunta. */
function EdicionCampo({ campo, onCambiar, onCambiarTipo }) {
  const conOpciones = campo.tipo === "opcion_unica" || campo.tipo === "opcion_multiple";
  const esSeccion = campo.tipo === "seccion";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <input
          id={`etiqueta-${campo.id}`}
          value={campo.etiqueta}
          maxLength={300}
          onChange={(e) => onCambiar({ etiqueta: e.target.value })}
          placeholder={esSeccion ? "Título de la sección" : campo.tipo === "tabla_verificacion" ? "Título de la lista" : "Pregunta"}
          className={`min-w-0 flex-1 rounded-t-md border-b-2 border-slate-300 bg-slate-50 px-3 py-3 text-slate-900 focus:border-blue-600 focus:outline-none ${
            esSeccion ? "text-lg font-bold" : "text-base"
          }`}
        />
        <select
          value={campo.tipo}
          onChange={(e) => onCambiarTipo(e.target.value)}
          aria-label="Tipo de pregunta"
          className="rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none sm:w-56"
        >
          {Object.entries(TIPOS_CAMPO).map(([tipo, def]) => (
            <option key={tipo} value={tipo}>
              {def.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <input
        value={campo.ayuda}
        maxLength={500}
        onChange={(e) => onCambiar({ ayuda: e.target.value })}
        placeholder={esSeccion ? "Descripción de la sección (opcional)" : "Descripción o indicación para el inspector (opcional)"}
        className="w-full border-b border-slate-200 bg-transparent px-1 py-1.5 text-sm text-slate-600 focus:border-blue-600 focus:outline-none"
      />

      {campo.tipo === "texto" && <RespuestaSimulada texto="Texto de respuesta corta" />}
      {campo.tipo === "parrafo" && <RespuestaSimulada texto="Texto de respuesta larga" ancho="sm:w-full" />}
      {campo.tipo === "numero" && <RespuestaSimulada texto="Número" ancho="sm:w-1/3" />}
      {campo.tipo === "fecha" && (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <RespuestaSimulada texto="Día, mes, año" ancho="sm:w-48" />
          <Interruptor
            etiqueta="Llenar con la fecha de hoy"
            activo={campo.hoyPorDefecto === true}
            onCambiar={(v) => onCambiar({ hoyPorDefecto: v })}
          />
        </div>
      )}
      {campo.tipo === "si_no" && (
        <div className="space-y-2">
          {["Sí", "No"].map((o) => (
            <div key={o} className="flex items-center gap-3 text-sm text-slate-700">
              <Marcador tipo="radio" />
              {o}
            </div>
          ))}
        </div>
      )}
      {conOpciones && (
        <EditorLista
          items={campo.opciones}
          onCambiar={(opciones) => onCambiar({ opciones })}
          marcador={campo.tipo === "opcion_unica" ? "radio" : "check"}
          textoFila="Opción"
          textoAgregar="Agregar opción"
          maximo={MAX_OPCIONES}
        />
      )}
      {campo.tipo === "tabla_verificacion" && (
        <div className="space-y-3">
          <EditorLista
            items={campo.filas}
            onCambiar={(filas) => onCambiar({ filas })}
            marcador="numero"
            textoFila="Ítem"
            textoAgregar="Agregar ítem (o pegue la lista copiada de Word)"
            maximo={MAX_FILAS_TABLA}
          />
          <p className="text-xs text-slate-400">{campo.filas.filter((f) => f.trim()).length} ítem(s) · cada ítem se marca con una columna.</p>
          <EditorColumnas columnas={campo.columnas} onCambiar={(columnas) => onCambiar({ columnas })} />
        </div>
      )}
      {campo.tipo === "foto" && (
        <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          El inspector podrá subir hasta
          <input
            type="number"
            min={1}
            max={MAX_FOTOS_POR_CAMPO}
            value={campo.maxFotos}
            onChange={(e) => onCambiar({ maxFotos: Number(e.target.value) })}
            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none"
          />
          foto(s) desde la cámara o la galería.
        </label>
      )}
      {campo.tipo === "firma" && (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400">
          El inspector firmará aquí con el dedo
        </div>
      )}
    </div>
  );
}

// Fila de configuración del encabezado: etiqueta a la izquierda, control a la derecha.
function FilaAjuste({ etiqueta, ayuda, children }) {
  return (
    <div className="flex flex-col gap-2 px-6 py-3.5 sm:flex-row sm:items-start sm:gap-6">
      <div className="shrink-0 sm:w-32 sm:pt-1.5">
        <span className="text-sm font-medium text-slate-700">{etiqueta}</span>
      </div>
      <div className="min-w-0 flex-1">
        {children}
        {ayuda && <p className="mt-1.5 text-xs text-slate-500">{ayuda}</p>}
      </div>
    </div>
  );
}

/**
 * Constructor de formularios al estilo Google Forms para el administrador.
 * @param {{ formulario: { id: string, titulo: string, descripcion: string|null, codigo?: string|null,
 *           emision?: string|null, revision?: string|null, rol?: string|null, plantillaId?: string|null,
 *           campos: object[] } | null,
 *           formatos: { id: string, nombre: string, codigo: string, rol: string, periodicidad: string,
 *           vinculadoA: { id: string, titulo: string } | null }[] }} props
 */
export default function EditorFormulario({ formulario, formatos = [] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [titulo, setTitulo] = useState(formulario?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(formulario?.descripcion ?? "");
  const [codigo, setCodigo] = useState(formulario?.codigo ?? "");
  const [emision, setEmision] = useState(formulario?.emision ?? "");
  const [revision, setRevision] = useState(formulario?.revision ?? "");
  // Rol al que va dirigido: decide a quién se puede asignar.
  const [rol, setRol] = useState(formulario?.rol ?? "");
  // Formato del cronograma vinculado: cada "P" de ese formato genera una asignación de este formulario.
  const [plantillaId, setPlantillaId] = useState(formulario?.plantillaId ?? "");
  // Un formulario nuevo empieza con una pregunta, como en Google Forms.
  const [campos, setCampos] = useState(() => (formulario?.campos?.length ? formulario.campos : [campoVacio("opcion_unica")]));
  const [activoId, setActivoId] = useState(() => (formulario?.id ? null : campos[0]?.id ?? null));
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [estado, setEstado] = useState({ tipo: "idle", texto: "" });
  // Arrastrar para reordenar: solo se activa al tomar la tarjeta por su asa.
  const [arrastrable, setArrastrable] = useState(null);
  const [arrastre, setArrastre] = useState(null);
  const enfocar = useRef(null);

  // Avisa antes de salir si hay cambios sin guardar.
  useEffect(() => {
    if (!sucio) return undefined;
    const alSalir = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [sucio]);

  // Lleva el cursor a la pregunta recién agregada o duplicada.
  useEffect(() => {
    if (!enfocar.current) return;
    const id = enfocar.current;
    enfocar.current = null;
    document.getElementById(`tarjeta-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById(`etiqueta-${id}`)?.focus({ preventScroll: true });
  });

  const cambiar = (fn) => {
    fn();
    setSucio(true);
    if (estado.tipo !== "idle") setEstado({ tipo: "idle", texto: "" });
  };

  const actualizarCampo = (id, cambio) => cambiar(() => setCampos((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambio } : c))));
  const cambiarTipo = (id, tipo) => cambiar(() => setCampos((prev) => prev.map((c) => (c.id === id ? convertirCampo(c, tipo) : c))));

  const moverCampo = (desde, hasta) => {
    if (hasta < 0 || hasta >= campos.length || desde === hasta) return;
    cambiar(() =>
      setCampos((prev) => {
        const lista = [...prev];
        const [c] = lista.splice(desde, 1);
        lista.splice(hasta, 0, c);
        return lista;
      })
    );
  };

  // Inserta debajo de la tarjeta seleccionada (o al final) y la deja seleccionada.
  const insertar = (nuevo) => {
    const i = campos.findIndex((c) => c.id === activoId);
    const posicion = i === -1 ? campos.length : i + 1;
    enfocar.current = nuevo.id;
    setActivoId(nuevo.id);
    cambiar(() => setCampos((prev) => [...prev.slice(0, posicion), nuevo, ...prev.slice(posicion)]));
  };

  const duplicarCampo = (c) => insertar({ ...structuredClone(c), id: nuevoIdCampo() });

  const eliminarCampo = (id) => {
    const i = campos.findIndex((c) => c.id === id);
    const vecino = campos[i + 1] ?? campos[i - 1] ?? null;
    setActivoId(vecino?.id ?? null);
    cambiar(() => setCampos((prev) => prev.filter((c) => c.id !== id)));
  };

  const soltar = () => {
    if (!arrastre) return;
    const desde = campos.findIndex((c) => c.id === arrastre.id);
    const hasta = arrastre.destino > desde ? arrastre.destino - 1 : arrastre.destino;
    moverCampo(desde, hasta);
    setArrastre(null);
    setArrastrable(null);
  };

  const guardar = () => {
    startTransition(async () => {
      try {
        const res = await guardarFormulario({
          id: formulario?.id,
          titulo,
          rol,
          plantillaId: plantillaId || null,
          descripcion,
          codigo,
          emision,
          revision,
          campos,
        });
        if (!res?.success) {
          setEstado({ tipo: "error", texto: res?.error ?? "No se pudo guardar." });
          return;
        }
        setSucio(false);
        setEstado({
          tipo: "ok",
          texto: res.asignacionesCreadas
            ? `Guardado · ${res.asignacionesCreadas} asignación(es) creadas desde el cronograma.`
            : "Formulario guardado.",
        });
        if (!formulario?.id) router.replace(`/formularios/${res.id}/editar`);
      } catch {
        setEstado({ tipo: "error", texto: "Sin conexión con el servidor." });
      }
    });
  };

  const totalPreguntas = campos.filter((c) => TIPOS_CAMPO[c.tipo].esPregunta).length;

  // Formatos que se pueden vincular: los del rol elegido y los comunes ("General").
  const formatosDelRol = formatos.filter((f) => f.rol === rol || f.rol === ROL_GENERAL);
  const formatoElegido = formatos.find((f) => f.id === plantillaId) ?? null;
  const elegirRol = (r) =>
    cambiar(() => {
      setRol(r);
      // Si el formato vinculado no es de ese rol, se desvincula.
      if (formatoElegido && formatoElegido.rol !== r && formatoElegido.rol !== ROL_GENERAL) setPlantillaId("");
    });

  const herramientas = [
    { icono: "mas", etiqueta: "Agregar pregunta", tipo: "opcion_unica" },
    { icono: "seccion", etiqueta: "Agregar sección", tipo: "seccion" },
    { icono: "lista", etiqueta: "Agregar lista de verificación", tipo: "tabla_verificacion" },
    { icono: "foto", etiqueta: "Agregar foto", tipo: "foto" },
    { icono: "firma", etiqueta: "Agregar firma", tipo: "firma" },
  ];

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:top-2">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 p-1 text-sm font-semibold">
            {[
              [false, "Editar"],
              [true, "Vista previa"],
            ].map(([valor, etiqueta]) => (
              <button
                key={etiqueta}
                type="button"
                onClick={() => setVistaPrevia(valor)}
                aria-pressed={vistaPrevia === valor}
                className={`rounded-md px-3 py-1 ${vistaPrevia === valor ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
          <span className="hidden text-xs text-slate-500 sm:inline">{totalPreguntas} pregunta(s)</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            aria-live="polite"
            className={`text-xs font-medium ${
              estado.tipo === "error" ? "text-red-600" : estado.tipo === "ok" ? "text-emerald-700" : sucio ? "text-amber-600" : "text-slate-400"
            }`}
          >
            {estado.texto || (sucio ? "Cambios sin guardar" : formulario?.id ? "Sin cambios" : "")}
          </span>
          <button
            type="button"
            onClick={guardar}
            disabled={isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {isPending ? "Guardando…" : formulario?.id ? "Guardar cambios" : "Crear formulario"}
          </button>
        </div>
      </div>

      {vistaPrevia ? (
        <div className="mx-auto max-w-3xl space-y-3">
          <EncabezadoFormato titulo={titulo} descripcion={descripcion} codigo={codigo} emision={emision} revision={revision} />
          <div className={CLASE_REJILLA}>
            {campos.map((c) => (
              <CampoFormulario key={c.id} campo={paraVistaPrevia(c)} deshabilitado />
            ))}
          </div>
          {campos.length === 0 && <p className="text-center text-sm text-slate-500">Aún no hay preguntas.</p>}
        </div>
      ) : (
        <div className="mx-auto grid max-w-[54rem] gap-3 lg:grid-cols-[minmax(0,1fr)_3.25rem]">
          <div className="min-w-0 space-y-3">
            {/* Encabezado del formulario */}
            <div className="overflow-hidden rounded-xl border border-slate-200 border-t-[10px] border-t-marca bg-white shadow-sm">
              <div className="space-y-3 px-6 pb-5 pt-4">
                {/* Textareas que crecen con el contenido: el título largo se ve completo en el celular. */}
                <textarea
                  rows={1}
                  value={titulo}
                  maxLength={200}
                  onChange={(e) => cambiar(() => setTitulo(e.target.value.replace(/\n/g, " ")))}
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                  placeholder="Título del formulario"
                  aria-label="Título del formulario"
                  className="field-sizing-content w-full resize-none border-b border-transparent bg-transparent py-1 text-2xl font-bold text-slate-900 placeholder:text-slate-400 hover:border-slate-200 focus:border-blue-600 focus:outline-none sm:text-3xl"
                />
                <textarea
                  rows={1}
                  maxLength={2000}
                  value={descripcion}
                  onChange={(e) => cambiar(() => setDescripcion(e.target.value))}
                  placeholder="Descripción o instrucciones del formulario"
                  aria-label="Descripción del formulario"
                  className="field-sizing-content min-h-9 w-full resize-none border-b border-transparent bg-transparent py-1 text-sm text-slate-700 placeholder:text-slate-400 hover:border-slate-200 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                <FilaAjuste
                  etiqueta="Dirigido a"
                  ayuda={rol ? `Solo se podrá asignar a personal con rol ${rol}.` : "Obligatorio: elija un rol para poder asignarlo."}
                >
                  <div role="radiogroup" aria-label="Dirigido a" className="flex flex-wrap gap-1.5">
                    {ROLES_OPERATIVOS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={rol === r}
                        onClick={() => elegirRol(r)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          rol === r ? "bg-tinta text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </FilaAjuste>

                <FilaAjuste
                  etiqueta="Cronograma"
                  ayuda={
                    formatoElegido
                      ? `Cada "P" de este formato en el cronograma de un inspector le asigna el formulario con fecha límite ese día. Al enviarlo se registra la "E".`
                      : "Sin vincular: el formulario se asigna a mano desde Asignar."
                  }
                >
                  <select
                    value={plantillaId}
                    disabled={!rol}
                    onChange={(e) => cambiar(() => setPlantillaId(e.target.value))}
                    aria-label="Formato del cronograma vinculado"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marca focus:outline-none focus:ring-2 focus:ring-marca/30 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">{rol ? "No vincular (asignación manual)" : "Elija primero el rol"}</option>
                    {formatosDelRol.map((f) => {
                      const ocupado = f.vinculadoA && f.vinculadoA.id !== formulario?.id;
                      return (
                        <option key={f.id} value={f.id} disabled={ocupado}>
                          {f.codigo} · {f.nombre} ({f.periodicidad}){ocupado ? ` — ya usado por «${f.vinculadoA.titulo}»` : ""}
                        </option>
                      );
                    })}
                  </select>
                </FilaAjuste>

                <FilaAjuste etiqueta="Formato oficial">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["Código", codigo, setCodigo, 50, "CVC-SST-FT-00", "font-mono text-xs uppercase sm:text-sm"],
                      ["Emisión", emision, setEmision, 30, "Jun-2026", "text-sm"],
                      ["Revisión", revision, setRevision, 20, "02", "text-sm"],
                    ].map(([etiqueta, valor, setValor, max, ejemplo, extra]) => (
                      <label key={etiqueta} className="block text-xs text-slate-500">
                        {etiqueta}
                        <input
                          value={valor}
                          maxLength={max}
                          onChange={(e) => cambiar(() => setValor(e.target.value))}
                          placeholder={ejemplo}
                          className={`mt-0.5 w-full border-b border-slate-200 bg-transparent py-1 text-slate-800 focus:border-marca focus:outline-none ${extra}`}
                        />
                      </label>
                    ))}
                  </div>
                </FilaAjuste>
              </div>
            </div>

            {/* Tarjetas de preguntas */}
            <ol className="space-y-3">
              {campos.map((c, i) => {
                const activa = c.id === activoId;
                const esSeccion = c.tipo === "seccion";
                const resumen =
                  c.tipo === "tabla_verificacion" && c.filas.length > FILAS_RESUMEN
                    ? { ...paraVistaPrevia(c), filas: paraVistaPrevia(c).filas.slice(0, FILAS_RESUMEN) }
                    : paraVistaPrevia(c);
                const ocultos = c.tipo === "tabla_verificacion" ? paraVistaPrevia(c).filas.length - resumen.filas.length : 0;
                const lineaArriba = arrastre && arrastre.destino === i;
                const lineaAbajo = arrastre && arrastre.destino === campos.length && i === campos.length - 1;

                return (
                  <li
                    key={c.id}
                    id={`tarjeta-${c.id}`}
                    draggable={arrastrable === c.id}
                    onClick={() => !activa && setActivoId(c.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", c.id);
                      setArrastre({ id: c.id, destino: i });
                    }}
                    onDragOver={(e) => {
                      if (!arrastre) return;
                      e.preventDefault();
                      const r = e.currentTarget.getBoundingClientRect();
                      const destino = e.clientY > r.top + r.height / 2 ? i + 1 : i;
                      if (destino !== arrastre.destino) setArrastre({ ...arrastre, destino });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      soltar();
                    }}
                    onDragEnd={() => {
                      setArrastre(null);
                      setArrastrable(null);
                    }}
                    className={`relative scroll-mt-24 rounded-xl border bg-white transition ${
                      esSeccion ? "border-l-[6px] border-slate-200 border-l-marca" : "border-slate-200"
                    } ${activa ? "shadow-md" : "cursor-pointer shadow-sm hover:border-slate-300"} ${
                      arrastre?.id === c.id ? "opacity-40" : ""
                    } ${lineaArriba ? "shadow-[0_-4px_0_0_#2563eb]" : ""} ${lineaAbajo ? "shadow-[0_4px_0_0_#2563eb]" : ""}`}
                  >
                    {activa && !esSeccion && <span className="absolute inset-y-0 left-0 w-1.5 rounded-l-xl bg-marca" aria-hidden="true" />}

                    {/* Asa para arrastrar (escritorio) */}
                    <div
                      onMouseDown={() => setArrastrable(c.id)}
                      onMouseUp={() => setArrastrable(null)}
                      title="Arrastrar para mover"
                      className="hidden h-6 cursor-grab items-center justify-center text-slate-300 hover:text-slate-500 active:cursor-grabbing md:flex"
                    >
                      <svg viewBox="0 0 24 8" className="h-2 w-6" fill="currentColor" aria-hidden="true">
                        {[3, 9, 15, 21].flatMap((x) => [<circle key={`a${x}`} cx={x} cy="2" r="1.4" />, <circle key={`b${x}`} cx={x} cy="6" r="1.4" />])}
                      </svg>
                    </div>

                    <div className={`px-5 md:px-6 ${activa ? "pb-4 pt-4 md:pt-0" : "pb-5 pt-4 md:pt-0"}`}>
                      {activa ? (
                        <EdicionCampo
                          campo={c}
                          onCambiar={(cambio) => actualizarCampo(c.id, cambio)}
                          onCambiarTipo={(tipo) => cambiarTipo(c.id, tipo)}
                        />
                      ) : (
                        <div className="pointer-events-none select-none">
                          <CampoFormulario campo={resumen} deshabilitado plano />
                          {ocultos > 0 && <p className="mt-2 text-xs font-medium text-slate-500">… y {ocultos} ítem(s) más</p>}
                        </div>
                      )}
                    </div>

                    {activa && (
                      <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-3 py-2">
                        <BotonIcono icono="arriba" etiqueta="Subir" onClick={() => moverCampo(i, i - 1)} disabled={i === 0} />
                        <BotonIcono icono="abajo" etiqueta="Bajar" onClick={() => moverCampo(i, i + 1)} disabled={i === campos.length - 1} />
                        <span className="flex-1" />
                        <BotonIcono icono="copiar" etiqueta="Duplicar" onClick={() => duplicarCampo(c)} />
                        <BotonIcono icono="borrar" etiqueta="Eliminar" onClick={() => eliminarCampo(c.id)} peligro />
                        {TIPOS_CAMPO[c.tipo].esPregunta && (
                          <>
                            <span className="mx-2 h-6 w-px bg-slate-200" aria-hidden="true" />
                            <Interruptor
                              etiqueta={c.tipo === "tabla_verificacion" ? "Todos los ítems obligatorios" : "Obligatoria"}
                              activo={c.obligatorio}
                              onCambiar={(v) => actualizarCampo(c.id, { obligatorio: v })}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            <button
              type="button"
              onClick={() => insertar(campoVacio("opcion_unica"))}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/60 px-4 py-4 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
            >
              <Icono nombre="mas" />
              Agregar pregunta
            </button>
          </div>

          {/* Barra flotante de herramientas: al costado en escritorio, abajo en el celular */}
          <aside
            aria-label="Agregar elementos"
            className="sticky bottom-3 z-10 mx-auto flex w-max gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg lg:top-24 lg:bottom-auto lg:mx-0 lg:flex-col lg:self-start"
          >
            {herramientas.map((h) => (
              <BotonIcono key={h.tipo} icono={h.icono} etiqueta={h.etiqueta} onClick={() => insertar(campoVacio(h.tipo))} />
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}

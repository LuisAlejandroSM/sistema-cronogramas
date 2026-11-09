// Base de datos local en el navegador usando IndexedDB nativo (sin librerías externas).
// Permite guardar cientos de MBs de respuestas, fotos (Blob) y firmas (Blob) sin conexión.

const DB_NOMBRE = "cronogramas_offline_v1";
const DB_VERSION = 1;
const STORE_COLA = "cola_envios";
const STORE_CACHE = "cache_formularios";

let _dbPromise = null;

/**
 * Abre o inicializa la base de datos IndexedDB en el navegador.
 * @returns {Promise<IDBDatabase>}
 */
export function abrirDB() {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB no está disponible en este entorno."));
  }

  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NOMBRE, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // 1. Cola de inspecciones pendientes de sincronización (Outbox)
      if (!db.objectStoreNames.contains(STORE_COLA)) {
        const storeCola = db.createObjectStore(STORE_COLA, { keyPath: "id" });
        storeCola.createIndex("por_fecha", "creadoEn", { unique: false });
        storeCola.createIndex("por_asignacion", "asignacionId", { unique: false });
        storeCola.createIndex("por_estado", "estado", { unique: false });
      }

      // 2. Caché de formularios asignados para visualización offline
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        const storeCache = db.createObjectStore(STORE_CACHE, { keyPath: "asignacionId" });
        storeCache.createIndex("por_fecha", "guardadoEn", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      _dbPromise = null;
      reject(req.error || new Error("No se pudo abrir la base de datos local."));
    };
  });

  return _dbPromise;
}

/**
 * Guarda una inspección terminada en la cola de salida local.
 * @param {{
 *   id?: string,
 *   asignacionId: string,
 *   formularioTitulo?: string,
 *   respuestas: Record<string, unknown>,
 *   fotos?: Array<{ id: string, campoId: string, blob?: Blob, nombre?: string, previewUrl?: string }>
 * }} datos
 * @returns {Promise<string>} ID del elemento en cola
 */
export async function encolarInspeccion({ id, asignacionId, formularioTitulo = "Inspección", respuestas, fotos = [] }) {
  const db = await abrirDB();
  const idFinal = id || `envio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Normalizamos las fotos para guardar únicamente el Blob crudo y metadatos
  const fotosSerializables = (fotos || []).map((f) => ({
    id: f.id,
    campoId: f.campoId,
    blob: f.blob || null,
    nombre: f.nombre || (f.blob?.type === "image/png" ? "firma.png" : "foto.jpg"),
    esLocal: Boolean(f.esLocal || f.blob),
  }));

  const item = {
    id: idFinal,
    asignacionId,
    formularioTitulo,
    respuestas: respuestas || {},
    fotos: fotosSerializables,
    creadoEn: new Date().toISOString(),
    estado: "pendiente", // 'pendiente' | 'sincronizando' | 'error'
    intentos: 0,
    error: null,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_COLA], "readwrite");
    const store = tx.objectStore(STORE_COLA);
    const req = store.put(item);

    req.onsuccess = () => resolve(idFinal);
    req.onerror = () => reject(req.error || new Error("Error al guardar en la cola local."));
  });
}

/**
 * Devuelve todas las inspecciones pendientes en la cola local ordenadas por fecha.
 * @returns {Promise<Array<object>>}
 */
export async function listarCola() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_COLA], "readonly");
    const store = tx.objectStore(STORE_COLA);
    const req = store.getAll();

    req.onsuccess = () => {
      const lista = req.result || [];
      // Orden cronológico (las más antiguas primero)
      lista.sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());
      resolve(lista);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Obtiene un elemento específico de la cola por su ID.
 * @param {string} id
 */
export async function obtenerDeCola(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_COLA], "readonly");
    const store = tx.objectStore(STORE_COLA);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Actualiza el estado o metadatos de un elemento en la cola.
 * @param {string} id
 * @param {Partial<object>} cambios
 */
export async function actualizarEstadoCola(id, cambios) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_COLA], "readwrite");
    const store = tx.objectStore(STORE_COLA);
    const reqGet = store.get(id);

    reqGet.onsuccess = () => {
      const item = reqGet.result;
      if (!item) {
        return resolve(false);
      }
      const actualizado = { ...item, ...cambios };
      const reqPut = store.put(actualizado);
      reqPut.onsuccess = () => resolve(true);
      reqPut.onerror = () => reject(reqPut.error);
    };
    reqGet.onerror = () => reject(reqGet.error);
  });
}

/**
 * Elimina una inspección de la cola (ej. tras sincronización exitosa).
 * @param {string} id
 */
export async function eliminarDeCola(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_COLA], "readwrite");
    const store = tx.objectStore(STORE_COLA);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Devuelve el número total de inspecciones esperando en la cola.
 * @returns {Promise<number>}
 */
export async function contarCola() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_COLA], "readonly");
    const store = tx.objectStore(STORE_COLA);
    const req = store.count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────
// Caché de Plantillas de Formularios para uso sin conexión
// ─────────────────────────────────────────────────────────────

/**
 * Guarda los datos completos de una asignación/formulario en caché para poder abrirlo sin señal.
 * @param {string} asignacionId
 * @param {object} datos { formulario, asignacion, fotos }
 */
export async function guardarCacheAsignacion(asignacionId, datos) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CACHE], "readwrite");
    const store = tx.objectStore(STORE_CACHE);
    const item = {
      asignacionId,
      datos,
      guardadoEn: new Date().toISOString(),
    };
    const req = store.put(item);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Obtiene los datos cacheados de un formulario asignado.
 * @param {string} asignacionId
 */
export async function obtenerCacheAsignacion(asignacionId) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CACHE], "readonly");
    const store = tx.objectStore(STORE_CACHE);
    const req = store.get(asignacionId);
    req.onsuccess = () => resolve(req.result?.datos || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Lista todas las asignaciones cacheadas en el dispositivo.
 */
export async function listarCacheAsignaciones() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CACHE], "readonly");
    const store = tx.objectStore(STORE_CACHE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

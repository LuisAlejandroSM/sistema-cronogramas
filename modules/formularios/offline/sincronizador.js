// Motor de sincronización automática en segundo plano (estilo KoboToolbox / Enketo)
// Sube secuencialmente fotos, firmas y respuestas acumuladas en la cola local de IndexedDB.

import { enviarRespuesta, subirFoto } from "../actions";
import { actualizarEstadoCola, contarCola, eliminarDeCola, listarCola } from "./db";

let _sincronizando = false;
let _escuchaIniciada = false;

/**
 * Procesa todas las inspecciones pendientes en la cola local de IndexedDB.
 * @param {(progreso: { actual: number, total: number, mensaje: string }) => void} [onProgreso]
 * @returns {Promise<{ sincronizados: number, errores: number, restantes: number }>}
 */
export async function sincronizarCola(onProgreso) {
  if (typeof window === "undefined") {
    return { sincronizados: 0, errores: 0, restantes: 0 };
  }

  if (!navigator.onLine) {
    const total = await contarCola().catch(() => 0);
    return { sincronizados: 0, errores: 0, restantes: total };
  }

  if (_sincronizando) {
    const total = await contarCola().catch(() => 0);
    return { sincronizados: 0, errores: 0, restantes: total };
  }

  _sincronizando = true;
  window.dispatchEvent(new CustomEvent("cronogramas:sync-start"));

  let sincronizados = 0;
  let errores = 0;

  try {
    const items = await listarCola();
    const pendientes = items.filter((i) => i.estado === "pendiente" || i.estado === "error");
    const total = pendientes.length;

    for (let index = 0; index < total; index++) {
      const item = pendientes[index];
      onProgreso?.({
        actual: index + 1,
        total,
        mensaje: `Sincronizando ${index + 1} de ${total}: "${item.formularioTitulo || "Inspección"}"…`,
      });

      try {
        await actualizarEstadoCola(item.id, { estado: "sincronizando" });

        // 1. Subir fotos y firmas locales que aún estén en formato Blob
        const fotosLocales = (item.fotos || []).filter((f) => f.esLocal && f.blob);
        for (let fIdx = 0; fIdx < fotosLocales.length; fIdx++) {
          const foto = fotosLocales[fIdx];
          onProgreso?.({
            actual: index + 1,
            total,
            mensaje: `Subiendo archivo ${fIdx + 1} de ${fotosLocales.length} para "${item.formularioTitulo}"…`,
          });

          const formData = new FormData();
          formData.append("asignacionId", item.asignacionId);
          formData.append("campoId", foto.campoId);
          formData.append("archivo", foto.blob, foto.nombre || "archivo.jpg");

          const resFoto = await subirFoto(formData);
          if (!resFoto?.success) {
            throw new Error(resFoto?.error || "Error al subir foto o firma adjunta.");
          }

          // Se actualiza el ID local por el ID real retornado por el servidor
          foto.id = resFoto.id;
          foto.esLocal = false;
          delete foto.blob;
        }

        // 2. Enviar las respuestas definitivas de la inspección
        onProgreso?.({
          actual: index + 1,
          total,
          mensaje: `Registrando inspección en el servidor…`,
        });

        const resEnvio = await enviarRespuesta({
          asignacionId: item.asignacionId,
          respuestas: item.respuestas,
        });

        if (resEnvio?.success) {
          await eliminarDeCola(item.id);
          sincronizados++;
        } else if (resEnvio?.error === "Este formulario ya fue enviado.") {
          // Si el servidor ya lo tenía registrado, se limpia de la cola local
          await eliminarDeCola(item.id);
          sincronizados++;
        } else {
          throw new Error(resEnvio?.error || "El servidor rechazó el formulario.");
        }
      } catch (err) {
        console.warn(`[sincronizador] Error en item ${item.id}:`, err);
        errores++;
        await actualizarEstadoCola(item.id, {
          estado: "error",
          error: err?.message || "Error al sincronizar.",
          intentos: (item.intentos || 0) + 1,
        });
      }
    }
  } catch (errorGlobal) {
    console.error("[sincronizador] Error global en cola:", errorGlobal);
  } finally {
    _sincronizando = false;
    const restantes = await contarCola().catch(() => 0);
    window.dispatchEvent(
      new CustomEvent("cronogramas:sync-end", {
        detail: { sincronizados, errores, restantes },
      })
    );
    onProgreso?.({
      actual: 0,
      total: 0,
      mensaje: "",
    });
  }

  const restantes = await contarCola().catch(() => 0);
  return { sincronizados, errores, restantes };
}

/**
 * Inicia los escuchadores automáticos de conectividad en el navegador.
 * Dispara la sincronización tan pronto el teléfono detecta señal.
 */
export function iniciarAutoSincronizacion() {
  if (typeof window === "undefined" || _escuchaIniciada) return () => {};

  _escuchaIniciada = true;

  const alReconectar = () => {
    sincronizarCola();
  };

  const alCambiarVisibilidad = () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      sincronizarCola();
    }
  };

  window.addEventListener("online", alReconectar);
  document.addEventListener("visibilitychange", alCambiarVisibilidad);

  // Sincronización periódica cada 45 segundos si hay conexión
  const intervalo = setInterval(() => {
    if (navigator.onLine && !_sincronizando) {
      contarCola().then((n) => {
        if (n > 0) sincronizarCola();
      }).catch(() => {});
    }
  }, 45000);

  // Intento inicial inmediato
  if (navigator.onLine) {
    setTimeout(() => sincronizarCola(), 1500);
  }

  return () => {
    window.removeEventListener("online", alReconectar);
    document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    clearInterval(intervalo);
    _escuchaIniciada = false;
  };
}

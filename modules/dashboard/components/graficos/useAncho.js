"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Mide el ancho real del contenedor antes de dibujar el SVG (sin estirar el texto con viewBox).
// Devuelve `null` hasta medir: las gráficas muestran un espacio reservado del mismo alto,
// así nunca se dibujan con un ancho supuesto que desborde la tarjeta.
export function useAncho() {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const medir = (valor) => setAncho(Math.max(260, Math.floor(valor)));
    medir(el.clientWidth);
    const observador = new ResizeObserver(([entrada]) => medir(entrada.contentRect.width));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return [ref, ancho];
}

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Recuadro para firmar con el dedo, lápiz o mouse. Al confirmar entrega un PNG (Blob).
 * @param {{ onConfirmar: (blob: Blob) => void, deshabilitado?: boolean }} props
 */
export default function PadFirma({ onConfirmar, deshabilitado = false }) {
  const canvasRef = useRef(null);
  const dibujando = useRef(false);
  const [vacio, setVacio] = useState(true);

  // Ajusta la resolución del lienzo a su tamaño en pantalla (trazos nítidos en el celular).
  useEffect(() => {
    const canvas = canvasRef.current;
    const escala = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * escala);
    canvas.height = Math.round(height * escala);
    const ctx = canvas.getContext("2d");
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b1f4b";
  }, []);

  const punto = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const empezar = (e) => {
    if (deshabilitado) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    dibujando.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = punto(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setVacio(false);
  };
  const mover = (e) => {
    if (!dibujando.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = punto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const terminar = () => {
    dibujando.current = false;
  };

  const limpiar = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setVacio(true);
  };

  const confirmar = () => {
    canvasRef.current.toBlob((blob) => blob && onConfirmar(blob), "image/png");
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        aria-label="Recuadro para firmar"
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        className="h-40 w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-white"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{vacio ? "Firme dentro del recuadro" : "¿Quedó bien? Confirme la firma."}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={limpiar}
            disabled={vacio || deshabilitado}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            Borrar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={vacio || deshabilitado}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
          >
            Confirmar firma
          </button>
        </div>
      </div>
    </div>
  );
}

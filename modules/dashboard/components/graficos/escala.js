// Utilidades puras para dibujar gráficas SVG: escalas, ticks, formatos y formas de barra.

// Paso "bonito" (1, 2, 5 × 10^k) para que los ticks del eje sean números redondos.
function pasoBonito(valor) {
  if (valor <= 1) return 1;
  const exp = 10 ** Math.floor(Math.log10(valor));
  const f = valor / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * exp;
}

/** Eje Y entero desde 0: devuelve { max, ticks }. */
export function ejeEntero(maximo, divisiones = 4) {
  const paso = pasoBonito(Math.max(maximo, 1) / divisiones);
  const max = Math.max(paso, Math.ceil(maximo / paso) * paso);
  const ticks = [];
  for (let v = 0; v <= max + 1e-9; v += paso) ticks.push(v);
  return { max, ticks };
}

// Formato determinista (igual en servidor y navegador): separador de miles con punto.
export function formatoNumero(valor) {
  if (valor === null || valor === undefined) return "—";
  const n = Math.round(Number(valor));
  const signo = n < 0 ? "-" : "";
  return signo + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatoPorcentaje(valor) {
  if (valor === null || valor === undefined) return "—";
  return `${Math.round(valor * 100)}%`;
}

/** Columna vertical: extremo de datos redondeado (4px), base cuadrada. */
export function pathColumna(x, yTope, ancho, yBase) {
  const alto = yBase - yTope;
  if (alto <= 0) return "";
  const r = Math.min(4, ancho / 2, alto);
  return `M${x},${yBase}V${yTope + r}Q${x},${yTope} ${x + r},${yTope}H${x + ancho - r}Q${x + ancho},${yTope} ${x + ancho},${yTope + r}V${yBase}Z`;
}

/** Barra horizontal desde x0: extremo de datos redondeado (4px), base cuadrada. */
export function pathBarra(x0, xFin, y, alto) {
  const largo = xFin - x0;
  if (largo <= 0) return "";
  const r = Math.min(4, alto / 2, largo);
  return `M${x0},${y}H${xFin - r}Q${xFin},${y} ${xFin},${y + r}V${y + alto - r}Q${xFin},${y + alto} ${xFin - r},${y + alto}H${x0}Z`;
}

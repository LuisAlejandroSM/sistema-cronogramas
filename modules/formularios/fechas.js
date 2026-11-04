// Formatos de fecha deterministas (se calculan en el servidor y se envían como texto).

const dos = (n) => String(n).padStart(2, "0");

/** "02/11/2026 10:48" a partir de un Date o timestamp. */
export function textoFechaHora(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

/** "02/11/2026" a partir de "2026-11-02". */
export function textoFecha(iso) {
  if (!iso) return null;
  const [a, m, d] = String(iso).split("-");
  return `${d}/${m}/${a}`;
}

/** Fecha local de hoy como "YYYY-MM-DD". */
export function hoyISO(ahora = new Date()) {
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

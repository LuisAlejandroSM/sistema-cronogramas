// Clases de diseño compartidas por el formulario, la vista previa y la respuesta.
// (Cadenas literales para que Tailwind las detecte.)

// Una sola columna ordenada (como Google Forms): cada pregunta es una tarjeta de ancho completo.
// Así la vista previa, el formulario del inspector y la respuesta se ven igual en celular y escritorio.
export const CLASE_REJILLA = "flex flex-col gap-3";

// El ancho guardado en cada campo (completo / mitad / tercio) ya no divide la fila;
// se conserva en los datos para no alterar formularios existentes.
export const CLASE_ANCHO = {
  completo: "",
  mitad: "",
  tercio: "",
};

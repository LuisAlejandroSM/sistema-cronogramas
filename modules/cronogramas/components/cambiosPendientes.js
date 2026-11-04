"use client";

// Estado compartido mínimo entre <MatrizMes /> y <FiltrosCronograma />:
// cuántas celdas de la matriz tienen cambios sin guardar. Permite advertir al usuario
// antes de cambiar de vista, mes o inspector y perder lo editado.

let pendientes = 0;

export function registrarCambiosPendientes(cantidad) {
  pendientes = cantidad;
}

export function hayCambiosPendientes() {
  return pendientes > 0;
}

export function confirmarDescartarCambios() {
  if (pendientes === 0) return true;
  return window.confirm(
    `Hay ${pendientes} celda(s) sin guardar en la matriz. ¿Desea descartarlas y continuar?`
  );
}

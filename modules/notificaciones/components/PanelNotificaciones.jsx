import { connection } from "next/server";
import { requerirAdmin } from "@/modules/auth/dal";
import ListaNotificaciones from "./ListaNotificaciones";
import {
  obtenerEstadisticasNotificaciones,
  obtenerNotificaciones,
} from "../queries";

export default async function PanelNotificaciones() {
  await connection();
  await requerirAdmin();

  const [notificaciones, estadisticas] = await Promise.all([
    obtenerNotificaciones({ limite: 100 }),
    obtenerEstadisticasNotificaciones(),
  ]);

  return (
    <ListaNotificaciones
      notificacionesIniciales={notificaciones}
      estadisticasIniciales={estadisticas}
    />
  );
}

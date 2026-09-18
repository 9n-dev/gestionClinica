/**
 * Horas que pinta la rejilla: de 9:00 a 20:00 como mínimo, y más si algún horario, cita o bloqueo se sale. Los horarios
 * se editan en Configuración: con el rango fijo, una cita a las 8:30 se pintaba encima de la de las 9:00.
 */
export function rangoDe(marcas: { desde: number; hasta: number }[]) {
  return {
    desde: Math.floor(Math.min(9 * 60, ...marcas.map((m) => m.desde)) / 60) * 60,
    hasta: Math.ceil(Math.max(20 * 60, ...marcas.map((m) => m.hasta)) / 60) * 60,
  };
}

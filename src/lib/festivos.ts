import type { Dia } from "./fechas";

// Festivos nacionales de España. Los autonómicos y locales cambian con cada clínica: esos se añaden a mano como bloqueos.
// Ojo: cuando uno cae en domingo, cada comunidad decide si lo pasa al lunes. Aquí se queda en su día.

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher para el calendario gregoriano). */
function pascua(anio: number) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
  const d = Math.floor(b / 4), e = b % 4, g = Math.floor((8 * b + 13) / 25);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 19 * l) / 433);
  const mes = Math.floor((h + l - 7 * m + 90) / 25), dia = ((h + l - 7 * m + 33 * mes + 19) % 32);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

export function festivosNacionales(anio: number): { dia: Dia; nombre: string }[] {
  const viernesSanto = new Date(pascua(anio).getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
  return [
    ["01-01", "Año Nuevo"], ["01-06", "Epifanía del Señor"], ["05-01", "Fiesta del Trabajo"], ["08-15", "Asunción de la Virgen"],
    ["10-12", "Fiesta Nacional"], ["11-01", "Todos los Santos"], ["12-06", "Día de la Constitución"], ["12-08", "Inmaculada Concepción"], ["12-25", "Natividad del Señor"],
  ]
    .map(([d, nombre]) => ({ dia: `${anio}-${d}`, nombre }))
    .concat({ dia: viernesSanto, nombre: "Viernes Santo" })
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

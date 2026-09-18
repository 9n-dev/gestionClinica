import { normalizarNombre } from "./pacientes";
import { esquemaPaciente } from "./validacion";

// Importación de la cartera de pacientes desde un CSV (Excel → Guardar como → CSV). Sin librerías.

export type FilaPaciente = { nombre: string; telefono: string; email: string | null; notas: string };
export const MAX_FILAS = 5000;

/** Excel en español guarda «CSV» en Windows-1252 y «CSV UTF-8» con BOM. Si los bytes no son UTF-8 válido, es lo primero. */
export function decodificar(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes); // TextDecoder ya se come el BOM
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** CSV con comillas ("a;b", "" para una comilla, saltos de línea dentro). El separador es el que más sale en la cabecera: ; , o tabulador. */
export function leerCsv(texto: string) {
  const cabecera = texto.slice(0, texto.search(/\r?\n|$/));
  const sep = [";", ",", "\t"].map((s) => [s, cabecera.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const filas: string[][] = [];
  let fila: string[] = [], campo = "", entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c !== '"') campo += c;
      else if (texto[i + 1] === '"') { campo += '"'; i++; }
      else entreComillas = false;
    } else if (c === '"' && campo === "") entreComillas = true;
    else if (c === sep) { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      filas.push([...fila, campo]);
      fila = []; campo = "";
    } else campo += c;
  }
  if (campo || fila.length) filas.push([...fila, campo]);
  return filas;
}

// Cómo llama cada programa a sus columnas. Se comparan sin acentos ni mayúsculas.
const COLUMNAS = {
  nombre: ["nombre", "nombre y apellidos", "nombre completo", "paciente"],
  apellidos: ["apellidos", "apellido", "primer apellido", "segundo apellido", "apellido 1", "apellido 2"],
  telefono: ["telefono", "movil", "telefono movil", "tel", "tlf", "celular"],
  email: ["email", "e-mail", "mail", "correo", "correo electronico"],
  notas: ["notas", "observaciones", "comentarios"],
};

export function prepararPacientes(filas: string[][]): { error: string } | { validas: FilaPaciente[]; errores: { linea: number; texto: string; motivo: string }[]; repetidas: number } {
  const [cabecera, ...resto] = filas;
  if (!cabecera) return { error: "El fichero está vacío." };
  const columnas = (tipo: keyof typeof COLUMNAS) => cabecera.flatMap((c, i) => (COLUMNAS[tipo].includes(normalizarNombre(c)) ? [i] : []));
  const vistas = `Columnas del fichero: ${cabecera.map((c) => c.trim()).filter(Boolean).join(", ")}.`;
  if (!columnas("nombre").length) return { error: `No encuentro la columna del nombre. ${vistas}` };
  if (!columnas("telefono").length) return { error: `No encuentro la columna del teléfono. ${vistas}` };
  if (resto.length > MAX_FILAS) return { error: `El fichero tiene ${resto.length} filas y el máximo son ${MAX_FILAS}. Divídelo en varios.` };

  const validas: FilaPaciente[] = [];
  const errores = [];
  const claves = new Set<string>();
  let repetidas = 0;
  for (const [i, fila] of resto.entries()) {
    const de = (tipo: keyof typeof COLUMNAS) => columnas(tipo).map((c) => fila[c]?.trim() ?? "").filter(Boolean);
    const nombre = [...de("nombre"), ...de("apellidos")].join(" ");
    if (!fila.some((c) => c.trim())) continue; // líneas en blanco
    const datos = esquemaPaciente.safeParse({ nombre, telefono: de("telefono")[0] ?? "", email: de("email")[0] ?? "", notas: de("notas").join(" ").slice(0, 1000) });
    if (!datos.success) {
      errores.push({ linea: i + 2, texto: nombre || fila.join(" ").trim().slice(0, 60), motivo: datos.error.issues[0].message });
      continue;
    }
    const clave = `${datos.data.telefono}|${normalizarNombre(datos.data.nombre)}`; // la misma identidad que usa la reserva
    if (claves.has(clave)) repetidas++;
    else {
      claves.add(clave);
      validas.push(datos.data);
    }
  }
  return { validas, errores, repetidas };
}

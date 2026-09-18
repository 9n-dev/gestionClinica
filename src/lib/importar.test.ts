import { expect, it } from "vitest";
import { decodificar, leerCsv, prepararPacientes } from "./importar";

it("lee el CSV del Excel español: punto y coma, Windows-1252, comillas con separadores y saltos dentro", () => {
  // "Núñez" en Windows-1252: ú = 0xFA, ñ = 0xF1. En UTF-8 esos bytes sueltos no son válidos.
  const bytes = Uint8Array.from([...Buffer.from('Nombre;Notas\r\n"N'), 0xfa, 0xf1, ...Buffer.from('ez; Ana";"dice ""hola""\nen dos líneas"\r\n', "latin1")]);
  expect(leerCsv(decodificar(bytes))).toEqual([["Nombre", "Notas"], ["Núñez; Ana", 'dice "hola"\nen dos líneas']]);
  // Y el UTF-8 con BOM que guarda «CSV UTF-8», con comas
  expect(leerCsv(decodificar(new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from("nombre,teléfono\nÍñigo,600")])))).toEqual([["nombre", "teléfono"], ["Íñigo", "600"]]);
});

it("reconoce las columnas por su nombre, junta nombre y apellidos y separa lo que no vale", () => {
  const r = prepararPacientes(leerCsv(`Apellidos;NOMBRE;Móvil;Correo electrónico;Observaciones;Ciudad
Pérez Gil;Íñigo;+34 612 345 678;INIGO@correo.es;Prefiere tardes;Getafe
Sanz;Eva;91 000 00;;;
;;;;;
Ruiz Mora;Luis;699-111-222;no-es-un-email;;
Pérez Gil;íñigo;612345678;;duplicado en el fichero;`));
  if ("error" in r) throw new Error(r.error);
  expect(r.validas).toEqual([{ nombre: "Íñigo Pérez Gil", telefono: "612345678", email: "inigo@correo.es", notas: "Prefiere tardes" }]);
  expect(r.errores).toEqual([
    { linea: 3, texto: "Eva Sanz", motivo: "Escribe un teléfono español de 9 cifras" },
    { linea: 5, texto: "Luis Ruiz Mora", motivo: "Escribe un email válido" },
  ]);
  expect(r.repetidas).toBe(1);
});

it("sin columna de nombre o de teléfono no sigue, y dice qué columnas ha visto", () => {
  expect(prepararPacientes(leerCsv("Paciente,Email\nAna,ana@correo.es"))).toEqual({ error: "No encuentro la columna del teléfono. Columnas del fichero: Paciente, Email." });
  expect(prepararPacientes([])).toEqual({ error: "El fichero está vacío." });
});

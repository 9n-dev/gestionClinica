"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { anotar } from "@/lib/auditoria";
import { requerirAdmin, requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decodificar, leerCsv, MAX_FILAS, prepararPacientes, type FilaPaciente } from "@/lib/importar";
import { fusionarPacientes, normalizarNombre, suprimirPaciente } from "@/lib/pacientes";
import { gestionaTodo } from "@/lib/permisos";
import { esquemaEspera, esquemaPaciente } from "@/lib/validacion";
import { type Estado, primerError, refrescar } from "./comun";

// ---------- Pacientes ----------

/** Alta sin cita: alguien que llama para apuntarse a la lista de espera, o la ficha que se abre antes de la primera visita. */
export async function crearPaciente(_: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirSesion();
  const valores = Object.fromEntries([...fd].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const datos = esquemaPaciente.safeParse(valores);
  if (!datos.success) return { error: primerError(datos.error), valores };
  let id: string;
  try {
    ({ id } = await prisma.paciente.create({ data: { ...datos.data, notas: datos.data.notas || null, nombreNorm: normalizarNombre(datos.data.nombre) } }));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Ya hay un paciente con ese nombre y ese teléfono. Búscalo en la lista.", valores };
    throw e;
  }
  await anotar(user, "CREAR", "paciente", id);
  refrescar();
  redirect(`/panel/pacientes/${id}`);
}

/** Junta en `destinoId` la ficha `origenId`. Recepción y administración: toca citas de todos los profesionales. */
export async function fusionarFichas(destinoId: string, origenId: string) {
  const { user } = await requerirSesion();
  if (!gestionaTodo(user)) return;
  if ((await fusionarPacientes(destinoId, origenId)).ok) await anotar(user, "EDITAR", "paciente", destinoId, `fusión: absorbe la ficha ${origenId}`);
  refrescar();
}

/** Cambia la ficha. Las citas conservan lo que se escribió al reservar. */
export async function guardarPaciente(id: string, _: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirSesion();
  const datos = esquemaPaciente.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  try {
    await prisma.paciente.update({ where: { id }, data: { ...datos.data, notas: datos.data.notas || null, nombreNorm: normalizarNombre(datos.data.nombre) } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Ya hay otro paciente con ese nombre y ese teléfono." };
    throw e;
  }
  await anotar(user, "EDITAR", "paciente", id, "datos de contacto y notas");
  refrescar();
  return { ok: "Ficha guardada." };
}

/** Derecho de supresión. Solo administración: no se puede deshacer. */
export async function suprimirDatosPaciente(id: string): Promise<Estado> {
  const { user } = await requerirAdmin();
  const r = await suprimirPaciente(id);
  if (!r.ok) return { error: r.error };
  await anotar(user, "BORRAR", "paciente", id, "supresión: datos anonimizados");
  refrescar();
  return { ok: "Datos eliminados." };
}

// ---------- Lista de espera ----------

export async function apuntarEnEspera(pacienteId: string, _: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirSesion();
  const datos = esquemaEspera.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  const { servicioId, profesionalId, preferencia } = datos.data;
  if (await prisma.enEspera.findFirst({ where: { pacienteId, servicioId, atendidoAt: null } })) return { error: "Ya está en la lista de espera para ese servicio." };
  const e = await prisma.enEspera.create({ data: { pacienteId, servicioId, profesionalId: profesionalId || null, preferencia: preferencia || null } });
  await anotar(user, "CREAR", "paciente", pacienteId, `lista de espera ${e.id}`);
  refrescar();
  return { ok: "Apuntado en la lista de espera." };
}

export async function quitarDeEspera(id: string) {
  const { user } = await requerirSesion();
  const { count } = await prisma.enEspera.updateMany({ where: { id, atendidoAt: null }, data: { atendidoAt: new Date() } });
  if (count) await anotar(user, "BORRAR", "paciente", null, `lista de espera ${id}`);
  refrescar();
}

// ---------- Importar pacientes (solo ADMIN) ----------

export type EstadoImportacion = {
  error?: string;
  comprobado?: { validas: FilaPaciente[]; errores: { linea: number; texto: string; motivo: string }[]; totalErrores: number; repetidas: number };
  hecho?: { creados: number; yaExistian: number };
};

/** Paso 1: lee el CSV y dice qué entraría. No escribe nada. */
export async function comprobarImportacion(_: EstadoImportacion, fd: FormData): Promise<EstadoImportacion> {
  await requerirAdmin();
  const fichero = fd.get("fichero");
  if (!(fichero instanceof File) || !fichero.size) return { error: "Elige un fichero CSV." };
  const r = prepararPacientes(leerCsv(decodificar(new Uint8Array(await fichero.arrayBuffer()))));
  return "error" in r ? { error: r.error } : { comprobado: { ...r, errores: r.errores.slice(0, 100), totalErrores: r.errores.length } };
}

/** Paso 2: crea los pacientes que no existan ya. Las filas vuelven del navegador, así que se validan otra vez. */
export async function confirmarImportacion(_: EstadoImportacion, fd: FormData): Promise<EstadoImportacion> {
  const { user } = await requerirAdmin();
  let filas: unknown;
  try {
    filas = JSON.parse(String(fd.get("filas")));
  } catch {
    return { error: "No se han recibido los pacientes. Vuelve a comprobar el fichero." };
  }
  // El esquema espera el email como texto ("" si no hay), y las filas ya validadas lo traen como null.
  const conEmailDeTexto = (f: unknown) => (f && typeof f === "object" ? { ...f, email: (f as { email?: unknown }).email ?? "" } : f);
  const datos = z.array(z.preprocess(conEmailDeTexto, esquemaPaciente)).max(MAX_FILAS).safeParse(filas);
  if (!datos.success) return { error: "Los datos no son válidos. Vuelve a comprobar el fichero." };

  const nuevos = datos.data.map((p) => ({ ...p, notas: p.notas || null, nombreNorm: normalizarNombre(p.nombre) }));
  // Misma identidad que en la reserva: teléfono + nombre normalizado. Lo que ya existe no se toca.
  const existentes = await prisma.paciente.findMany({ where: { telefono: { in: nuevos.map((p) => p.telefono) } }, select: { telefono: true, nombreNorm: true } });
  const ya = new Set(existentes.map((p) => `${p.telefono}|${p.nombreNorm}`));
  const crear = nuevos.filter((p) => !ya.has(`${p.telefono}|${p.nombreNorm}`));
  if (crear.length) {
    await prisma.paciente.createMany({ data: crear });
    await anotar(user, "CREAR", "paciente", null, `importación: ${crear.length} pacientes`);
  }
  refrescar();
  return { hecho: { creados: crear.length, yaExistian: nuevos.length - crear.length } };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hash } from "bcryptjs";
import { enviarAcceso } from "@/lib/acceso";
import { requerirAdmin, requerirSesion } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { aInstante, diaDe, formatoHora, minutosAHora } from "@/lib/fechas";
import { normalizarNombre } from "@/lib/pacientes";
import { cancelarCita, crearCita, moverCita } from "@/lib/reservas";
import { nuevoToken } from "@/lib/seed-datos";
import { esquemaBloqueo, esquemaCitaPanel, esquemaHorario, esquemaMover, esquemaNotas, esquemaPaciente, esquemaProfesional, esquemaServicio, esquemaUsuario } from "@/lib/validacion";

export type Estado = { error?: string; ok?: string; campos?: Record<string, string[] | undefined>; valores?: Record<string, string> };

const primerError = (e: z.ZodError) => e.issues[0]?.message ?? "Datos no válidos";
const refrescar = () => revalidatePath("/panel", "layout");

// ---------- Citas ----------

export async function cancelarDesdePanel(id: string) {
  await requerirSesion();
  await cancelarCita({ id });
  refrescar();
}

export async function cambiarEstado(id: string, estado: "ATENDIDA" | "NO_PRESENTADA") {
  await requerirSesion();
  await prisma.cita.updateMany({ where: { id, estado: "CONFIRMADA" }, data: { estado } });
  refrescar();
}

export async function guardarNotas(id: string, _: Estado, fd: FormData): Promise<Estado> {
  await requerirSesion();
  const datos = esquemaNotas.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  await prisma.cita.update({ where: { id }, data: { notas: datos.data.notas || null } });
  refrescar();
  return { ok: "Notas guardadas." };
}

export async function crearCitaPanel(_: Estado, fd: FormData): Promise<Estado> {
  await requerirSesion();
  const valores = Object.fromEntries([...fd].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const datos = esquemaCitaPanel.safeParse(valores);
  if (!datos.success) return { error: "Revisa los campos marcados.", campos: z.flattenError(datos.error).fieldErrors, valores };
  const r = await crearCita(datos.data, true);
  if (!r.ok) return { error: r.error, valores };
  refrescar();
  redirect(`/panel/citas/${r.id}?creada=1`);
}

export async function moverDesdeFormulario(id: string, _: Estado, fd: FormData): Promise<Estado> {
  await requerirSesion();
  const datos = esquemaMover.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  const r = await moverCita(id, datos.data);
  if (!r.ok) return { error: r.error };
  refrescar();
  redirect(`/panel/citas/${id}?movida=1`);
}

/** Arrastrar y soltar en la agenda. Recibe el instante de destino en ISO. */
export async function moverArrastrando(id: string, profesionalSlug: string, inicioIso: string) {
  await requerirSesion();
  const inicio = new Date(inicioIso);
  if (isNaN(inicio.getTime())) return { ok: false as const, error: "Hora no válida" };
  const r = await moverCita(id, { profesional: profesionalSlug, dia: diaDe(inicio), hora: formatoHora(inicio) });
  if (r.ok) refrescar();
  return r;
}

// ---------- Pacientes ----------

/** Cambia la ficha. Las citas conservan lo que se escribió al reservar. */
export async function guardarPaciente(id: string, _: Estado, fd: FormData): Promise<Estado> {
  await requerirSesion();
  const datos = esquemaPaciente.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  try {
    await prisma.paciente.update({ where: { id }, data: { ...datos.data, notas: datos.data.notas || null, nombreNorm: normalizarNombre(datos.data.nombre) } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Ya hay otro paciente con ese nombre y ese teléfono." };
    throw e;
  }
  refrescar();
  return { ok: "Ficha guardada." };
}

// ---------- Bloqueos ----------

// "2026-09-18T13:00" (hora de Madrid, de un <input type="datetime-local">) → instante UTC
const aInstanteLocal = (s: string) => {
  const [dia, hora] = s.split("T");
  const [h, m] = hora.split(":").map(Number);
  return aInstante(dia, h * 60 + m);
};

export async function crearBloqueo(_: Estado, fd: FormData): Promise<Estado> {
  await requerirSesion();
  const datos = esquemaBloqueo.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  const inicio = aInstanteLocal(datos.data.inicio);
  const fin = aInstanteLocal(datos.data.fin);
  if (fin <= inicio) return { error: "El final tiene que ser posterior al inicio." };
  const profesionalId = datos.data.profesionalId || null;

  await prisma.bloqueo.create({ data: { profesionalId, inicio, fin, motivo: datos.data.motivo } });
  const afectadas = await prisma.cita.count({
    where: { estado: "CONFIRMADA", inicio: { lt: fin }, fin: { gt: inicio }, ...(profesionalId ? { profesionalId } : {}) },
  });
  refrescar();
  return {
    ok: afectadas
      ? `Bloqueo creado. Ojo: hay ${afectadas} ${afectadas === 1 ? "cita confirmada" : "citas confirmadas"} en ese periodo; no se cancelan solas, revísalas en la agenda.`
      : "Bloqueo creado. Esas horas ya no se ofrecen en la web.",
  };
}

export async function borrarBloqueo(id: string) {
  await requerirSesion();
  await prisma.bloqueo.deleteMany({ where: { id } });
  refrescar();
}

// ---------- Configuración (solo ADMIN) ----------

export async function guardarServicio(id: string, _: Estado, fd: FormData): Promise<Estado> {
  await requerirAdmin();
  const datos = esquemaServicio.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  const { precio, ...resto } = datos.data;
  await prisma.servicio.update({ where: { id }, data: { ...resto, precioCent: Math.round(precio * 100) } });
  revalidatePath("/", "layout");
  return { ok: "Guardado." };
}

export async function guardarProfesional(id: string, _: Estado, fd: FormData): Promise<Estado> {
  await requerirAdmin();
  const datos = esquemaProfesional.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  await prisma.profesional.update({ where: { id }, data: datos.data });
  revalidatePath("/", "layout");
  return { ok: "Guardado." };
}

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export async function guardarHorario(profesionalId: string, _: Estado, fd: FormData): Promise<Estado> {
  await requerirAdmin();
  const datos = esquemaHorario.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  const tramos = [];
  for (const d of [1, 2, 3, 4, 5, 6, 7]) {
    for (const t of ["m", "t"]) {
      const i = datos.data[`${t}${d}i`];
      const f = datos.data[`${t}${d}f`];
      if (!i && !f) continue;
      if (!i || !f) return { error: "Cada tramo necesita hora de inicio y de fin." };
      if (aMinutos(f) <= aMinutos(i)) return { error: `El tramo ${minutosAHora(aMinutos(i))}–${minutosAHora(aMinutos(f))} acaba antes de empezar.` };
      tramos.push({ diaSemana: d, minInicio: aMinutos(i), minFin: aMinutos(f) });
    }
  }
  await prisma.$transaction([
    prisma.horarioLaboral.deleteMany({ where: { profesionalId } }),
    prisma.horarioLaboral.createMany({ data: tramos.map((t) => ({ ...t, profesionalId })) }),
  ]);
  revalidatePath("/", "layout");
  return { ok: "Horario guardado. Las citas que ya existían no cambian." };
}

// ---------- Usuarios (solo ADMIN) ----------

const emailRepetido = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** El usuario nuevo no tiene contraseña: recibe un enlace para elegirla. */
export async function crearUsuario(_: Estado, fd: FormData): Promise<Estado> {
  await requerirAdmin();
  const valores = Object.fromEntries([...fd].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const datos = esquemaUsuario.safeParse(valores);
  if (!datos.success) return { error: primerError(datos.error), valores };
  try {
    const { profesionalId, ...resto } = datos.data;
    // Hash de un valor aleatorio que nadie conoce: hasta que use el enlace, no hay contraseña que acierte.
    const usuario = await prisma.usuario.create({ data: { ...resto, profesionalId: profesionalId || null, passwordHash: await hash(nuevoToken(), 10) } });
    const enviado = await enviarAcceso(usuario, true);
    refrescar();
    return enviado
      ? { ok: `Usuario creado. Le hemos enviado a ${usuario.email} el enlace para elegir contraseña (vale 3 días).` }
      : { error: "Usuario creado, pero el email con el enlace ha fallado. Puede pedir uno nuevo desde «He olvidado mi contraseña»." };
  } catch (e) {
    if (emailRepetido(e)) return { error: "Ya hay un usuario con ese email.", valores };
    throw e;
  }
}

export async function guardarUsuario(id: string, _: Estado, fd: FormData): Promise<Estado> {
  await requerirAdmin();
  const datos = esquemaUsuario.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) return { error: "Ese usuario ya no existe." };
  if (usuario.demo) return { error: "Los usuarios de la demo no se pueden cambiar." };
  if (usuario.rol === "ADMIN" && datos.data.rol !== "ADMIN" && (await prisma.usuario.count({ where: { rol: "ADMIN" } })) === 1)
    return { error: "Es el único administrador: nombra a otro antes de quitarle el rol." };
  try {
    await prisma.usuario.update({ where: { id }, data: { ...datos.data, profesionalId: datos.data.profesionalId || null } });
  } catch (e) {
    if (emailRepetido(e)) return { error: "Ya hay un usuario con ese email." };
    throw e;
  }
  refrescar();
  return { ok: "Guardado." };
}

export async function borrarUsuario(id: string) {
  const sesion = await requerirAdmin();
  // Ni a uno mismo (siempre queda al menos un administrador) ni a los de la demo.
  if (id !== sesion.user.id) await prisma.usuario.deleteMany({ where: { id, demo: false } });
  refrescar();
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hash } from "bcryptjs";
import { enviarAcceso } from "@/lib/acceso";
import { anotar } from "@/lib/auditoria";
import { requerirAdmin, requerirSesion } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { aInstante, diaDe, formatoHora, minutosAHora } from "@/lib/fechas";
import { decodificar, leerCsv, MAX_FILAS, prepararPacientes, type FilaPaciente } from "@/lib/importar";
import { normalizarNombre, suprimirPaciente } from "@/lib/pacientes";
import { gestionaTodo, puedeGestionar, SOLO_LO_TUYO } from "@/lib/permisos";
import { cancelarCita, crearCita, moverCita } from "@/lib/reservas";
import { nuevoToken } from "@/lib/seed-datos";
import { esquemaBloqueo, esquemaCitaPanel, esquemaHorario, esquemaMover, esquemaNotas, esquemaPaciente, esquemaProfesional, esquemaServicio, esquemaUsuario } from "@/lib/validacion";

export type Estado = { error?: string; ok?: string; campos?: Record<string, string[] | undefined>; valores?: Record<string, string> };

const primerError = (e: z.ZodError) => e.issues[0]?.message ?? "Datos no válidos";
const refrescar = () => revalidatePath("/panel", "layout");

// ---------- Citas ----------

/** Sesión + permiso sobre esa cita. `user` es null si la cita es de otro profesional y quien pregunta solo gestiona lo suyo. */
async function sesionParaCita(id: string) {
  const { user } = await requerirSesion();
  const cita = await prisma.cita.findUnique({ where: { id }, select: { profesionalId: true } });
  return cita && puedeGestionar(user, cita.profesionalId) ? user : null;
}
const idDeProfesional = async (slug: string) => (await prisma.profesional.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null;

export async function cancelarDesdePanel(id: string) {
  const user = await sesionParaCita(id);
  if (user && (await cancelarCita({ id }))) await anotar(user, "CANCELAR", "cita", id);
  refrescar();
}

export async function cambiarEstado(id: string, estado: "ATENDIDA" | "NO_PRESENTADA") {
  const user = await sesionParaCita(id);
  if (!user) return;
  const { count } = await prisma.cita.updateMany({ where: { id, estado: "CONFIRMADA" }, data: { estado } });
  if (count) await anotar(user, "ESTADO", "cita", id, estado);
  refrescar();
}

export async function guardarNotas(id: string, _: Estado, fd: FormData): Promise<Estado> {
  const user = await sesionParaCita(id);
  if (!user) return { error: SOLO_LO_TUYO };
  const datos = esquemaNotas.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  await prisma.cita.update({ where: { id }, data: { notas: datos.data.notas || null } });
  await anotar(user, "EDITAR", "cita", id, "notas");
  refrescar();
  return { ok: "Notas guardadas." };
}

export async function crearCitaPanel(_: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirSesion();
  const valores = Object.fromEntries([...fd].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const datos = esquemaCitaPanel.safeParse(valores);
  if (!datos.success) return { error: "Revisa los campos marcados.", campos: z.flattenError(datos.error).fieldErrors, valores };
  if (!puedeGestionar(user, await idDeProfesional(datos.data.profesional))) return { error: SOLO_LO_TUYO, valores };
  const r = await crearCita(datos.data, true);
  if (!r.ok) return { error: r.error, valores };
  await anotar(user, "CREAR", "cita", r.id, `${datos.data.dia} ${datos.data.hora}`);
  refrescar();
  redirect(`/panel/citas/${r.id}?creada=1`);
}

export async function moverDesdeFormulario(id: string, _: Estado, fd: FormData): Promise<Estado> {
  const user = await sesionParaCita(id);
  const datos = esquemaMover.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  // Ni sacar una cita de otro ni meterle una a otro
  if (!user || !puedeGestionar(user, await idDeProfesional(datos.data.profesional))) return { error: SOLO_LO_TUYO };
  const r = await moverCita(id, datos.data);
  if (!r.ok) return { error: r.error };
  await anotar(user, "MOVER", "cita", id, `→ ${datos.data.dia} ${datos.data.hora} ${datos.data.profesional}`);
  refrescar();
  redirect(`/panel/citas/${id}?movida=1`);
}

/** Arrastrar y soltar en la agenda. Recibe el instante de destino en ISO. */
export async function moverArrastrando(id: string, profesionalSlug: string, inicioIso: string) {
  const user = await sesionParaCita(id);
  const inicio = new Date(inicioIso);
  if (isNaN(inicio.getTime())) return { ok: false as const, error: "Hora no válida" };
  if (!user || !puedeGestionar(user, await idDeProfesional(profesionalSlug))) return { ok: false as const, error: SOLO_LO_TUYO };
  const r = await moverCita(id, { profesional: profesionalSlug, dia: diaDe(inicio), hora: formatoHora(inicio) });
  if (r.ok) {
    await anotar(user, "MOVER", "cita", id, `→ ${diaDe(inicio)} ${formatoHora(inicio)} ${profesionalSlug}`);
    refrescar();
  }
  return r;
}

// ---------- Pacientes ----------

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

// ---------- Importar pacientes (solo ADMIN) ----------

export type EstadoImportacion = {
  error?: string;
  comprobado?: { validas: FilaPaciente[]; errores: { linea: number; texto: string; motivo: string }[]; repetidas: number };
  hecho?: { creados: number; yaExistian: number };
};

/** Paso 1: lee el CSV y dice qué entraría. No escribe nada. */
export async function comprobarImportacion(_: EstadoImportacion, fd: FormData): Promise<EstadoImportacion> {
  await requerirAdmin();
  const fichero = fd.get("fichero");
  if (!(fichero instanceof File) || !fichero.size) return { error: "Elige un fichero CSV." };
  const r = prepararPacientes(leerCsv(decodificar(new Uint8Array(await fichero.arrayBuffer()))));
  return "error" in r ? { error: r.error } : { comprobado: { ...r, errores: r.errores.slice(0, 100) } };
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

// ---------- Bloqueos ----------

// "2026-09-18T13:00" (hora de Madrid, de un <input type="datetime-local">) → instante UTC
const aInstanteLocal = (s: string) => {
  const [dia, hora] = s.split("T");
  const [h, m] = hora.split(":").map(Number);
  return aInstante(dia, h * 60 + m);
};

export async function crearBloqueo(_: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirSesion();
  const datos = esquemaBloqueo.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  const inicio = aInstanteLocal(datos.data.inicio);
  const fin = aInstanteLocal(datos.data.fin);
  if (fin <= inicio) return { error: "El final tiene que ser posterior al inicio." };
  const profesionalId = datos.data.profesionalId || null;
  if (!puedeGestionar(user, profesionalId)) return { error: profesionalId ? SOLO_LO_TUYO : "Un bloqueo de toda la clínica lo pone recepción o administración." };

  const bloqueo = await prisma.bloqueo.create({ data: { profesionalId, inicio, fin, motivo: datos.data.motivo } });
  await anotar(user, "CREAR", "bloqueo", bloqueo.id, `${datos.data.inicio} → ${datos.data.fin}`);
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
  const { user } = await requerirSesion();
  const suyos = gestionaTodo(user) ? {} : { profesionalId: user.profesionalId };
  if ((await prisma.bloqueo.deleteMany({ where: { id, ...suyos } })).count) await anotar(user, "BORRAR", "bloqueo", id);
  refrescar();
}

// ---------- Configuración (solo ADMIN) ----------

/** "Estudio de la pisada" → "estudio-de-la-pisada"; si ya existe, "-2", "-3"… El slug va en las URL de /reservar y no cambia al renombrar. */
async function slugLibre(nombre: string, existe: (slug: string) => Promise<unknown>) {
  const base = normalizarNombre(nombre).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sin-nombre";
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (slug !== "cualquiera" && !(await existe(slug))) return slug; // "cualquiera" es el «me da igual» de la reserva
  }
}

/** id = null: alta. */
export async function guardarServicio(id: string | null, _: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirAdmin();
  const datos = esquemaServicio.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  const { precio, ...resto } = datos.data;
  const data = { ...resto, precioCent: Math.round(precio * 100) };
  if (id) await prisma.servicio.update({ where: { id }, data });
  else {
    const slug = await slugLibre(data.nombre, (slug) => prisma.servicio.findUnique({ where: { slug } }));
    await prisma.servicio.create({ data: { ...data, slug, orden: await prisma.servicio.count() } });
  }
  await anotar(user, id ? "EDITAR" : "CREAR", "configuracion", id, `servicio: ${data.nombre}, ${data.duracionMin} min, ${precio} €`);
  revalidatePath("/", "layout");
  return { ok: id ? "Guardado." : "Servicio creado." };
}

/** id = null: alta. Nace sin horario: hasta que se le ponga, no ofrece huecos. */
export async function guardarProfesional(id: string | null, _: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirAdmin();
  const datos = esquemaProfesional.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  if (id) await prisma.profesional.update({ where: { id }, data: datos.data });
  else {
    const slug = await slugLibre(datos.data.nombre, (slug) => prisma.profesional.findUnique({ where: { slug } }));
    await prisma.profesional.create({ data: { ...datos.data, slug, orden: await prisma.profesional.count() } });
  }
  await anotar(user, id ? "EDITAR" : "CREAR", "configuracion", id, `profesional: ${datos.data.nombre}`);
  revalidatePath("/", "layout");
  return { ok: id ? "Guardado." : "Profesional creado. Ponle horario aquí abajo para que admita citas." };
}

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export async function guardarHorario(profesionalId: string, _: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirAdmin();
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
  await anotar(user, "EDITAR", "configuracion", profesionalId, "horario semanal");
  revalidatePath("/", "layout");
  return { ok: "Horario guardado. Las citas que ya existían no cambian." };
}

// ---------- Usuarios (solo ADMIN) ----------

const emailRepetido = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** El usuario nuevo no tiene contraseña: recibe un enlace para elegirla. */
export async function crearUsuario(_: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirAdmin();
  const valores = Object.fromEntries([...fd].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const datos = esquemaUsuario.safeParse(valores);
  if (!datos.success) return { error: primerError(datos.error), valores };
  try {
    const { profesionalId, ...resto } = datos.data;
    // Hash de un valor aleatorio que nadie conoce: hasta que use el enlace, no hay contraseña que acierte.
    const usuario = await prisma.usuario.create({ data: { ...resto, profesionalId: profesionalId || null, passwordHash: await hash(nuevoToken(), 10) } });
    const enviado = await enviarAcceso(usuario, true);
    await anotar(user, "CREAR", "usuario", usuario.id, `${usuario.email}, rol ${usuario.rol}`);
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
  const { user } = await requerirAdmin();
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
  await anotar(user, "EDITAR", "usuario", id, usuario.rol === datos.data.rol ? datos.data.email : `${datos.data.email}, rol ${usuario.rol} → ${datos.data.rol}`);
  refrescar();
  return { ok: "Guardado." };
}

export async function borrarUsuario(id: string) {
  const { user } = await requerirAdmin();
  // Ni a uno mismo (siempre queda al menos un administrador) ni a los de la demo.
  const usuario = id === user.id ? null : await prisma.usuario.findFirst({ where: { id, demo: false } });
  if (usuario) {
    await prisma.usuario.delete({ where: { id } });
    await anotar(user, "BORRAR", "usuario", id, usuario.email);
  }
  refrescar();
}

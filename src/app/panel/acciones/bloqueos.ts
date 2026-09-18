"use server";

import { anotar } from "@/lib/auditoria";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aInstante, hoy, sumarDias } from "@/lib/fechas";
import { festivosNacionales } from "@/lib/festivos";
import { gestionaTodo, puedeGestionar, SOLO_LO_TUYO } from "@/lib/permisos";
import { esquemaBloqueo } from "@/lib/validacion";
import { type Estado, primerError, refrescar } from "./comun";

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

/** Bloquea toda la clínica los festivos nacionales de ese año que aún no hayan pasado. Se puede repetir: no duplica. */
export async function anadirFestivos(_: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirSesion();
  if (!gestionaTodo(user)) return { error: "Los festivos de toda la clínica los pone recepción o administración." };
  const anio = Number(fd.get("anio"));
  if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) return { error: "Año no válido" };

  const festivos = festivosNacionales(anio).filter((f) => f.dia >= hoy());
  const yaPuestos = new Set((await prisma.bloqueo.findMany({ where: { profesionalId: null, inicio: { in: festivos.map((f) => aInstante(f.dia)) } }, select: { inicio: true } })).map((b) => b.inicio.getTime()));
  const nuevos = festivos.filter((f) => !yaPuestos.has(aInstante(f.dia).getTime()));
  if (!nuevos.length) return { ok: `Los festivos nacionales de ${anio} ya estaban puestos.` };
  await prisma.bloqueo.createMany({ data: nuevos.map((f) => ({ profesionalId: null, inicio: aInstante(f.dia), fin: aInstante(sumarDias(f.dia, 1)), motivo: `Festivo: ${f.nombre}` })) });
  await anotar(user, "CREAR", "bloqueo", null, `${nuevos.length} festivos nacionales de ${anio}`);

  const afectadas = await prisma.cita.count({ where: { estado: "CONFIRMADA", OR: nuevos.map((f) => ({ inicio: { gte: aInstante(f.dia), lt: aInstante(sumarDias(f.dia, 1)) } })) } });
  refrescar();
  return { ok: `${nuevos.length} festivos bloqueados. Añade a mano los de tu comunidad y tu municipio.${afectadas ? ` Ojo: hay ${afectadas} ${afectadas === 1 ? "cita confirmada" : "citas confirmadas"} en esos días; revísalas.` : ""}` };
}

export async function borrarBloqueo(id: string) {
  const { user } = await requerirSesion();
  const suyos = gestionaTodo(user) ? {} : { profesionalId: user.profesionalId };
  if ((await prisma.bloqueo.deleteMany({ where: { id, ...suyos } })).count) await anotar(user, "BORRAR", "bloqueo", id);
  refrescar();
}

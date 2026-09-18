"use server";

import { revalidatePath } from "next/cache";
import { anotar } from "@/lib/auditoria";
import { requerirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { minutosAHora } from "@/lib/fechas";
import { normalizarNombre } from "@/lib/pacientes";
import { esquemaHorario, esquemaProfesional, esquemaServicio } from "@/lib/validacion";
import { type Estado, primerError } from "./comun";

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
    // Un servicio nuevo lo hacen todos hasta que se desmarque en la ficha de alguien: si naciera sin nadie, no se podría reservar.
    const todos = await prisma.profesional.findMany({ select: { id: true } });
    await prisma.servicio.create({ data: { ...data, slug, orden: await prisma.servicio.count(), profesionales: { connect: todos } } });
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
  // Las casillas de «servicios que hace». Los ids que no existan, Prisma los rechaza.
  const servicios = fd.getAll("servicios").filter((v): v is string => typeof v === "string").map((id) => ({ id }));
  if (id) await prisma.profesional.update({ where: { id }, data: { ...datos.data, servicios: { set: servicios } } });
  else {
    const slug = await slugLibre(datos.data.nombre, (slug) => prisma.profesional.findUnique({ where: { slug } }));
    await prisma.profesional.create({ data: { ...datos.data, slug, orden: await prisma.profesional.count(), servicios: { connect: servicios } } });
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
  const tramos: { diaSemana: number; minInicio: number; minFin: number }[] = [];
  for (const d of [1, 2, 3, 4, 5, 6, 7]) {
    for (const t of ["m", "t"]) {
      const i = datos.data[`${t}${d}i`];
      const f = datos.data[`${t}${d}f`];
      if (!i && !f) continue;
      if (!i || !f) return { error: "Cada tramo necesita hora de inicio y de fin." };
      if (aMinutos(f) <= aMinutos(i)) return { error: `El tramo ${minutosAHora(aMinutos(i))}–${minutosAHora(aMinutos(f))} acaba antes de empezar.` };
      // La agenda y la reserva van en una rejilla de 15 minutos: un horario a las 9:10 daría huecos que luego no se pueden mover.
      if (aMinutos(i) % 15 || aMinutos(f) % 15) return { error: "Las horas van de 15 en 15 minutos: en punto, y cuarto, y media o menos cuarto." };
      const anterior = tramos.at(-1);
      if (anterior?.diaSemana === d && aMinutos(i) < anterior.minFin) return { error: "El tramo de tarde empieza antes de que acabe el de mañana." };
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

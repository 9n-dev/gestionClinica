"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aInstante } from "@/lib/fechas";
import { cancelarCita } from "@/lib/reservas";
import { esquemaBloqueo } from "@/lib/validacion";

export async function cancelarDesdePanel(id: string) {
  await requerirSesion();
  await cancelarCita({ id });
  revalidatePath("/panel", "layout");
}

export async function marcarAtendida(id: string) {
  await requerirSesion();
  await prisma.cita.updateMany({ where: { id, estado: "CONFIRMADA" }, data: { estado: "ATENDIDA" } });
  revalidatePath("/panel", "layout");
}

export type EstadoBloqueo = { error?: string; ok?: string };

// "2026-09-18T13:00" (hora de Madrid, de un <input type="datetime-local">) → instante UTC
const aInstanteLocal = (s: string) => {
  const [dia, hora] = s.split("T");
  const [h, m] = hora.split(":").map(Number);
  return aInstante(dia, h * 60 + m);
};

export async function crearBloqueo(_: EstadoBloqueo, fd: FormData): Promise<EstadoBloqueo> {
  await requerirSesion();
  const datos = esquemaBloqueo.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: Object.values(z.flattenError(datos.error).fieldErrors).flat()[0] ?? "Datos no válidos" };
  const inicio = aInstanteLocal(datos.data.inicio);
  const fin = aInstanteLocal(datos.data.fin);
  if (fin <= inicio) return { error: "El final tiene que ser posterior al inicio." };
  const profesionalId = datos.data.profesionalId || null;

  await prisma.bloqueo.create({ data: { profesionalId, inicio, fin, motivo: datos.data.motivo } });
  const afectadas = await prisma.cita.count({
    where: { estado: "CONFIRMADA", inicio: { lt: fin }, fin: { gt: inicio }, ...(profesionalId ? { profesionalId } : {}) },
  });
  revalidatePath("/panel", "layout");
  return {
    ok: afectadas
      ? `Bloqueo creado. Ojo: hay ${afectadas} ${afectadas === 1 ? "cita confirmada" : "citas confirmadas"} en ese periodo; no se cancelan solas, revísalas en la agenda.`
      : "Bloqueo creado. Esas horas ya no se ofrecen en la web.",
  };
}

export async function borrarBloqueo(id: string) {
  await requerirSesion();
  await prisma.bloqueo.deleteMany({ where: { id } });
  revalidatePath("/panel", "layout");
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { anotar } from "@/lib/auditoria";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { diaDe, formatoHora, sumarDias } from "@/lib/fechas";
import { puedeGestionar, SOLO_LO_TUYO } from "@/lib/permisos";
import { cancelarCita, crearCita, moverCita } from "@/lib/reservas";
import { esquemaCitaPanel, esquemaCobro, esquemaMover, esquemaNotas } from "@/lib/validacion";
import { type Estado, primerError, refrescar } from "./comun";

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
  const { repetirCada, veces, ...cita } = datos.data;
  const r = await crearCita(cita, true);
  if (!r.ok) return { error: r.error, valores };
  await anotar(user, "CREAR", "cita", r.id, `${cita.dia} ${cita.hora}`);
  // Si estaba en la lista de espera para este servicio, ya no: tiene su cita.
  const creada = await prisma.cita.findUniqueOrThrow({ where: { id: r.id }, select: { pacienteId: true, servicioId: true } });
  await prisma.enEspera.updateMany({ where: { ...creada, atendidoAt: null }, data: { atendidoAt: new Date() } });

  // Serie: mismo día de la semana y misma hora. Si una fecha no tiene hueco, se salta y se avisa; no se busca otra hora sola.
  const serie = { creadas: 0, sinHueco: [] as string[] };
  for (let n = 1; repetirCada && n < veces; n++) {
    const dia = sumarDias(cita.dia, n * repetirCada * 7);
    const otra = await crearCita({ ...cita, dia }, true);
    if (otra.ok) {
      serie.creadas++;
      await anotar(user, "CREAR", "cita", otra.id, `${dia} ${cita.hora} (serie)`);
    } else serie.sinHueco.push(dia);
  }
  refrescar();
  redirect(`/panel/citas/${r.id}?creada=1${repetirCada ? `&serie=${serie.creadas}&sinHueco=${serie.sinHueco.join(",")}` : ""}`);
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

/** Cobro en la clínica. No se cobra una cita cancelada ni a la que no vino. */
export async function cobrarCita(id: string, _: Estado, fd: FormData): Promise<Estado> {
  const user = await sesionParaCita(id);
  if (!user) return { error: SOLO_LO_TUYO };
  const datos = esquemaCobro.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  const cobradoCent = Math.round(datos.data.importe * 100);
  const { count } = await prisma.cita.updateMany({ where: { id, pagadaAt: null, estado: { in: ["CONFIRMADA", "ATENDIDA"] } }, data: { pagadaAt: new Date(), formaPago: datos.data.formaPago, cobradoCent } });
  if (!count) return { error: "Esta cita no se puede cobrar (ya está cobrada, o está cancelada o sin presentarse)." };
  await anotar(user, "EDITAR", "cita", id, `cobro: ${datos.data.importe} € ${datos.data.formaPago}`);
  refrescar();
  return { ok: "Cobro apuntado." };
}

export async function anularCobro(id: string) {
  const user = await sesionParaCita(id);
  if (!user) return;
  const { count } = await prisma.cita.updateMany({ where: { id, pagadaAt: { not: null } }, data: { pagadaAt: null, formaPago: null, cobradoCent: null } });
  if (count) await anotar(user, "EDITAR", "cita", id, "cobro anulado");
  refrescar();
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

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { crearCita } from "@/lib/reservas";
import { esquemaReserva } from "@/lib/validacion";

export type EstadoReserva = { error?: string; campos?: Record<string, string[] | undefined>; valores?: Record<string, string> };

export async function reservar(_: EstadoReserva, fd: FormData): Promise<EstadoReserva> {
  const valores = Object.fromEntries([...fd].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  // Campo trampa: invisible para personas, los bots lo rellenan.
  if (valores.web) return { error: "No se ha podido completar la reserva." };

  const datos = esquemaReserva.safeParse(valores);
  if (!datos.success) return { error: "Revisa los campos marcados.", campos: z.flattenError(datos.error).fieldErrors, valores };

  const r = await crearCita(datos.data);
  if (!r.ok) return { error: r.error, valores };
  redirect(`/cita/${r.token}?nueva=1`);
}

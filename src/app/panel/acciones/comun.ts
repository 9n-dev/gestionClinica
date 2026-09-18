import { revalidatePath } from "next/cache";
import type { z } from "zod";

// Lo que comparten las acciones del panel (src/app/panel/acciones/*). No es un fichero "use server": aquí no hay acciones.

export type Estado = { error?: string; ok?: string; campos?: Record<string, string[] | undefined>; valores?: Record<string, string> };

export const primerError = (e: z.ZodError) => e.issues[0]?.message ?? "Datos no válidos";
export const refrescar = () => revalidatePath("/panel", "layout");

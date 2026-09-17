import { z } from "zod";
import { esDia } from "./fechas";

export const esquemaLogin = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});

const dia = z.string().refine(esDia, "Fecha no válida");

// Solo datos de contacto: no se pide ningún dato de salud.
export const esquemaReserva = z.object({
  servicio: z.string().min(1).max(80),
  profesional: z.string().min(1).max(80), // slug o "cualquiera"
  dia,
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida"),
  nombre: z.string().trim().min(3, "Escribe tu nombre y apellidos").max(80, "Máximo 80 caracteres"),
  telefono: z
    .string()
    .transform((t) => t.replace(/[\s.-]/g, "").replace(/^(\+34|0034)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{8}$/, "Escribe un teléfono español de 9 cifras")),
  email: z.email("Escribe un email válido, por ejemplo nombre@correo.es").max(200).transform((e) => e.toLowerCase()),
  privacidad: z.literal("on", "Necesitamos que aceptes la política de privacidad para gestionar tu cita"),
});

const fechaHoraLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha no válida");

export const esquemaBloqueo = z.object({
  profesionalId: z.string().max(40), // "" = toda la clínica
  inicio: fechaHoraLocal,
  fin: fechaHoraLocal,
  motivo: z.string().trim().min(2, "Indica un motivo").max(120),
});

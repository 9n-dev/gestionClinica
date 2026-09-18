import { z } from "zod";
import { esDia } from "./fechas";

export const esquemaLogin = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});

export const esquemaEmail = z.object({ email: z.email("Escribe un email válido").max(200).transform((e) => e.toLowerCase()) });

export const esquemaPasswordNueva = z
  .object({ password: z.string().min(10, "Mínimo 10 caracteres").max(200), repetir: z.string() })
  .refine((d) => d.password === d.repetir, "Las dos contraseñas no coinciden");

export const esquemaUsuario = esquemaEmail.extend({
  nombre: z.string().trim().min(2, "Escribe el nombre").max(80),
  rol: z.enum(["ADMIN", "EQUIPO"]),
  profesionalId: z.string().max(40), // "" = no es un profesional de la clínica
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

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida");
const telefono = z
  .string()
  .transform((t) => t.replace(/[\s.-]/g, "").replace(/^(\+34|0034)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{8}$/, "Escribe un teléfono español de 9 cifras"));
const emailOpcional = z
  .string()
  .trim()
  .transform((e) => e.toLowerCase())
  .pipe(z.union([z.literal(""), z.email("Escribe un email válido")]))
  .transform((e) => e || null);

// Cita creada desde el panel: sin antelación mínima, email opcional.
export const esquemaCitaPanel = z.object({
  servicio: z.string().min(1, "Elige un servicio").max(80),
  profesional: z.string().min(1, "Elige un profesional").max(80),
  dia,
  hora,
  nombre: z.string().trim().min(3, "Escribe el nombre del paciente").max(80),
  telefono,
  email: emailOpcional,
  notas: z.string().trim().max(1000).optional(),
  // Serie: la misma cita cada N semanas, `veces` en total (con la primera). 0 = cita suelta.
  repetirCada: z.coerce.number().int().min(0).max(12).default(0),
  veces: z.coerce.number().int().min(2).max(8).default(2),
});

export const esquemaPaciente = z.object({
  nombre: z.string().trim().min(3, "Escribe el nombre y los apellidos").max(80),
  telefono,
  email: emailOpcional,
  notas: z.string().trim().max(1000),
});

export const esquemaEspera = z.object({
  servicioId: z.string().min(1, "Elige un servicio").max(40),
  profesionalId: z.string().max(40), // "" = cualquiera
  preferencia: z.string().trim().max(200),
});

export const FORMAS_PAGO = { EFECTIVO: "Efectivo", TARJETA: "Tarjeta", BIZUM: "Bizum", TRANSFERENCIA: "Transferencia" } as const;
export const esquemaCobro = z.object({
  importe: z.coerce.number("Escribe el importe").min(0, "El importe no puede ser negativo").max(9999),
  formaPago: z.enum(["EFECTIVO", "TARJETA", "BIZUM", "TRANSFERENCIA"], "Elige la forma de pago"),
});

export const esquemaMover = z.object({ profesional: z.string().min(1).max(80), dia, hora });

export const esquemaNotas = z.object({ notas: z.string().trim().max(1000) });

export const esquemaServicio = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre").max(80),
  descripcion: z.string().trim().min(2, "Escribe la descripción").max(500),
  duracionMin: z.coerce.number().int().min(15, "Mínimo 15 minutos").max(240).multipleOf(15, "La duración va de 15 en 15 minutos"),
  precio: z.coerce.number().min(0).max(9999),
  activo: z.literal("on").optional().transform(Boolean),
});

export const esquemaProfesional = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre").max(80),
  titulo: z.string().trim().min(2, "Escribe el título").max(160),
  bio: z.string().trim().min(2, "Escribe la presentación").max(1000),
  activo: z.literal("on").optional().transform(Boolean),
});

// Horario semanal: por cada día, tramo de mañana y de tarde (vacío = no trabaja).
const horaOpcional = z.union([z.literal(""), hora]);
export const esquemaHorario = z.object(
  Object.fromEntries([1, 2, 3, 4, 5, 6, 7].flatMap((d) => [`m${d}i`, `m${d}f`, `t${d}i`, `t${d}f`].map((k) => [k, horaOpcional]))),
);

const fechaHoraLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha no válida");

export const esquemaBloqueo = z.object({
  profesionalId: z.string().max(40), // "" = toda la clínica
  inicio: fechaHoraLocal,
  fin: fechaHoraLocal,
  motivo: z.string().trim().min(2, "Indica un motivo").max(120),
});

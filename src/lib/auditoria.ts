import { prisma } from "./db";

export type Accion = "VER" | "CREAR" | "EDITAR" | "BORRAR" | "EXPORTAR" | "MOVER" | "CANCELAR" | "ESTADO" | "ENTRAR";
export type Entidad = "paciente" | "cita" | "usuario" | "configuracion" | "bloqueo" | "sesion";

/**
 * Apunta quién hizo qué. En `detalle`, nunca datos del paciente: ids, fechas o nombres de campos.
 * VER se apunta una vez cada 15 minutos por persona y ficha: guardar las notas vuelve a pintar la página
 * y no es un acceso nuevo.
 */
export async function anotar(quien: { id: string; email: string }, accion: Accion, entidad: Entidad, entidadId: string | null = null, detalle?: string) {
  if (accion === "VER" && (await prisma.auditoria.findFirst({ where: { usuarioId: quien.id, accion, entidad, entidadId, creadoAt: { gt: new Date(Date.now() - 15 * 60_000) } } }))) return;
  await prisma.auditoria.create({ data: { usuarioId: quien.id, usuarioEmail: quien.email, accion, entidad, entidadId, detalle } });
}

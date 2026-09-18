import { prisma } from "./db";

/** "  José Luis  MONTERO " → "jose luis montero". Identifica al paciente junto al teléfono y permite buscar sin acentos. */
export const normalizarNombre = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

export const ELIMINADO = "Paciente eliminado";

/**
 * Derecho de supresión. Anonimiza en vez de borrar: las citas pasadas se quedan, sin nombre, para que la agenda
 * y los números de meses anteriores sigan cuadrando. Se van nombre, teléfono, email, notas y los emails y mensajes
 * guardados de sus citas (llevan su nombre o su teléfono).
 */
export async function suprimirPaciente(id: string, ahora = new Date()): Promise<{ ok: true } | { ok: false; error: string }> {
  const pendientes = await prisma.cita.count({ where: { pacienteId: id, estado: "CONFIRMADA", inicio: { gt: ahora } } });
  if (pendientes) return { ok: false, error: `Tiene ${pendientes === 1 ? "una cita pendiente" : `${pendientes} citas pendientes`}. Cancélalas antes: al borrar sus datos ya no habría a quién avisar.` };
  // Por cita y no por destinatario: un teléfono o un email pueden ser de varios pacientes (la madre que reserva para su
  // hijo), y borrar por ellos se llevaría lo de otro. No quedan emails sueltos: la retención los borra junto a su cita.
  await prisma.$transaction([
    prisma.emailEnviado.deleteMany({ where: { cita: { pacienteId: id } } }),
    prisma.mensajeEnviado.deleteMany({ where: { cita: { pacienteId: id } } }),
    prisma.enEspera.deleteMany({ where: { pacienteId: id } }),
    prisma.cita.updateMany({ where: { pacienteId: id }, data: { pacienteNombre: ELIMINADO, pacienteTelefono: "", pacienteEmail: null, notas: null } }),
    // nombreNorm único por paciente: (telefono, nombreNorm) sigue siendo una clave válida y ninguna reserva nueva coincide con él
    prisma.paciente.update({ where: { id }, data: { nombre: ELIMINADO, nombreNorm: `eliminado-${id}`, telefono: "", email: null, notas: null, eliminadoAt: ahora } }),
  ]);
  return { ok: true };
}

/** Derecho de acceso y portabilidad: todo lo que hay de un paciente, en un formato que lee una máquina. */
export async function datosDePaciente(id: string) {
  const p = await prisma.paciente.findUnique({
    where: { id },
    include: { enEspera: { include: { servicio: true } }, citas: { orderBy: { inicio: "asc" }, include: { servicio: true, profesional: true, emails: { orderBy: { enviadoAt: "asc" } }, mensajes: { orderBy: { enviadoAt: "asc" } } } } },
  });
  if (!p) return null;
  return {
    exportadoEl: new Date().toISOString(),
    paciente: { nombre: p.nombre, telefono: p.telefono, email: p.email, notasInternas: p.notas, pacienteDesde: p.creadoAt.toISOString() },
    listaDeEspera: p.enEspera.map((e) => ({ servicio: e.servicio.nombre, preferencia: e.preferencia, apuntadoEl: e.creadoAt.toISOString(), cerradoEl: e.atendidoAt?.toISOString() ?? null })),
    citas: p.citas.map((c) => ({
      inicio: c.inicio.toISOString(),
      fin: c.fin.toISOString(),
      servicio: c.servicio.nombre,
      precioEuros: c.precioCent / 100,
      cobro: c.pagadaAt ? { euros: (c.cobradoCent ?? 0) / 100, formaPago: c.formaPago, fecha: c.pagadaAt.toISOString() } : null,
      profesional: c.profesional.nombre,
      estado: c.estado,
      reservadaEl: c.creadaAt.toISOString(),
      datosAlReservar: { nombre: c.pacienteNombre, telefono: c.pacienteTelefono, email: c.pacienteEmail },
      notasInternas: c.notas,
      emailsEnviados: c.emails.map((e) => ({ tipo: e.tipo, para: e.para, asunto: e.asunto, enviadoEl: e.enviadoAt.toISOString() })),
      mensajesEnviados: c.mensajes.map((m) => ({ tipo: m.tipo, canal: m.canal, para: m.para, texto: m.texto, enviadoEl: m.enviadoAt.toISOString() })),
    })),
  };
}

/** Fichas que pueden ser la misma persona: mismo teléfono (reservó como «Pepe» y como «José») o mismo nombre (cambió de móvil). */
export const posiblesDuplicados = (p: { id: string; telefono: string; nombreNorm: string }) =>
  prisma.paciente.findMany({
    where: { id: { not: p.id }, eliminadoAt: null, OR: [{ telefono: p.telefono }, { nombreNorm: p.nombreNorm }] },
    include: { _count: { select: { citas: true } } },
    orderBy: { creadoAt: "asc" },
  });

/**
 * Junta dos fichas: `destino` se queda con las citas, la lista de espera y el historial de accesos de `origen`, y
 * con su email y sus notas si le faltaban. `origen` desaparece. Solo entre posibles duplicados, para que un despiste
 * no mezcle a dos personas que no tienen nada que ver.
 */
export async function fusionarPacientes(destinoId: string, origenId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const destino = await prisma.paciente.findUnique({ where: { id: destinoId } });
  if (!destino || destino.eliminadoAt) return { ok: false, error: "Esa ficha ya no existe." };
  const origen = (await posiblesDuplicados(destino)).find((p) => p.id === origenId);
  if (!origen) return { ok: false, error: "Esas dos fichas no comparten ni teléfono ni nombre." };
  await prisma.$transaction([
    prisma.cita.updateMany({ where: { pacienteId: origenId }, data: { pacienteId: destinoId } }),
    prisma.enEspera.updateMany({ where: { pacienteId: origenId }, data: { pacienteId: destinoId } }),
    prisma.auditoria.updateMany({ where: { entidad: "paciente", entidadId: origenId }, data: { entidadId: destinoId } }),
    prisma.paciente.update({ where: { id: destinoId }, data: { email: destino.email ?? origen.email, notas: [destino.notas, origen.notas].filter(Boolean).join("\n") || null, creadoAt: origen.creadoAt < destino.creadoAt ? origen.creadoAt : destino.creadoAt } }),
    prisma.paciente.delete({ where: { id: origenId } }),
  ]);
  return { ok: true };
}

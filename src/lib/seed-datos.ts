import { randomBytes } from "node:crypto";
import { hashSync } from "bcryptjs";
import type { prisma as Prisma } from "./db";
import { USUARIO_DEMO } from "./clinica";
import { calcularHuecos, finDe, franjasDe, type Intervalo, type Tramo } from "./disponibilidad";
import { plantillas } from "./emails/plantillas";
import { aInstante, hoy, sumarDias } from "./fechas";
import { normalizarNombre } from "./pacientes";

// Datos de la demo. Lo usan `npm run seed` y el cron de reinicio diario.

const SERVICIOS = [
  { slug: "consulta-general", nombre: "Consulta general", duracionMin: 30, precioCent: 4000,
    descripcion: "Primera valoración o revisión de cualquier molestia en el pie: dolor, durezas, uñas, piel. Exploramos, te explicamos qué ocurre y te proponemos un plan." },
  { slug: "quiropodia", nombre: "Quiropodia", duracionMin: 45, precioCent: 4500,
    descripcion: "Cuidado integral del pie: corte y fresado de uñas, eliminación de durezas y callosidades, tratamiento de helomas e hidratación final." },
  { slug: "estudio-de-la-pisada", nombre: "Estudio de la pisada", duracionMin: 60, precioCent: 8000,
    descripcion: "Análisis biomecánico en estático y en marcha con plataforma de presiones y vídeo. Imprescindible antes de unas plantillas o si corres con dolor." },
  { slug: "plantillas-revision", nombre: "Plantillas a medida – revisión", duracionMin: 30, precioCent: 3500,
    descripcion: "Revisión y ajuste de tus plantillas personalizadas: desgaste, adaptación al calzado y evolución de los síntomas." },
];

const PROFESIONALES = [
  { slug: "laura-serrano", nombre: "Dra. Laura Serrano", titulo: "Podóloga y directora clínica. Colegiada n.º 28-0000", sabados: true,
    bio: "Graduada en Podología por la Universidad Complutense y máster en biomecánica. Más de quince años tratando pies de deportistas, mayores y pacientes con pie de riesgo. Fundó la clínica en 2011 con una idea sencilla: explicar bien y tratar sin prisa." },
  { slug: "marcos-ortiz", nombre: "Dr. Marcos Ortiz", titulo: "Podólogo, especialista en podología deportiva. Colegiado n.º 28-0001", sabados: false,
    bio: "Graduado en Podología por la Universidad Rey Juan Carlos y especialista en podología deportiva. Corredor popular, se ocupa de los estudios de la pisada y de las plantillas a medida de la clínica." },
];

const PACIENTES = [
  "Carmen Ruiz Molina", "Antonio Vega Prieto", "Lucía Campos Gil", "Javier Moreno Sanz", "Pilar Nieto Rubio",
  "Francisco Marín Soler", "Elena Cano Pastor", "Manuel Rey Aguilar", "Rosa Ibáñez Lozano", "David Pascual Mora",
  "Isabel Gallego Cruz", "Sergio Bravo Peña", "Teresa Vidal Román", "Alberto Crespo Luna", "Nuria Santos Bermejo",
  "Raúl Herrero Calvo", "Marta Esteban Rivas", "José Luis Montero Díez", "Beatriz Carmona Vera", "Andrés Blanco Otero",
  "Cristina Arias Redondo", "Óscar Velasco Pardo", "Silvia Benítez Rojo", "Emilio Fuentes Cabello", "Patricia Lorenzo Sáez",
  "Víctor Hidalgo Mesa", "Inés Robles Trujillo", "Guillermo Soto Navas", "Amparo Duran Cuesta", "Rubén Gallardo Espejo",
];

// PRNG determinista (mulberry32): la demo sale igual en cada reinicio del mismo día.
function azar(semilla: number) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const nuevoToken = () => randomBytes(24).toString("base64url");

export async function sembrar(prisma: typeof Prisma, nCitas = 40) {
  // Borrado en orden de dependencias
  await prisma.intento.deleteMany();
  await prisma.auditoria.deleteMany();
  await prisma.emailEnviado.deleteMany();
  await prisma.mensajeEnviado.deleteMany();
  await prisma.franjaOcupada.deleteMany();
  await prisma.enEspera.deleteMany();
  await prisma.cita.deleteMany();
  await prisma.paciente.deleteMany();
  await prisma.bloqueo.deleteMany();
  await prisma.horarioLaboral.deleteMany();
  await prisma.servicio.deleteMany();
  await prisma.profesional.deleteMany();
  await prisma.usuario.deleteMany();

  const passwordHash = hashSync(USUARIO_DEMO.password, 10);
  // demo: true los protege en el panel de usuarios (ni borrar, ni cambiar rol, ni cambiar contraseña).
  await prisma.usuario.create({ data: { email: USUARIO_DEMO.email, nombre: "Recepción (demo)", passwordHash, demo: true } });
  await prisma.usuario.create({ data: { email: "admin@podologiaserrano.es", nombre: "Administración (demo)", passwordHash, demo: true, rol: "ADMIN" } });

  const servicios = await Promise.all(SERVICIOS.map((s, orden) => prisma.servicio.create({ data: { ...s, orden } })));

  const pros = [];
  for (const [orden, { sabados, ...p }] of PROFESIONALES.entries()) {
    const tramos: Tramo[] = [1, 2, 3, 4, 5].flatMap((diaSemana) => [
      { diaSemana, minInicio: 9 * 60, minFin: 14 * 60 },
      { diaSemana, minInicio: 16 * 60, minFin: 20 * 60 },
    ]);
    if (sabados) tramos.push({ diaSemana: 6, minInicio: 9 * 60, minFin: 13 * 60 });
    const pro = await prisma.profesional.create({ data: { ...p, orden, horarios: { create: tramos }, servicios: { connect: servicios.map((s) => ({ id: s.id })) } } });
    // Cada profesional tiene su usuario (misma contraseña que el demo); su agenda se abre filtrada.
    await prisma.usuario.create({ data: { email: `${p.slug.split("-")[0]}@podologiaserrano.es`, nombre: p.nombre, passwordHash, demo: true, profesionalId: pro.id } });
    pros.push({ ...pro, tramos, ocupados: [] as Intervalo[] });
  }
  const [laura, marcos] = pros;

  const d0 = hoy();
  const bloqueos = [
    { profesionalId: laura.id, inicio: aInstante(sumarDias(d0, 3), 16 * 60), fin: aInstante(sumarDias(d0, 3), 20 * 60), motivo: "Formación: curso de ecografía" },
    { profesionalId: marcos.id, inicio: aInstante(sumarDias(d0, 9)), fin: aInstante(sumarDias(d0, 11)), motivo: "Vacaciones" },
    ...pros.map((p) => ({ profesionalId: p.id, inicio: aInstante(sumarDias(d0, 1), 13 * 60), fin: aInstante(sumarDias(d0, 1), 14 * 60), motivo: "Reunión de equipo" })),
  ];
  await prisma.bloqueo.createMany({ data: bloqueos });
  for (const b of bloqueos) pros.find((p) => p.id === b.profesionalId)!.ocupados.push(b);

  // Pacientes: cada uno con su teléfono fijo; alguno sin email, como los que piden cita por teléfono.
  const rnd = azar(Number(d0.replaceAll("-", "")));
  const elegir = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const pacientes = [];
  for (const [i, nombre] of (nCitas ? PACIENTES : []).entries()) {
    const nombreNorm = normalizarNombre(nombre);
    pacientes.push(await prisma.paciente.create({
      data: {
        nombre,
        nombreNorm,
        telefono: `6${String(Math.floor(rnd() * 1e8)).padStart(8, "0")}`,
        email: i % 7 === 6 ? null : `${nombreNorm.split(" ").slice(0, 2).join(".")}@ejemplo.com`,
        notas: i % 10 === 3 ? "Prefiere primera hora de la mañana." : null,
        creadoAt: aInstante(sumarDias(d0, -70 - i * 9)), // anteriores al historial sembrado
      },
    }));
  }

  // Citas: se colocan con la misma lógica de huecos que usa la reserva real.
  // Primero las de las próximas dos semanas; después, un historial de los dos meses anteriores para las fichas.
  const nPasadas = Math.round(nCitas * 0.6);
  const ahora = new Date();
  let creadas = 0;
  for (let intento = 0; creadas < nCitas + nPasadas && intento < nCitas * 40; intento++) {
    const pasada = creadas >= nCitas;
    const dia = pasada ? sumarDias(d0, -1 - Math.floor(rnd() * 60)) : sumarDias(d0, Math.floor(rnd() ** 1.5 * 14)); // algo más cargados los primeros días
    const pro = elegir(pros);
    const servicio = elegir(servicios);
    const huecos = calcularHuecos({ dia, duracionMin: servicio.duracionMin, tramos: pro.tramos, ocupados: pro.ocupados, desde: aInstante(pasada ? dia : d0) })
      .filter((h) => h.getUTCMinutes() % 30 === 0); // agenda realista: en punto o a y media
    if (!huecos.length) continue;
    const inicio = elegir(huecos);
    const fin = finDe(inicio, servicio.duracionMin);
    const paciente = pacientes[(creadas * 7) % pacientes.length]; // salteados: varios repiten visita
    const cancelada = creadas % 13 === 12;
    const cita = await prisma.cita.create({
      data: {
        servicioId: servicio.id,
        profesionalId: pro.id,
        inicio,
        fin,
        estado: cancelada ? "CANCELADA" : fin > ahora ? "CONFIRMADA" : creadas % 8 === 5 ? "NO_PRESENTADA" : "ATENDIDA",
        canceladaAt: cancelada ? ahora : null,
        precioCent: servicio.precioCent,
        pacienteId: paciente.id,
        pacienteNombre: paciente.nombre,
        pacienteTelefono: paciente.telefono,
        pacienteEmail: paciente.email,
        notas: creadas % 9 === 4 ? "Trae las plantillas del año pasado." : null,
        tokenCancelacion: nuevoToken(),
        franjas: cancelada ? undefined : { create: franjasDe(inicio, servicio.duracionMin).map((f) => ({ profesionalId: pro.id, inicio: f })) },
      },
    });
    if (!cancelada) pro.ocupados.push({ inicio, fin });
    // Unos cuantos emails de muestra para el panel (registrados, nunca enviados).
    if (!cancelada && !pasada && cita.pacienteEmail && creadas % 6 === 0) {
      const completa = { ...cita, servicio, profesional: pro };
      await prisma.emailEnviado.createMany({
        data: [
          { tipo: "CONFIRMACION_PACIENTE", canal: "CONSOLA", para: cita.pacienteEmail, citaId: cita.id, ...plantillas.confirmacionPaciente(completa) },
          { tipo: "AVISO_CLINICA", canal: "CONSOLA", para: "clinica@podologiaserrano.es", citaId: cita.id, ...plantillas.avisoClinica(completa) },
        ],
      });
    }
    // Y algún recordatorio al móvil de citas que ya pasaron.
    if (pasada && !cancelada && creadas % 5 === 0)
      await prisma.mensajeEnviado.create({
        data: { tipo: "RECORDATORIO", canal: "CONSOLA", para: `+34${paciente.telefono}`, citaId: cita.id, enviadoAt: new Date(inicio.getTime() - 86_400_000), texto: plantillas.recordatorioMovil({ ...cita, servicio, profesional: pro }).texto },
      });
    creadas++;
  }
  // Dos personas que quieren venir antes
  if (pacientes.length) {
    await prisma.enEspera.create({ data: { pacienteId: pacientes[4].id, servicioId: servicios[1].id, profesionalId: laura.id, preferencia: "Solo por las tardes", creadoAt: aInstante(sumarDias(d0, -3), 11 * 60) } });
    await prisma.enEspera.create({ data: { pacienteId: pacientes[11].id, servicioId: servicios[0].id, preferencia: "Cuanto antes, le duele al andar", creadoAt: aInstante(sumarDias(d0, -1), 17 * 60) } });
  }
  return { citas: creadas, bloqueos: bloqueos.length };
}

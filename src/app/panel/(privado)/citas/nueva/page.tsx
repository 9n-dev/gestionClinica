import type { Metadata } from "next";
import { FormularioAuto } from "@/components/FormularioAuto";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { esDia, formatoDia, formatoHora, formatoPrecio, hoy } from "@/lib/fechas";
import { huecosEnRango } from "@/lib/reservas";
import { FormularioCitaPanel } from "./formulario";

export const metadata: Metadata = { title: "Nueva cita" };

type Params = { profesional?: string; servicio?: string; dia?: string; hora?: string; paciente?: string };

export default async function NuevaCita({ searchParams }: { searchParams: Promise<Params> }) {
  const sesion = await requerirSesion();
  const sp = await searchParams;
  const [profesionales, servicios, paciente] = await Promise.all([
    prisma.profesional.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    prisma.servicio.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    sp.paciente ? prisma.paciente.findUnique({ where: { id: sp.paciente } }) : null, // desde la ficha: datos ya rellenos
  ]);
  const profesional = profesionales.find((p) => p.slug === (sp.profesional ?? sesion.user.profesionalSlug)) ?? profesionales[0];
  const servicio = servicios.find((s) => s.slug === sp.servicio) ?? servicios[0];
  const dia = esDia(sp.dia) ? sp.dia : hoy();

  const huecos = profesional && servicio ? (await huecosEnRango({ desde: dia, dias: 1, duracionMin: servicio.duracionMin, profesionalSlug: profesional.slug, desdePanel: true })).get(dia) ?? [] : [];
  const horas = huecos.map((h) => formatoHora(h.inicio));

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold">Nueva cita</h1>
      <p className="mt-2 text-pizarra">Para pacientes que llaman o piden hora en el mostrador. Se aplican las mismas reglas que en la web, pero sin antelación mínima.</p>

      <FormularioAuto action="/panel/citas/nueva" className="mt-6 grid gap-4 sm:grid-cols-3">
        {paciente && <input type="hidden" name="paciente" value={paciente.id} />}
        <div>
          <label htmlFor="profesional" className="etiqueta">Profesional</label>
          <select id="profesional" name="profesional" defaultValue={profesional?.slug} className="campo">
            {profesionales.map((p) => <option key={p.id} value={p.slug}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="servicio" className="etiqueta">Servicio</label>
          <select id="servicio" name="servicio" defaultValue={servicio?.slug} className="campo">
            {servicios.map((s) => <option key={s.id} value={s.slug}>{s.nombre} ({s.duracionMin} min, {formatoPrecio(s.precioCent)})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="dia" className="etiqueta">Día</label>
          <input id="dia" name="dia" type="date" defaultValue={dia} min={hoy()} className="campo" />
        </div>
        <noscript><button className="btn btn-secundario sm:col-span-3">Ver horas libres</button></noscript>
      </FormularioAuto>

      <h2 className="mt-8 text-xl font-bold first-letter:uppercase">{formatoDia(dia, { weekday: "long", day: "numeric", month: "long" })}, {profesional?.nombre}</h2>
      {horas.length && profesional && servicio ? (
        <div className="mt-3">
          <FormularioCitaPanel servicio={servicio.slug} profesional={profesional.slug} dia={dia} horas={horas} horaInicial={horas.includes(sp.hora ?? "") ? sp.hora : undefined}
            paciente={paciente ? { nombre: paciente.nombre, telefono: paciente.telefono, email: paciente.email ?? "" } : undefined} />
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-ambar-claro p-4">No hay ningún hueco libre ese día para ese servicio y profesional. Prueba otro día o revisa los bloqueos.</p>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { Tarifa } from "@/components/Tarifa";
import { CLINICA } from "@/lib/clinica";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Servicios y precios",
  description: "Consulta general, quiropodia, estudio de la pisada y revisión de plantillas a medida en Getafe. Duración y precio de cada servicio.",
};

const DUDAS = [
  { p: "¿Tengo que traer algo?", r: "Si vienes por dolor al caminar o correr, trae el calzado que más usas y tus plantillas, si tienes. Para el estudio de la pisada, ropa cómoda que deje la rodilla a la vista." },
  { p: "¿No sé qué servicio pedir?", r: "Pide una consulta general. Valoramos el pie y, si hace falta otra cosa, te lo explicamos allí mismo sin compromiso." },
  { p: "¿Puedo cancelar?", r: "Sí, hasta la misma hora de la cita, desde el enlace que te enviamos por email al reservar. Así otra persona aprovecha el hueco." },
];

export default async function Servicios() {
  const servicios = await prisma.servicio.findMany({ where: { activo: true }, orderBy: { orden: "asc" } });
  return (
    <div className="contenedor py-12">
      <h1 className="text-5xl font-extrabold">Servicios y precios</h1>
      <p className="mb-10 mt-4 max-w-[60ch] text-xl text-pizarra">
        Cuatro servicios, con su duración real y su precio final. Reservas online y pagas en la clínica.
      </p>
      <Tarifa servicios={servicios} />

      <section aria-labelledby="t-dudas" className="mt-16 max-w-[68ch]">
        <h2 id="t-dudas" className="text-3xl font-bold">Antes de venir</h2>
        <dl className="mt-6 space-y-6">
          {DUDAS.map((d) => (
            <div key={d.p}>
              <dt className="text-xl font-bold">{d.p}</dt>
              <dd className="mt-1">{d.r}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8">
          ¿Otra duda? Llámanos al <a href={CLINICA.telefonoHref} className="enlace">{CLINICA.telefono}</a>.
        </p>
      </section>
    </div>
  );
}

import Link from "next/link";
import { HuellaIsobaras } from "@/components/HuellaIsobaras";
import { Tarifa } from "@/components/Tarifa";
import { CLINICA, DIRECCION_COMPLETA } from "@/lib/clinica";
import { horarioPublico } from "@/lib/horario";
import { prisma } from "@/lib/db";
import { formatoFechaLarga, formatoHora, hoy, sumarDias } from "@/lib/fechas";
import { proximoHueco } from "@/lib/reservas";

export default async function Inicio() {
  const [servicios, profesionales] = await Promise.all([
    prisma.servicio.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    prisma.profesional.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
  ]);
  const consulta = servicios[0];
  const hueco = consulta ? await proximoHueco(consulta.duracionMin) : null;
  const cuando = hueco && (hueco.dia === hoy() ? "hoy" : hueco.dia === sumarDias(hoy(), 1) ? "mañana" : formatoFechaLarga(hueco.inicio));

  return (
    <>
      <section className="contenedor grid items-center gap-10 pb-16 pt-12 md:grid-cols-[1.25fr_1fr] md:pt-20">
        <div>
          <h1 className="text-5xl font-extrabold sm:text-6xl lg:text-7xl">Podología sin prisa, en el centro de Getafe</h1>
          <p className="mt-6 max-w-[52ch] text-xl text-pizarra">
            Quiropodia, estudio de la pisada y plantillas a medida. Te explicamos qué le pasa a tu pie y lo tratamos con el tiempo que necesita.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/reservar" className="btn btn-primario px-7 text-lg">Pedir cita online</Link>
            <a href={CLINICA.telefonoHref} className="btn btn-secundario text-lg">Llamar al {CLINICA.telefono}</a>
          </div>
          {hueco && consulta && (
            <p className="mt-8 border-l-4 border-ambar pl-4">
              Primer hueco libre para consulta:{" "}
              <Link href={`/reservar?servicio=${consulta.slug}&profesional=cualquiera&dia=${hueco.dia}`} className="enlace">
                {cuando} a las {formatoHora(hueco.inicio)}
              </Link>
            </p>
          )}
        </div>
        <figure className="mx-auto w-full max-w-xs md:max-w-sm">
          <HuellaIsobaras className="w-full" />
          <figcaption className="mt-3 text-center text-base text-pizarra">
            Así ve tu pisada nuestra plataforma de presiones: del azul, poca carga, al ámbar, donde más apoyas.
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="t-servicios" className="contenedor py-12">
        <h2 id="t-servicios" className="mb-8 text-4xl font-bold">Qué hacemos y cuánto cuesta</h2>
        <Tarifa servicios={servicios} />
        <p className="mt-6 text-pizarra">Precios finales. Se paga en la clínica, en efectivo o con tarjeta.</p>
      </section>

      <section aria-labelledby="t-equipo" className="contenedor py-12">
        <h2 id="t-equipo" className="mb-8 text-4xl font-bold">Quién te va a atender</h2>
        <div className="grid gap-8 md:grid-cols-2">
          {profesionales.map((p) => (
            <article key={p.id} className="border-l-4 border-cobalto pl-5">
              <h3 className="text-2xl font-bold">{p.nombre}</h3>
              <p className="text-pizarra">{p.titulo}</p>
              <p className="mt-3">{p.bio.split(". ")[0]}.</p>
            </article>
          ))}
        </div>
        <p className="mt-8"><Link href="/equipo" className="enlace">Conoce al equipo</Link></p>
      </section>

      <section aria-labelledby="t-donde" className="contenedor py-12">
        <div className="grid gap-8 rounded-lg bg-cielo p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 id="t-donde" className="text-4xl font-bold">Dónde estamos</h2>
            <p className="mt-4 text-xl">{DIRECCION_COMPLETA}</p>
            <p className="mt-2">A cinco minutos andando de Getafe Central (Metro Sur y Cercanías C-4).</p>
            <p className="mt-6"><Link href="/contacto" className="enlace">Cómo llegar y mapa</Link></p>
          </div>
          <dl className="space-y-3 self-center">
            {(await horarioPublico()).texto.map((h) => (
              <div key={h.dias} className="grid grid-cols-[11rem_1fr] gap-2">
                <dt className="font-bold">{h.dias}</dt>
                <dd>{h.horas}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}

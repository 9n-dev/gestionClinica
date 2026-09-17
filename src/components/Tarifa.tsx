import Link from "next/link";
import { formatoPrecio } from "@/lib/fechas";

type Servicio = { slug: string; nombre: string; descripcion: string; duracionMin: number; precioCent: number };

/** Lista de precios, como la tarifa impresa de una clínica: sin tarjetas, una fila por servicio. */
export function Tarifa({ servicios }: { servicios: Servicio[] }) {
  return (
    <ul className="border-t-2 border-tinta">
      {servicios.map((s) => (
        <li key={s.slug} className="grid gap-x-8 gap-y-3 border-b border-linea py-6 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div>
            <h3 className="text-2xl font-bold">{s.nombre}</h3>
            <p className="mt-1 max-w-[60ch] text-pizarra">{s.descripcion}</p>
          </div>
          <p className="md:text-right">
            <span className="font-display text-3xl font-bold">{formatoPrecio(s.precioCent)}</span>
            <span className="ml-2 text-pizarra md:ml-0 md:block">{s.duracionMin} minutos</span>
          </p>
          <Link href={`/reservar?servicio=${s.slug}`} className="btn btn-secundario justify-self-start">
            Pedir cita<span className="sr-only"> para {s.nombre}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

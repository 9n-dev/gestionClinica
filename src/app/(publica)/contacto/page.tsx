import type { Metadata } from "next";
import Link from "next/link";
import { Mapa } from "@/components/Mapa";
import { CLINICA } from "@/lib/clinica";

export const metadata: Metadata = {
  title: "Contacto y horario",
  description: "Dirección, teléfono, horario y cómo llegar a Podología Serrano, en el centro de Getafe.",
};

export default function Contacto() {
  return (
    <div className="contenedor py-12">
      <h1 className="text-5xl font-extrabold">Contacto y horario</h1>
      <div className="mt-10 grid gap-12 md:grid-cols-2">
        <div className="space-y-8">
          <section aria-labelledby="t-direccion">
            <h2 id="t-direccion" className="text-2xl font-bold">Dirección</h2>
            <address className="mt-2 text-xl not-italic">
              {CLINICA.direccion}<br />{CLINICA.cp} {CLINICA.ciudad} ({CLINICA.provincia})
            </address>
            <p className="mt-2 text-pizarra">Local a pie de calle, sin escalones. A cinco minutos andando de Getafe Central (Metro Sur, línea 12, y Cercanías C-4).</p>
          </section>
          <section aria-labelledby="t-telefono">
            <h2 id="t-telefono" className="text-2xl font-bold">Teléfono y email</h2>
            <p className="mt-2 text-xl"><a href={CLINICA.telefonoHref} className="enlace">{CLINICA.telefono}</a></p>
            <p className="mt-1"><a href={`mailto:${CLINICA.email}`} className="enlace">{CLINICA.email}</a></p>
            <p className="mt-2 text-pizarra">Por email no podemos valorar casos clínicos; para eso, pide una consulta.</p>
          </section>
          <section aria-labelledby="t-horario">
            <h2 id="t-horario" className="text-2xl font-bold">Horario</h2>
            <table className="mt-2 w-full max-w-md">
              <tbody>
                {CLINICA.horario.map((h) => (
                  <tr key={h.dias} className="border-b border-linea">
                    <th scope="row" className="py-2 pr-4 text-left align-top">{h.dias}</th>
                    <td className="py-2">{h.horas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <Link href="/reservar" className="btn btn-primario">Pedir cita online</Link>
        </div>
        <section aria-labelledby="t-mapa">
          <h2 id="t-mapa" className="sr-only">Mapa</h2>
          <Mapa />
        </section>
      </div>
    </div>
  );
}

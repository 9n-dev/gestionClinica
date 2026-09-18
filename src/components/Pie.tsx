import Link from "next/link";
import { CLINICA } from "@/lib/clinica";
import { horarioPublico } from "@/lib/horario";
import { BotonConfigurarCookies } from "./BannerCookies";

const enlace = "underline underline-offset-4 hover:text-ambar";

export async function Pie() {
  const horario = (await horarioPublico()).texto;
  return (
    <footer className="mt-24 bg-tinta pb-28 pt-12 text-white md:pb-12">
      <div className="contenedor grid gap-10 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-bold">{CLINICA.nombre}</p>
          <address className="mt-3 not-italic">
            {CLINICA.direccion}<br />
            {CLINICA.cp} {CLINICA.ciudad} ({CLINICA.provincia})<br />
            <a href={CLINICA.telefonoHref} className={enlace}>{CLINICA.telefono}</a><br />
            <a href={`mailto:${CLINICA.email}`} className={enlace}>{CLINICA.email}</a>
          </address>
        </div>
        <div>
          <h2 className="text-lg font-bold">Horario</h2>
          <dl className="mt-3 space-y-2">
            {horario.map((h) => (
              <div key={h.dias}>
                <dt className="font-bold">{h.dias}</dt>
                <dd className="text-white/85">{h.horas}</dd>
              </div>
            ))}
          </dl>
        </div>
        <nav aria-label="Legal y acceso">
          <h2 className="text-lg font-bold">Información legal</h2>
          <ul className="mt-3 space-y-2">
            <li><Link href="/legal/aviso-legal" className={enlace}>Aviso legal</Link></li>
            <li><Link href="/legal/privacidad" className={enlace}>Política de privacidad</Link></li>
            <li><Link href="/legal/cookies" className={enlace}>Política de cookies</Link></li>
            <li><BotonConfigurarCookies className={`${enlace} cursor-pointer`} /></li>
            <li className="pt-3"><Link href="/panel" className={enlace}>Acceso profesionales</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

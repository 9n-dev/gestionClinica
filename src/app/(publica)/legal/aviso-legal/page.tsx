import type { Metadata } from "next";
import { CLINICA, DIRECCION_COMPLETA } from "@/lib/clinica";

export const metadata: Metadata = { title: "Aviso legal" };

export default function AvisoLegal() {
  return (
    <>
      <h1 className="text-4xl font-extrabold">Aviso legal</h1>
      <h2>Quién está detrás de esta web</h2>
      <p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), te informamos de los datos del titular:</p>
      <ul>
        <li>Titular: {CLINICA.razonSocial}</li>
        <li>NIF: {CLINICA.nif}</li>
        <li>Domicilio: {DIRECCION_COMPLETA}</li>
        <li>Teléfono: {CLINICA.telefono}</li>
        <li>Email: {CLINICA.email}</li>
        <li>Actividad sanitaria: podología. Profesionales colegiados en el Colegio Profesional de Podólogos de la Comunidad de Madrid (n.º 28-0000 y 28-0001).</li>
        <li>Centro sanitario autorizado por la Consejería de Sanidad de la Comunidad de Madrid con el n.º CS-00000.</li>
      </ul>
      <h2>Para qué sirve la web</h2>
      <p>La web informa de los servicios de la clínica y permite pedir cita online. La información sobre salud que contiene es general y no sustituye a una consulta: ningún contenido debe entenderse como diagnóstico ni como tratamiento.</p>
      <h2>Citas online</h2>
      <p>Pedir cita es gratuito y no exige pago por adelantado. El precio mostrado es el precio final del servicio, que se abona en la clínica. Puedes cancelar sin coste hasta la hora de la cita desde el enlace que recibes por email.</p>
      <h2>Propiedad intelectual</h2>
      <p>Los textos, el diseño y el código de esta web pertenecen a su titular o se usan con licencia. Puedes enlazar y citar la web; para cualquier otro uso, pide permiso por escrito.</p>
      <h2>Responsabilidad</h2>
      <p>Trabajamos para que la web esté disponible y su información sea correcta, pero no podemos garantizar la ausencia total de errores o interrupciones. Si detectas alguno, escríbenos a {CLINICA.email}.</p>
      <h2>Ley aplicable</h2>
      <p>Este aviso se rige por la ley española. Si eres consumidor, cualquier controversia se resolverá en los juzgados de tu domicilio.</p>
    </>
  );
}

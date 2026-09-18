import type { Metadata } from "next";
import Link from "next/link";
import { CLINICA, DIRECCION_COMPLETA } from "@/lib/clinica";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function Privacidad() {
  return (
    <>
      <h1 className="text-4xl font-extrabold">Política de privacidad</h1>
      <p>Esta política explica qué datos personales tratamos cuando usas esta web, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD).</p>
      <h2>Responsable del tratamiento</h2>
      <p>{CLINICA.razonSocial}, NIF {CLINICA.nif}, {DIRECCION_COMPLETA}. Contacto para privacidad: {CLINICA.email}.</p>
      <h2>Qué datos recogemos y para qué</h2>
      <table>
        <thead><tr><th scope="col">Datos</th><th scope="col">Finalidad</th><th scope="col">Base legal</th></tr></thead>
        <tbody>
          <tr><td>Nombre, teléfono y email que escribes al pedir cita</td><td>Gestionar la cita, enviarte la confirmación, un recordatorio y el enlace para cancelarla</td><td>Medidas precontractuales a petición tuya (art. 6.1.b RGPD)</td></tr>
          <tr><td>Servicio, profesional, día y hora de la cita</td><td>Organizar la agenda de la clínica</td><td>Art. 6.1.b RGPD</td></tr>
        </tbody>
      </table>
      <p><strong>En la reserva online no pedimos ningún dato de salud.</strong> No escribas información clínica en el formulario. Tu historia clínica se gestiona en la consulta, fuera de esta web, con las garantías propias de la normativa sanitaria.</p>
      <h2>Cuánto tiempo los guardamos</h2>
      <p>Los datos de la cita se conservan mientras sea necesario para gestionarla y, después, durante los plazos legales para atender posibles responsabilidades. Las citas canceladas se eliminan pasados 12 meses.</p>
      <h2>A quién se los comunicamos</h2>
      <p>No cedemos tus datos a terceros salvo obligación legal. Usamos proveedores que actúan como encargados del tratamiento, con contrato conforme al art. 28 RGPD:</p>
      <ul>
        <li>Alojamiento web: Vercel Inc.</li>
        <li>Base de datos: Turso (ChiselStrike Inc.)</li>
        <li>Envío de emails: Resend (Plus Five Five, Inc.)</li>
        <li>Recordatorios de cita por WhatsApp o SMS: Twilio Inc.</li>
      </ul>
      <p>Estos proveedores pueden tratar datos fuera del Espacio Económico Europeo, al amparo del Marco de Privacidad de Datos UE-EE. UU. o de cláusulas contractuales tipo.</p>
      <h2>Tus derechos</h2>
      <p>Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a {CLINICA.email} o a nuestra dirección postal, indicando qué derecho ejerces. Respondemos en el plazo máximo de un mes. Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" rel="noopener noreferrer">www.aepd.es</a>).</p>
      <h2>Seguridad</h2>
      <p>La web funciona siempre sobre conexión cifrada (HTTPS), el acceso al panel de la clínica está protegido con contraseña y el enlace para cancelar tu cita contiene un código único imposible de adivinar.</p>
      <h2>Cookies</h2>
      <p>Lo explicamos en la <Link href="/legal/cookies">política de cookies</Link>.</p>
    </>
  );
}

import type { Metadata } from "next";
import { BotonConfigurarCookies } from "@/components/BannerCookies";

export const metadata: Metadata = { title: "Política de cookies" };

export default function Cookies() {
  return (
    <>
      <h1 className="text-4xl font-extrabold">Política de cookies</h1>
      <p>Una cookie es un pequeño archivo que la web guarda en tu navegador. Aquí usamos muy pocas, y ninguna de publicidad ni de analítica.</p>
      <h2>Cookies técnicas (siempre activas)</h2>
      <p>Son necesarias para que la web funcione y están exentas de consentimiento (art. 22.2 LSSI-CE).</p>
      <table>
        <thead><tr><th scope="col">Cookie</th><th scope="col">Para qué sirve</th><th scope="col">Duración</th></tr></thead>
        <tbody>
          <tr><td>consentimiento</td><td>Recuerda si has aceptado o rechazado las cookies de terceros</td><td>6 meses</td></tr>
          <tr><td>authjs.session-token, authjs.csrf-token, authjs.callback-url</td><td>Mantienen la sesión del panel de profesionales. Solo se crean al iniciar sesión en el panel</td><td>Sesión, máximo 12 horas</td></tr>
        </tbody>
      </table>
      <h2>Cookies de terceros (solo si las aceptas)</h2>
      <table>
        <thead><tr><th scope="col">Proveedor</th><th scope="col">Para qué sirve</th><th scope="col">Más información</th></tr></thead>
        <tbody>
          <tr><td>Google Maps (Google Ireland Ltd.)</td><td>Muestra el mapa interactivo de la página de contacto. Google puede instalar cookies como NID o CONSENT para recordar preferencias y medir el uso del mapa</td><td><a href="https://policies.google.com/technologies/cookies?hl=es" rel="noopener noreferrer">Cookies de Google</a></td></tr>
        </tbody>
      </table>
      <p>Si las rechazas, en lugar del mapa verás la dirección y un enlace para abrirla en Google Maps. El resto de la web funciona igual.</p>
      <h2>Cambiar tu elección</h2>
      <p>Puedes aceptar o rechazar las cookies de terceros en cualquier momento:</p>
      <p><BotonConfigurarCookies className="btn btn-secundario" /></p>
      <p>También puedes borrar o bloquear las cookies desde la configuración de tu navegador.</p>
    </>
  );
}

import { enviarEmail } from "./emails/enviar";
import { plantillas } from "./emails/plantillas";
import { permitido } from "./limite";

/**
 * Aviso técnico a quien mantiene la instalación (ALERTAS_EMAIL): un error del servidor o un cron que falla.
 * Siempre queda en el log; por email, como mucho 10 a la hora, para que un fallo en bucle no inunde el buzón.
 * Nunca lanza: avisar de un error no puede provocar otro.
 */
export async function alertar(asunto: string, detalle: string) {
  console.error(`[alerta] ${asunto}\n${detalle}`);
  try {
    const para = process.env.ALERTAS_EMAIL;
    if (para && (await permitido("alerta", 10, 60))) await enviarEmail({ tipo: "ALERTA", para, ...plantillas.alerta(asunto, detalle) });
  } catch (e) {
    console.error("[alerta] no se pudo enviar", e);
  }
}

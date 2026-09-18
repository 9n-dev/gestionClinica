import { prisma } from "./db";

// Límite de intentos con ventana fija: un contador por (clave, ventana).
// ponytail: en el cambio de ventana puede colarse hasta el doble del máximo; si algún día importa, ventana deslizante.

const ventanaDe = (minutos: number) => new Date(Math.floor(Date.now() / (minutos * 60_000)) * minutos * 60_000);

/** Apunta un intento y dice si sigue dentro del máximo. El upsert es atómico: dos peticiones a la vez cuentan dos. */
export async function permitido(clave: string, max: number, minutos: number) {
  const ventana = ventanaDe(minutos);
  const { cuenta } = await prisma.intento.upsert({ where: { clave_ventana: { clave, ventana } }, create: { clave, ventana }, update: { cuenta: { increment: 1 } } });
  return cuenta <= max;
}

/** Devuelve un intento ya apuntado (el login acertó). */
export async function devolver(clave: string, minutos: number) {
  await prisma.intento.updateMany({ where: { clave, ventana: ventanaDe(minutos), cuenta: { gt: 0 } }, data: { cuenta: { decrement: 1 } } });
}

/** Solo mira, sin apuntar. Para el login, donde solo cuentan los fallos. */
export async function agotado(clave: string, max: number, minutos: number) {
  const fila = await prisma.intento.findUnique({ where: { clave_ventana: { clave, ventana: ventanaDe(minutos) } } });
  return (fila?.cuenta ?? 0) >= max;
}

/** Lo llama el cron diario. */
export const borrarIntentosViejos = () => prisma.intento.deleteMany({ where: { ventana: { lt: new Date(Date.now() - 86_400_000) } } });

/**
 * IP del cliente. En Vercel, x-forwarded-for lo escribe la plataforma y el cliente no puede falsearlo;
 * detrás de otro proxy hay que comprobar que también lo sobrescribe.
 */
export const ipDe = (h: Headers) => h.get("x-forwarded-for")?.split(",")[0].trim() || "desconocida";

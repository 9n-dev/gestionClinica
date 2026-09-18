import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { URL_BASE } from "./clinica";
import { prisma } from "./db";
import { enviarEmail } from "./emails/enviar";
import { plantillas } from "./emails/plantillas";
import { nuevoToken } from "./seed-datos";

// Enlaces de un solo uso para poner contraseña: invitación de un usuario nuevo (3 días) o recuperación (1 hora).
// En la base de datos solo está el hash del token: quien la lea no puede usar los enlaces pendientes.

const huella = (token: string) => createHash("sha256").update(token).digest("hex");

export async function enviarAcceso(u: { id: string; email: string; nombre: string }, invitacion: boolean) {
  const token = nuevoToken();
  await prisma.usuario.update({
    where: { id: u.id },
    data: { accesoTokenHash: huella(token), accesoExpira: new Date(Date.now() + (invitacion ? 72 : 1) * 3_600_000) },
  });
  const url = `${URL_BASE()}/panel/acceso/${token}`;
  return enviarEmail({ tipo: "ACCESO", para: u.email, secreto: url, ...plantillas.acceso(u.nombre, url, invitacion) });
}

/** Los usuarios de la demo no entran aquí: su contraseña es pública y no se puede cambiar. */
export const usuarioDeToken = (token: string) =>
  prisma.usuario.findFirst({ where: { accesoTokenHash: huella(token), accesoExpira: { gt: new Date() }, demo: false } });

export async function ponerPassword(token: string, password: string) {
  const usuario = await usuarioDeToken(token);
  if (!usuario) return false;
  // Se gasta el token en la misma escritura; la condición sobre el hash evita que dos peticiones a la vez lo usen dos veces.
  const r = await prisma.usuario.updateMany({
    where: { id: usuario.id, accesoTokenHash: huella(token) },
    data: { passwordHash: await hash(password, 10), accesoTokenHash: null, accesoExpira: null },
  });
  return r.count === 1;
}

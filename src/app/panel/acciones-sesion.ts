"use server";

import { headers } from "next/headers";
import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { enviarAcceso, ponerPassword } from "@/lib/acceso";
import { anotar } from "@/lib/auditoria";
import { DemasiadosIntentos, requerirSesion, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ipDe, permitido } from "@/lib/limite";
import { esquemaEmail, esquemaPasswordNueva } from "@/lib/validacion";

export async function entrar(_: string | undefined, fd: FormData) {
  try {
    await signIn("credentials", { email: fd.get("email"), password: fd.get("password"), redirectTo: "/panel/agenda" });
  } catch (e) {
    if (e instanceof DemasiadosIntentos) return "Demasiados intentos fallidos. Espera un cuarto de hora y vuelve a probar.";
    if (e instanceof AuthError) return "Email o contraseña incorrectos.";
    throw e; // el redirect de éxito también viaja como excepción
  }
}

export async function salir() {
  await signOut({ redirectTo: "/panel/login" });
}

export type EstadoAcceso = { error?: string; ok?: string };

/** Responde lo mismo exista o no el email, para que no sirva para averiguar quién tiene usuario. */
export async function pedirAcceso(_: EstadoAcceso, fd: FormData): Promise<EstadoAcceso> {
  const datos = esquemaEmail.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: datos.error.issues[0].message };
  if (!(await permitido(`recuperar:${ipDe(await headers())}`, 5, 60))) return { error: "Demasiadas peticiones. Espera una hora y vuelve a probar." };
  const usuario = await prisma.usuario.findFirst({ where: { email: datos.data.email, demo: false } });
  // Tope también por destinatario, para que nadie use esto para llenarle el correo a otro. Se calla: la respuesta no cambia.
  if (usuario && (await permitido(`recuperar:${usuario.email}`, 3, 60))) await enviarAcceso(usuario, false);
  return { ok: "Si ese email tiene usuario en el panel, acabamos de enviarle un enlace para cambiar la contraseña. Vale durante 1 hora." };
}

export async function guardarPassword(token: string, _: EstadoAcceso, fd: FormData): Promise<EstadoAcceso> {
  const datos = esquemaPasswordNueva.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: datos.error.issues[0].message };
  if (!(await ponerPassword(token, datos.data.password))) return { error: "El enlace ha caducado o ya se ha usado. Pide uno nuevo." };
  redirect("/panel/login?password=1");
}

/** Cambia la contraseña y cierra todas las sesiones, también esta: se vuelve a entrar con la nueva. */
export async function cambiarPassword(_: EstadoAcceso, fd: FormData): Promise<EstadoAcceso> {
  const { user } = await requerirSesion();
  if (user.demo) return { error: "Los usuarios de la demo tienen la contraseña fija." };
  const datos = esquemaPasswordNueva.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: datos.error.issues[0].message };
  // Quien se encuentre una sesión abierta no debe poder probar contraseñas a placer.
  if (!(await permitido(`password:${user.id}`, 5, 15))) return { error: "Demasiados intentos. Espera un cuarto de hora." };
  const { passwordHash } = await prisma.usuario.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await compare(String(fd.get("actual") ?? ""), passwordHash))) return { error: "La contraseña actual no es esa." };
  await prisma.usuario.update({ where: { id: user.id }, data: { passwordHash: await hash(datos.data.password, 10), sesionesDesde: new Date() } });
  await anotar(user, "EDITAR", "usuario", user.id, "contraseña");
  await signOut({ redirectTo: "/panel/login?password=1" });
  return {};
}

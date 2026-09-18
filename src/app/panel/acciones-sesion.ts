"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { enviarAcceso, ponerPassword } from "@/lib/acceso";
import { DemasiadosIntentos, signIn, signOut } from "@/lib/auth";
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

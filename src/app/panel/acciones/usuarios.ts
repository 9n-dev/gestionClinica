"use server";

import { hash } from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { enviarAcceso } from "@/lib/acceso";
import { anotar } from "@/lib/auditoria";
import { requerirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nuevoToken } from "@/lib/seed-datos";
import { esquemaUsuario } from "@/lib/validacion";
import { type Estado, primerError, refrescar } from "./comun";

const emailRepetido = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** El usuario nuevo no tiene contraseña: recibe un enlace para elegirla. */
export async function crearUsuario(_: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirAdmin();
  const valores = Object.fromEntries([...fd].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const datos = esquemaUsuario.safeParse(valores);
  if (!datos.success) return { error: primerError(datos.error), valores };
  try {
    const { profesionalId, ...resto } = datos.data;
    // Hash de un valor aleatorio que nadie conoce: hasta que use el enlace, no hay contraseña que acierte.
    const usuario = await prisma.usuario.create({ data: { ...resto, profesionalId: profesionalId || null, passwordHash: await hash(nuevoToken(), 10) } });
    const enviado = await enviarAcceso(usuario, true);
    await anotar(user, "CREAR", "usuario", usuario.id, `${usuario.email}, rol ${usuario.rol}`);
    refrescar();
    return enviado
      ? { ok: `Usuario creado. Le hemos enviado a ${usuario.email} el enlace para elegir contraseña (vale 3 días).` }
      : { error: "Usuario creado, pero el email con el enlace ha fallado. Puede pedir uno nuevo desde «He olvidado mi contraseña»." };
  } catch (e) {
    if (emailRepetido(e)) return { error: "Ya hay un usuario con ese email.", valores };
    throw e;
  }
}

export async function guardarUsuario(id: string, _: Estado, fd: FormData): Promise<Estado> {
  const { user } = await requerirAdmin();
  const datos = esquemaUsuario.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { error: primerError(datos.error) };
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) return { error: "Ese usuario ya no existe." };
  if (usuario.demo) return { error: "Los usuarios de la demo no se pueden cambiar." };
  if (usuario.rol === "ADMIN" && datos.data.rol !== "ADMIN" && (await prisma.usuario.count({ where: { rol: "ADMIN" } })) === 1)
    return { error: "Es el único administrador: nombra a otro antes de quitarle el rol." };
  try {
    await prisma.usuario.update({ where: { id }, data: { ...datos.data, profesionalId: datos.data.profesionalId || null } });
  } catch (e) {
    if (emailRepetido(e)) return { error: "Ya hay un usuario con ese email." };
    throw e;
  }
  await anotar(user, "EDITAR", "usuario", id, usuario.rol === datos.data.rol ? datos.data.email : `${datos.data.email}, rol ${usuario.rol} → ${datos.data.rol}`);
  refrescar();
  return { ok: "Guardado." };
}

export async function borrarUsuario(id: string) {
  const { user } = await requerirAdmin();
  // Ni a uno mismo (siempre queda al menos un administrador) ni a los de la demo.
  const usuario = id === user.id ? null : await prisma.usuario.findFirst({ where: { id, demo: false } });
  if (usuario) {
    await prisma.usuario.delete({ where: { id } });
    await anotar(user, "BORRAR", "usuario", id, usuario.email);
  }
  refrescar();
}

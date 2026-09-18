import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";
import { esquemaLogin } from "./validacion";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/panel/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credenciales) {
        const datos = esquemaLogin.safeParse(credenciales);
        if (!datos.success) return null;
        const usuario = await prisma.usuario.findUnique({ where: { email: datos.data.email } });
        if (!usuario || !(await compare(datos.data.password, usuario.passwordHash))) return null;
        return { id: usuario.id, email: usuario.email, name: usuario.nombre };
      },
    }),
  ],
  callbacks: {
    // La sesión solo lleva el id: rol, profesional y demás se leen de la base de datos en cada petición.
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
});

/**
 * Usuario de la sesión, leído de la base de datos: si lo han borrado o le han cambiado el rol, se nota al momento
 * y no cuando caduque la cookie. cache() lo deja en una consulta por petición aunque lo pidan layout, página y acción.
 */
export const usuarioActual = cache(async () => {
  const id = (await auth())?.user?.id;
  if (!id) return null;
  const u = await prisma.usuario.findUnique({ where: { id }, include: { profesional: { select: { slug: true } } } });
  return u && { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, demo: u.demo, profesionalSlug: u.profesional?.slug ?? null };
});

/** Se llama en cada página y en cada acción del panel: la sesión se comprueba junto a los datos, no solo en el layout. */
export async function requerirSesion() {
  const user = await usuarioActual();
  if (!user) redirect("/panel/login");
  return { user };
}

/** Configuración y usuarios. */
export async function requerirAdmin() {
  const sesion = await requerirSesion();
  if (sesion.user.rol !== "ADMIN") redirect("/panel/agenda");
  return sesion;
}

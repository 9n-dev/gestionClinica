import { compare } from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";
import { agotado, ipDe, permitido } from "./limite";
import { esquemaLogin } from "./validacion";

// 10 contraseñas falladas desde la misma conexión en 15 minutos. Por IP y no por email: con un tope por email,
// cualquiera podría dejar sin acceso a un compañero (o a la demo entera) fallando a propósito.
const LOGIN = { max: 10, minutos: 15 };
export class DemasiadosIntentos extends CredentialsSignin {
  code = "demasiados-intentos";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/panel/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // El límite va aquí y no en la acción del formulario: también cubre a quien llame directo a /api/auth.
      async authorize(credenciales, req) {
        const clave = `login:${ipDe(req.headers)}`;
        if (await agotado(clave, LOGIN.max, LOGIN.minutos)) throw new DemasiadosIntentos();
        const datos = esquemaLogin.safeParse(credenciales);
        const usuario = datos.success ? await prisma.usuario.findUnique({ where: { email: datos.data.email } }) : null;
        if (!datos.success || !usuario || !(await compare(datos.data.password, usuario.passwordHash))) {
          await permitido(clave, LOGIN.max, LOGIN.minutos); // solo cuentan los fallos
          return null;
        }
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

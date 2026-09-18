import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
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
        const usuario = await prisma.usuario.findUnique({ where: { email: datos.data.email }, include: { profesional: true } });
        if (!usuario || !(await compare(datos.data.password, usuario.passwordHash))) return null;
        return { id: usuario.id, email: usuario.email, name: usuario.nombre, profesionalSlug: usuario.profesional?.slug ?? null };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.profesionalSlug = user.profesionalSlug;
      return token;
    },
    session({ session, token }) {
      session.user.profesionalSlug = (token.profesionalSlug as string | null) ?? null;
      return session;
    },
  },
});

/** Se llama en cada página y en cada acción del panel: la sesión se comprueba junto a los datos, no solo en el layout. */
export async function requerirSesion() {
  const sesion = await auth();
  if (!sesion?.user) redirect("/panel/login");
  return sesion;
}

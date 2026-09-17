"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export async function entrar(_: string | undefined, fd: FormData) {
  try {
    await signIn("credentials", { email: fd.get("email"), password: fd.get("password"), redirectTo: "/panel/agenda" });
  } catch (e) {
    if (e instanceof AuthError) return "Email o contraseña incorrectos.";
    throw e; // el redirect de éxito también viaja como excepción
  }
}

export async function salir() {
  await signOut({ redirectTo: "/panel/login" });
}

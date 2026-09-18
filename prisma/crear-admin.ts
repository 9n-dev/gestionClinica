import "dotenv/config";
import { hash } from "bcryptjs";
import { crearEnlaceAcceso } from "../src/lib/acceso";
import { prisma } from "../src/lib/db";
import { nuevoToken } from "../src/lib/seed-datos";
import { esquemaEmail } from "../src/lib/validacion";

// `npm run crear-admin -- ana@clinica.es "Ana García"`
// El primer usuario de una instalación real, o la salida de emergencia si el único administrador se queda fuera.
// No pide contraseña: imprime un enlace de un solo uso para que la elija quien lo abra.
async function main() {
  const [email, nombre = "Administración"] = process.argv.slice(2);
  const datos = esquemaEmail.safeParse({ email });
  if (!datos.success) throw new Error('Uso: npm run crear-admin -- email@clinica.es "Nombre y apellidos"');

  const usuario = await prisma.usuario.upsert({
    where: { email: datos.data.email },
    update: { rol: "ADMIN" },
    create: { email: datos.data.email, nombre, rol: "ADMIN", passwordHash: await hash(nuevoToken(), 10) },
  });
  if (usuario.demo) throw new Error("Ese es un usuario de la demo: su contraseña es fija.");
  console.log(`Administrador: ${usuario.email}\nEnlace para elegir contraseña (un solo uso, 3 días):\n${await crearEnlaceAcceso(usuario.id, true)}`);
}

main().finally(() => prisma.$disconnect());

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const crear = () =>
  new PrismaClient({
    adapter: new PrismaLibSql({
      url: process.env.DATABASE_URL ?? "file:./dev.db",
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    }),
  });

// En desarrollo se reutiliza la instancia entre recargas en caliente.
const g = globalThis as unknown as { prisma?: ReturnType<typeof crear> };
export const prisma = g.prisma ?? crear();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

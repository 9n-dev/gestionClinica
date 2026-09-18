import type { Instrumentation } from "next";

// Next llama aquí con cada error no controlado del servidor (páginas, acciones y rutas). Sin servicio externo:
// queda en el log y, si hay ALERTAS_EMAIL, llega un email. Para más (agrupar, trazas, errores del navegador), Sentry.
/** Al arrancar el servidor. Con los secretos de .env.example cualquiera forjaría una sesión o llamaría a los cron: en producción, no se arranca. */
export function register() {
  if (process.env.NODE_ENV !== "production") return;
  for (const clave of ["AUTH_SECRET", "CRON_SECRET"])
    if (process.env[clave]?.startsWith("cambia-esto")) throw new Error(`${clave} sigue con el valor de ejemplo de .env.example. Genera uno propio (npx auth secret) antes de arrancar en producción.`);
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  // La condición va en positivo y alrededor del import a propósito: este fichero se compila también para el runtime
  // edge, y solo así el compilador descarta allí alertas.ts (que arrastra Prisma y node:crypto). Con un `return`
  // temprano, `next dev` no arranca.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { alertar } = await import("./lib/alertas");
    const e = err as Error & { digest?: string };
    await alertar(`Error en ${request.method} ${request.path}`, `${context.routeType} ${context.routePath}\ndigest: ${e.digest ?? "—"}\n\n${e.stack ?? e.message}`);
  }
};

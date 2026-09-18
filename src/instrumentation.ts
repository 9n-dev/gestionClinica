import type { Instrumentation } from "next";

// Next llama aquí con cada error no controlado del servidor (páginas, acciones y rutas). Sin servicio externo:
// queda en el log y, si hay ALERTAS_EMAIL, llega un email. Para más (agrupar, trazas, errores del navegador), Sentry.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { alertar } = await import("./lib/alertas");
  const e = err as Error & { digest?: string };
  await alertar(`Error en ${request.method} ${request.path}`, `${context.routeType} ${context.routePath}\ndigest: ${e.digest ?? "—"}\n\n${e.stack ?? e.message}`);
};

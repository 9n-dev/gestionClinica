"use client";

/** Formulario GET que se reenvía solo al cambiar cualquier campo (sin JS sigue funcionando con su botón). */
export function FormularioAuto({ children, ...props }: React.ComponentProps<"form">) {
  return (
    <form method="get" onChange={(e) => e.currentTarget.requestSubmit()} {...props}>
      {children}
    </form>
  );
}

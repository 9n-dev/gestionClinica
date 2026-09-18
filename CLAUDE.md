Web + citas online + panel de gestión para una clínica de podología ficticia. Empezó como demo de portfolio y hoy es un producto instalable que podría vender a clínicas pequeñas. Debe seguir pareciéndolo: nada de maqueta.

## Estado
- Qué hace y cómo está hecho: `README.md` («Qué incluye» y «Cómo está hecho»). Es la fuente de verdad; este fichero solo dice cómo trabajar.
- `MODO_DEMO=1` en local. Sin esa variable la app se comporta como instalación real (sin contraseñas en el login, y `npm run seed` y el cron de reinicio se niegan).
- **Sin desplegar en Vercel, por decisión mía.** No lo propongas ni lo prepares salvo que lo pida. El repo de GitHub (privado, `9n-dev/gestionClinica`) sí se mantiene al día.
- Sin probar contra servicios reales: migraciones en Turso (sí contra un servidor libSQL por HTTP, en el CI), envíos por Resend y Twilio, y sus webhooks.

## Contexto de negocio (los datos de la demo)
- Clínica: "Podología Serrano", Getafe (Madrid). Dos profesionales: Dra. Laura Serrano y Dr. Marcos Ortiz.
- Servicios (duración / precio): Consulta general (30 min / 40 €), Quiropodia (45 min / 45 €), Estudio de la pisada (60 min / 80 €), Plantillas a medida – revisión (30 min / 35 €).
- Horario: L-V 9:00-14:00 y 16:00-20:00. Sábados 9:00-13:00 solo la Dra. Serrano.
- Usuarios demo, todos con `demo1234` y visibles en el login: `demo@` (recepción), `admin@`, `laura@` y `marcos@podologiaserrano.es`.
- Idioma de toda la interfaz, del código y de los commits: español.

## Stack (no cambiar sin preguntarme)
- Next.js 15 (App Router) + TypeScript + Tailwind 4. Server Components y Server Actions; sin librerías de interfaz ni de gráficos.
- SQLite/libSQL con Prisma 7. Migraciones propias en producción (`src/lib/migraciones.ts`), porque `prisma migrate deploy` no habla con Turso.
- Auth.js v5 con credenciales, sin OAuth. Zod para validar.
- Emails con Resend y mensajes al móvil con Twilio por API REST (sin SDK). Sin claves, todo va a consola y queda en `emails_enviados` / `mensajes_enviados`.
- Vitest para la lógica y Playwright + axe para extremo a extremo. GitHub Actions y Dependabot.
- Los saltos de versión mayor (Next, React, Prisma, TypeScript, ESLint) se deciden a mano.
- Pensado para Vercel: evita dependencias que no funcionen ahí.

## Forma de trabajar
- **Si algo es ambiguo o toca el stack, pregunta; no inventes requisitos.** Para lo demás, decide con un valor por defecto sensato y dímelo.
- **Cambios de esquema: enséñame el modelo antes.** Después, `npx prisma migrate dev`, `npx prisma generate` y reiniciar `next dev` (el cliente viejo se queda en caché y los campos nuevos llegan como `undefined` sin dar error).
  - Si Prisma quiere rehacer una tabla entera y basta un `ADD COLUMN`, escribe la migración a mano. Si se niega por ir sin terminal interactiva, igual: a mano, y `migrate dev` la aplica.
  - Una migración ya aplicada no se toca: Prisma compara su huella.
- **Test primero.** La lógica, en `src/lib/*.test.ts` contra una SQLite temporal; cada flujo nuevo, con su e2e. Un fallo se reproduce con un test que falle antes de arreglarlo.
  - Los specs de Playwright comparten base de datos: no afirmes valores absolutos que otro spec o el seed alteran, y tras un clic que navega, `waitForURL` antes de leer la URL.
- **Antes de cada commit:** `npm run lint`, `npm test` y `npm run test:e2e`. Los e2e corren contra el build de producción y no ven si el modo desarrollo se rompe: tras tocar `instrumentation.ts`, middleware o `next.config.ts`, arranca `next dev` una vez.
- **Tras cada bloque grande, revisión independiente** con un agente que no haya visto cómo se escribió el código, en solo lectura: una pasada de corrección y otra de seguridad que intente refutar el modelo que declara el README. La primera vez encontró 17 fallos reales que ni los tests ni el CI veían.
- **Server Actions:** cada una autentica y autoriza por sí misma (son endpoints públicos), y sus argumentos se validan en tiempo de ejecución: el tipo de TypeScript no existe en el servidor.
- **Datos de pacientes:** ni en logs, ni en el registro de actividad, ni en URLs. Lo que se añada con datos suyos tiene que entrar en la descarga y en la supresión (`src/lib/pacientes.ts`) y en los plazos de `src/lib/retencion.ts`.
- **Interfaz:** accesible (axe sin infracciones), usable en móvil y tablet, y sin textos que prometan lo que el código no hace. Para verla: `node scripts/capturas.mjs` saca todas las pantallas.
- Commits pequeños en español, con el porqué en el mensaje. Push a `main` al cerrar cada bloque. README al día con lo que se añade y con lo que se deja fuera a propósito.

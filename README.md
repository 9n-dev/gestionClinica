# Podología Serrano — web y citas online para clínicas pequeñas

Demo de portfolio: web pública + reserva de citas online + panel de agenda para una clínica de podología ficticia de Getafe (Madrid). Todos los datos (clínica, profesionales, pacientes, NIF, teléfono, dirección) son inventados.

**Acceso al panel de la demo:** `demo@podologiaserrano.es` / `demo1234` (en `/panel`).

## Qué incluye

- **Web pública**: inicio, servicios y precios, equipo, contacto con mapa, aviso legal, privacidad y política de cookies con banner funcional (el mapa de Google solo se carga si se aceptan las cookies de terceros).
- **Reserva en `/reservar`**: servicio → profesional (o «me da igual») → día y hora con huecos reales → datos de contacto → confirmación. No se pide ningún dato de salud.
- **Sin dobles reservas, garantizado por la base de datos** (ver más abajo).
- **Emails** de confirmación, aviso a la clínica, cancelación y recordatorio, con enlace de cancelación por token.
- **Panel en `/panel`**: agenda por día y semana filtrable por profesional, detalle de cita, cancelar, marcar como atendida, bloqueo de horas y registro de emails enviados.
- **Modo demo**: `npm run seed` y un cron diario que reinicia los datos.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 sobre SQLite/libSQL · Auth.js v5 (credenciales) · Zod · Resend · Vitest.

Sin librerías de UI: HTML semántico, Server Components y Server Actions. El asistente de reserva guarda su estado en la URL, así que funciona el botón «atrás» y casi no necesita JavaScript.

## Puesta en marcha

Requisitos: Node.js 20.9 o superior (probado con Node 22).

```bash
npm install          # instala y genera el cliente de Prisma
cp .env.example .env # y cambia AUTH_SECRET (npx auth secret) y CRON_SECRET
npm run seed         # crea las tablas si no existen y carga los datos de la demo
npm run dev          # http://localhost:3000
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run seed` | Reinicia los datos: profesionales, servicios, horarios, bloqueos, ~40 citas en 14 días y emails de muestra |
| `npm test` | Tests de la lógica de disponibilidad |
| `npm run lint` | ESLint |

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | `file:./dev.db` en local; `libsql://…` de Turso en producción |
| `DATABASE_AUTH_TOKEN` | Solo con Turso | Token de la base de datos de Turso |
| `AUTH_SECRET` | Sí | Secreto de Auth.js. Genera uno con `npx auth secret` |
| `APP_URL` | Sí | URL pública, para los enlaces de los emails |
| `RESEND_API_KEY` | No | Si está vacía, los emails se escriben en consola. En ambos casos quedan registrados en la tabla `emails_enviados` y se ven en `/panel/emails` |
| `EMAIL_FROM` | Con Resend | Remitente, con dominio verificado en Resend |
| `EMAIL_CLINICA` | No | Dirección que recibe los avisos de la clínica |
| `CRON_SECRET` | Sí | Protege `/api/cron/*`. Vercel Cron lo envía como `Authorization: Bearer …` |
| `RECORDATORIO_VENTANA_HORAS` | No | Por defecto 36 (cron diario). Con un cron horario, pon 24 |

Los pacientes del seed usan direcciones `@ejemplo.com`: a esas direcciones nunca se envía nada real aunque Resend esté configurado.

## Cómo está hecho

```
prisma/schema.prisma          modelo de datos
prisma/seed.ts                CLI del seed
src/lib/disponibilidad.ts     cálculo de huecos y solapes (función pura, con tests)
src/lib/reservas.ts           huecos con datos reales, crear y cancelar citas
src/lib/seed-datos.ts         datos de la demo (los usa el seed y el cron de reinicio)
src/lib/emails/               plantillas y envío (Resend o consola)
src/lib/fechas.ts             utilidades de fecha en Europe/Madrid
src/app/(publica)/            web, /reservar y /cita/[token]
src/app/panel/                login y panel (agenda, citas, bloqueos, emails)
src/app/api/cron/             recordatorios y reinicio de la demo
```

### Dobles reservas

SQLite no tiene restricciones de exclusión por rango, así que cada cita activa ocupa filas en `franjas_ocupadas`, una por cada 15 minutos, con clave primaria `(profesionalId, inicio)`. La cita y sus franjas se insertan en una única transacción: si dos personas confirman a la vez horas que se pisan, la segunda viola la clave primaria y no se guarda nada. Al cancelar se borran las franjas y el hueco vuelve a ofrecerse. Con «me da igual», si el primer profesional acaba de ocuparse se intenta con el siguiente.

### Horas y zonas horarias

Todo se guarda en UTC y se calcula y muestra en `Europe/Madrid`, porque los servidores de Vercel corren en UTC. Los tests cubren el cambio de hora de octubre.

### Reglas de reserva

Huecos cada 15 minutos, con un mínimo de 2 horas de antelación y un máximo de 60 días (constantes en `src/lib/clinica.ts`). Máximo 3 citas pendientes por email. Los dos profesionales hacen todos los servicios.

## Despliegue en Vercel

Un fichero SQLite no sirve en Vercel (el sistema de ficheros es de solo lectura y efímero), así que en producción se usa [Turso](https://turso.tech), que es SQLite alojado: mismo esquema y mismo código, solo cambia la URL.

1. **Crea la base de datos** (plan gratuito):
   ```bash
   turso db create podologia-serrano
   turso db show podologia-serrano --url      # → DATABASE_URL
   turso db tokens create podologia-serrano   # → DATABASE_AUTH_TOKEN
   ```
2. **Crea las tablas y carga la demo** desde tu máquina, apuntando a Turso:
   ```bash
   DATABASE_URL="libsql://…" DATABASE_AUTH_TOKEN="…" npm run seed
   ```
3. **Importa el repositorio en Vercel** y define las variables de entorno de la tabla de arriba (`APP_URL` con el dominio final).
4. **Despliega.** `vercel.json` ya declara dos cron jobs:
   - `/api/cron/reset-demo`, cada día a las 03:00 UTC: reinicia los datos de la demo.
   - `/api/cron/recordatorios`, cada día a las 06:00 UTC: envía los recordatorios de las citas de las próximas 36 horas. Es idempotente (`recordatorioEnviadoAt`), así que puede ejecutarse las veces que haga falta.

   El plan Hobby de Vercel solo permite crons diarios. En el plan Pro puedes pasar el de recordatorios a horario (`0 * * * *`) con `RECORDATORIO_VENTANA_HORAS=24` para avisar justo 24 horas antes.

Para probar un cron a mano:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio/api/cron/recordatorios
```

**Cambios de esquema:** en local, `npx prisma migrate dev` (siempre trabaja contra `dev.db`). `npm run seed` solo aplica las migraciones sobre una base de datos vacía, así que para llevar un cambio de esquema a Turso lo más simple en una demo es recrear la base de datos y repetir el paso 2.

## Para convertirlo en un producto real

Lo que esta demo deja fuera a propósito: límite de intentos en el login y en el formulario de reserva (rate limiting), usuarios y permisos por profesional, edición de horarios y servicios desde el panel, festivos automáticos, y la revisión de los textos legales por la asesoría de cada clínica.

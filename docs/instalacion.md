# Instalación y despliegue

## En local

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
| `npm run migrar` | Aplica las migraciones pendientes a la base de datos de `DATABASE_URL` (local o Turso). `npm run build` lo ejecuta antes de compilar |
| `npm run crear-admin -- email "Nombre"` | Crea (o recupera) un administrador e imprime un enlace de un solo uso para que elija su contraseña |
| `npm run seed` | **Solo con `MODO_DEMO=1`.** Reinicia los datos: usuarios, profesionales, servicios, horarios, bloqueos, 30 pacientes, ~40 citas en 14 días, un historial de dos meses y emails de muestra |
| `npm test` | Tests de la lógica: disponibilidad, horario público, minutos disponibles para la ocupación y lectura del CSV de pacientes (puros) y, contra una SQLite temporal con el esquema real, movimiento de citas, identidad y supresión de pacientes, enlaces de acceso, límite de intentos, plazos de conservación, migración de una base de datos antigua con datos, y mensajes al móvil con la API de Twilio simulada |
| `npm run test:e2e` | Playwright contra el build de producción, con dos servidores: uno en modo demo recién sembrado (reserva → ficha → cancelación por email, alta de usuario → contraseña → permisos, bloqueo del login, accesibilidad con axe en todas las pantallas, descarga y supresión de datos, recordatorios, mover una cita en pantalla táctil, estadísticas e importación de pacientes) y otro como instalación real con la base de datos vacía (`crear-admin` → profesional, horario y servicio → primera cita reservable, sin rastro de la demo). La primera vez: `npx playwright install chromium` |
| `npm run lint` | ESLint |

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `MODO_DEMO` | No | `1` en la demo: contraseñas a la vista en el login, `npm run seed`, reinicio diario y avisos de demo. Vacía en una clínica real: el seed y el cron de reinicio se niegan a ejecutarse |
| `CLINICA_*` | En una clínica real | Nombre, razón social, NIF, dirección, teléfono, email y coordenadas (lista completa en `.env.example`). Sin definir, salen los de la clínica ficticia |
| `DATABASE_URL` | Sí | `file:./dev.db` en local; `libsql://…` de Turso en producción |
| `DATABASE_AUTH_TOKEN` | Solo con Turso | Token de la base de datos de Turso |
| `AUTH_SECRET` | Sí | Secreto de Auth.js. Genera uno con `npx auth secret` |
| `APP_URL` | Sí | URL pública, para los enlaces de los emails |
| `RESEND_API_KEY` | No | Si está vacía, los emails se escriben en consola. En ambos casos quedan registrados en la tabla `emails_enviados` y se ven en `/panel/emails` |
| `EMAIL_FROM` | Con Resend | Remitente, con dominio verificado en Resend |
| `EMAIL_CLINICA` | No | Dirección que recibe los avisos de la clínica |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | No | Si faltan, los mensajes al móvil se escriben en consola. En ambos casos quedan en `mensajes_enviados` y se ven en el panel |
| `TWILIO_WHATSAPP_FROM`, `TWILIO_WHATSAPP_PLANTILLA` | No | Número de WhatsApp (`+34…`) y Content SID (`HX…`) de la plantilla aprobada. Sin ellos se va directo al SMS |
| `TWILIO_SMS_FROM` | No | Número o remitente de los SMS. Sin él no hay SMS de reserva |
| `ALERTAS_EMAIL` | No | Recibe los errores del servidor y los fallos de los cron. Vacío: solo al log |
| `RESEND_WEBHOOK_SECRET` | No | Secreto (`whsec_…`) del webhook de rebotes de Resend. Vacío: el webhook lo rechaza todo |
| `CRON_SECRET` | Sí | Protege `/api/cron/*`. Vercel Cron lo envía como `Authorization: Bearer …` |
| `RETENCION_*_MESES` | No | Plazos de conservación (ver `.env.example`). Por defecto 12, 12 y 24 meses; los pacientes inactivos no se tocan si no se define su plazo |
| `RECORDATORIO_VENTANA_HORAS` | No | Por defecto 36 (cron diario). Con un cron horario, pon 24 |

Los pacientes del seed usan direcciones `@ejemplo.com`: a esas direcciones nunca se envía nada real aunque Resend esté configurado.

## Despliegue en Vercel

Un fichero SQLite no sirve en Vercel (el sistema de ficheros es de solo lectura y efímero), así que en producción se usa [Turso](https://turso.tech), que es SQLite alojado: mismo esquema y mismo código, solo cambia la URL.

1. **Crea la base de datos** (plan gratuito):
   ```bash
   turso db create podologia-serrano
   turso db show podologia-serrano --url      # → DATABASE_URL
   turso db tokens create podologia-serrano   # → DATABASE_AUTH_TOKEN
   ```
2. **Crea las tablas y carga la demo** (`npm run seed` aplica las migraciones y siembra) desde tu máquina, apuntando a Turso:
   ```bash
   DATABASE_URL="libsql://…" DATABASE_AUTH_TOKEN="…" npm run seed
   ```
3. **Importa el repositorio en Vercel** y define las variables de entorno de la tabla de arriba (`APP_URL` con el dominio final).
4. **Despliega.** `vercel.json` ya declara dos cron jobs:
   - `/api/cron/reset-demo`, cada día a las 03:00 UTC: reinicia los datos de la demo.
   - `/api/cron/recordatorios`, cada día a las 06:00 UTC: además de la limpieza diaria (límite de intentos y plazos de conservación), envía los recordatorios de las citas de las próximas 36 horas. Es idempotente (`recordatorioEnviadoAt`), así que puede ejecutarse las veces que haga falta.

   El plan Hobby de Vercel solo permite crons diarios. En el plan Pro puedes pasar el de recordatorios a horario (`0 * * * *`) con `RECORDATORIO_VENTANA_HORAS=24` para avisar justo 24 horas antes.

Para probar un cron a mano:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio/api/cron/recordatorios
```

**Arrastrar y soltar** usa la API nativa de HTML5, sin librerías, y esa API no existe en pantallas táctiles. Para la tablet de recepción está «Mover una cita»: se toca la cita y luego la hora nueva, y solo se ofrecen los huecos donde cabe. Los destinos son botones, así que el mismo modo sirve con teclado.

**Cambios de esquema:** en local, `npx prisma migrate dev` (siempre trabaja contra `dev.db`) y después `npx prisma generate`. En producción no hay que hacer nada: `npm run build` empieza por `npm run migrar`, que aplica a la base de datos de `DATABASE_URL` las migraciones que le falten, así que cada despliegue la deja al día. `prisma migrate deploy` no habla con Turso; por eso hay un ejecutor propio en `src/lib/migraciones.ts`:

- Lo aplicado se apunta en la tabla `_migraciones`. Una base de datos anterior a esa tabla se reconoce por su esquema y recibe solo lo que le falta.
- Cada migración va en una transacción y con las claves foráneas apagadas **en la misma conexión** (`client.migrate()` de libSQL). Importa: las migraciones que rehacen una tabla hacen `DROP TABLE`, y con Turso por HTTP un `PRAGMA foreign_keys=OFF` suelto no vale para la sentencia siguiente, de modo que el `DROP` de `citas` borraría en cascada las franjas ocupadas. Hay un test que migra una base de datos antigua con datos y comprueba que no se pierde nada.
- Ojo con los despliegues de vista previa de Vercel: si comparten `DATABASE_URL` con producción, migran producción. Dales su propia base de datos.

**Copias de seguridad:** Turso guarda el historial y permite restaurar a un punto en el tiempo (`turso db create restaurada --from-db podologia-serrano --timestamp …`). Para tener además una copia fuera: `turso db shell podologia-serrano .dump > copia.sql`. Una copia que no se ha probado a restaurar no cuenta: restáurala en una base de datos nueva y arranca la app contra ella antes de darla por buena.

## Instalarlo en una clínica real

1. Base de datos en Turso y proyecto en Vercel, como arriba, pero **sin** `MODO_DEMO` y con las variables `CLINICA_*`, `RESEND_API_KEY` y `EMAIL_FROM` de la clínica. No ejecutes `npm run seed` (se negará).
2. Despliega: el build crea las tablas.
3. Desde tu máquina, apuntando a Turso: `DATABASE_URL="libsql://…" DATABASE_AUTH_TOKEN="…" APP_URL="https://…" npm run crear-admin -- ana@clinica.es "Ana García"`. Abre el enlace que imprime y elige la contraseña.
4. En el panel, «Configuración»: da de alta profesionales, sus horarios y los servicios. En «Usuarios», al resto del equipo.
5. Puedes quitar el cron `reset-demo` de `vercel.json`; si se queda, responde 404.

Los textos de la web pública (portada, equipo, cómo llegar, legales) hablan de la clínica ficticia: son contenido, y se cambian en `src/app/(publica)/`.

## Antes de abrirlo a pacientes de verdad

Lo que ya está probado y lo que solo se puede probar con las cuentas reales:

| | Estado |
| --- | --- |
| Migraciones por HTTP (el protocolo de Turso) | **Probado**: el CI levanta un servidor libSQL y migra una base de datos antigua con datos. Falta verlo una vez contra Turso de verdad; mira el log del primer build |
| Envío por Resend | El código es el de la documentación de Resend; no hay cuenta en esta demo. Envía un email de prueba y comprueba que llega y que aparece como «Resend» en el panel |
| Envío por Twilio (WhatsApp y SMS) | **Sin probar contra Twilio**: los tests simulan su API. Hay que probarlo con una cuenta, un número y una plantilla aprobada antes de fiarse |
| Webhooks de Twilio y de Resend | Las firmas se comprueban con el algoritmo documentado de cada uno y los tests lo verifican, pero no contra peticiones reales |

Puesta en marcha, además de lo de [Instalarlo en una clínica real](#instalarlo-en-una-clínica-real):

1. **Correo**: dominio propio verificado en Resend con SPF y DKIM, y un registro DMARC (`v=DMARC1; p=quarantine; rua=mailto:…`). Sin esto, los recordatorios van a spam. En Resend → Webhooks, apunta `email.bounced` y `email.complained` a `/api/resend/webhook` y pon su secreto en `RESEND_WEBHOOK_SECRET`: los rebotes salen como fallidos en «Emails y mensajes».
2. **Avisos**: `ALERTAS_EMAIL` recibe los errores del servidor (`src/instrumentation.ts`) y los fallos de los cron, como mucho 10 a la hora. Y un monitor de disponibilidad gratuito (UptimeRobot, Better Stack) contra `/api/salud`, que responde 200 solo si la app llega a la base de datos. Para agrupar errores, trazas y errores del navegador, el siguiente paso es Sentry.
3. **Entorno de pruebas**: otro proyecto de Vercel con **su propia** base de datos de Turso y `MODO_DEMO=1`. No compartas `DATABASE_URL` con producción: el build migra la base de datos a la que apunta.
4. **Copias de seguridad**: programa el `.dump` de más arriba y restáuralo una vez en una base de datos nueva.
5. **Lo que no es código**: contrato de encargo del tratamiento con Vercel, Turso, Resend y Twilio (los cuatro lo ofrecen) y región de la UE en los que dejan elegir; registro de actividades de tratamiento; decidir con la asesoría `RETENCION_PACIENTES_MESES`; y que la asesoría revise los textos de `/legal`, que son un punto de partida. Los textos de la web pública siguen hablando de la clínica ficticia.

---
[Volver al README](../README.md) · [Manual del panel](manual-del-panel.md) · [Arquitectura](arquitectura.md) · [Instalación](instalacion.md) · [Pruebas](pruebas.md) · [Pendiente](pendiente.md)

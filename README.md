# Podología Serrano — web y citas online para clínicas pequeñas

[![CI](https://github.com/9n-dev/gestionClinica/actions/workflows/ci.yml/badge.svg)](https://github.com/9n-dev/gestionClinica/actions/workflows/ci.yml)

Demo de portfolio: web pública + reserva de citas online + panel de agenda para una clínica de podología ficticia de Getafe (Madrid). Todos los datos (clínica, profesionales, pacientes, NIF, teléfono, dirección) son inventados.

**Acceso al panel de la demo** (en `/panel`), todos con contraseña `demo1234`:
- `demo@podologiaserrano.es`: recepción, ve toda la agenda.
- `admin@podologiaserrano.es`: administración. Además ve «Configuración» y «Usuarios».
- `laura@podologiaserrano.es` y `marcos@podologiaserrano.es`: cada profesional entra con su agenda filtrada.

## Qué incluye

- **Web pública**: inicio, servicios y precios, equipo, contacto con mapa, aviso legal, privacidad y política de cookies con banner funcional (el mapa de Google solo se carga si se aceptan las cookies de terceros).
- **Reserva en `/reservar`**: servicio → profesional (o «me da igual») → día y hora con huecos reales → datos de contacto → confirmación. No se pide ningún dato de salud.
- **Sin dobles reservas, garantizado por la base de datos** (ver más abajo).
- **Emails** de confirmación, aviso a la clínica, cancelación y recordatorio, con enlace de cancelación por token.
- **Panel en `/panel`**:
  - Agenda por día y semana, filtrable por profesional. **Arrastra una cita** para cambiarla de hora o de profesional; pulsa en un hueco libre para crear una.
  - Crear citas desde el panel (teléfono, mostrador): sin antelación mínima y con email opcional.
  - Detalle de cita: cambiar hora (también sin ratón), marcar como atendida o «no se presentó», cancelar, notas internas.
  - **Pacientes**: se crean solos con la primera cita (por la web o desde el panel). Buscador sin acentos, ficha con historial, visitas, faltas y notas, y «nueva cita» con los datos ya puestos. Al abrir una cita se avisa si ese paciente ha faltado otras veces.
  - Bloqueo de horas (comidas, vacaciones, festivos) con aviso si hay citas dentro.
  - Configuración (solo administración): servicios y precios, profesionales y horario semanal de cada uno.
  - **Usuarios y roles** (solo administración): alta, cambio de rol y baja. Nadie escribe la contraseña de otro: el usuario nuevo recibe un enlace de un solo uso para elegirla, y el mismo mecanismo sirve para «he olvidado mi contraseña».
  - Registro de todos los emails enviados.
- **Límite de intentos** en el login, en la reserva web y en la recuperación de contraseña.
- **Modo demo**: `npm run seed` y un cron diario que reinicia los datos.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 sobre SQLite/libSQL · Auth.js v5 (credenciales) · Zod · Resend · Vitest · Playwright · GitHub Actions.

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
| `npm run seed` | Reinicia los datos: usuarios, profesionales, servicios, horarios, bloqueos, 30 pacientes, ~40 citas en 14 días, un historial de dos meses y emails de muestra |
| `npm test` | Tests de la lógica: disponibilidad (pura) y, contra una SQLite temporal con el esquema real, movimiento de citas, identidad del paciente, enlaces de acceso y límite de intentos |
| `npm run test:e2e` | Playwright contra el build de producción con una base de datos recién sembrada (`e2e.db`): reserva → ficha → cancelación por email, alta de usuario → contraseña → permisos, y bloqueo del login. La primera vez: `npx playwright install chromium` |
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
src/lib/reservas.ts           huecos con datos reales, crear, mover y cancelar citas
src/lib/pacientes.ts          normalización del nombre (identidad y búsqueda)
src/lib/auth.ts               Auth.js, usuario de la petición y roles
src/lib/acceso.ts             enlaces de un solo uso para poner contraseña
src/lib/limite.ts             límite de intentos
src/lib/seed-datos.ts         datos de la demo (los usa el seed y el cron de reinicio)
src/lib/emails/               plantillas y envío (Resend o consola)
src/lib/fechas.ts             utilidades de fecha en Europe/Madrid
src/app/(publica)/            web, /reservar y /cita/[token]
src/app/panel/                login, recuperación y panel (agenda, citas, pacientes, bloqueos, emails, configuración, usuarios)
src/app/api/cron/             recordatorios y reinicio de la demo
e2e/                          pruebas de extremo a extremo (Playwright)
.github/workflows/ci.yml      lint, tests y e2e en cada push
```

### Dobles reservas

SQLite no tiene restricciones de exclusión por rango, así que cada cita activa ocupa filas en `franjas_ocupadas`, una por cada 15 minutos, con clave primaria `(profesionalId, inicio)`. La cita y sus franjas se insertan en una única transacción: si dos personas confirman a la vez horas que se pisan, la segunda viola la clave primaria y no se guarda nada. Al cancelar se borran las franjas y el hueco vuelve a ofrecerse. Con «me da igual», si el primer profesional acaba de ocuparse se intenta con el siguiente. Mover una cita (formulario o arrastre) libera las franjas viejas y ocupa las nuevas en una sola transacción: si el destino está pillado, la cita se queda donde estaba.

### Pacientes

Un paciente es un teléfono más un nombre normalizado (sin acentos ni mayúsculas), con restricción única en la base de datos. El mismo móvil con otro nombre es otro paciente: es el caso de quien reserva para su hijo. La cita se enlaza a su paciente con `connectOrCreate` dentro de la misma transacción que ocupa las franjas, y conserva además lo que se escribió al reservar. La migración que introdujo la tabla crea los pacientes de las citas que ya existían. No hay fusión de duplicados: si alguien reserva una vez como «Pepe» y otra como «José», son dos fichas.

### Usuarios, roles y contraseñas

Dos roles: `EQUIPO` (agenda, citas, pacientes, bloqueos, emails) y `ADMIN` (además, configuración y usuarios). Ser profesional no es un rol: es estar ligado a un profesional, y solo cambia con qué columna se abre la agenda. La cookie de sesión solo lleva el id; el rol se lee de la base de datos en cada petición (una consulta, con `cache()` de React), así que borrar a alguien o quitarle el rol surte efecto al momento y no cuando caduque la sesión.

Las contraseñas solo las escribe su dueño. Dar de alta a alguien le envía un enlace de un solo uso (3 días); «he olvidado mi contraseña» envía otro (1 hora) y responde lo mismo exista o no el email. En la base de datos solo está el hash SHA-256 del token, y cuando el email sale de verdad por Resend el enlace se tacha del registro de `/panel/emails`. Sin Resend se deja, porque ese registro es la única forma de leer el email: así se puede probar en la demo.

En la demo, los cuatro usuarios sembrados llevan `demo = true` y no se pueden cambiar, borrar ni recuperar, para que un visitante no deje fuera a los demás. Los usuarios que cree un visitante sí, y desaparecen con el reinicio nocturno.

### Límite de intentos

Contadores por clave y ventana de tiempo en la tabla `intentos`, porque en Vercel las funciones no comparten memoria y así no hace falta otro servicio. Login: 10 contraseñas falladas por IP cada 15 minutos (solo cuentan los fallos), comprobado dentro de `authorize()` para cubrir también a quien llame directo a `/api/auth`. Es por IP y no por email a propósito: con un tope por email, cualquiera podría dejar sin acceso a un compañero fallando adrede. Reserva web: 6 por IP y hora, además del tope de 3 citas pendientes por email y del campo trampa. Recuperación de contraseña: 5 por IP y 3 por destinatario a la hora. El cron diario borra los contadores viejos. La IP sale de `x-forwarded-for`, que en Vercel escribe la plataforma; detrás de otro proxy hay que comprobar que también lo sobrescribe.

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

**Arrastrar y soltar** usa la API nativa de HTML5, sin librerías; en pantallas táctiles no funciona, ahí se usa «Cambiar hora» en el detalle de la cita.

**Cambios de esquema:** en local, `npx prisma migrate dev` (siempre trabaja contra `dev.db`). `npm run seed` solo aplica las migraciones sobre una base de datos vacía, así que para llevar un cambio de esquema a Turso lo más simple en una demo es recrear la base de datos y repetir el paso 2.

## Para convertirlo en un producto real

Lo que esta demo deja fuera a propósito:

- **Quitar el modo demo**: el cron de reinicio, las contraseñas a la vista en el login y los usuarios con `demo = true`.
- **Migraciones en producción**: `npm run seed` solo crea las tablas en una base de datos vacía. Con datos reales hace falta aplicar las migraciones en cada despliegue y tener copias de seguridad con la restauración probada.
- **Protección de datos**: una agenda de podología con notas es dato de salud. Contratos de encargo con los proveedores, alojamiento en la UE, registro de accesos, retención y borrado, y textos legales revisados por la asesoría de cada clínica.
- **Sesiones**: cambiar la contraseña no cierra las sesiones que ya estuvieran abiertas, y no hay cambio de contraseña desde dentro del panel (se hace con «he olvidado mi contraseña»).
- **Pacientes**: fusión de fichas duplicadas y exportación o borrado de los datos de un paciente.
- **Permisos más finos**: un profesional puede tocar las citas de otro.
- Recordatorios por WhatsApp o SMS, festivos automáticos, citas periódicas, lista de espera, cobros y facturación, alta de profesionales desde el panel, monitorización de errores.
- Historia clínica: exige otro nivel de seguridad y normativa, y las clínicas ya usan software específico.

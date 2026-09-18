# Podología Serrano — web y citas online para clínicas pequeñas

[![CI](https://github.com/9n-dev/gestionClinica/actions/workflows/ci.yml/badge.svg)](https://github.com/9n-dev/gestionClinica/actions/workflows/ci.yml)

Demo de portfolio: web pública + reserva de citas online + panel de agenda para una clínica de podología ficticia de Getafe (Madrid). Todos los datos (clínica, profesionales, pacientes, NIF, teléfono, dirección) son inventados.

**Acceso al panel de la demo** (en `/panel`), todos con contraseña `demo1234`:
- `demo@podologiaserrano.es`: recepción, ve toda la agenda.
- `admin@podologiaserrano.es`: administración. Además ve «Configuración» y «Usuarios».
- `laura@podologiaserrano.es` y `marcos@podologiaserrano.es`: cada profesional entra con su agenda filtrada.

La misma base de código sirve para la demo y para una clínica real: lo decide la variable `MODO_DEMO` (ver [Instalarlo en una clínica real](#instalarlo-en-una-clínica-real)).

## Qué incluye

- **Web pública**: inicio, servicios y precios, equipo, contacto con mapa, aviso legal, privacidad y política de cookies con banner funcional (el mapa de Google solo se carga si se aceptan las cookies de terceros).
- **Reserva en `/reservar`**: servicio → profesional (o «me da igual») → día y hora con huecos reales → datos de contacto → confirmación. No se pide ningún dato de salud.
- **Sin dobles reservas, garantizado por la base de datos** (ver más abajo).
- **Emails** de confirmación, aviso a la clínica, cancelación y recordatorio, con enlace de cancelación por token.
- **Recordatorio al móvil** por WhatsApp y, si no llega, por SMS (Twilio). Llega también a quien reservó por teléfono y no dio email.
- **Panel en `/panel`**:
  - Agenda por día y semana, filtrable por profesional. **Arrastra una cita** para cambiarla de hora o de profesional, o en una tablet tócala y toca la hora nueva; pulsa en un hueco libre para crear una.
  - Crear citas desde el panel (teléfono, mostrador): sin antelación mínima y con email opcional. **Citas periódicas**: la misma cada N semanas; la fecha que no tenga hueco se salta y se avisa.
  - Detalle de cita: cambiar hora (también sin ratón), marcar como atendida o «no se presentó», cancelar, notas internas.
  - **Pacientes**: se crean solos con la primera cita (por la web o desde el panel). Buscador sin acentos, ficha con historial, visitas, faltas y notas, y «nueva cita» con los datos ya puestos. Al abrir una cita se avisa si ese paciente ha faltado otras veces.
  - **Importar pacientes** desde un CSV de Excel (solo administración): primero comprueba el fichero y enseña qué entraría y qué filas tienen problemas; al confirmar, no duplica a quien ya existe.
  - **Cobros y caja**: en el detalle de cada cita se apunta el cobro (efectivo, tarjeta, Bizum o transferencia) con el importe editable por si hay descuento. «Caja» suma lo cobrado cada día por forma de pago, para cuadrar el cajón y el datáfono, y avisa de lo atendido ese día que sigue sin cobrar. Un profesional ve su caja; recepción y administración, la de todos.
  - **Lista de espera**: se apunta desde la ficha a quien quiere venir antes. Cuando se cancela una cita, su detalle y el email de aviso a la clínica dicen a quién de la lista le encaja ese hueco (le cabe el servicio, lo hace ese profesional y lo pidió a él o le daba igual), por orden de llegada; «Darle esta cita» abre el formulario con todo puesto y, al crearla, sale de la lista. Decide una persona, no un mensaje automático: no todos los huecos valen para todos.
  - Bloqueo de horas (comidas, vacaciones) con aviso si hay citas dentro, y los **festivos nacionales** del año con un botón (Viernes Santo incluido, calculado); los autonómicos y locales se añaden a mano.
  - Configuración (solo administración): alta y edición de servicios y precios, de profesionales y del horario semanal de cada uno. El horario que se ve en la web y en el JSON-LD se calcula de ahí.
  - **Estadísticas** (solo administración): ingresos, citas atendidas, ocupación de la agenda y ausencias del mes, comparados con el anterior; tendencia de seis meses, reparto por servicio y por profesional.
  - **Usuarios y roles** (solo administración): alta, cambio de rol y baja. Nadie escribe la contraseña de otro: el usuario nuevo recibe un enlace de un solo uso para elegirla, y el mismo mecanismo sirve para «he olvidado mi contraseña».
  - Registro de todos los emails enviados.
- **Protección de datos**: registro de actividad (quién abrió o cambió qué; abrir una ficha también cuenta), descarga de los datos de un paciente en JSON (derecho de acceso) y eliminación de sus datos (derecho de supresión).
- **Límite de intentos** en el login, en la reserva web y en la recuperación de contraseña.
- **Modo demo**: `npm run seed` y un cron diario que reinicia los datos.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 sobre SQLite/libSQL · Auth.js v5 (credenciales) · Zod · Resend · Twilio (API REST, sin SDK) · Vitest · Playwright · GitHub Actions.

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
| `npm run migrar` | Aplica las migraciones pendientes a la base de datos de `DATABASE_URL` (local o Turso). `npm run build` lo ejecuta antes de compilar |
| `npm run crear-admin -- email "Nombre"` | Crea (o recupera) un administrador e imprime un enlace de un solo uso para que elija su contraseña |
| `npm run seed` | **Solo con `MODO_DEMO=1`.** Reinicia los datos: usuarios, profesionales, servicios, horarios, bloqueos, 30 pacientes, ~40 citas en 14 días, un historial de dos meses y emails de muestra |
| `npm test` | Tests de la lógica: disponibilidad, horario público, minutos disponibles para la ocupación y lectura del CSV de pacientes (puros) y, contra una SQLite temporal con el esquema real, movimiento de citas, identidad y supresión de pacientes, enlaces de acceso, límite de intentos, plazos de conservación, migración de una base de datos antigua con datos, y mensajes al móvil con la API de Twilio simulada |
| `npm run test:e2e` | Playwright contra el build de producción, con dos servidores: uno en modo demo recién sembrado (reserva → ficha → cancelación por email, alta de usuario → contraseña → permisos, bloqueo del login, descarga y supresión de datos, recordatorios, mover una cita en pantalla táctil, estadísticas e importación de pacientes) y otro como instalación real con la base de datos vacía (`crear-admin` → profesional, horario y servicio → primera cita reservable, sin rastro de la demo). La primera vez: `npx playwright install chromium` |
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
| `CRON_SECRET` | Sí | Protege `/api/cron/*`. Vercel Cron lo envía como `Authorization: Bearer …` |
| `RETENCION_*_MESES` | No | Plazos de conservación (ver `.env.example`). Por defecto 12, 12 y 24 meses; los pacientes inactivos no se tocan si no se define su plazo |
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
src/lib/permisos.ts           quién puede modificar las citas y bloqueos de quién
src/lib/acceso.ts             enlaces de un solo uso para poner contraseña
src/lib/limite.ts             límite de intentos
src/lib/auditoria.ts          registro de actividad
src/lib/retencion.ts          plazos de conservación (cron diario)
src/lib/estadisticas.ts       números del panel de estadísticas
src/lib/importar.ts           lectura del CSV de pacientes (codificación, separador, columnas)
src/lib/migraciones.ts        ejecutor de migraciones (build, seed y CLI)
src/lib/clinica.ts            datos de la clínica (variables CLINICA_*) y MODO_DEMO
src/lib/horario.ts            horario público, calculado de los horarios de los profesionales
src/lib/seed-datos.ts         datos de la demo (los usa el seed y el cron de reinicio)
src/lib/emails/               plantillas y envío (Resend o consola)
src/lib/mensajes.ts           WhatsApp y SMS con Twilio (o consola), webhook de estado y su firma
src/lib/fechas.ts             utilidades de fecha en Europe/Madrid
src/app/(publica)/            web, /reservar y /cita/[token]
src/app/panel/                login, recuperación y panel (agenda, citas, pacientes, bloqueos, emails, configuración, usuarios)
src/app/api/cron/             recordatorios y reinicio de la demo
src/app/api/twilio/estado/    webhook: si un WhatsApp no llega, sale el SMS
e2e/                          pruebas de extremo a extremo (Playwright)
.github/workflows/ci.yml      lint, tests y e2e en cada push
```

### Dobles reservas

SQLite no tiene restricciones de exclusión por rango, así que cada cita activa ocupa filas en `franjas_ocupadas`, una por cada 15 minutos, con clave primaria `(profesionalId, inicio)`. La cita y sus franjas se insertan en una única transacción: si dos personas confirman a la vez horas que se pisan, la segunda viola la clave primaria y no se guarda nada. Al cancelar se borran las franjas y el hueco vuelve a ofrecerse. Con «me da igual», si el primer profesional acaba de ocuparse se intenta con el siguiente. Mover una cita (formulario o arrastre) libera las franjas viejas y ocupa las nuevas en una sola transacción: si el destino está pillado, la cita se queda donde estaba.

### Pacientes

Un paciente es un teléfono más un nombre normalizado (sin acentos ni mayúsculas), con restricción única en la base de datos. El mismo móvil con otro nombre es otro paciente: es el caso de quien reserva para su hijo. La cita se enlaza a su paciente con `connectOrCreate` dentro de la misma transacción que ocupa las franjas, y conserva además lo que se escribió al reservar. La migración que introdujo la tabla crea los pacientes de las citas que ya existían. Si alguien reserva una vez como «Pepe» y otra como «José» salen dos fichas: la ficha avisa de las que comparten teléfono o nombre y recepción puede fusionarlas (las citas, la lista de espera y el historial de accesos pasan a la que se queda). Solo se fusiona entre esos posibles duplicados, para que un despiste no mezcle a dos desconocidos. También hay alta a mano, sin cita.

### Importar pacientes

CSV y no `.xlsx` a propósito: leer Excel exige una librería (la de npm más conocida está abandonada y con avisos de seguridad) y desde Excel es «Guardar como → CSV». A cambio, el lector se ocupa de lo que de verdad rompe estas importaciones: el Excel español separa con punto y coma y guarda en Windows-1252, no en UTF-8, así que se prueba UTF-8 estricto y, si los bytes no lo son, se lee como Windows-1252 (tildes y eñes intactas en los dos casos). Las columnas se reconocen por su nombre (Nombre, Apellidos, Teléfono o Móvil, Email o Correo, Notas u Observaciones). Va en dos pasos: comprobar, que no escribe nada y lista las filas con problemas con su número de línea, y confirmar. Las filas confirmadas vuelven del navegador, así que el servidor las valida otra vez con el mismo esquema que el resto de la app. La identidad es la de siempre (teléfono + nombre normalizado): repetir la importación no duplica a nadie.

### Usuarios, roles y contraseñas

Dos roles: `EQUIPO` (agenda, citas, pacientes, bloqueos, emails) y `ADMIN` (además, configuración, usuarios, estadísticas y actividad). Ser profesional no es un rol: es estar ligado a un profesional. Todos ven la agenda entera, pero quien es de Equipo y está ligado a un profesional solo **modifica** sus propias citas y bloqueos (`src/lib/permisos.ts`); recepción, que no está ligada a nadie, y administración gestionan lo de todos. La regla se comprueba en cada acción del servidor, no solo escondiendo botones. La cookie de sesión solo lleva el id; el rol se lee de la base de datos en cada petición (una consulta, con `cache()` de React), así que borrar a alguien o quitarle el rol surte efecto al momento y no cuando caduque la sesión.

Cambiar la contraseña (desde «Mi cuenta» o por enlace) cierra todas las sesiones de ese usuario: el login guarda su hora en la cookie y `Usuario.sesionesDesde` marca desde cuándo valen. No se usa el `iat` del JWT porque Auth.js lo renueva en cada visita.

Las contraseñas solo las escribe su dueño. Dar de alta a alguien le envía un enlace de un solo uso (3 días); «he olvidado mi contraseña» envía otro (1 hora) y responde lo mismo exista o no el email. En la base de datos solo está el hash SHA-256 del token, y cuando el email sale de verdad por Resend el enlace se tacha del registro de `/panel/emails`. Sin Resend se deja, porque ese registro es la única forma de leer el email: así se puede probar en la demo.

En la demo, los cuatro usuarios sembrados llevan `demo = true` y no se pueden cambiar, borrar ni recuperar, para que un visitante no deje fuera a los demás. Los usuarios que cree un visitante sí, y desaparecen con el reinicio nocturno.

### Estadísticas

- **Los ingresos no se mueven al cambiar tarifas**: cada cita guarda el precio que tenía el servicio al reservar (`Cita.precioCent`). Solo cuentan las citas atendidas. Al lado va lo **cobrado** de verdad (`Cita.cobradoCent`, que puede llevar descuento) y lo atendido que sigue sin cobrar.
- **Ocupación** = minutos citados / minutos disponibles, donde lo disponible es el horario de cada profesional menos los bloqueos, contado por franjas de 15 minutos como la reserva (así dos bloqueos que se pisan no restan dos veces). Se calcula con el horario de hoy: si alguien cambió de horario a mitad de un mes pasado, la ocupación de ese mes es aproximada.
- **Ausencias** = no presentadas sobre las que debían haberse atendido; las canceladas a tiempo van aparte, porque liberaron el hueco.
- Los gráficos son HTML y CSS, sin librería: una sola serie en el cobalto del sitio con el mes elegido destacado sobre gris, cifra solo en el mes elegido y en el mejor, burbuja al pasar el ratón o con el foco del teclado, texto alternativo en cada marca y una tabla equivalente debajo de cada gráfico. Las variaciones llevan flecha y texto además de color.

### Recordatorios al móvil

El cron de recordatorios avisa al móvil de todos los pacientes con cita (todos tienen teléfono; email, no) y además por email a quien lo tenga. Con Twilio, por su API REST y sin SDK:

1. **WhatsApp** con una plantilla aprobada: fuera de una conversación abierta por el paciente, WhatsApp no admite texto libre. La plantilla se crea en Twilio con cinco huecos, en este orden: `{{1}}` nombre, `{{2}}` día, `{{3}}` hora, `{{4}}` profesional, `{{5}}` enlace para cancelar.
2. **SMS de reserva** si el WhatsApp falla. El fallo puede venir en el acto (Twilio rechaza la petición) o después: Twilio acepta un WhatsApp para un número que no tiene WhatsApp y avisa más tarde. Para ese caso, cada envío lleva `StatusCallback` a `/api/twilio/estado`; el webhook comprueba la firma `X-Twilio-Signature`, apunta el error y envía el SMS una sola vez aunque Twilio repita el aviso.
3. El SMS sale sin á, í, ó, ú: un solo carácter fuera del alfabeto GSM-7 lo pasa a UCS-2, con 70 caracteres por segmento en vez de 160, y se cobra el triple. La é y la ñ sí están en GSM-7 y se quedan.

Sin credenciales, los mensajes se escriben en consola y quedan en el panel, como los emails. **El envío real no está probado contra Twilio** (no hay cuenta en esta demo): los tests simulan su API y comprueban peticiones, reserva, webhook y firma. Antes de usarlo con pacientes hay que probarlo con una cuenta y una plantilla reales.

### Protección de datos

Una agenda de podología con notas es dato de salud, así que también se apunta quién **mira**, no solo quién cambia. `src/lib/auditoria.ts` anota cada entrada al panel, cada ficha o cita abierta (una vez cada 15 minutos por persona y ficha, para que guardar unas notas no cuente como otro acceso), cada descarga y cada cambio. Solo administración ve el registro, en «Actividad», y desde cada ficha se llega a lo suyo. El registro nunca guarda datos del paciente, solo ids, fechas y nombres de campos: así sobrevive a una supresión sin conservar lo que se pidió borrar. Un test de extremo a extremo comprueba, de paso, que recorrer la lista de pacientes no se apunta como haber abierto sus fichas.

- **Acceso y portabilidad**: «Descargar sus datos» genera un JSON con la ficha, todas sus citas y los emails que se le han enviado.
- **Retención**: el cron diario borra lo que cumple su plazo (`src/lib/retencion.ts`): citas canceladas y copia de emails y mensajes a los 12 meses, registro de actividad a los 24. Es lo que promete la política de privacidad. Anonimizar a los pacientes que llevan años sin venir también está, pero **apagado hasta que la clínica fije `RETENCION_PACIENTES_MESES`**: es irreversible y el plazo es una decisión suya, no un valor por defecto. Lo que hace el sistema queda en «Actividad» a nombre de «sistema».
- **Supresión**: solo administración, y solo si no tiene citas pendientes. **Anonimiza en vez de borrar**: se van nombre, teléfono, email, notas y los emails guardados de sus citas (llevan su nombre en el texto); las citas pasadas se quedan como «Paciente eliminado» para que la agenda y los números de meses anteriores cuadren. Si vuelve a reservar, es un paciente nuevo.

### Límite de intentos

Contadores por clave y ventana de tiempo en la tabla `intentos`, porque en Vercel las funciones no comparten memoria y así no hace falta otro servicio. Login: 10 contraseñas falladas por IP cada 15 minutos (solo cuentan los fallos), comprobado dentro de `authorize()` para cubrir también a quien llame directo a `/api/auth`. Es por IP y no por email a propósito: con un tope por email, cualquiera podría dejar sin acceso a un compañero fallando adrede. Reserva web: 6 por IP y hora, además del tope de 3 citas pendientes por email y del campo trampa. Recuperación de contraseña: 5 por IP y 3 por destinatario a la hora. El cron diario borra los contadores viejos. La IP sale de `x-forwarded-for`, que en Vercel escribe la plataforma; detrás de otro proxy hay que comprobar que también lo sobrescribe.

### Horas y zonas horarias

Todo se guarda en UTC y se calcula y muestra en `Europe/Madrid`, porque los servidores de Vercel corren en UTC. Los tests cubren el cambio de hora de octubre.

### Reglas de reserva

Huecos cada 15 minutos, con un mínimo de 2 horas de antelación y un máximo de 60 días (constantes en `src/lib/clinica.ts`). Máximo 3 citas pendientes por email. Cada profesional tiene marcados los servicios que hace (en la demo, los dos hacen todos): la reserva solo le ofrece para esos, tanto si se le elige como con «me da igual», y el filtro está en el mismo sitio donde se calculan los huecos, así que vale igual para la web, el panel, crear y mover.

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

## Para convertirlo en un producto real

Lo que esta demo deja fuera a propósito:

- **Protección de datos, la parte que no es código**: contratos de encargo con los proveedores (Vercel, Turso, Resend, Twilio), alojamiento en la UE, y textos legales revisados por la asesoría de cada clínica.
- **Segundo factor** (2FA) para administración.
- Oferta automática del hueco liberado al primero de la lista de espera, señal al reservar con Stripe, facturación (mejor integrarse con un programa homologado para Verifactu que construirla), monitorización de errores.
- Historia clínica: exige otro nivel de seguridad y normativa, y las clínicas ya usan software específico.

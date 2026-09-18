# Manual: la reserva y el panel, pantalla a pantalla

Todo lo que sale en las capturas es la demo: clínica, profesionales y pacientes ficticios. Se regeneran con `node scripts/capturas.mjs`.

- [Lo que ve el paciente](#lo-que-ve-el-paciente)
- [Entrar al panel y moverse por él](#entrar-al-panel-y-moverse-por-él)
- [Agenda](#agenda) · [Citas](#citas) · [Pacientes](#pacientes) · [Lista de espera](#lista-de-espera) · [Caja](#caja) · [Bloqueos y festivos](#bloqueos-y-festivos)
- [Gestión](#gestión): [Estadísticas](#estadísticas) · [Emails y mensajes](#emails-y-mensajes) · [Actividad](#actividad) · [Configuración](#configuración) · [Usuarios](#usuarios)
- [Quién puede hacer qué](#quién-puede-hacer-qué)
- [En el móvil y en la tablet](#en-el-móvil-y-en-la-tablet)

## Lo que ve el paciente

La web tiene portada, servicios con precios, equipo, contacto con mapa y las páginas legales. El horario del pie y los días de consulta de cada profesional no están escritos a mano: salen de los horarios que se configuran en el panel.

![Portada de la web](capturas/web-inicio.png)

| Servicios y precios | Equipo | Contacto |
| --- | --- | --- |
| ![Servicios y precios](capturas/web-servicios.png) | ![El equipo](capturas/web-equipo.png) | ![Contacto, horario y mapa](capturas/web-contacto.png) |

El mapa de Google solo se carga si se aceptan las cookies de terceros; mientras tanto hay un enlace para abrirlo fuera.

**Pedir cita** son cuatro pasos, sin registrarse. El estado va en la URL, así que funciona el botón «atrás» y casi no necesita JavaScript.

| 1. Qué necesita | 2. Con quién |
| --- | --- |
| ![Elegir servicio](capturas/web-reservar-1-servicio.png) | ![Elegir profesional](capturas/web-reservar-2-profesional.png) |

En el paso 2 solo aparecen los profesionales que hacen ese servicio. «Me da igual» enseña los huecos de todos y, al confirmar, asigna a quien tenga menos citas ese día.

| 3. Día y hora | 4. Sus datos |
| --- | --- |
| ![Elegir día y hora](capturas/web-reservar-3-dia-y-hora.png) | ![Datos de contacto](capturas/web-reservar-4-datos.png) |

Los huecos son reales: horario del profesional, menos sus citas, menos los bloqueos, con un mínimo de 2 horas de antelación y un máximo de 60 días. No se pide ningún dato de salud.

Al confirmar recibe un email con un enlace personal. Desde ahí ve su cita y puede cancelarla, mientras no haya pasado; el hueco vuelve a ofrecerse al momento. El día anterior le llega un recordatorio por email y al móvil.

| Confirmación | Cancelar |
| --- | --- |
| ![Cita confirmada](capturas/web-cita-confirmada.png) | ![Cancelar la cita desde el enlace](capturas/web-cita-cancelar.png) |

## Entrar al panel y moverse por él

El panel está en `/panel`. En la demo, las contraseñas están a la vista en el login; en una clínica real esa caja no existe. «He olvidado mi contraseña» envía un enlace de un solo uso.

![Acceso al panel](capturas/panel-login.png)

Arriba, lo de todos los días: **Agenda, Pacientes, Lista de espera, Caja y Bloqueos**. Lo esporádico está en **Gestión**. **Nueva cita** es el único botón, porque es una acción y no un sitio. La página en la que estás va subrayada en ámbar. En «Cuenta»: cambiar la contraseña (cierra todas tus sesiones), ver la web y salir.

![El desplegable Gestión](capturas/panel-menu-gestion.png)

## Agenda

Por semana o por día, de todos o de un profesional. Cada profesional tiene su columna y su color; en gris, lo ya atendido; rayado en ámbar, los bloqueos. Pulsar un hueco libre abre «Nueva cita» con ese profesional, día y hora ya puestos.

![Agenda de la semana](capturas/panel-agenda-semana.png)

**Mover una cita.** Con ratón se arrastra, a otra hora o a otro profesional. Sin ratón (en la tablet de recepción, o con teclado) está «Mover una cita»: se elige la cita y se ofrecen, en azul, solo los huecos donde cabe: dentro del horario y sin pisar otra cita ni un bloqueo. En los dos casos decide el servidor, y si el paciente tiene email se le avisa del cambio.

![Moviendo una cita: en azul, los huecos donde cabe](capturas/panel-agenda-moviendo.png)

## Citas

**Nueva cita** es para quien llama o pide hora en el mostrador: sin antelación mínima y con el email opcional. Se abre en el primer día con hueco. Abajo, **Repetir**: la misma cita cada N semanas (una quiropodia cada seis, por ejemplo). Si una fecha de la serie no tiene hueco se salta y se avisa, y toda la serie se anuncia al paciente en un solo email, con un enlace para cancelar cada fecha.

![Nueva cita](capturas/panel-cita-nueva.png)

En el **detalle de una cita** se marca como atendida o «no se presentó», se cancela, se cambia de hora, se apunta el cobro y se escriben notas internas (no son historia clínica). Si ese paciente ha faltado otras veces, lo avisa arriba. Si la cita se cancela y a alguien de la lista de espera le encaja el hueco, aparece aquí mismo.

![Detalle de una cita, con el cobro](capturas/panel-cita.png)

## Pacientes

Se crean solos con la primera cita, por la web o desde el panel: mismo teléfono y mismo nombre (sin acentos ni mayúsculas) es el mismo paciente. También se pueden dar de alta sin cita o **importar** desde Excel. El buscador encuentra «Óscar» escribiendo «oscar», y por teléfono.

![Lista de pacientes](capturas/panel-pacientes.png)

La **ficha** reúne visitas, faltas y cancelaciones, las próximas citas, la lista de espera, el historial y los datos de contacto. «Nueva cita para este paciente» abre el formulario relleno. Si hay otra ficha con el mismo teléfono o el mismo nombre (reservó una vez como «Pepe» y otra como «José»), lo avisa y deja fusionarlas.

Abajo, **protección de datos**: descargar todo lo que hay del paciente en un fichero (derecho de acceso) y, solo administración, eliminar sus datos (derecho de supresión). Eliminar anonimiza: se van nombre, teléfono, email, notas y los mensajes guardados, y las citas pasadas se quedan sin nombre para que la agenda y los números de meses anteriores cuadren.

![Ficha de un paciente](capturas/panel-ficha-paciente.png)

**Importar pacientes** acepta el CSV que guarda Excel («Guardar como → CSV»), con punto y coma o coma y con las tildes bien leídas. Primero comprueba: dice cuántos entrarían y qué filas tienen problemas, con su número de línea. No guarda nada hasta que se confirma, y repetir la importación no duplica a nadie.

![Importar pacientes desde un CSV](capturas/panel-importar.png)

## Lista de espera

Quien quiere venir antes de lo que hay libre. Se apunta desde su ficha: para qué servicio, con quién (o con cualquiera) y cuándo le viene bien. Cuando se cancela una cita, su detalle y el email de aviso a la clínica dicen a quién de la lista le encaja ese hueco, por orden de llegada. «Dar cita» abre el formulario con todo puesto y, al crearla, sale de la lista. Decide una persona, no un mensaje automático.

![Lista de espera](capturas/panel-lista-de-espera.png)

## Caja

Lo cobrado cada día, por forma de pago, para cuadrar el cajón y el datáfono al cerrar. El cobro se apunta en el detalle de cada cita, con el importe editable por si hay descuento (debajo queda la tarifa). Abajo avisa de lo atendido ese día que sigue sin cobrar.

![Caja del día](capturas/panel-caja.png)

## Bloqueos y festivos

Horas que dejan de ofrecerse en la reserva: vacaciones, comidas, formación. De un profesional o de toda la clínica. Si dentro hay citas confirmadas, lo avisa: no se cancelan solas. «Bloquear los festivos» pone de una vez los festivos nacionales que quedan del año (el Viernes Santo se calcula); los autonómicos y locales se añaden a mano.

![Bloqueos](capturas/panel-bloqueos.png)

## Gestión

### Estadísticas

Solo administración. Del mes elegido, comparado con el anterior: ingresos (lo atendido, con el precio que tenía el servicio al reservar, para que cambiar una tarifa no mueva los meses pasados), lo cobrado de verdad y lo pendiente, citas atendidas, ocupación de la agenda y ausencias. Debajo, la tendencia de seis meses, las citas por servicio y el desglose por profesional. Cada gráfico tiene su tabla equivalente.

![Estadísticas](capturas/panel-estadisticas.png)

### Emails y mensajes

Todo lo que sale del sistema queda registrado: qué, a quién, cuándo y si falló (un rebote también cuenta). Sin claves de Resend o de Twilio no se envía nada de verdad y esto es lo único que hay, que es lo que permite probarlo todo en la demo. Los emails con enlaces para poner contraseña y las alertas técnicas solo los ve administración.

![Emails y mensajes enviados](capturas/panel-emails-y-mensajes.png)

### Actividad

Solo administración. Quién ha abierto o cambiado qué, y cuándo. Abrir una ficha o una cita también cuenta, porque son datos de salud. El registro no guarda datos de pacientes, solo a qué ficha se refiere, así que sobrevive a una supresión. Desde cada ficha se llega a lo suyo.

![Registro de actividad](capturas/panel-actividad.png)

### Configuración

Solo administración. Servicios (nombre, descripción, duración, precio), profesionales (con los servicios que hace cada uno) y el horario semanal de cada uno. Lo que se cambia aquí se ve en la web al momento, y no afecta a las citas que ya existen.

![Configuración](capturas/panel-configuracion.png)

### Usuarios

Solo administración. Nadie escribe la contraseña de otro: el usuario nuevo recibe un enlace de un solo uso para elegirla. Quitar a alguien, o cambiarle el rol, surte efecto al momento. Siempre queda al menos un administrador.

![Usuarios](capturas/panel-usuarios.png)

## Quién puede hacer qué

| | Ver la agenda y las fichas | Modificar citas y bloqueos | Pacientes, lista de espera, caja | Estadísticas, actividad, configuración, usuarios, importar, eliminar datos |
| --- | --- | --- | --- | --- |
| **Administración** | todo | todo | todo | sí |
| **Equipo sin profesional** (recepción) | todo | todo | todo | no |
| **Equipo ligado a un profesional** | todo | solo lo suyo | sí; la caja, la suya | no |

La regla se comprueba en el servidor en cada acción; la interfaz, además, esconde lo que no se puede hacer.

![Mi cuenta](capturas/panel-cuenta.png)

## En el móvil y en la tablet

La web y la reserva están pensadas primero para el móvil. En el panel, por debajo de 1280 px el menú se pliega en «Menú» y todo cabe en una fila; la agenda se desplaza en horizontal y las citas se mueven tocando.

![La web, la reserva, la agenda y el menú en un móvil](capturas/movil.png)

![La agenda semanal en una tablet](capturas/tablet-agenda.png)

---
[Volver al README](../README.md) · [Arquitectura](arquitectura.md) · [Instalación](instalacion.md) · [Pruebas](pruebas.md) · [Pendiente](pendiente.md)

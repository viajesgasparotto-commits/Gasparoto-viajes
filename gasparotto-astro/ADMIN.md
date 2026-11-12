# Panel de administración (sin WordPress)

El front (`src/` y `public/`) conserva su estética. El panel vive en `/admin/` y usa
Cloudflare Pages Functions + D1 (base de datos) + R2 (imágenes).
Las tablas se crean y migran solas la primera vez que entrás al panel (hacelo una vez después de cada deploy).

## Probar en local (opcional)
```sh
npm install
cp .dev.vars.example .dev.vars     # clave del panel en local
npm run dev                        # http://localhost:8788/admin/
```

## Subir a Cloudflare (una sola vez)
IMPORTANTE: con Functions hay que desplegar con Wrangler o Git; arrastrar la carpeta en el dashboard NO sube las Functions.
```sh
npm install
npx wrangler login
npm run db:create        # copiá el database_id en wrangler.jsonc
npm run r2:create
npm run project:create
npm run secret           # escribí la clave del panel
npm run deploy
```
Entrá a `https://mi-agencia.pages.dev/admin/`. El número de WhatsApp está en `wrangler.jsonc` (`WHATSAPP_NUMBER`).

### SITE_URL (importante para SEO)
`SITE_URL` en `wrangler.jsonc` es el dominio donde el sitio vive de verdad (sin esta variable el sitio se sirve como "no indexar").
Se usa en canonical, Open Graph, JSON-LD, `sitemap.xml` y `robots.txt`.
En cualquier otro dominio (por ejemplo `mi-agencia.pages.dev`) el sitio responde `X-Robots-Tag: noindex` y
`robots.txt` con `Disallow: /`, para no competir con el dominio principal.
**Si todavía no conectaste el dominio propio y querés indexar desde `pages.dev`, poné esa URL en `SITE_URL`.**

## Qué hace
- **Blog**: crea/edita/duplica/borra -> `/blog/<slug>/` y aparece en `/blog/`.
- **Paquetes**: crea/edita/duplica/borra -> `/paquetes/<slug>/` y aparece como tarjeta en la página de su categoría.
- **Precios**: tabla con todos los paquetes (precio anterior + precio, guardar por fila).
- **SEO**: pestaña con el estado de cada entrada (título, descripción, imagen y alt, largo del contenido) y, dentro
  de cada formulario, vista previa de cómo se ve en Google con contadores de caracteres.
- Si la base falla, el sitio se sirve estático como siempre.

## Disponibilidad y reserva por fecha (fase 1 del ecommerce)
Pestaña **Disponibilidad** del panel. Por paquete se definen las reglas y después se ajusta día por día en el calendario:
- **Reservar por fecha**: si está apagado, la ficha sigue igual que siempre (campo de fecha libre + WhatsApp). Si está prendido, la ficha muestra un calendario con solo los días con lugar.
- **Reglas**: mínimo y máximo de personas por reserva, cupo por día (total de personas), días de la semana con salida, anticipación mínima y hasta cuántos días adelante se vende.
- **Calendario**: tocá uno o varios días (o el nombre de un día de la semana para elegirlos todos) y usá **Cerrar**, **Abrir** (también sirve para abrir un día de semana apagado), **Cupo…** (cupo propio para esos días) o **Restaurar regla** (vuelve a la regla del paquete). Un punto naranja marca los días cambiados a mano.
- La ficha limita las personas al mínimo/máximo del paquete y al cupo que queda ese día. Las reservas pagadas y las pendientes con retención vigente (tabla `bookings`, ver fase 2 más abajo) descuentan cupo.
- Un día figura como completo cuando lo que queda es menos que el mínimo de personas.
- Las tablas/columnas nuevas (`availability`, `bookings` y los campos de `packages`) se crean solas al entrar al panel o al abrir una ficha con reserva activa.
- API: `GET /api/avail?slug=&month=YYYY-MM` (público, solo días reservables) y, con sesión, `GET|PUT /api/slots` y `PUT /api/booking-config/<id>`.
- Fase 2 (abajo): la ficha ya crea la reserva pendiente y retiene el cupo. Fase 3 (abajo): cobro con Pix.

## Reserva pendiente con retención de cupo (fase 2 del ecommerce, sin pagos)
Para los paquetes con **Reservar por fecha** prendido, el botón de la ficha pasa a **Reservar mi lugar** y ya no abre WhatsApp directo:
1. El cliente elige fecha, personas, nombre y WhatsApp (el teléfono ahora es obligatorio, porque la reserva queda en el panel).
2. Al confirmar se crea una reserva en estado **pendiente** y se **retiene el cupo** `BOOKING_HOLD_MINUTES` minutos (15–30, por defecto 20; está en `wrangler.jsonc`).
   Durante ese tiempo nadie más puede tomar esos lugares: el calendario de la ficha y `/api/avail` ya los descuentan.
3. El cliente ve su número de reserva, una cuenta regresiva y un botón de WhatsApp con el mensaje armado para confirmarla con la agencia. También puede **Cancelar esta reserva** para liberar el lugar.
4. Si pasa el tiempo sin confirmar, la reserva queda **vencida** y el cupo vuelve solo (no hay tareas programadas: el cupo se libera porque solo cuentan las retenciones vigentes; el estado se actualiza al listar o al reservar).

**Sin sobreventa:** la revisión de cupo y la creación son una sola sentencia SQL (`INSERT … WHERE cupo suficiente`), así que dos clientes que reservan a la vez por el último lugar no pueden pasarse: el segundo recibe "ya no quedan lugares" y el calendario se actualiza.

**Panel → Reservas** (con insignia de pendientes en el menú): contadores por estado, filtro, y por reserva el cliente (enlace a WhatsApp), la salida, el total y el estado:
| Estado | Qué significa | Acciones |
|---|---|---|
| Pendiente | cupo retenido, esperando confirmación | ✓ Pagada · Renovar retención · Cancelar |
| Pagada | confirmada (descuenta cupo para siempre) | Cancelar |
| Cancelada | cupo liberado | Reactivar · borrar |
| Vencida | terminó la retención sin pagar; cupo liberado | ✓ Pagada · Reactivar · borrar |
- **Pagada** y **Reactivar/Renovar** vuelven a comprobar el cupo del día: si mientras tanto otra persona tomó ese lugar, el panel avisa en vez de sobrevender (subí el cupo del día en Disponibilidad si querés aceptarla igual).
- Una reserva pagada no se borra: primero se cancela. El estado "Vencida" lo pone el sistema; no se elige a mano.
- Cada reserva también queda como consulta (formulario) en **Consultas** y en **Medición**, para que las ventas en curso se sigan contando.
- Total: precio del paquete × personas, guardado en centavos (`bookings.total`) con la moneda deducida del precio (`R$`, `US$`, `AR$`…) o `PRICE_CURRENCY`. Si el paquete no tiene precio numérico, el total figura "A confirmar".

**Protecciones:** campo trampa oculto, 6 intentos de reserva cada 10 minutos por IP, máximo 3 retenciones vigentes por teléfono, chequeo de origen, y el cliente solo puede liberar su propia reserva con el token que recibe al reservar (el token no se muestra en el panel).
**Limitación conocida:** un bot con muchas IPs y teléfonos distintos podría retener cupo sin pagar; si pasa, el siguiente paso es sumar Cloudflare Turnstile al formulario.
**Si el servidor de reservas falla** (error 5xx o sin conexión) la ficha cae a la consulta de siempre: arma el mensaje de WhatsApp para que el cliente lo envíe con un toque, nunca se pierde la venta.
- API: `POST /api/book` y `POST /api/book/cancel` (públicas) · con sesión: `GET /api/bookings`, `PUT /api/bookings/<id>` `{status}` y `DELETE /api/bookings/<id>`.
- Migración: `bookings` suma las columnas `message`, `token` y `updated_at` solas al primer ingreso al panel (o al primer pedido a la API); `schema.sql` ya las trae para bases nuevas.
- Cambió `conv.js` (se subió `ASSET_V` a 8): hay que desplegar con `npm run deploy` para que se publique.

## Panel de Disponibilidad y compra del cliente (mejoras v58)
**Panel → Disponibilidad**
- Arriba, una tarjeta con el paquete, **cómo reserva el cliente** y las reglas plegadas (el resumen muestra personas, cupo y días con salida; se despliegan para editar). Un solo botón **Guardar cambios**.
- **Resumen del mes:** días con lugar, reservas pagadas (y personas), pendientes y ocupación.
- **Calendario:** cada día muestra una barra de ocupación. Tocá **un día** para ver sus reservas (cliente, personas, estado, WhatsApp) y saltar a Reservas; tocá **varios** para cerrar, abrir o cambiar el cupo. **Elegir días con salida** selecciona de una vez todos los del mes.
- En modo WhatsApp directo se avisa que los clientes no ven el calendario.

**Compra del cliente (ficha, paquetes con reserva por fecha)**
- **Total en vivo** mientras elige fecha y personas (precio × personas), con aviso de que todavía no se cobra nada.
- **Pasos visibles** después de reservar: Lugar guardado → Pago con Pix (o Confirmar por WhatsApp) → Reserva confirmada.
- **Pantalla de pago Pix** con el monto, QR, código copia e cola e instrucciones de tres pasos; la confirmación es automática.
- **Agregar a mi calendario** (.ics) cuando la reserva queda pagada.
- Textos nuevos en `conv.js` (es/pt); estilos de los pasos en `tw.css` (`.tw-tstep`).

## Cobro con Pix (fase 3 del ecommerce)
Cada paquete elige **cómo reserva el cliente** en **Disponibilidad → Cómo reserva el cliente**:
- **Directo por WhatsApp**: fecha libre y el botón abre WhatsApp con los datos (sin calendario ni cupos).
- **Calendario + confirmar por WhatsApp**: fase 2; se guarda el lugar y se confirma con la agencia (marcás *Pagada* en Reservas).
- **Calendario + pago online con Pix**: la reserva pendiente suma el botón **Pagar con Pix** (requiere Mercado Pago configurado, ver abajo). Por defecto todos los paquetes quedan en WhatsApp: Pix solo se activa donde lo elijas.
1. Reservar crea la reserva pendiente (fase 2). Si el paquete está en modo Pix y tiene precio en reales (`R$`) el cliente ve **Pagar con Pix**.
2. Al tocarlo, el servidor crea el cobro en Mercado Pago y muestra el **QR** y el código **copia e cola**. El cupo queda retenido `PIX_MINUTES` (35) minutos desde ese momento, el mismo tiempo que vale el código.
3. Cuando el cliente paga, Mercado Pago avisa a `/api/pay/webhook` y la ficha consulta `/api/book/status` cada 5 s: la reserva pasa sola a **Pagada** y el cliente ve "¡Pago recibido!". En el panel figura "💚 Pagó con Pix".
4. Si el cliente cancela la reserva, el cobro Pix también se cancela en Mercado Pago.

**Cómo activarlo** (los secrets no van en `wrangler.jsonc`):
- `npx wrangler pages secret put MP_ACCESS_TOKEN --project-name <proyecto>` → *Access Token* de producción de la cuenta de Mercado Pago (Tus integraciones → Credenciales).
- `npx wrangler pages secret put MP_WEBHOOK_SECRET --project-name <proyecto>` → clave secreta del webhook.
- En Mercado Pago → Tus integraciones → Webhooks, URL de producción `https://TU-DOMINIO/api/pay/webhook`, evento **Pagos**. `SITE_URL` tiene que estar bien puesto (el cobro lleva esa URL de notificación).
- Para probar en local, `.dev.vars` con las mismas variables (ver `.dev.vars.example`) y credenciales de prueba.

**Seguridad:** el webhook nunca confía en lo que recibe. Verifica la firma `x-signature`, vuelve a pedir el pago a Mercado Pago con el token del servidor y solo confirma si el pago es el que creó este servidor para esa reserva, está aprobado y el monto coincide con el total. El monto lo fija el servidor (nunca el navegador). El cliente solo puede iniciar o consultar el pago de su reserva con su token.

**Casos a tener en cuenta**
- **Pix cobra solo en reales.** Paquetes en otra moneda, o sin precio numérico, no muestran el botón y se confirman por WhatsApp.
- **Pago tardío con el día ya lleno:** la reserva queda *Pagada* igual (la plata ya entró) y con la nota "Pago Pix recibido sin cupo: revisar o reembolsar" en la columna de cliente.
- **Reembolsos:** se hacen desde Mercado Pago; después cancelá la reserva en el panel para liberar el cupo.
- Marcar "Pagada" a mano en el panel (cobro por transferencia, efectivo, etc.) sigue funcionando.
- API: `POST /api/book/pay` `{id, token}` · `GET /api/book/status?id=&token=` · `POST /api/pay/webhook` (solo Mercado Pago).
- Migración: `bookings` suma `pix_code`, `pix_qr` y `paid_at` solas. Prueba: `npm run test:pix` (SQLite real y Mercado Pago simulado).
- Cambió `conv.js` (`ASSET_V` = 9): hay que desplegar con `npm run deploy`.
- **Requisito de la cuenta:** Pix lo habilita Mercado Pago solo para cuentas **de Brasil** (con CPF/CNPJ y clave Pix). Una cuenta argentina no puede cobrar Pix; en ese caso conviene otro proveedor (Asaas, EBANX) y habría que cambiar `functions/lib/pix.js`, que es el único archivo que habla con el proveedor.

## SEO automático en cada entrada publicada
- `<title>`, meta descripción, canonical, Open Graph y Twitter propios (no heredados de `/blog/`).
- JSON-LD: `BlogPosting` (blog) o `Product` + `Offer` en BRL (paquetes), con migas de pan.
- Entra al `sitemap.xml` con fecha de modificación; los borradores no.
- Si cambiás la dirección web (slug), la anterior redirige con 301 a la nueva.
- `/blog/slug` sin barra final redirige a `/blog/slug/` (una sola URL por contenido).
- Las imágenes se achican a 1600 px y se convierten a WebP en el navegador antes de subirlas.
- El HTML del contenido se limpia (sin scripts, estilos ni eventos) al guardar y al mostrar.

## Enlaces viejos de WordPress (`/?p=123`)
Las tarjetas del sitio original enlazaban a `/?p=ID`, que devuelve 404. Ahora esos enlaces van a `/blog/`.
Si recreás un post viejo en el panel, cargá su número en **Avanzado → ID viejo de WordPress** y las tarjetas
viejas pasarán a apuntar a la entrada nueva.

## Seguridad
- Sesión firmada que vence a los 30 días, cookie HttpOnly/Secure/SameSite, freno de intentos y chequeo de origen.
- Subida solo de JPG/PNG/WEBP/GIF/AVIF hasta 8 MB.
- Recomendado: Cloudflare Access sobre `/admin*` y `/api/*` (Zero Trust > Access > Applications > Self-hosted > Allow por email).

## Para escalar
- Categorías: ya no están en el código; se administran en el panel (sección **Categorías**).
- Campos nuevos: `functions/lib/schema.js` (migración) + `schema.sql` + lista de columnas en `functions/lib/api/contenido.js` (`TABLES`) + input en `public/admin/admin.js`.

## Cambios de esta versión (login + panel)
- **Login profesional** (tarjeta blanca con logo, campo de clave con botón Ver/Ocultar, errores en línea) con registro de arranque estilo terminal arriba: arranca en ~2 s mostrando cada paso real (`/api/me`, cookie `gv_admin`, D1/R2) y, al enviar la clave, `POST /api/login`, verificación HMAC, sesión firmada y carga de datos. Usa el logo de `/assets/gasparotto-logo-v1.png`.
- **Fix "clave incorrecta"**: el secret `ADMIN_PASSWORD` y la clave tipeada se comparan sin espacios/saltos de línea al borde (un `echo clave | wrangler secret put` guardaba un `\n` y nunca coincidía). La cookie solo lleva `Secure` en https, así que también funciona en `http://localhost`.
- **Si la sesión no se guarda** (cookies bloqueadas) el login lo dice en vez de quedar en blanco.
- **Panel**: menú lateral con logo, pantalla **Inicio** (resumen, accesos rápidos, últimas modificaciones, estado de D1/R2/WhatsApp), listados con miniatura, filtro por categoría, orden (recientes / A-Z / con observaciones SEO) y contador.
- Después de desplegar, si el login sigue rechazando la clave, volvé a cargarla: `npm run secret` y `npm run deploy`.

## Cambios (versión 4): panel más profesional + precios
- **Precios de paquetes**: en la pestaña **Precios** hay una tabla con todos los paquetes creados desde el panel (precio anterior + precio, guardar por fila). En el listado de Paquetes cada tarjeta tiene el botón **💲 Precio** (ventana rápida). También se puede cambiar dentro de Editar.
- Ventanas propias del panel (confirmar borrado, enlaces, texto alternativo de imágenes) en vez de los avisos del navegador.
- Avisos verdes/rojos, indicador "● Sin guardar", tarjeta de guardado fija al editar, cargas con esqueleto, atajo `/` para buscar, aviso de paquetes sin precio en Inicio.

## Cambios (versión 5): destacados, categorías y listados limpios
- **Etiqueta/categoría de paquetes**: el servidor acepta la clave (`tangos`) o la etiqueta (`Tangos`) y normaliza
  antes de guardar. Antes, un valor guardado con otro formato hacía que el paquete no se pudiera editar.
- **Destacados**: casilla "★ Destacado en el inicio" en paquetes y entradas del blog.
  - Paquetes destacados → aparecen en la página de inicio (bloque antes de la sección del blog).
  - Entradas destacadas → reemplazan las tarjetas del blog en el inicio.
  - Si no hay nada destacado, el inicio no muestra ese bloque.
- **Listados limpios**: en las páginas de Tangos, Paseos y Ofertas se quitaron las tarjetas estáticas de prueba
  (Madero Tango Last Minute, Madero Tango Black, Tango Porteño Plateia, etc.). Ahora solo se muestran los paquetes
  creados en el panel, en el lugar marcado por `<!--PANEL:PAQUETES-->`.
  Para repetir la limpieza en un HTML nuevo: `node scripts/limpiar-listados.mjs`.
- **Migración**: la columna `featured` se agrega sola la primera vez que se entra al panel. Para una base nueva usar `schema.sql`.

### Pendiente

## Cambios (versión 6): detalles en paquetes y mejoras del blog
- **Paquetes → Qué incluye / detalles**: botones para agregar ítems frecuentes (traslado, desayuno, almuerzo, open bar, guía en portugués…)
  con un toque; tocar otra vez lo quita. Se muestran con ✓ en la página del paquete. Podés escribir ítems propios, una línea cada uno.
- **Blog**: fecha de publicación editable (ordena el listado y se muestra en la entrada), sugerencias de categorías ya usadas,
  botón "Generar resumen desde el contenido" y contador de tiempo de lectura y palabras.
- Migración: las columnas nuevas (`details`, `publish_date`) se agregan solas la primera vez que se entra al panel.

## Cambios (versión 7): programación y entradas relacionadas
- **Programar**: en Blog, una fecha de publicación futura deja la entrada oculta (web, blog, inicio y sitemap) hasta ese día.
  El listado del panel la marca como "programada". La fecha se aplica desde las 00:00 de Buenos Aires.
- **Entradas relacionadas**: al pie de cada entrada se muestran hasta 3 tarjetas. Podés elegirlas en el formulario;
  si no elegís ninguna, se usan las de la misma categoría y, si no hay, las más recientes.
- Migración: la columna `related_ids` se agrega sola al entrar al panel.
- Limitación: la programación es por día, no por hora.

## Cambios (versión 8): categorías administrables
- **Panel → Categorías**: crear, renombrar, reordenar (▲▼) y borrar categorías de **Paquetes** y de **Blog**. También se puede crear una
  desde el formulario de una entrada/paquete con el botón **+ Nueva**. Las listas del panel (filtros, selectores, precios) salen de la base.
- **Se reflejan solas en el sitio**:
  - Blog: la barra de filtros de `/blog/` se genera desde la base (enlaces reales) y cada categoría tiene su página `/blog/categoria/<slug>/`.
    Las tarjetas y cada entrada muestran su categoría con enlace.
  - Paquetes: cada categoría nueva tiene su página `/paquetes/categoria/<slug>/` y las categorías se enlazan entre sí con botones en todos los listados.
    Las categorías de la v7 (Tangos, Paseos, Ofertas de viaje) conservan sus páginas fijas.
  - `sitemap.xml` incluye las páginas de categoría; las categorías **sin contenido publicado no se muestran** en el sitio ni en el sitemap.
- **Reglas**: no se pueden repetir nombres; al borrar una categoría con contenido hay que elegir adónde pasa; siempre queda al menos una;
  las categorías con página fija (Tangos, Paseos, Ofertas de viaje) se pueden renombrar pero no borrar (el menú del sitio enlaza a esas páginas).
  Si se cambia la dirección de una categoría o se borra, la dirección anterior redirige (301).
- **Migración automática** al primer ingreso al panel: se crea la tabla `categories`, se conservan las categorías de la barra del blog original
  y las que ya usaban tus entradas, y `posts.category` pasa de etiqueta a clave (así renombrar no rompe nada).
- **Correcciones incluidas** (hacían que los paquetes no se vieran en el sitio): los listados y el inicio dependían de una tarjeta de ejemplo que la
  limpieza de la v5 había borrado (los paquetes no se dibujaban) y el inicio buscaba un `<section>` inexistente. Ahora las tarjetas se generan solas.
- Limitación: el menú principal sigue siendo HTML fijo; las categorías nuevas se alcanzan desde los botones de categorías, no desde el menú.


## Cambios (versión 9): capa de conversión + base white-label
Objetivo: que el sitio venda más y que se pueda entregar a otras agencias sin tocar código (ver `WHITE-LABEL.md`).
- **Ficha de paquete nueva** (`/paquetes/<slug>/`): precio con "Desde", % de descuento calculado solo (precio anterior vs precio), lista "Qué incluye" con ✓,
  tarjeta de reserva que acompaña al scrollear (desktop) o barra fija abajo con precio + botón (mobile), formulario corto de consulta y paquetes relacionados.
- **Tarjetas de paquete nuevas** (inicio, Tangos, Paseos, Ofertas y categorías): badge de descuento, precio "desde … por persona", botón **Consultar** (WhatsApp con el nombre del paquete) y **Ver detalles**.
  Si un paquete no tiene precio muestra "Consultá tu precio".
- **Portada**: los CTA del hero pasan a botones y se agrega "Hablar por WhatsApp". El bloque de destacados ahora tiene título.
- **Consultas** (pestaña nueva del panel): cada formulario y cada clic en un botón de WhatsApp queda registrado, con estado (nuevo / contactado / vendido / perdido) y % de consultas vendidas.
  Migración automática: la tabla `leads` se crea sola al entrar al panel (o `npm run d1:schema` en una base nueva).
- **Medición**: los clics y formularios envían eventos `gv_whatsapp_click` / `gv_lead_form` a `dataLayer` y `generate_lead` a gtag/fbq si el sitio los tiene instalados.
- **Marca por agencia**: nombre, logo, colores, idioma y textos de confianza salen de variables de `wrangler.jsonc` (`BRAND_*`, `SITE_LANG`).
- Anti-spam del formulario: campo trampa oculto, límite de envíos por IP y chequeo de origen. Si algo falla, igual se abre WhatsApp: nunca se bloquea una consulta.
- Cuando cambie `public/assets/conv.js`, subir `ASSET_V` en `functions/lib/brand.js`. Cuando cambie `tw.css`, `fx.js` o `filter.js`, subir su `?v=` en `functions/lib/render.js` / `functions/lib/ficha.js` (los assets se cachean un año).

## Cambios (versión 14): ficha y listados
- **Datos de la ficha** (panel → Paquetes → Editar → "Datos de la ficha"): datos clave, qué no incluye, paradas, tabla de opciones/sectores, preguntas frecuentes y galería. Una línea por ítem; los formatos están en cada campo. Se guardan en la columna `meta` (se agrega sola al entrar al panel).
- **Ficha**: chips con datos clave, incluye/no incluye en dos columnas, tabla con scroll horizontal en celular, paradas, FAQ con datos estructurados FAQPage.
- **Horarios de salida** (panel → Paquetes o Servicios → Editar → "Datos de la ficha" → *Horarios de salida*): una línea por horario, `09:00 | nota opcional` (también acepta `9h30`, `9.30`, `9 h`). Se ordenan solos, se descartan los repetidos y los inválidos, hasta 24. Se guardan en `meta.times` (sin cambios en la base). En la ficha aparecen como casillas debajo de los datos clave y en la tarjeta del listado se muestran hasta 3 (`09:00 · 11:00 · 14:30 …`). Son **informativos**: no afectan al cupo ni a la reserva por fecha. Test: `npm run test:horarios`.
- **Reserva por horario (motor, en construcción)**: columna `packages.time_booking` (0/1, apagada por defecto) y `bookings.time` (`"HH:MM"`, vacío = reserva por día). Con el modo prendido y horarios cargados, el cliente elige fecha + hora y el **cupo diario vale por cada horario** (también el cupo propio de un día). Cerrar un día cierra todos sus horarios; las reservas viejas sin hora cuentan contra todos los horarios del día; con anticipación 0, los horarios de hoy que ya pasaron no se venden. Si se prende sin horarios cargados, se reserva por día. API: `/api/avail` suma `by_time`, `times` y `slots`; `/api/book` acepta `time` (error `code:"time"` si falta); `PUT /api/booking-config/:id` acepta `time_booking` (si no se manda, se conserva). Tests: `npm run test:reservas-horario` y `test:reservas-horario-api`. Falta: selector de horario en la ficha y el interruptor en el panel.
- **Listados**: buscador y filtro por duración (desde 6 paquetes), duración y horario en cada tarjeta, y comparador de opciones que aparece solo cuando 2 o más paquetes de la categoría tienen 2 o más datos clave.
- Mensaje de WhatsApp: "Hola, quisiera recibir información sobre el paquete [nombre]. ¿Podrían enviarme disponibilidad y detalles?".
- Carga inicial: `npm run seed` (no pisa lo que ya editaste).

## Cambios (versión 6): carga de blog simplificada
- El formulario de blog muestra solo: **Título**, **Contenido**, **Imagen**, **Categoría** y **Publicado**.
- **Formato automático**: al pegar el texto (o al guardar, o con el botón "✨ Dar formato automático") se arma solo: títulos H2/H3, listas, negritas (`**texto**`), enlaces, citas (`> texto`), y bloques "Consejo:" / "Dato clave:". Si el título está vacío, se toma de la primera línea.
- **Se completan solos**: dirección web (desde el título), resumen, descripción para Google, título para Google, texto alternativo de la imagen (usa el título), índice, tiempo de lectura y llamado a reservar.
- Todo lo demás (dirección, resumen, fecha programada, relacionadas, destacado, Google, ID de WordPress) quedó en **Opciones avanzadas**, cerrado por defecto.
- Preguntas frecuentes de la portada (`src/data/home.ts`): la 3.ª ahora explica que los precios publicados son por persona y de referencia.

## Cambios (versión 7): diseño con más color
- Paleta: azul de marca más vivo (ya no casi negro), celeste, dorado (`BRAND_ACCENT`), rojo tango y verde azulado, definidos en `src/styles/tw.css`.
- Portada: fondo con cielo y sol, sello dorado "Desde 2006" (`hero.badge` en `src/data/home.ts`), cinta dorada de destinos, destinos en tarjetas de color (`tone`: rose / blue / teal), pasos de colores, bloque dorado del fundador.
- Tarjetas de paquete: descuento en rojo y destacado en dorado. Pie con línea dorada.
- Después de cambiar estilos: `npm run build` (recompila `tw.css`).

## Paquetes que combinan servicios
1. Cargá primero cada servicio suelto (vuelo, hotel, traslado, excursión…) como un producto normal, cada uno con su precio.
2. Creá el paquete y, en "Datos de la ficha", elegí **Tipo de producto → Paquete** y marcá los servicios que lo componen.
3. En el sitio, el paquete muestra cada servicio con su precio y se puede consultar por separado. Si la suma de los precios sueltos supera el precio del paquete (misma moneda), se muestra cuánto se ahorra.

## Formulario de reserva en 2 pasos (v79)
- Paso 1 "Tu viaje" (fecha, personas, resumen de precio) y paso 2 "Tus datos" (nombre, WhatsApp, comentarios). Markup en `functions/_middleware.js`, lógica en `public/assets/conv.js`, indicador en `tw.css` (`.tw-steps`), animación en `fx.ts`.
- Versiones de assets subidas: `ASSET_V` = 10 (`brand.js`), `tw.css ?v=15` y `fx.js ?v=9` (`render.js`). Hay que desplegar con `npm run deploy` (corre el build de CSS y fx).
- Evento nuevo de medición: `gv_form_step` (dataLayer) al pasar al paso 2.

## Paquetes y servicios, y niños en la reserva
- **Nuevo paquete / Nuevo servicio**: en *Paquetes y servicios* hay un botón para cada uno (también en Inicio). Un **servicio** se vende solo (traslado, excursión, entrada…); un **paquete** combina varios servicios. El tipo se puede cambiar dentro del formulario (*Datos de la ficha → Tipo de producto*). Los servicios aparecen en `/servicios/`; los paquetes en `/paquetes/`.
- **Acepta niños**: casillero debajo del precio, al crear o editar el paquete/servicio.
  - Apagado (por defecto, y así quedan los que ya existían): la ficha pide "Personas", como siempre.
  - Prendido: la ficha pide **Adultos** (mínimo 1) y **Niños** por separado. El cupo, el mínimo/máximo de personas y el precio siguen contando el total (adultos + niños; los niños pagan igual que un adulto).
  - Se ve en el panel: *Reservas* y el detalle del día en *Disponibilidad* muestran "2 adultos + 1 niño", y en *Consultas* y en el mensaje de WhatsApp queda el desglose.
- Migración automática: `packages.accepts_children` y `bookings.adults/children` se crean solas al primer ingreso al panel después de desplegar.
- Cambió `conv.js` (`ASSET_V` = 11) y `admin.js`: desplegar con `npm run deploy`.

## Cambios (v81): precio de niños por edad, reservas más claras
**Precio de niños por edad** (Paquetes y servicios → Editar/Nuevo → *Acepta niños*)
- Al marcar *Acepta niños* aparece **Precio de los niños**: tramos "de X a Y años paga Z % del precio de adulto" (0 % = gratis). Hay atajos (*Gratis hasta 5 años*, *Gratis hasta 5 · mitad de 6 a 11*, *Mitad de precio hasta 11*, *Sin descuento*), hasta 4 tramos y una vista previa con el precio. Desde la edad siguiente al último tramo (hasta 17) pagan como adulto.
- En la ficha, el cliente ve la tarifa de niños, elige la **edad de cada niño** y el total se calcula al instante. Sin tramos configurados todo funciona como antes (los niños pagan completo y no se pide la edad).
- El **servidor recalcula siempre el total** (adultos × precio + cada niño según su tramo) y guarda las edades en la reserva (`bookings.child_ages`); lo que muestra el navegador es solo una vista previa. Pix cobra ese mismo total.
- Los niños que entran gratis **igual ocupan lugar** en el cupo del día (el cupo cuenta personas).
- Migración automática: columnas `packages.kids_policy` y `bookings.child_ages` (`schema.sql` ya las trae). Cambió `conv.js` (`ASSET_V` = 12) y `tw.css` (`?v=16`): desplegar con `npm run deploy`.
- Prueba: `npm run test:reservas` (incluye tramos, superposiciones, edades faltantes y totales).

**Panel → Reservas**
- Tarjetas agrupadas por **fecha de salida** (Hoy, Mañana, próximos días; las pasadas quedan plegadas), con cliente + WhatsApp, personas (con edades de los niños), total, estado y acciones.
- Resumen: por confirmar, salidas de los próximos 7 días, pagadas y lo cobrado. Búsqueda por nombre, teléfono, paquete o #, filtros por estado (por defecto *Activas*) y orden *Por salida* / *Más recientes*.
- En Disponibilidad, el detalle de cada día también muestra las edades.

## Usuarios del panel (versión 84)
- Panel → **Sistema → Usuarios** (solo administradores): crear, editar, cambiar clave, desactivar y borrar. Cada persona entra con **email + clave** en la pantalla de login.
- Roles: **Administrador** (todo, incluye usuarios) y **Editor** (todo el panel menos Usuarios).
- La **clave general** (`ADMIN_PASSWORD`) sigue funcionando: se entra con el campo Email vacío y vale como administrador. Sirve de respaldo si se pierde el acceso; si no la querés usar, poné un valor largo y aleatorio.
- Las claves se guardan con PBKDF2-SHA256 (100.000 iteraciones, sal propia). Cambiar la clave de alguien, desactivarlo o borrarlo cierra sus sesiones abiertas.
- Nadie puede borrarse, desactivarse ni quitarse el rol de administrador a sí mismo.
- La tabla `users` se crea sola al primer ingreso (también está en `schema.sql`). Para correr la prueba: `npm run test:users`.
- Archivos: `functions/lib/users.js` (hash y validaciones), `functions/lib/api/auth.js` (login y sesión), `functions/lib/api/usuarios.js` (`/api/users`), `public/admin/admin.js` (login y vista Usuarios).

## Equipo, favoritos y mapa de calor (versión 85)
- **Equipo → Rendimiento** (admin): por persona, publicaciones (entradas y paquetes), actualizaciones, movimientos, días activos y actividades cumplidas; por autor de blog, entradas publicadas, visitas, promedio por entrada, clics de WhatsApp y su mejor entrada; ranking de las 10 entradas con más visitas. Períodos de 7, 30 y 90 días.
- **Equipo → Historial** (admin): cada alta, edición, borrado, cambio de estado e ingreso queda registrado con quién lo hizo (tabla `activity`, se limpia sola pasados 400 días). Filtro por persona y período.
- **Autoría**: cada entrada y paquete guarda `created_by` y `updated_by`. Lo anterior a esta versión figura como "Sin autor asignado".
- **Actividades** (Operación): el administrador crea tareas obligatorias (una vez, diaria, semanal o mensual) para una persona o para todo el equipo; cada persona marca las suyas y se reinician solas según la frecuencia. El administrador ve el cumplimiento por persona. La clave general no identifica a nadie, así que no puede marcar actividades.
- **Favoritos de la portada** (Contenido): paquetes y servicios con orden manual (la portada muestra los 3 primeros; el resto queda de reserva) y entradas de blog destacadas. Lo que no se ordenó a mano sigue ordenándose por demanda.
- **Mapa de calor** (Crecimiento): por página, qué porcentaje de las visitas llega a cada décima de la página, dónde se pierde más gente, y los elementos con más clics (sección › tipo: texto). Se puede filtrar por celular o escritorio. `conv.js` envía un solo aviso por visita a `POST /api/track`, sin cookies ni datos personales, y excluye bots y a quienes tienen "No rastrear". **No es un mapa de clics por posición en pantalla**: mide profundidad de scroll y clics por elemento.
- Cambió `conv.js` (`ASSET_V` = 13): desplegar con `npm run deploy`. Tablas nuevas (se crean solas al primer ingreso al panel, y están en `schema.sql`): `activity`, `tasks`, `task_done`, `page_depth`, `page_clicks`, más las columnas `created_by`, `updated_by` y `home_order`.
- Pruebas: `npm run test:equipo` (y `npm run test:users`).


## Reporte de actividades, avisos y links adjuntos (versión 86)
- **Equipo → Reporte de actividades** (admin; también un botón *Ver reporte* en Actividades): cumplimiento de los últimos 7, 30 o 90 días. Muestra el % general, hechas / no hechas / en curso, el detalle **por persona** y **por actividad**, y la lista de lo que quedó sin hacer. **Descargar CSV** exporta actividad × persona.
  - Solo cuentan los períodos ya terminados (día, semana de lunes a domingo, mes); el período actual figura "en curso". Una actividad cuenta desde el día en que se creó y las pausadas no entran. Las de una sola vez cuentan como no hechas cuando pasa su fecha de vencimiento.
- **Avisos** (campana arriba a la derecha y bloque *Para revisar hoy* en Inicio), con tres niveles: **Urgente**, **Atención** y **Pendiente**. Cada aviso lleva a la pantalla donde se resuelve. El número de la campana cuenta urgentes + atención. Se actualizan al navegar y cada 5 minutos.
  - Para cada persona: sus actividades vencidas (urgente), las que vencen en 2 días o están por cerrar su período —diarias después de las 18 h, semanales de viernes a domingo, mensuales en los últimos 5 días— (atención), las pendientes (pendiente), y las que **no hizo en el período anterior** ("ayer", "la semana pasada", "el mes pasado").
  - Para el administrador, además: actividades vencidas que el equipo no completó y cuántas del período anterior quedaron sin cumplir.
  - Para todos: reservas pendientes por confirmar (urgente si salen en 2 días), consultas sin contactar hace más de 24 h, productos publicados sin precio y publicaciones sin imagen.
- **Links en las actividades**: al crear o editar una actividad hay un campo *Links útiles*, uno por línea (`Nombre | https://…` o solo la dirección; si falta `https://` se agrega). Hasta 8, solo `http`/`https` (se rechazan `javascript:`, `data:`, etc.). Se muestran como botones en *Mis actividades*, en el tablero del administrador y en el reporte. Pausar una actividad conserva sus links; dejar el campo vacío al editar los quita.
- Migración automática: la columna `tasks.links` se crea sola al primer ingreso (también está en `schema.sql`).
- API nueva: `GET /api/alerts` (cada persona ve lo suyo) y `GET /api/tasks/report?days=` (solo admin). `POST/PUT /api/tasks` aceptan `links`.
- Archivos: `functions/lib/activity.js` (links, períodos y reporte), `functions/lib/api/equipo.js`, `public/admin/admin.js` y `src/styles/admin.css` (hay que correr `npm run build` para recompilar `admin.css`).
- Pruebas: `npm run test:equipo` (suma links, reporte y avisos).

### Constancia al completar una actividad (v87)
- Al marcar una actividad como hecha se abre una ventana con **Nota** y **Link** opcionales (por ejemplo, el link a la entrada publicada o a la carpeta de fotos). Si se cancela, la actividad no se marca.
- La constancia se ve en *Mis actividades* y, para el administrador, en **Reporte de actividades → Constancias recientes**.
- Volver a marcar la actividad actualiza la constancia sin cambiar cuándo se completó. El link debe ser http(s).
- Migración automática: `task_done.note` y `task_done.link`. Prueba: `npm run test:equipo`.

### Revisión de entregas y aviso de actividad nueva (v88)
- **Revisión** (Equipo → Reporte de actividades → *Entregas recientes*, botón **Revisar**): el administrador puede **aprobar** una entrega o **pedir corrección** (el comentario es obligatorio en ese caso) y también quitar la revisión. Queda en el Historial como "revisó".
- La persona ve en *Mis actividades* si su entrega fue aprobada o qué hay que corregir, recibe un aviso **Atención** y tiene el botón **Entregar de nuevo**, que limpia la revisión. Volver a marcar la actividad también la limpia.
- El administrador recibe un aviso **Pendiente** con las entregas con nota o link que todavía no revisó (últimos 14 días).
- **Actividad nueva**: quien recibe una actividad (o todo el equipo si es general) ve un aviso **Atención** "Nueva actividad para vos" durante 3 días, mientras siga sin hacerla. Después pasa a "Pendiente" o a los avisos de cierre de período.
- *Entregas recientes* ahora lista todas las entregas del período (con o sin nota), hasta 40.
- API: `PUT /api/tasks/<id>/review` `{user_id, period, status: ok|redo|"", review_note}` (solo admin). Migración automática: `task_done.review`, `review_note`, `reviewed_by`, `reviewed_at`.

## Seguridad del panel (versión 89)
Auditoría del login, las sesiones, los permisos, el origen de los pedidos y la subida de imágenes. Qué se corrigió:
- **Firma de sesión propia.** Antes la cookie se firmaba con la propia clave general (`ADMIN_PASSWORD`): cualquiera con una cookie válida (por ejemplo, un editor con la suya) podía probar contraseñas fuera de línea contra esa firma. Ahora se firma con una clave aleatoria que el sistema genera y guarda en la base (tabla `settings`), o con el secret opcional `SESSION_SECRET` (16 caracteres o más: `npx wrangler pages secret put SESSION_SECRET --project-name <proyecto>`).
  Cambiar la clave general sigue cerrando las sesiones de la clave general; las de usuarios dependen de la clave de cada uno.
- **Las sesiones duran 14 días** (antes 30). **Después de desplegar, todos tienen que volver a entrar una vez** (las cookies viejas ya no valen).
- **Bloqueo por fuerza bruta guardado en la base** (tabla `login_fails`, compartido entre todas las instancias del servidor; antes el freno era solo en memoria de cada instancia y se podía esquivar). 8 fallos en 15 minutos bloquean la **cuenta** (o la clave general) aunque los intentos vengan de IP distintas, y 20 fallos bloquean la **IP**. Se levanta solo; entrar bien limpia los fallos. El bloqueo de una cuenta queda en el Historial ("bloqueado").
  Contrapartida: alguien que adivine un email puede bloquear esa cuenta 15 minutos. La clave general sirve de respaldo.
- **Origen de los pedidos.** Además del `Origin`, los pedidos que modifican datos con sesión se rechazan si el navegador indica `Sec-Fetch-Site` distinto de `same-origin`.
- **Video en paquetes, servicios y blog**: en el formulario hay una tarjeta "Video" (debajo de la imagen). Se sube un MP4, WebM o MOV de hasta 50 MB (o se pega una URL https directa a un MP4/WebM) y se reproduce en la página, debajo de la foto principal. "Quitar video" lo saca. Se guarda en el mismo R2 que las imágenes; la columna `video` se crea sola en la base.
- **Subida de imágenes**: ahora se revisa el contenido real del archivo (JPG, PNG, GIF, WEBP o AVIF), no solo el tipo que declara el navegador. HTML u otros archivos disfrazados de imagen se rechazan.
- **Cabeceras del panel** (`public/_headers`, solo `/admin/*`): Content-Security-Policy (solo scripts propios, sin embeber el panel en otros sitios), `Referrer-Policy: no-referrer` y `Cross-Origin-Opener-Policy`.
- **Avisos para administradores** en el panel: clave general de menos de 12 caracteres y, si Pix está activo, falta de `MP_WEBHOOK_SECRET`.
- Migración automática: tablas `settings` y `login_fails`. Prueba: `npm run test:seguridad`.

**Recomendado y no automatizable:** poner **Cloudflare Access** delante de `/admin*` y `/api/*` (sigue siendo la defensa más fuerte), usar una clave general larga y aleatoria, y configurar `MP_WEBHOOK_SECRET` si se cobra con Pix (sin él, el webhook igual revalida cada pago contra Mercado Pago, pero no se verifica la firma).


## API por secciones (versión 96)
`functions/api/[[path]].js` tenía más de 1000 líneas con todo mezclado. Ahora son ~25: solo registra en el historial cada cambio hecho desde el panel y delega. La lógica vive en `functions/lib/api/`, una pieza por sección. El comportamiento no cambió: se comprobó contra la versión anterior con 266 pedidos idénticos (respuestas, cookies y contenido de las 16 tablas).

| Archivo | Qué tiene |
|---|---|
| `router.js` | Orden de atención: rutas públicas → clave y origen → sesión → secciones del panel. |
| `auth.js` | Ingreso (`/api/login`), lectura de la sesión, `/api/logout` y `/api/me`. |
| `usuarios.js` | `/api/users`: alta, edición y baja (solo administradores). |
| `reservas.js` | Disponibilidad, reserva, cobro Pix y webhook (públicos) + `/api/bookings`, `/api/slots` y `/api/booking-config` (panel). |
| `contenido.js` | `/api/posts` y `/api/packages` (alta, edición, redirecciones), categorías, favoritos de la portada y precios. |
| `estadisticas.js` | Medición pública de visitas (`/api/track`) y los reportes `/api/stats` y `/api/heat`. |
| `equipo.js` | `/api/team` (rendimiento), `/api/activity` (historial), `/api/alerts` (avisos) y `/api/tasks` (actividades obligatorias). |
| `consultas.js` | Formulario y clics de WhatsApp (`/api/lead`) y `/api/leads` en el panel. |
| `medios.js` | `/api/upload`: imágenes y videos a R2, validando el contenido real del archivo. |
| `http.js`, `guard.js`, `sesion.js` | Piezas comunes: respuestas y texto, frenos de abuso, firma de la cookie de sesión. |

**Cómo se agrega algo**
- Una ruta nueva dentro de una sección: se escribe en el módulo de esa sección (cada uno recibe `{ ctx, request, env, url, res, id, method, params, user }` y devuelve `null` si el pedido no es suyo).
- Una sección nueva: crear `functions/lib/api/<seccion>.js` con una función `manejarXxx`, sumarla a `PANEL` (con sesión) o `PUBLICAS` (sin sesión) en `router.js`, y si debe quedar en el historial, agregar su recurso a `LOG_ENT` en `functions/api/[[path]].js`.
- Las secciones no se importan entre sí: solo el router las junta. Los módulos de `functions/lib/api/` no exportan `onRequest*` a propósito, para que Cloudflare Pages no los tome como rutas.
- Pruebas: `npm run test:rutas` verifica que cada ruta siga respondiendo donde corresponde. `npm test` corre todas las pruebas juntas.

## Actividades: flujo de trabajo (v97)
- **Tildar completa al instante**, sin modal. La constancia (nota y link) es una acción aparte: "Agregar constancia" o "Editar constancia".
- **Destildar avisa** antes de borrar una constancia que ya existía.
- **Mis actividades** muestra un resumen (hechas, vencidas, para corregir) y las pendientes van primero.
- **Para revisar** (solo admin, arriba de la pantalla): entregas del período actual con constancia sin revisar, con **Aprobar** o **Pedir corrección** en el mismo lugar. Ya no hace falta ir a Reporte.
- Al cambiar algo solo se vuelve a cargar Actividades y el contador del menú; no se re-renderiza toda la app.

## Pulido visual (v98)
- Estilos nuevos al final de `src/styles/admin.css` (bloque "Pulido visual"). Usan los tokens de marca (`--gv-*`), así que cada agencia conserva sus colores.
- Cambios: barra lateral con la marca y un ítem activo claro, tablas con encabezados y filas más legibles, botones y campos con estados de foco consistentes, chips redondeados, modal y avisos más prolijos, topbar pegajosa y respeto por "reducir movimiento".
- El mismo bloque está agregado a `public/admin/admin.css`. Si corrés `npm run css:admin`, se regenera desde la fuente y queda igual.

## Rediseño de la cáscara (v99)
- Menú lateral claro, agrupado por secciones, con el ítem activo marcado y el usuario abajo.
- Barra superior con migas de pan, búsqueda de secciones con **Ctrl/⌘ + K** y avisos.
- En celular el menú es un cajón que se abre con el botón de menú.
- Las vistas (Inicio, Actividades, Reservas, etc.) conservan su lógica; la cáscara se rehizo en `shell()` de `public/admin/admin.js`.

## Inicio rediseñado (v100)
- Encabezado con saludo, fecha y acciones principales (nueva entrada, nuevo paquete).
- Cuatro indicadores clicables: entradas publicadas, paquetes publicados, reservas pendientes (se carga aparte) y páginas con observaciones SEO.
- Bloque "Para revisar" (avisos) debajo de los indicadores.
- Últimas modificaciones en una lista con miniaturas, y a la derecha accesos rápidos y estado del sistema.

## Voucher y mensajes de WhatsApp (v101)
- **Voucher de reserva pagada:** página HTML imprimible con logo, experiencia, fecha, personas, titular, total pagado y fecha de pago. Se guarda como PDF desde el navegador (Imprimir → Guardar como PDF). Solo existe para reservas *pagadas*; las demás devuelven error.
- **Panel → Reservas:** las reservas pagadas tienen **Voucher** (lo abre) y **Enviar voucher** (abre WhatsApp con el cliente, con el mensaje formateado y el enlace). Al marcar una reserva como pagada, el panel ofrece abrir el voucher en el momento.
- **Cliente:** al confirmarse el pago aparece **Descargar voucher** en la pantalla de la reserva (usa el enlace privado que recibió al reservar).
- **Mensajes de WhatsApp:** las reservas (pedido, pago y consulta de respaldo) usan negritas y saltos de línea, en lugar de una sola línea de texto.
- **Seguridad:** el voucher nunca muestra el token. El panel obtiene el enlace privado (`/api/bookings?link=ID`) solo para armar el envío por WhatsApp; ese enlace permite pagar o cancelar la reserva, así que solo lo ve el personal con sesión.
- Endpoints: `GET /api/book/voucher?id=&token=` (cliente) y `GET /api/bookings?voucher=ID` (panel, HTML).
- `ASSET_V` subió a 14 para que el navegador tome el nuevo `conv.js`.

## Reservas como tabla (v102)
- Tabla con columnas de salida, experiencia, cliente (con WhatsApp), personas, estado, total y acciones.
- Franjas por día para las próximas salidas y bloque plegado de "Salidas pasadas" con menor opacidad.
- Borde de color por estado en la primera columna (pendiente, pagada, cancelada, vencida).
- Filtros por estado, búsqueda y orden se mantienen. En celular cada reserva pasa a una tarjeta.
- Mismas acciones y confirmaciones que antes (marcar pagada, voucher, enviar por WhatsApp, cancelar, borrar).

## Disponibilidad como calendario (v103)
- Arriba: paquete y modo de reserva en selectores, con la explicación del modo y el aviso de Pix si falta configurarlo. Cuatro indicadores del mes.
- Calendario a la izquierda con celdas por estado (abierto, completo, cerrado, fuera de venta, cambiado a mano) y barra de ocupación. Navegación por mes, "Hoy" y "Elegir días con salida".
- A la derecha: detalle del día con sus reservas (o resumen de la selección) y las **reglas de venta** en un solo bloque (mínimo y máximo de personas, cupo, anticipación, plazo y días de salida).
- Al elegir días aparece una **barra flotante** con Cerrar, Abrir, Cupo y Restaurar regla. Shift + clic elige un rango; Ctrl/⌘ + clic suma días sueltos (ver el texto de ayuda en el detalle).
- Misma lógica de cupos, selección con teclado y guardado de reglas que antes.

## Listado de Blog y Paquetes como tabla (v104)
- Tabla con miniatura, título y dirección, categoría, estado (publicado, borrador, programada), indicador SEO con sus observaciones al pasar el cursor, precio (en paquetes) y última actualización.
- Indicadores arriba: totales, publicados, borradores o programadas, y sin precio / con observaciones SEO.
- Filtros por tipo (paquetes o servicios) y por estado, búsqueda, categoría y orden (recientes, A–Z o más observaciones SEO).
- Las acciones son las mismas: ver, precio, editar, duplicar y borrar.

## Checklist SEO en vivo en el editor (v105)
- En la columna derecha del editor de entradas y paquetes aparece la **Checklist SEO**, que se actualiza mientras escribís (sin guardar): título (30–60), descripción (70–160), contenido (palabras y tiempo de lectura), secciones H2, enlaces internos y externos, imagen con texto alternativo, dirección web y títulos o descripciones repetidos en otras entradas.
- El puntaje (ej. 8/10) y la barra muestran el avance. Cada punto se corrige en el mismo formulario.

## Pulido general (v106)
- El editor de contenido muestra títulos, citas, imágenes y los bloques "Dato clave" y "Consejo" con el mismo aspecto que en el sitio.
- Foco visible uniforme en menús, tarjetas, filtros y acciones; estados deshabilitados más claros.
- Detalles desplegables con indicador, selección de texto con el color de marca y etiquetas unificadas.

## Limpieza de código (v107)
- Se quitaron 44 reglas CSS de vistas que ya no existen (lista de paquetes antigua, tarjetas de reservas y resumen de disponibilidad viejos, topbar anterior).
- Se quitó la función `bkDay`, que no se usaba.
- Recomendado: correr `npm run css:admin` para regenerar `public/admin/admin.css` desde `src/styles/admin.css`. Así el archivo compilado queda en una sola versión, en lugar de tener los bloques agregados a mano al final.

## Helpers compartidos (v108)
- `parseUTC` (fechas de la base en UTC) y `onlyDigits` (teléfonos) quedaron como funciones únicas; `ago`, `when`, Reservas, Disponibilidad y Consultas las usan en vez de copiarlas.

## SEO técnico (v109)
- **Sitemap de imágenes:** cada entrada y paquete publicado con foto aparece en `/sitemap.xml` con su imagen (`<image:image>`), para que pueda aparecer en la búsqueda de Google Imágenes. Las direcciones relativas de `/media/` se convierten en absolutas con `SITE_URL`.
- Ya existían: canonical, Open Graph y Twitter por página, datos estructurados (agencia, artículos, paquetes, migas de pan, preguntas frecuentes, video) y robots con sitemap.
- Después de desplegar, enviá el sitemap en Google Search Console y revisá en "Sitemaps" que las imágenes se lean.

## Dirección y mapa de la oficina (v110)
- Nueva dirección: **Florida 537, Local 356, C1005 Ciudad Autónoma de Buenos Aires**. Aparece en el pie, en la página de contacto (texto, mapa embebido y "Cómo llegar"), en las preguntas frecuentes de la portada y en Nosotros.
- Datos estructurados de la agencia: dirección con código postal, coordenadas (`geo`: -34.6017646, -58.3745329) y enlace al mapa (`hasMap`).
- Se quitaron las menciones al Obelisco como vista de la oficina, porque la oficina está en el microcentro. Se mantiene la calle Florida y Galerías Pacífico.
- Nota: Google devuelve el código postal C1004 para esa dirección; el sitio usa C1005 como lo indicaste. Conviene confirmarlo con Correo Argentino.

## Reseñas de Google (solo API de Google Places)
- **Fuente única:** la calificación, la cantidad de opiniones, los comentarios y las fotos salen de la API de Google Places (New), con el secreto `GOOGLE_PLACES_API_KEY` y `GOOGLE_PLACE_ID` en `wrangler.jsonc`. Ya **no hay carga manual**: el panel no guarda calificación ni comentarios, y los que se habían cargado a mano dejaron de mostrarse.
- **Cada cuánto:** se consulta a Google como mucho una vez por día. Si Google falla, la web sigue mostrando los últimos datos buenos. Si nunca hubo datos, aparecen solo los botones "Ver avaliações" y "Deixar uma avaliação".
- **Panel → Inicio → Reseñas de Google:** muestra el estado de la conexión, la calificación, las opiniones, cuántos comentarios y fotos llegaron, y el botón **Actualizar ahora** (consulta a Google en el momento). Si hay error, explica qué arreglar en la clave.
- **Límites de Google:** entrega como máximo **5 comentarios** y **10 fotos** por ficha, y Google elige cuáles (no se pueden elegir desde el sitio).
- **Portada:** calificación, carrusel de comentarios y mosaico de fotos con el crédito de cada autor (Google lo exige). Se ven 5 fotos en celular, 9 en tableta y 7 en escritorio, para que el mosaico cierre sin huecos.
- **Contacto:** calificación, botones y el mapa de la ficha.
- **Costo de las fotos:** la dirección pública de cada foto se pide una vez por día al actualizar; las visitas no generan consultas pagas a Google. Si esa dirección vence, `/google-foto/<n>` la vuelve a pedir con la clave.
- **Importante:** hay tres fichas para el mismo negocio (Florida 537, Florida 459 y la dirección vieja de Carlos Pellegrini 465). Conviene unificarlas en Google Business Profile para que las opiniones se acumulen en una sola.

## Confianza y SEO con reseñas (v112)
- **Opiniones de viajeros:** en Inicio → Reseñas de Google, cargá hasta 6 opiniones reales, una por línea: `Nombre | estrellas | texto`. Aparecen como "Lo que dicen nuestros viajeros" en la portada y en contacto.
- **Datos estructurados:** esas opiniones se publican como `Review` de la agencia en la portada. Google solo las usa si son opiniones reales de clientes publicadas en el sitio. La calificación de Google no se marca como dato estructurado, porque sus opiniones no pueden marcarse así.
- Solo cargá opiniones que los clientes realmente hayan dado (con su permiso si es posible). Editar o inventar opiniones va en contra de la política de Google y perjudica la confianza.

## Subcategorías y opciones con precio (v8)
- **Subcategorías** (panel → Categorías): debajo de cada categoría de paquetes, botón **+ Subcategoría** (ej. en *Shows de tango*: *Com jantar*, *Só show*, *Experiência VIP*). Se ordenan con ‹ ›, se renombran y se quitan. Quitar una subcategoría **no borra productos**: quedan en la categoría, sin subcategoría. Al renombrar una categoría, sus subcategorías la siguen; al borrarla, pasan junto con los productos a la categoría elegida (si allá ya existe una con el mismo nombre, se unen).
- En el formulario del paquete/servicio, debajo de la categoría: **Subcategoría** (opcional, con **+ Nueva**). Si cambiás la categoría, la subcategoría vuelve a "Sin subcategoría".
- En el sitio, la página de la categoría muestra una fila de botones con las subcategorías que tienen algo publicado y filtra con `?sub=`. La ficha la muestra en la ruta de navegación.
- **Opciones y precios** (formulario del paquete/servicio): para un mismo servicio con variantes que solo cambian el precio (ej. tango: Só show · Jantar show · Platea VIP). Cada fila: nombre, precio, precio anterior (opcional) y qué incluye (opcional). Todas comparten fecha, horario y cupo.
- **Políticas** (dentro de Opciones y precios, opcional): menores, cancelación, documentación, pagos u otra (con título propio). Cada una puede valer para todo el producto o solo para una opción (“Aplica a”). Se guardan en `meta.policies` como `[tipo, texto, opción, título]`; en la ficha aparecen en la sección **Políticas** (`#politicas`), con un aviso en la opción a la que aplican y un enlace en el formulario de reserva. Hasta 10 por producto; cada línea del texto es un párrafo. Es solo informativo: el precio de los niños por edad se sigue cargando en “Acepta niños”.
- **Paquetes que combinan servicios** (formulario del paquete → Datos de la ficha → *Itinerario y precio*):
  - **Itinerario**: cada servicio va un día del paquete (Día 1, Día 2…) y, si el servicio se reserva por horario, a una hora (o "Lo elige el cliente"). Si el servicio tiene opciones, se elige cuál incluye el paquete (por defecto, la más barata).
  - **Modo**: *Itinerario fijo* (el cliente solo elige la fecha de inicio) o *El cliente elige los días* (puede mover cada servicio dentro de los días del paquete; tu día queda como sugerencia).
  - **Precio automático** (opcional, con **descuento %**): precio = suma de los servicios − descuento. Se recalcula solo cuando cambia el precio u opción de un servicio. Si a un servicio le falta precio o hay monedas distintas, queda el último precio y el panel avisa.
  - **Reserva**: el paquete tiene que tener la reserva por fecha activa (Disponibilidad). El calendario solo ofrece inicios en los que **todos** los servicios reservables tienen lugar en su día; al reservar se crea la reserva del paquete (con el total) y una por servicio (`bookings.parent_id`) que descuenta su cupo. Pagar, cancelar, liberar o cambiar la fecha del paquete se aplica a todos sus servicios; si uno no tiene lugar, no se cambia nada y se avisa cuál. Los servicios sin reserva por fecha (ej. traslado) aparecen en el itinerario pero no descuentan cupo.
  - **Cliente**: ve el itinerario día por día, el desglose del total (servicios, descuento, adultos y niños por tramo) y recibe el itinerario en la confirmación, en el mensaje de WhatsApp y en el voucher.
  - Con al menos una opción, el precio del producto ("a partir de") se calcula solo con la más barata y los campos de precio se ocultan: no se carga dos veces. En **Precios**, esos productos dicen "N opciones · desde …" y se editan desde el formulario.
  - En la ficha: bloque **Opções e preços** (con botón *Escolher*) y el selector dentro del formulario de reserva; viene marcada la más barata. El total, el resumen, el mensaje de WhatsApp y la reserva usan la opción elegida. El servidor recalcula el precio (no confía en el navegador) y guarda la opción en la reserva (`bookings.option_name`): se ve en Reservas, en el voucher y en la consulta.
  - Para Google: con 2 o más opciones la ficha publica `AggregateOffer` (precio mínimo y máximo, una oferta por opción).
  - La "Tabla comparativa" de Datos de la ficha sigue existiendo, pero es solo informativa (no cambia precios).
- Base: tabla `subcategories`, columnas `packages.subcategory` y `bookings.option_name`, y `meta.options` en el JSON del producto. Se crean solas al abrir el panel (o con `npm run d1:schema`). Test: `npm run test:opciones`.
- **Reseñas de Google en la portada (v10):** si los datos guardados los dejó una versión anterior (sin comentarios ni fotos), se vuelven a pedir a Google en la próxima visita en vez de esperar 24 h. Panel → Reseñas de Google avisa cuando Google devolvió la nota pero ningún comentario ni foto. Si no hay comentarios, la sección se arma en dos columnas (título a la izquierda, nota y botones a la derecha) sin dejar un hueco vacío.

## Conectar Claude al blog (v11)
- Panel → **Conectar Claude** (solo administradores): **Nueva conexión** genera una dirección privada `https://<sitio>/mcp/<clave>` que se muestra **una sola vez** (en la base queda solo el hash SHA-256). Se puede revocar en cualquier momento; deja de funcionar al instante.
- En claude.ai: **Personalizar › Conectores › Agregar conector personalizado** → pegar la dirección → autenticación **Sin inicio de sesión** → Agregar. En un chat: **+ › Conectores** y activarlo. (Team/Enterprise: lo agrega un propietario en Configuración de la organización › Conectores.)
- Permisos: **Solo borradores** (recomendado): Claude crea y edita borradores; no publica ni toca notas publicadas. **Puede publicar**: publica solo si se lo pedís. En ningún caso puede borrar, ni tocar paquetes, precios, reservas o usuarios.
- Herramientas: `blog_listar_categorias`, `blog_listar_entradas`, `blog_ver_entrada`, `blog_crear_entrada`, `blog_editar_entrada`, `blog_subir_imagen` (desde una URL https; valida que sea una imagen real, hasta 8 MB) y `sitio_listar_paquetes` (para enlaces internos). Al conectarse, Claude recibe la guía del blog: idioma (portugués de Brasil), formato HTML con los cuadros `gvb-dato`/`gvb-tip`, SEO y enlaces internos.
- Las notas se guardan con la misma lógica que el panel (sanitizado, slug, redirecciones, resumen automático), firmadas por quien creó la conexión, y quedan en **Historial** como "vía Claude". Al terminar, Claude devuelve el enlace directo `/admin/#posts/<id>`.
- Código: `functions/mcp/[[path]].js` → `functions/lib/mcp.js` (MCP por HTTP, sin estado, respuestas JSON); claves en `functions/lib/api/claude.js`; tabla `api_keys`. Claves inválidas: 20 intentos cada 15 min por IP. `/mcp/` está en `robots.txt` y lleva `noindex`. Test: `npm run test:mcp`.
- Si Claude no logra conectarse: revisá que en Cloudflare (Seguridad › Bots / WAF) no haya una regla que bloquee pedidos automáticos a `/mcp/`.

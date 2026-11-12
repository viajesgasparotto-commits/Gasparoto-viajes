# Migración a Astro + Tailwind + Motion (por etapas)

## Cómo convive lo nuevo con lo viejo
El sitio es dinámico (paquetes y blog salen de D1), así que Astro no reemplaza todo de golpe.
- Astro genera **fragmentos** en `src/pages/fragmentos/<pagina>.astro` (con `export const partial = true`, sin `<html>`).
- El motor (`functions/_middleware.js`, `staticPage`) busca primero `/fragmentos/<pagina>/` y, si no existe, `public/_pages/<pagina>/`. Reemplaza los marcadores (`{{LOGO}}`, `{{WA_URL}}`, `<!--PANEL:FEATURED-->`…) y lo mete en el layout.
- Tailwind se compila con su CLI a `public/assets/tw.css` (`npm run css`) y escanea `src/` **y** `functions/`, así que sirve también para el HTML que arman las Functions.
- Tailwind corre **completo** (`@import "tailwindcss" source(none)`, con reset global) desde la etapa 7; `ui.css` y `conv.css` ya no existen. `source(none)` limita el escaneo a los `@source` de `tw.css` (`src/` y `functions/`).
- Motion se empaqueta con esbuild (`npm run fx`) desde `src/scripts/fx.ts` a `public/assets/fx.js`. Atributos: `data-fx="hero"`, `data-fx="up"` (+ `data-fx-delay`), `data-parallax`. Respeta "reducir movimiento" y, si el script falla, el contenido queda visible.

## Hecho (etapa 1)
- Base Astro + Tailwind + Motion y tema con los colores de marca (`BRAND_*` de `wrangler.jsonc`).
- Portada rediseñada: `src/pages/fragmentos/home.astro` + `src/components/home/*`. Textos en `src/data/home.ts`.

- Etapa 2: cabecera y pie nuevos (Tailwind) en `functions/lib/render.js` (`siteHeader`/`siteFooter`; viven ahí porque `renderPage` arma el HTML en el motor). Menú móvil con `<details>` (funciona sin JS) animado con Motion; sombra de la cabecera al scrollear. `fx.ts` ahora respeta "reducir movimiento" en todo.

- Etapa 3: Nosotros, Contacto, Reservas y 404 como fragmentos Astro (`src/pages/fragmentos/`), con `PageHero` y `CtaBand` compartidos. Todas las páginas fijas usan ahora contenedor propio (`wide: true`). Se borró `public/_pages/` (el motor conserva el fallback por si se agrega una página en HTML).

## Historial por etapas

- Etapa 5 (ficha de paquete): `packagePage` (`functions/_middleware.js`), `fichaHtml`/`compareTable`/`cardFacts` (`functions/lib/ficha.js`) y `pkgCard` + `priceHtml` (`functions/lib/html.js`) ahora son Tailwind. Textos nuevos en `labels()` (es/pt).
  - Contrato con `conv.js` (no renombrar): `form[data-gv-lead]` (+ `data-package`, `data-slug`), pasos `[data-step="1|2"]` (el 2 con `hidden`, sin clases de display), indicador `[data-steps] > [data-stepi]`, botones `[data-next-step]` / `[data-back-step]` / `[data-edit-step]`, resumen `[data-recap]` (`[data-rc]`); `[data-next]` es otra cosa: el texto del paso siguiente tras reservar; `button[type=submit]`, campos `date`/`pax`/`name`/`phone`, honeypot `website`, mensaje `.gv-lead-msg` (conv.js le reescribe la clase a `gv-lead-msg ok|err`), `a[data-gv-wa]` (+ `data-gv-bar` en la barra fija), `[data-gv-sticky]`.
  - `filter.js` ahora filtra por `[data-dur]` (las tarjetas ya no llevan `.gv-card`); se sube a `?v=2` en `filterBar`.
  - Texto libre del panel (descripción del paquete): `.tw-prose` en `tw.css` (reutilizable en la etapa 6). Estado del formulario y barra de progreso: `.tw-lead`.
  - Reset parcial para controles de formulario dentro de `.tw` (`@layer base`); se puede borrar al activar `@import "tailwindcss"`.
  - `tw.css` subió a `?v=3` en `render.js`.


- Etapa 6 (artículo de blog): `postPage` y `tocHtml` (`functions/_middleware.js`) en Tailwind: portada, índice automático (≥3 `<h2>`, ids `s1…`), cuerpo, bloque de consulta (conserva `data-gv-wa="blog"`) y "Seguí leyendo".
  - El cuerpo (HTML libre del panel, pasa por `sanitizeHtml`) se estiliza por etiqueta con `.tw-prose` + `.tw-prose--post` en `tw.css`; se conservan `.gvb-dato` y `.gvb-tip`, las únicas clases `gvb-*` que ofrece el panel. `tw.css` sube a `?v=4`.

- Etapa 7 (limpieza final): eliminados `public/assets/ui.css` y `conv.css` (con todas las clases `hm-*`, `ns-*`, `ui-*`, `gv-*` de maquetación, `gvf-*`, `gvp-*` y `gvb-*` de la plantilla vieja del blog) y activado el reset global de Tailwind.
  - Lo último que dependía de `ui.css` (incluye lo que había quedado pendiente de la etapa 4: tarjetas y listados) se migró a Tailwind: tarjetas de blog (`postCardHtml`), chips de categoría (`chipsRow`), contenedor de listados (`listShell`) y grilla común (`CARD_GRID`) en `functions/lib/html.js`, `pkgSection`, `filterBar` (`ficha.js`), listados `/paquetes/`, `/blog/` y categorías, y la sección de blog de la portada (`functions/_middleware.js`).
  - `renderPage` ya no recibe `wide`: `<main>` no impone contenedor y cada página arma el suyo. El skip-link usa utilidades.
  - Base global (fuente, color, scroll suave solo sin "reducir movimiento", cursor de botones) en `@layer base` de `tw.css`.
  - Botón flotante de WhatsApp: ahora `.tw-fab` (`tw.css`), creado por `conv.js`. Se eliminaron `hero()` y `reveal()` de `conv.js` (ya no tenían nada que tocar) y `brand.js` ya no inyecta `conv.css`; solo queda `<style id="gv-theme">` con las variables de marca.
  - Se borró el shim de formularios, `PKG_CSS`, `PANEL_MARK` y `blogFilterBar` (sin uso).
  - Detalle de la etapa 6 resuelto: `ui.css` (sin capa) le ganaba a `.tw-prose .gvb-dato/.gvb-tip`; al desaparecer, mandan las reglas de `tw.css`. Además se quitó el `!important` de los enlaces del cuerpo y se definieron viñetas/numeración (`list-style`) y negritas en `.tw-prose`, porque el reset global las deja en cero.
  - Versiones: `tw.css ?v=5` y `fx.js ?v=3` (`render.js`), `filter.js ?v=3` (`ficha.js`), `ASSET_V = "5"` (`brand.js`, para `conv.js`).
  - Contratos que se mantienen: `.gv-lead-msg` / `.gv-lead-wa` (conv.js), `data-gv-*`, `id="gv-theme"`, `--gv-primary/accent/cta`, cookie `gv-session`.
  - Sin migrar y sin uso (se puede borrar cuando quieran): en `functions/lib/html.js`, `balancedEnd`, `firstCard`, `cardRanges`, `replaceCards`, `postCard`, `packageCard`, `buildHead` y `renderPage` (restos de las plantillas de WordPress).

## Panel de administración (por etapas)
El panel es una SPA: `public/admin/admin.js` arma cada vista con plantillas de texto (`innerHTML`). Se migra vista por vista, sin tocar la lógica.
1. **Base** (hecha): el panel sale de `public/admin/index.html` y pasa a la página Astro `src/pages/admin/index.astro` (cáscara con `#app` y `#msg`). El CSS de siempre quedó **verbatim** en `src/styles/admin.css`, dentro de `@layer legacy`, que está por debajo de las utilidades de Tailwind: al migrar una vista se usan clases normales sin trucos. Se compila a `public/admin/admin.css` (`npm run css:admin`, ya incluido en `npm run build`). `admin.js` es el de siempre, sin cambios. CSS y JS se sirven desde `/admin/` (`no-store` en `_headers`), así que no llevan `?v=`.
2. **Marca** (hecha): el panel usa los colores `BRAND_*` como el sitio. `brandColors(env)` (`functions/lib/brand.js`) es la fuente única; `/api/brand` (antes del login) y `/api/me` devuelven `colors`, y `applyBrand()` en `admin.js` los aplica como `--gv-primary/accent/cta` (valida el formato `#hex`). `admin.css` trae esos valores solo como respaldo, deriva los tonos del login (degradado, foco, hover) con `color-mix()` y los tokens de Tailwind del panel (`primary`, `accent`, `cta`) son los mismos nombres que en el sitio. Se quitó el naranja fijo de las etiquetas "En inicio" (`.tag` ya usa el acento).
3. Login y shell (barra lateral, avisos, modales, esqueletos).
4. Inicio, Medición y Consultas.
5. Blog, Paquetes, Categorías, Precios y SEO.
6. Editor (formulario, barra de formato, vista previa de Google, imágenes).
7. Limpieza: borrar la capa `legacy`, activar el reset de Tailwind y separar `admin.js` en módulos (con esbuild, como `fx.js`).


## v50 — Fase 1 (rediseño visual)
- Portada sin la sección del fundador (vive solo en /nosotros/). Componente `Founder.astro` y `founder` de home.ts quedan sin uso.
- Portada: el tríptico de accesos (`Intents.astro`, `intents` de home.ts) se reemplazó por "Antes de embarcar" (`Tips.astro`, `tips` de home.ts), que no enlaza a categorías. `Intents.astro` queda sin uso.
- Portada (v8): orden Hero → Confianza → Reseñas de Google → Os mais procurados (con enlace a todos los paquetes) → Antes de embarcar → Viaje do seu jeito → Como reservar → Blog → FAQ → Cierre. Las reseñas son una sección propia generada por el motor (`googleBlock` variant "reviews": título, nota, comentarios y fotos de la API; si Google no devuelve nada, no aparece). Estilos nuevos en CSS plano: `public/assets/home.css` y el final de `public/assets/google.css` (v=4).
- Nuevo `home/Trust.astro` (franja de confianza bajo el hero, datos en `trust` de home.ts).
- Tarjetas de paquete: entrada escalonada, elevación al pasar el mouse, flecha de enlace (`.tw-arrow`).
- Cabecera: barra de avance de lectura (`[data-progress]`, fx.ts). Botones con micro-elevación. Ajustes de espaciado y alto táctil en móvil.
- Pendiente de probar: `npm install && npm run build` (tw.css ?v=13, fx.js ?v=7).
- Blog paginado: 10 notas por página (`BLOG_PER_PAGE` en functions/_middleware.js). URLs `/blog/pagina/2/` y `/blog/categoria/<slug>/pagina/2/`; `/pagina/1/` redirige a la base. Solo la primera página destaca una nota.
- Paquetes y servicios: cada producto del panel puede ser "Servicio o experiencia" (se vende solo) o "Paquete" (combina varios servicios). Se guarda en `packages.meta` (`kind`, `parts` = direcciones de los servicios incluidos), sin cambios en la base de datos. La ficha del paquete lista cada servicio con su foto, precio y consulta propios, y muestra el ahorro solo si todos tienen precio en la misma moneda y la suma supera el precio del paquete. La ficha de un servicio muestra los paquetes que lo incluyen. En `/paquetes/` aparece el filtro Todo / Paquetes / Servicios (`?tipo=paquete|servicio`) cuando hay de los dos tipos.
- Portada: los marcadores del motor ahora son `<div data-panel="featured|posts" hidden></div>` (invisibles si no se reemplazan) y `staticPage` borra cualquier `<!--PANEL:…-->` que quede. El blog de la portada muestra siempre las 3 últimas notas (las destacadas primero). Bloque nuevo `Mix.astro` ("Viajá como quieras": paquetes o servicios; textos en `mix` de `src/data/home.ts`).
- Página `/servicios/`: lista todo lo que no es un paquete, con filtro por categoría (`?categoria=`) y enlace a los paquetes. Está en el menú, el pie y el sitemap.
- Fichas: "Otras experiencias" ya no repite los servicios incluidos de un paquete ni los paquetes que contienen a un servicio. La tarjeta "Paquetes" de la portada lleva a `/paquetes/` (no queda vacía si todavía no hay paquetes armados).

## v58
- Franja de confianza rediseñada (`home/Trust.astro`): tarjeta con ícono que se superpone al borde de la portada (la portada subió su padding inferior), cifra "+100.000 clientes" destacada en "Atención personal" y copys nuevos en `trust` de `data/home.ts`. Pendiente de ver en pantalla: `npm install && npm run build`.
- Ecommerce fase 3: cobro con Pix (Mercado Pago). Ver `ADMIN.md` > "Cobro con Pix". Archivos: `functions/lib/pix.js`, rutas en `functions/lib/api/reservas.js`, UI en `conv.js` (`ASSET_V` 9) y marcadores `[data-pay]`/`[data-pix]` en la ficha. Prueba: `npm run test:pix`.
- Modo de reserva por paquete (`packages.pay_mode`: whatsapp | pix) y panel de Disponibilidad rediseñado (resumen del mes, ocupación por día, detalle de reservas del día). Ficha: total en vivo, pasos de la reserva, pantalla Pix y .ics. Pendiente de ver en pantalla (`npm run build`, que también compila `admin.css` con las clases nuevas `.av-st`, `.av-o`, `.av-r`).

## v132 — SEO Intelligence, Fase 1 (etapa 1): traducciones con estados
- Nueva sección del panel **Contenido › Traducciones** (`translations` y `trEdit` en `public/admin/admin.js`): listado de todo el contenido con su estado en español (sin traducir, borrador, en revisión, publicada) y editor lado a lado con el original (título, dirección, resumen, detalles, precio, contenido, SEO e imagen alt).
- `translations.status` (`borrador` | `revision` | `publicada`) y `updated_by`, migrados solos por `ensureSchema`. Las traducciones que ya existían quedan **publicadas**, así que nada cambia en el sitio.
- Solo las **publicadas** salen en `/es/…`, en el hreflang de la versión portuguesa y en el sitemap (`translationBySlug`/`translationByRef` filtran por defecto; el panel pide `live = false`).
- Permisos: un editor guarda borradores y envía a revisión, y puede seguir editando una ya publicada; **publicar** o borrar una publicada exige ser administrador (la clave general cuenta como administrador).
- Cada alta, edición, cambio de estado y borrado queda en el Historial (`entity = "traducción"`). El contenido se sanea al guardar (`sanitizeHtml`).
- API: `GET /api/translations` (resumen), `GET ?kind=&ref=`, `PUT` (acepta `status`; sin `status` conserva el actual, o publica si es nueva, por compatibilidad), `DELETE`.
- Prueba: `npm run test:i18n` (ahora cubre estados, permisos de editor, sitemap y saneado).
- Pendiente de ver en pantalla: `npm install && npm run build` (el panel usa solo clases que ya existían en `admin.css`).
- Siguiente en el roadmap: autores, revisores y fuentes; luego portada/listados/categorías en `/es/`, `og:locale:alternate` y adaptación a Brasil.

## v133 — SEO Intelligence, Fase 1 (etapa 2): autoría y experiencia
- **Perfil de autor.** `users` gana `slug`, `headline` (descripción profesional), `bio`, `experience`, `avatar`, `links` y `profile_public` (migración automática). Pantalla **Cuenta › Mi perfil** (`profile` en `admin.js`): cada usuario con email edita el suyo; un administrador edita el de cualquiera desde **Usuarios › Perfil**. La clave general no tiene perfil. API: `/api/profile` (propio), `/api/authors` (lista para elegir, sin emails) y `/api/authors/<id>` (solo administradores). Código: `functions/lib/autores.js` y `functions/lib/api/autores.js`.
- **Autor, revisor y fuentes por artículo.** `posts.author_id`, `reviewer_id` y `sources` (JSON `[{label,url}]`, hasta 8 enlaces http/https). Tarjeta **Autoría** en el editor del blog. Una entrada nueva queda a nombre de quien la crea; editar sin tocar la autoría la conserva; el revisor tiene que ser otra persona que el autor.
- **Sitio.** La firma del artículo muestra autor (con cargo y foto), revisor, fecha de publicación y de actualización; las fuentes salen al final (`sourcesBlock`) y, si el autor tiene perfil público, una ficha con su bio. Sin autor asignado o desactivado, queda la firma del equipo como siempre. Nueva página `/autor/<slug>/` (solo perfiles públicos de personas activas; entra al sitemap si tiene artículos publicados). Solo existe en portugués/raíz: en `/es/` el enlace del autor apunta a esa misma página.
- **Datos estructurados.** `BlogPosting.author` pasa a `Person` (con `url`, `jobTitle`, `image`, `sameAs`, `worksFor`) cuando hay autor; si no, sigue la organización. El revisor va en `mainEntityOfPage.reviewedBy` (en schema.org `reviewedBy` es de `WebPage`, no de `Article`) y las fuentes en `citation`. La página del autor lleva `ProfilePage`.
- Cada edición de perfil queda en el Historial.
- Prueba: `npm run test:autoria` (ya incluida en `npm test`).
- Pendiente de ver en pantalla: `npm install && npm run build`.
- Siguiente: portada, listados y categorías en `/es/`, `og:locale:alternate` y adaptación al mercado brasileño.

## v133 — Blog en español e inglés (previo a la Fase 3)
- **Inglés para el blog**: `/en/blog/<slug-en>/` (hreflang `en-US`). Solo artículos: paquetes y servicios siguen en portugués y español. El portugués es la versión base (`x-default`).
- `i18n.js` (`EN`, `TRANSLATED`, `langPathOf`), `translations.js` (todas las consultas reciben el idioma; `LANGS_BY_KIND` define qué idiomas admite cada tipo; `liveTranslations` para el hreflang) y `api/traducciones.js` (parámetro `lang`: `es` por defecto, así que lo que ya llamaba a la API sigue igual; `en` solo para `posts`). La tabla `translations` no cambia: ya tenía `lang` en la clave.
- La ficha en cualquier idioma anuncia **todas** las versiones publicadas (portugués, español, inglés) y el sitemap las lista con sus alternativas. Solo cuentan las traducciones **publicadas**; despublicar el artículo portugués baja también sus traducciones.
- Plantilla en inglés: cabecera/pie (`render.js`), textos del blog (`blog.js`), etiquetas (`html.js`), JSON-LD (`seo.js`), fechas y `og:locale`. Las categorías `tips-de-viaje` y `noche-portena` se muestran en el idioma de la página (`catLabels` en `blog.js`); una categoría nueva del panel se ve con su nombre portugués hasta que se agregue ahí.
- La página en inglés no muestra "Seguí leyendo" ni "Para vivir lo que leíste" (traerían títulos en portugués). Pendiente igual que en español: portada, listado del blog y categorías en `/es/` y `/en/`; los enlaces de la cabecera, el pie y el botón "volver al blog" apuntan a la versión portuguesa.
- Corrección: `labels()` (html.js) tomaba siempre `SITE_LANG` (portugués) y las tarjetas de paquete dentro de una página `/es/` salían en portugués. Ahora manda el `<html lang>` de la petición.
- Panel › Traducciones: selector **Español / Inglés (blog)** en el listado y en el editor (el mismo flujo de estados borrador → revisión → publicada; el historial anota `en · estado`).
- **Script `scripts/translate-blog.mjs`** (`npm run translate:blog`): lee los artículos de D1, los traduce con la API de Claude (español rioplatense con voseo e inglés de EE. UU.), conserva el HTML (clases `gvb-*`, enlaces, imágenes), compara la estructura con el original y deja el resultado como `.sql` o lo carga por la API del panel (`--api`). Siempre queda en **revisión** (o **borrador** si cambió la estructura): publicar es una decisión humana. Ver el encabezado del archivo para las opciones.
- Pruebas: `npm run test:blog-idiomas` (script con traductor falso, SQL y API, páginas `/es/` y `/en/`, hreflang, sitemap, panel). Entra en `npm test`.

## v134 — Blog: buscador, anterior/siguiente y lecturas más baratas
- **Buscador** `/blog/buscar/?q=…` (caja en el índice del blog y en los resultados). Sin acentos ni mayúsculas ("iguazu" encuentra "Iguazú"), todas las palabras deben estar, el título pesa más que la bajada, hasta 24 resultados. Busca en título, bajada y descripción SEO (no en el texto completo, para que el costo no crezca con el largo de las notas). Va con `noindex,follow`, bloqueado en `robots.txt` y sin caché de página. `WebSite` declara `SearchAction`.
- **Anterior / siguiente** al final de cada nota (portugués), con una lectura por lado sobre el índice `posts_order`.
- **"Seguí leyendo"**: ya no lee el texto completo de las notas (solo las columnas de la tarjeta), con más de 90 relacionadas elegidas a mano ya no recorre todo el blog, y siempre completa hasta 3.
- **Caché de páginas**: las URLs con `?query` ya no se guardan (el caché ignoraba el query; afectaba al buscador y a `/servicios/?categoria=`).
- Portugués: "Últimos artigos" en lugar de "Últimas notas". Pruebas: `npm run test:blog-busqueda` (entra en `npm test`).
- Para publicar: `npm run build` (recompila `public/assets/tw.css`) y `npm run deploy`. No hace falta tocar la base.

## v135 — Blog: posicionamiento
- **Profundidad de rastreo**: la paginación suma saltos de 10, 100 y 1000 páginas (con 10.000 notas cualquier página queda a 3-4 clics de la primera, no a cientos).
- **Títulos con ancla propia**: los `<h2>`/`<h3>` llevan id con su texto (`#como-llegar`) en lugar de `#s1`; Google los usa para los enlaces "Ir a" bajo el resultado. Se repiten con `-2`; sin letras queda `s1`.
- **Core Web Vitals**: la foto de portada de cada nota se precarga (`rel=preload`, prioridad alta) para mejorar el LCP.
- **Datos estructurados** de la nota: `url`, `isAccessibleForFree`, `thumbnailUrl` y `keywords` (categoría).
- Pruebas en `npm run test:blog-busqueda`.
- v8: subcategorías de paquetes/servicios y opciones con precio por producto (ver ADMIN.md › Subcategorías y opciones con precio). Estilos nuevos en CSS plano: `public/assets/options.css` (ficha), pastillas `[data-subcats]` agregadas a `tw.css` (fuente y compilado) y reglas `.optbox`/`.sub-*` al final de `admin.css` (fuente y compilado). conv.js → ASSET_V 17.
- v11: conector de Claude para el blog (MCP) — ver ADMIN.md › Conectar Claude al blog. Rutas nuevas: `/mcp/*` (Pages Function propia; el middleware la deja pasar).
- v12: "Antes de embarcar" pasa a ser una guía interactiva con pestañas (Tips.astro + `public/assets/home.js` + `.gh-guide` en `home.css` v=2): rutas animadas desde los aeropuertos, botón de WhatsApp para la cotización, línea de la noche porteña y calculadora de propina. Sin JavaScript se ven los 4 paneles seguidos.
- v13: "Antes de embarcar" (consejos con datos escritos a mano) se reemplazó por "Monte seu roteiro" (`functions/lib/planner.js`, marcador `data-panel="planner"`): el visitante marca paquetes y servicios publicados (título, foto, categoría y precio salen de la base) y manda la lista armada por WhatsApp. Sin 2 productos publicados no aparece. Interacción en `public/assets/home.js`, estilos `.gp-*` en `home.css`. Se borró `Tips.astro` y el bloque `tips` de home.ts. Test: `npm run test:roteiro`.
- v14: portada restaurada exactamente como en la v7 original (tríptico de accesos, reseñas como estaban, sin "Antes de embarcar" ni "Monte seu roteiro"). Una categoría borrada o inexistente ya no da 404: usa la redirección que deja el panel (301) o lleva a /paquetes/ (302). Google: si responde sin comentarios ni fotos se reintenta sin idioma y el panel muestra un diagnóstico de la respuesta. Se mantienen subcategorías, opciones con precio y el conector de Claude.
- v15: categorías fijas de la portada (`SITE.fixedCategories` en site.js: show-de-tango, city-tour, paseos). Se crean solas si faltan, no se pueden borrar ni cambiar de dirección (sí de nombre); el panel las marca "fija · portada". Las fotos de la portada apuntan a esas categorías (antes apuntaban a shows-de-tango y delta-del-tigre, que no existían en la base).

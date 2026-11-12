# Entregar este producto a una agencia (white-label)

El proyecto se divide en dos partes:

- **Motor (no se toca):** `functions/` (excepto `functions/lib/site.js`), el panel `/admin/`, `public/assets/conv.js` y `filter.js`.
  Es igual para todas las agencias y no contiene nombres, teléfonos ni dominios de ninguna.
- **Datos de la agencia (se cambian en cada alta):** variables de `wrangler.jsonc`, `functions/lib/site.js`, el logo (`public/assets/logo.png`) y los textos de `public/_pages/*/index.html`.

> Todo el sitio público se genera con un solo layout (`functions/lib/render.js`) y el sistema visual Tailwind (`src/styles/tw.css`, compilado a `public/assets/tw.css`). Los colores salen de `BRAND_*`. No hay HTML de terceros.
> Las páginas fijas (portada, nosotros, reservas, términos, 404) viven en `src/pages/fragmentos/<nombre>.astro` (textos en `src/data/`): la primera línea es un comentario JSON con `title` y `description`; el texto admite `{{BRAND}}`, `{{WA_URL}}`, `{{SITE_URL}}`, `{{LOGO}}` y `{{YEAR}}`.
> **Reemplazar** los textos de nosotros y términos por los reales de la agencia: los que vienen son mínimos y genéricos.

## Alta rápida
```
node scripts/new-agency.mjs --slug mi-agencia --name "Mi Agencia" --url https://miagencia.com --wa 5491100000000 --logo ruta/logo.png
```
Renombra proyecto, base D1 y bucket R2 (`mi-agencia`, `mi-agencia-db`, `mi-agencia-images`) y carga nombre, dominio, WhatsApp y logo. Después:

1. Editar los textos de `src/data/*` y `src/pages/fragmentos/*` y poner el logo en `public/assets/logo.png`.
2. Editar `functions/lib/site.js`: páginas fijas, listados, categorías iniciales del blog, mapa de enlaces viejos y redirecciones. Sumar las páginas nuevas a `functions/lib/static-pages.js` (sitemap).
3. (Opcional) ajustar colores con las variables `BRAND_*`.
4. `npm run audit`: lista enlaces rotos, enlaces `/?p=ID` sin destino y teléfonos/mails que no son de la agencia. Debe terminar sin avisos.
5. `npm run db:create` (copiar el `database_id` a `wrangler.jsonc`), `npm run r2:create`, `npm run project:create`, `npm run secret`, `npm run deploy`.
6. Entrar a `/admin/` (migra la base sola), crear categorías y paquetes.
7. Activar Cloudflare Access sobre `/admin*` y `/api/*` (excepto `/api/lead`, que es público).

## Variables por agencia (`wrangler.jsonc` → `vars`)
| Variable | Para qué | Si falta |
|---|---|---|
| `SITE_URL` | Dominio real (canonical, sitemap, robots) | el sitio sale como **no indexar** (seguro) |
| `WHATSAPP_NUMBER` | Número con código de país, sin `+` | los botones van a `/reservas` |
| `BRAND_NAME` | Nombre en títulos, Open Graph, JSON-LD y panel | "Agencia de viajes" |
| `BRAND_LOGO` | Logo (ruta o URL) para JSON-LD y panel | `/assets/logo.png` |
| `BRAND_PRIMARY` / `BRAND_ACCENT` / `BRAND_CTA` | Colores del sitio y del panel de administración (CTA con buen contraste con texto blanco) | `#003195` / `#ee964b` / `#15803d` |
| `BRAND_PERKS` | 2–4 frases de confianza en la ficha, separadas por `\|` | frases genéricas |
| `PRICE_CURRENCY` | Moneda (código ISO, ej. `ARS`) para el JSON-LD cuando el precio no trae símbolo claro (`$ 100`). Si el precio dice `US$`, `R$`, `AR$` o `€` se deduce solo | `BRL` |
| `BOOKING_HOLD_MINUTES` | Minutos que una reserva pendiente retiene el cupo mientras el cliente confirma (se fuerza entre 15 y 30) | `20` |
| `SITE_LANG` | `es` o `pt-BR`: idioma de los textos nuevos | el `<html lang>` de cada página |

Solo prometer en `BRAND_PERKS` lo que la agencia cumple.

## `functions/lib/site.js` (datos que no son variables)
- `listings`: páginas fijas de listado de paquetes (slug, nombre, ruta).
- `seedPostCategories`: categorías iniciales del blog.
- `legacyPages` / `legacyFallback`: destino de los enlaces `/?p=ID` del sitio anterior. Orden: "ID viejo" de un post del panel, luego este mapa, luego el fallback.
- `redirects`: redirecciones 302 fijas (la clave que termina en `*` es prefijo).

## Medición
- Pestaña **Consultas** del panel: formularios + clics en WhatsApp, con estado y % vendido.
- `dataLayer` / gtag / fbq: eventos `gv_whatsapp_click`, `gv_lead_form`, `generate_lead`.

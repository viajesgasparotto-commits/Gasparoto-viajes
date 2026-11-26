import { privacyPage } from "./lib/privacy.js";
import { videoBlock, esc, labels, pkgSection, chipsRow, listShell, CARD_GRID, waLink, pkgCard, priceHtml, discountPct, WA_ICON, bundleSection, kindSwitch, kindText } from "./lib/html.js";
import { injectTheme, perks } from "./lib/brand.js";
import { listCategories, catPath } from "./lib/categories.js";
import { googleBlock, googlePhoto, placesData } from "./lib/google.js";
import { parsePrice, priceCurrency, siteUrl, isProdHost, absUrl, clip, pageTitle, sanitizeHtml, ldScript, postLd, blogIndexLd, packageLd, packageSeo, personLd, buildSitemap, buildRobots, breadcrumbLd, orgLd, websiteLd, ymd, BRAND, LOGO, initBrand } from "./lib/seo.js";
import { fichaHtml, compareTable, filterBar, kindOf, partsOf, timesOf, galleryOf, isVideoUrl, optionsOf, optionTimes, cheapestOption, policiesOf, qtyTable } from "./lib/ficha.js";
import { bookingConfig, holdMinutes, kidsPolicy, kidsScope, kidsTiersFor } from "./lib/booking.js";
import { bundleItems, bundleKidTable, bundlePolicies, bundleQuote, curOf, fmtMoney, isBundle, kidsText, loadParts, servicePolicies, spanOf, winOf } from "./lib/bundle.js";
import { pixEnabled } from "./lib/pix.js";
import { STATIC_PAGES } from "./lib/static-pages.js";
import { SITE, legacyTarget, staticRedirect } from "./lib/site.js";
import { renderPage, initLayout, stubShell, postCardHtml, waUrl, tr, stripTags, postDay, langOf } from "./lib/render.js";
import { blogText, blogIndexBody, postBody, authorBody, rssXml, catIn, searchBody } from "./lib/blog.js";
import { peopleFor, authorBySlug } from "./lib/autores.js";
import { memoize, edgeGet, edgePut, EDGE_RE, purge } from "./lib/edge.js";
import { restoreExpired } from "./lib/ofertas.js";
import { CLIENTES_PATH, PHOTOS_SQL, clientesBody, clientesStrip, clientesText } from "./lib/clientes.js";
import { ensureSchema } from "./lib/schema.js";
import { PT, ES, EN, splitLang, langPathOf, itemPath, alternateLinks, addToHead, localizeUrls } from "./lib/i18n.js";
import { itemForLang, liveTranslations } from "./lib/translations.js";

// Traducción de los ítems rápidos de "Qué incluye" del panel (admin.js · DET).
const INCL_PT = { "traslado incluido": "Traslado incluído", "desayuno": "Café da manhã", "almuerzo": "Almoço", "cena": "Jantar", "open bar": "Open bar", "guía en portugués": "Guia em português", "guía en español": "Guia em espanhol", "entradas incluidas": "Ingressos incluídos", "impuestos incluidos": "Impostos incluídos" };
const INCL_EN = { "traslado incluido": "Hotel transfer included", "desayuno": "Breakfast", "almuerzo": "Lunch", "cena": "Dinner", "open bar": "Open bar", "guía en portugués": "Portuguese-speaking guide", "guía en español": "Spanish-speaking guide", "entradas incluidas": "Tickets included", "impuestos incluidos": "Taxes included" };


const NO_CACHE = "no-cache, must-revalidate";
// Texto del botón principal de la portada por variante (sin urgencia falsa: solo cambia la invitación).
const AB_CTA = { a: "Consultar pelo WhatsApp", b: "Montar a minha viagem pelo WhatsApp" };
// Notas por página en el índice del blog (la primera página muestra 1 destacada + 9 en grilla).
const BLOG_PER_PAGE = 10;
// /blog/buscar/ es el buscador, no una nota: no cuenta como visita a una ficha.
const VIEW_RE = /^\/(?:paquetes\/[^/]+|blog\/(?!buscar\/$)[^/]+)\/$/;
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|monitor|uptime/i;

// Suma una visita (path + variante + día). Nunca rompe la página si falla.
async function recordView(env, request, path, variant) {
  if (!env.DB || BOT_RE.test(request.headers.get("user-agent") || "")) return;
  try {
    await ensureSchema(env.DB);
    await env.DB.prepare("INSERT INTO page_views (path, variant, day, n) VALUES (?,?,date('now'),1) ON CONFLICT(path, variant, day) DO UPDATE SET n = n + 1")
      .bind(path, variant || "").run();
  } catch { /* la medición es best-effort */ }
}
const LIVE = "(publish_date='' OR publish_date<=date('now','-3 hours'))";
// Marcadores de la portada: <div data-panel="..." hidden></div> (invisible si por algún motivo no se reemplaza).
// Se reemplaza con una función (no con un texto) para que un "$" del contenido no se interprete como patrón.
const putPanel = (b, name, htmlStr) => b.replace(new RegExp(`<div[^>]*data-panel="${name}"[^>]*></div>`), () => htmlStr);
// Red de seguridad: si quedara algún marcador viejo (<!--PANEL:X--> o su versión escapada), no se muestra como texto.
const dropMarks = (b) => b.replace(/<!--\s*PANEL:[A-Z]+\s*-->|&lt;!--\s*PANEL:[A-Z]+\s*--&gt;/g, "");

const fillTokens = (html, env) => html
  .replaceAll("{{BRAND}}", esc(BRAND)).replaceAll("{{SITE_URL}}", siteUrl(env)).replaceAll("{{LOGO}}", esc(LOGO))
  .replaceAll("{{WA_URL}}", esc(waUrl(env, "Hola, quiero consultar por sus experiencias"))).replaceAll("{{YEAR}}", String(new Date().getFullYear()))
  // {{WA:texto}} = enlace de WhatsApp con un mensaje propio (ej. la página de traslados).
  .replace(/\{\{WA:([^}]{1,300})\}\}/g, (_, t) => esc(waUrl(env, t.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"'))));

// Entradas relacionadas: las elegidas en el panel; si no hay, las de la misma categoría; si no, las más recientes.
const POST_CARD_COLS = "id,slug,title,excerpt,image,image_alt,category,publish_date,created_at,read_mins,CASE WHEN read_mins>0 THEN 0 ELSE LENGTH(content) END AS content_len";
const POST_KEY = "COALESCE(NULLIF(publish_date,''),created_at)";
const dbAll = (env, sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results).catch(() => []);

// "Seguí leyendo": las que se eligieron a mano en el panel y, si no hay (o ya no están publicadas), las más nuevas de la misma categoría.
// Siempre se completan hasta 3 con las últimas del blog. Solo se leen las columnas de la tarjeta (nunca el texto completo) para que el costo no crezca con la cantidad de notas.
async function relatedFor(env, p) {
  const cols = `SELECT ${POST_CARD_COLS} FROM posts WHERE published=1 AND id != ? AND ${LIVE}`;
  const ids = String(p.related_ids || "").split(",").map(Number).filter(Boolean).slice(0, 30); // con 30 alcanza para saltear las que ya no están publicadas
  if (ids.length) {
    const got = await dbAll(env, `${cols} AND id IN (${ids.map(() => "?").join(",")})`, p.id, ...ids);
    const byId = new Map(got.map((x) => [x.id, x]));
    const manual = ids.map((i) => byId.get(i)).filter(Boolean).slice(0, 3);
    if (manual.length) return manual;
  }
  const order = (n) => ` ORDER BY ${POST_KEY} DESC, id DESC LIMIT ${n}`;
  let out = p.category ? await dbAll(env, `${cols} AND category = ?${order(3)}`, p.id, p.category) : [];
  if (out.length < 3) {
    const have = out.map((x) => x.id);
    const more = await dbAll(env, `${cols}${have.length ? ` AND id NOT IN (${have.map(() => "?").join(",")})` : ""}${order(3 - out.length)}`, p.id, ...have);
    out = out.concat(more);
  }
  return out;
}

// Nota anterior (más vieja) y siguiente (más nueva) en el orden del blog. Usa el índice posts_order: una lectura por lado, sin importar cuántas notas haya.
async function adjacentFor(env, p) {
  const key = String(p.publish_date || p.created_at || "");
  if (!key || !env.DB) return null;
  const base = `SELECT slug,title FROM posts WHERE published=1 AND ${LIVE}`;
  const [older, newer] = await Promise.all([
    dbAll(env, `${base} AND (${POST_KEY} < ? OR (${POST_KEY} = ? AND id < ?)) ORDER BY ${POST_KEY} DESC, id DESC LIMIT 1`, key, key, p.id),
    dbAll(env, `${base} AND (${POST_KEY} > ? OR (${POST_KEY} = ? AND id > ?)) ORDER BY ${POST_KEY} ASC, id ASC LIMIT 1`, key, key, p.id),
  ]);
  return { older: older[0] || null, newer: newer[0] || null };
}

// Buscador del blog: sin acentos ni mayúsculas ("iguazu" encuentra "Iguazú"). Busca en título, bajada y descripción SEO (no en el texto completo, para que el costo no crezca con el largo de las notas).
const FOLD_FROM = "áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ", FOLD_TO = "aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn";
const sqlFold = (expr) => `LOWER(${[...FOLD_FROM].reduce((e, ch, i) => `REPLACE(${e},'${ch}','${FOLD_TO[i]}')`, expr)})`;
const foldText = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const likeEsc = (w) => w.replace(/[\\%_]/g, "\\$&");
const SEARCH_MAX = 24;
async function searchPosts(env, q) {
  const words = [...new Set(foldText(q).split(/\s+/).filter((w) => w.length >= 2))].slice(0, 5);
  if (!words.length || !env.DB) return [];
  const like = words.map((w) => `%${likeEsc(w)}%`);
  const sql = `SELECT ${POST_CARD_COLS.replace("CASE WHEN read_mins>0 THEN 0 ELSE LENGTH(content) END AS content_len", "content_len")}, (${words.map(() => "CASE WHEN ht LIKE ? ESCAPE '\\' THEN 3 ELSE 0 END").join(" + ")}) AS score
    FROM (SELECT id,slug,title,excerpt,image,image_alt,category,publish_date,created_at,read_mins, CASE WHEN read_mins>0 THEN 0 ELSE LENGTH(content) END AS content_len,
      ${sqlFold("title")} AS ht, ${sqlFold("title||' '||COALESCE(excerpt,'')||' '||COALESCE(seo_description,'')")} AS hay
      FROM posts WHERE published=1 AND ${LIVE})
    WHERE ${words.map(() => "hay LIKE ? ESCAPE '\\'").join(" AND ")}
    ORDER BY score DESC, ${POST_KEY} DESC, id DESC LIMIT ${SEARCH_MAX}`;
  return dbAll(env, sql, ...like, ...like);
}

// Paquetes relacionados (ficha de paquete): misma categoría primero, después los destacados / más recientes.
async function relatedPkgsFor(env, p, skip = []) {
  // skip = productos que la ficha ya muestra arriba (servicios incluidos / paquetes que lo contienen): no se repiten acá.
  const rows = (await env.DB.prepare("SELECT * FROM packages WHERE published=1 AND id != ? ORDER BY (category = ?) DESC, featured DESC, created_at DESC, id DESC LIMIT 12").bind(p.id, p.category || "").all().catch(() => ({ results: [] }))).results;
  return rows.filter((x) => !skip.includes(x.slug)).slice(0, 3);
}
// Cantidad de elementos publicados por categoría: en el sitio solo se muestran las categorías con contenido.
async function liveCounts(db) {
  const rows = (await db.prepare(`SELECT kind, category, COUNT(*) n FROM (SELECT 'posts' kind, category FROM posts WHERE published=1 AND ${LIVE} UNION ALL SELECT 'packages', category FROM packages WHERE published=1) GROUP BY kind, category`).all().catch(() => ({ results: [] }))).results;
  return new Map(rows.map((r) => [r.kind + ":" + r.category, r.n]));
}
const publicCats = (cats, counts, kind, keep = "") => cats.filter((c) => c.kind === kind && (counts.get(kind + ":" + c.slug) || c.slug === keep));
const toChips = (kind, list) => list.map((c) => ({ label: c.label, path: catPath(kind, c) }));
// Blog: cada entrada se arma sola con un diseño fijo (functions/lib/blog.js). El redactor solo escribe el contenido.
function postPage(env, shellHtml, p, related = [], cat = null, pkgs = [], catMap = new Map(), extra = null) {
  const L = labels(shellHtml), T = blogText(env);
  cat = catIn(env, cat); // en /es/ y /en/ la categoría se muestra en ese idioma
  const canonical = `${siteUrl(env)}/blog/${p.slug}/`;
  const desc = p.seo_description || clip(p.excerpt || p.content);
  const image = absUrl(env, p.image);
  const words = stripTags(sanitizeHtml(p.content)).split(" ").filter(Boolean).length;
  const body = postBody(env, { p, cat, related, pkgs, L, catMap, adj: extra?.adj || null, shellWa: (x) => waLink(env, x.title, L.waTitle) });
  const day = postDay(p), mod = String(p.updated_at || "").slice(0, 10);
  // La foto de portada es lo más grande de la primera pantalla: se pide al empezar (mejora el LCP, una de las métricas de Core Web Vitals que Google mide).
  const lcp = p.image ? `<link rel="preload" as="image" href="${esc(p.image)}" fetchpriority="high">` : "";
  const meta = [lcp, `<meta property="article:published_time" content="${esc(day)}">`, mod ? `<meta property="article:modified_time" content="${esc(mod)}">` : "", cat ? `<meta property="article:section" content="${esc(cat.label)}">` : ""].join("");
  return renderPage(shellHtml, { env,
    title: pageTitle(p.seo_title || p.title),
    desc,
    body,
    canonical,
    image,
    imageAlt: p.image_alt || p.title,
    ogType: "article",
    metaExtra: meta,
    ld: ldScript(postLd(env, { ...p, lang: L.lang, section: cat?.label, sectionPath: cat ? `/blog/categoria/${cat.slug}/` : "", words }, { url: canonical, desc, image })),
  });
}

// Ficha de paquete. Recibe los mismos argumentos que postPage (el router los pasa en la misma tabla); blogPkgs y catMap no se usan acá.
const parseMetaSafe = (m) => { try { return JSON.parse(m || "{}") || {}; } catch { return {}; } };
function packagePage(env, shellHtml, p, related = [], c = null, _blogPkgs = [], _catMap = null, extra = { parts: [], inBundles: [] }) {
  const L = labels(shellHtml);
  const cat = c ? { label: c.label, listing: catPath("packages", c) } : null;
  const canonical = `${siteUrl(env)}/paquetes/${p.slug}/`;
  const image = absUrl(env, p.image);
  // Imágenes para compartir (WhatsApp, Facebook, etc.): la portada y las fotos de la galería, sin videos; hasta 4.
  const shareImgs = [...new Set([image, ...galleryOf(p).filter((g) => !isVideoUrl(g.src)).map((g) => absUrl(env, g.src))].filter(Boolean))].slice(0, 4);
  const pct = discountPct(p.price_old, p.price);
  // Los botones rápidos del panel ("Traslado incluido", "Cena"…) se guardan en español: en la web se muestran en el idioma de la página.
  const INCL = /^pt/i.test(L.lang) ? INCL_PT : L.lang === "en" ? INCL_EN : null;
  const details = (p.details || "").split("\n").map((x) => x.trim()).filter(Boolean).map((x) => (INCL && INCL[x.toLowerCase()]) || x);
  // Paquete que combina servicios: las políticas que el paquete no tenga escritas se arman solas con las de cada servicio.
  // Servicio suelto: la de menores sale sola de la tabla de precios de niños si no la escribieron.
  const bPols = extra.items && extra.items.length ? bundlePolicies(p, extra.items, L) : servicePolicies(p, L);
  const F = fichaHtml(p, details, L, bPols);
  const waFor = (x) => waLink(env, x.title, L.waTitle), K = kindText(L.lang);
  // SEO de la ficha: título y descripción propios; si la agencia no los escribió, se arman con el nombre, la categoría, el tipo y el precio.
  const SEO = packageSeo(p, { kindLabel: K[kindOf(p)] || "", catLabel: cat ? cat.label : "", priceTxt: p.price ? String(p.price).trim() : "", lang: L.lang });
  const desc = SEO.desc;
  const bItems = extra.items || [], bMeta = parseMetaSafe(p.meta), bAuto = !!(extra.quote && extra.quote.ok && bMeta.auto === 1 && !optionsOf(p).length);
  const bundle = bundleSection(p, extra.parts, L, waFor, { items: bItems, quote: bAuto ? extra.quote : null });
  const inB = extra.inBundles.length
    ? `<section data-fx="up" class="mt-16"><h2 class="m-0 font-display text-h3 font-semibold text-ink">${esc(K.inH)}</h2><p class="m-0 mb-6 mt-2 max-w-2xl text-mute">${esc(K.inP)}</p><div class="${CARD_GRID}">${extra.inBundles.map((x, i) => pkgCard(x, waFor(x), L, i)).join("")}</div></section>`
    : "";

  // Formulario de reserva en 2 pasos: 1) Tu viaje (fecha + personas + resumen) y 2) Tus datos (nombre, teléfono, comentarios). conv.js abre wa.me con los datos y guarda la consulta en el panel.
  // Contrato con conv.js (no renombrar): form[data-gv-lead] con data-package y data-slug; [data-fields] (el formulario) y [data-sent] (la confirmación, empieza hidden);
  // campos date, pax, name, message (opcional), el honeypot "website" y phone (SOLO si no hay WHATSAPP_NUMBER o el paquete tiene reserva por fecha);
  // en reserva por fecha, [data-booking] (referencia + cuenta regresiva [data-hold] + [data-hold-note]) y [data-release] (liberar la retención) van dentro de [data-sent];
  // pasos: paneles [data-step="1|2"] (el 2 empieza hidden), indicador [data-steps] > [data-stepi], botones [data-next-step] / [data-back-step] / [data-edit-step], resumen [data-recap] con [data-rc="date|pax|total"];
  // botones [data-pax="-1|1"] (stepper de personas), [data-again]; enlace [data-wa-again]; errores [data-err="name|phone"]; estado .gv-lead-msg.
  // El teléfono del visitante NO se pide: le llega a la agencia con el mensaje de WhatsApp. Estilos: .tw-lead en src/styles/tw.css. Animaciones: src/scripts/fx.ts.
  // Con reserva por fecha (bk.enabled) el teléfono SÍ se pide: la reserva queda guardada en el panel y la agencia necesita cómo contactar al cliente.
  const bk = bookingConfig(p);
  const needPhone = bk.enabled || !String(env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  // Opciones con precio (ej. Solo show · Jantar show · Platea VIP): el cliente elige una en el paso 1 y el total usa su precio.
  // Todas comparten fecha, horario y cupo. Por defecto queda elegida la más barata (la del "a partir de").
  const opts = optionsOf(p), best = cheapestOption(opts);
  const unitNum = best ? best.cents / 100 : Number(parsePrice(p.price)), unitC = Number.isFinite(unitNum) && unitNum > 0 ? Math.round(unitNum * 100) : 0; // precio por persona en centavos (mismo cálculo que createBooking)
  const payPix = bk.pay === "pix" && pixEnabled(env); // el paquete cobra con Pix y el servidor tiene Mercado Pago configurado
  const BT = L.lang === "es"
    ? { send: "Reservar mi lugar", legal: payPix ? "Tu lugar queda retenido unos minutos. En este paso no se cobra nada: después podés pagar con Pix o confirmar por WhatsApp." : "Tu lugar queda retenido unos minutos mientras confirmás. En este paso no se cobra nada." }
    : { send: "Reservar minha vaga", legal: payPix ? "Sua vaga fica reservada por alguns minutos. Nenhuma cobrança neste passo: depois você paga com Pix ou confirma pelo WhatsApp." : "Sua vaga fica reservada por alguns minutos enquanto você confirma. Nenhuma cobrança neste passo." };
  // Reserva con fecha: el botón no abre WhatsApp (crea la reserva con retención), así que lleva ícono de calendario y color primario.
  const BOOK_ICON = '<svg class="size-5 shrink-0" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  const PT = L.lang === "es" ? { scan: "Escaneá el QR con la app de tu banco o copiá el código Pix.", copy: "Copiar código Pix", steps: "Abrí tu banco → Pix → Pagar con QR o copia e cola → confirmá." } : { scan: "Escaneie o QR no app do seu banco ou copie o código Pix.", copy: "Copiar código Pix", steps: "Abra seu banco → Pix → Pagar com QR ou copia e cola → confirme." };
  const ST = L.lang === "es"
    ? { aria: "Pasos de la reserva", s1: "Tu viaje", s2: "Tus datos", h1: "Fecha y personas", h2: "Datos de contacto", next: "Continuar", back: "Volver", change: "Cambiar", rcDate: "Fecha", rcPax: "Personas", rcTotal: "Total" }
    : { aria: "Etapas da reserva", s1: "Sua viagem", s2: "Seus dados", h1: "Data e pessoas", h2: "Dados de contato", next: "Continuar", back: "Voltar", change: "Alterar", rcDate: "Data", rcPax: "Pessoas", rcTotal: "Total" };
  const NEXT_ICON = '<svg class="size-5 shrink-0" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const BACK_ICON = '<svg class="size-4 shrink-0" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
  const stepH = "m-0 font-display text-lg font-semibold leading-tight text-ink";
  const rcRow = (k, lbl, hide) => `<div${hide ? ' data-rc-row="' + k + '" hidden' : ""} class="flex items-baseline justify-between gap-4"><dt class="text-mute">${esc(lbl)}</dt><dd data-rc="${k}" class="m-0 text-right font-semibold text-ink"></dd></div>`;
  const field = "tw-field";
  const label = "tw-label-f";
  const err = "m-0 mt-1.5 text-sm font-semibold text-bad";
  const stepBtn = "tw-step";
  const phoneField = needPhone
    ? `<div><label for="gv-phone" class="${label}">${esc(L.fPhone)}</label><input id="gv-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="40" placeholder="+54 9 11 …" class="${field}"><p data-err="phone" id="gv-phone-err" class="${err}" hidden></p></div>`
    : "";
  // Reserva por fecha (se activa por paquete en el panel > Disponibilidad): calendario con los días abiertos y personas dentro del mínimo/máximo.
  // Si está apagada, queda el campo de fecha de siempre. conv.js (initCal) pide los días a /api/avail y llena el campo oculto "date".
  const paxVal = bk.enabled ? Math.min(bk.max_pax, Math.max(2, bk.min_pax)) : 2;
  // Paquete/servicio que acepta niños (se marca en el panel al crearlo): en vez de "Personas" se piden Adultos y Niños por separado.
  // El campo "pax" pasa a ser oculto y conv.js lo mantiene como adultos + niños, así el cupo, el mínimo/máximo y el total siguen igual.
  // Un paquete que combina servicios acepta niños si los acepta él o alguno de sus servicios.
  const kids = Number(p.accepts_children) === 1 || bItems.some((i) => Number(i.svc.accepts_children) === 1);
  const KT = L.lang === "es"
    ? { ad: "Adultos", ch: "Niños", chHint: "Menores de edad que viajan con vos", adLess: "Menos adultos", adMore: "Más adultos", chLess: "Menos niños", chMore: "Más niños" }
    : { ad: "Adultos", ch: "Crianças", chHint: "Menores que viajam com você", adLess: "Menos adultos", adMore: "Mais adultos", chLess: "Menos crianças", chMore: "Mais crianças" };
  // Precio de niños por edad (se configura en el panel al crear el paquete/servicio): conv.js pide la edad de cada niño y calcula el total con estos tramos.
  // Paquete que combina servicios: cada niño paga según la política de cada servicio (tabla por edad, ver bundleKidTable).
  const kidTab = kids && bItems.length && !opts.length ? bundleKidTable(bItems) : null;
  const kidTiers = kidTab ? kidTab.map((pct, a) => ({ from: a, to: a, pct })) : kids ? kidsPolicy(p).tiers : [];
  // Si la política de menores es solo de algunas opciones, los tramos valen solo ahí (data-kid-scope: índices de esas opciones; vacío = todas).
  const kidScope = !kidTab && kidTiers.length && opts.length ? (() => { const sc = kidsScope(p); return sc.length ? opts.filter((o) => sc.includes(o.name.toLowerCase())).map((o) => String(o.i)) : []; })() : [];
  // Precio por cantidad (panel, ej. 2x1): {personas: centavos}; el formulario y la tarjeta muestran ese total (el servidor cobra lo mismo).
  // Con opciones, una tabla por opción (clave = índice de la opción); "" = sin opciones.
  const qtObj = (t) => (t ? Object.fromEntries([...t].map(([n, r]) => [n, r.cents])) : null);
  const qtMap = opts.length ? Object.fromEntries(opts.map((o) => [String(o.i), qtObj(qtyTable(p, o.name))]).filter((x) => x[1])) : (qtyTable(p) ? { "": qtObj(qtyTable(p)) } : {});
  const optT = Object.fromEntries(opts.filter((o) => o.times.length).map((o) => [String(o.i), optionTimes(p, o.name)]));
  const optTimesAttr = Object.keys(optT).length ? ` data-opt-times="${esc(JSON.stringify(Object.fromEntries(opts.map((o) => [String(o.i), optionTimes(p, o.name)]))))}"` : "";
  const qtyAttr = Object.keys(qtMap).length ? ` data-qty-table="${esc(JSON.stringify(qtMap))}"` : "";
  const scopeAttr = kidScope.length ? ` data-kid-scope="${esc(JSON.stringify(kidScope))}"` : "";
  const KP = L.lang === "es"
    ? { full: "En esta opción, los niños pagan tarifa de adulto.", title: "Tarifa para niños", free: "gratis", pays: "pagan", yrs: (a, b) => (a === b ? `${a} ${a === 1 ? "año" : "años"}` : `${a} a ${b} años`), adult: (n) => `Desde ${n} años: tarifa de adulto`, ages: "Edad de cada niño" }
    : { full: "Nesta opção, as crianças pagam tarifa de adulto.", title: "Tarifa para crianças", free: "grátis", pays: "pagam", yrs: (a, b) => (a === b ? `${a} ${a === 1 ? "ano" : "anos"}` : `${a} a ${b} anos`), adult: (n) => `A partir de ${n} anos: tarifa de adulto`, ages: "Idade de cada criança" };
  const kidLines = kidTab ? bItems.filter((i) => Number(i.svc.accepts_children) === 1 && kidsTiersFor(i.svc, i.option).length).map((i) => `${i.title}: ${kidsText(kidsTiersFor(i.svc, i.option), L.lang, curOf(i.txt || i.svc.price))}`) : kidTiers.map((t) => `${KP.yrs(t.from, t.to)}: ${t.amt != null && t.amt > 0 ? `${KP.pays} ${fmtMoney(curOf((cheapestOption(opts) || {}).price || p.price), t.amt)}` : t.pct === 0 ? KP.free : t.pct === 100 ? (L.lang === "es" ? "precio completo" : "preço cheio") : `${KP.pays} ${t.pct}%`}`);
  if (!kidTab && kidTiers.length && kidTiers[kidTiers.length - 1].to < 17) kidLines.push(KP.adult(kidTiers[kidTiers.length - 1].to + 1));
  const kidInfo = kidLines.length
    ? `<div data-kid-info class="rounded-lg bg-mist px-4 py-3"><p class="m-0 text-sm font-semibold text-ink">${esc(KP.title)}</p><ul class="m-0 mt-1 grid list-none gap-0.5 p-0 text-sm leading-snug text-mute">${kidLines.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${kidScope.length ? `<p data-kid-full class="m-0 mt-1 text-sm leading-snug text-mute" hidden>${esc(KP.full)}</p>` : ""}</div>`
    : "";
  const agesBlock = kidTiers.length
    ? `<div data-ages hidden class="grid gap-3 rounded-lg border border-ink/25 p-4"><p class="m-0 text-[0.9375rem] font-semibold text-ink">${esc(KP.ages)}</p><div data-ages-list class="grid grid-cols-2 gap-3"></div><p data-err="ages" id="gv-ages-err" class="${err}" hidden></p></div>`
    : "";
  const qty = (id, name, lbl, hint, val, min, kind, less, more) => `<div class="flex items-center justify-between gap-3 rounded-lg border border-ink/25 py-1.5 pl-4 pr-1.5"><div class="min-w-0"><label for="${id}" class="block text-[0.9375rem] font-semibold text-ink">${esc(lbl)}</label>${hint ? `<small class="block text-xs leading-tight text-mute">${esc(hint)}</small>` : ""}</div><div class="flex items-center gap-1"><button type="button" data-qty="${kind}:-1" aria-label="${esc(less)}" class="${stepBtn}">−</button><input id="${id}" name="${name}" type="number" min="${min}" max="99" value="${val}" inputmode="numeric" class="h-11 w-12 border-0 bg-transparent p-0 text-center font-display text-xl font-semibold text-ink focus:outline-3 focus:outline-primary/20"><button type="button" data-qty="${kind}:1" aria-label="${esc(more)}" class="${stepBtn}">+</button></div></div>`;
  const paxBlock = kids
    ? `${qty("gv-adults", "adults", KT.ad, "", paxVal, 1, "adults", KT.adLess, KT.adMore)}${qty("gv-children", "children", KT.ch, KT.chHint, 0, 0, "children", KT.chLess, KT.chMore)}${kidInfo}${agesBlock}<input type="hidden" name="pax" value="${paxVal}">`
    : `<div class="flex items-center justify-between gap-3 rounded-lg border border-ink/25 py-1.5 pl-4 pr-1.5"><label for="gv-pax" class="text-[0.9375rem] font-semibold text-ink">${esc(L.fPax)}</label><div class="flex items-center gap-1"><button type="button" data-pax="-1" aria-label="${esc(L.fPaxLess)}" class="${stepBtn}">−</button><input id="gv-pax" name="pax" type="number" min="${bk.enabled ? bk.min_pax : 1}" max="${bk.enabled ? bk.max_pax : 99}" value="${paxVal}" inputmode="numeric" class="h-11 w-12 border-0 bg-transparent p-0 text-center font-display text-xl font-semibold text-ink focus:outline-3 focus:outline-primary/20"><button type="button" data-pax="1" aria-label="${esc(L.fPaxMore)}" class="${stepBtn}">+</button></div></div>`;
  // Reserva por horario (el panel la prende y el paquete tiene horarios): al elegir el día, conv.js muestra un botón por horario; el horario viaja en el campo oculto "time".
  const TT = L.lang === "es" ? { label: "Horario de salida", hint: "Elegí un horario", rc: "Horario" } : { label: "Horário de saída", hint: "Escolha um horário", rc: "Horário" };
  const timeBlock = bk.enabled && bk.byTime ? `<div data-times hidden><span class="${label}">${esc(TT.label)}</span><small class="mt-0.5 block text-xs leading-tight text-mute">${esc(TT.hint)}</small><div data-time-list class="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3"></div><input type="hidden" name="time"><p data-err="time" id="gv-time-err" class="${err}" hidden></p></div>` : "";
  const OT = L.lang === "es" ? { pick: "Elegir", picked: "Elegida", rc: "Opción", list: "Opciones y precios", listP: "Mismo día, horario y cupo: solo cambia lo que incluye cada opción.", per: "por persona" } : { pick: "Escolher", picked: "Escolhida", rc: "Opção", list: "Opções e preços", listP: "Mesmo dia, horário e vagas: só muda o que cada opção inclui.", per: "por pessoa" };
  // Políticas (menores, cancelación, etc.): la sección va en la ficha (F.pl, #politicas). Acá: aviso en cada opción que tiene una propia y un enlace en el formulario.
  const pols = bPols || policiesOf(p, L);
  const PO = L.lang === "es" ? { see: "Ver política", form: "Antes de reservar, revisá las políticas" } : { see: "Ver política", form: "Antes de reservar, confira as políticas" };
  const polFor = (o) => pols.filter((x) => x.option === o.name).map((x) => x.title);
  const polLink = (o) => (polFor(o).length ? `<a href="#politicas" class="gvo-pol">${esc(PO.see)}: ${esc(polFor(o).join(", "))}</a>` : "");
  // Cada política con la opción a la que aplica (data-pol-opt = índice; vacío = todas): ficha.js muestra solo las de la opción elegida.
  const polIdx = (x) => { const o = x.option ? opts.find((y) => y.name === x.option) : null; return o ? String(o.i) : ""; };
  const polKeys = [...new Map(pols.map((x) => [x.title + "|" + polIdx(x), x])).values()];
  const polForm = pols.length ? `<p class="gvp-form" data-pol-form><a href="#politicas">${esc(PO.form)}</a> (<span>${polKeys.map((x) => `<span data-pol-opt="${polIdx(x)}">${esc(x.title)}</span>`).join("")}</span>)</p>` : "";
  const optBlock = opts.length
    ? `<fieldset data-options class="gvo"><legend class="${label}">${esc(L.options)}</legend><div class="gvo-list">${opts.map((o) => `<label class="gvo-o"><input type="radio" name="option" value="${o.i}" data-unit="${o.cents}" data-cur="${esc(priceCurrency(env, o.price))}" data-label="${esc(o.name)}"${best && o.i === best.i ? " checked" : ""}><span class="gvo-b"><span class="gvo-n">${esc(o.name)}</span>${o.times.length ? `<small class="gvo-time">🕗 ${esc(o.times.join(" · "))}</small>` : ""}${o.note ? `<small>${esc(o.note)}</small>` : ""}${polFor(o).length ? `<small class="gvo-polf">${esc(polFor(o).join(", "))}</small>` : ""}</span><span class="gvo-p">${o.old ? `<s>${esc(o.old)}</s>` : ""}<b>${esc(o.price)}</b></span></label>`).join("")}</div></fieldset>`
    : "";
  // Bloque de la ficha con todas las opciones y su precio; "Escolher" marca la opción en el formulario y lleva hasta él (conv.js: data-pick-option).
  const optSection = opts.length
    ? `<section data-fx="up" class="mt-16"><h2 class="m-0 font-display text-h3 font-semibold text-ink">${esc(OT.list)}</h2><p class="m-0 mb-6 mt-2 max-w-2xl text-mute">${esc(OT.listP)}</p><ul class="gvo-table">${opts.map((o) => `<li><div class="gvo-tn"><b>${esc(o.name)}</b>${o.times.length ? `<span class="gvo-time">🕗 ${esc(o.times.join(" · "))}</span>` : ""}${o.note ? `<span>${esc(o.note)}</span>` : ""}${polLink(o)}</div><div class="gvo-tp">${o.old ? `<s>${esc(o.old)}</s>` : ""}<b>${esc(o.price)}</b><small>${esc(OT.per)}</small></div><a href="#pedir" data-pick-option="${o.i}" class="tw-btn tw-btn--line tw-btn--sm"><span>${esc(OT.pick)}</span></a></li>`).join("")}</ul><link rel="stylesheet" href="/assets/options.css?v=5"></section>`
    : "";
  // Paquete que combina servicios y se reserva por fecha: después de elegir el inicio, conv.js pide el itinerario (/api/avail?start=) y muestra
  // un renglón por servicio (día y horario). En modo "libre" el cliente puede mover cada servicio de día; si la agencia no fijó el horario, lo elige él.
  const bundleOn = bk.enabled && bItems.length > 0;
  const IT = L.lang === "es" ? { h: "Itinerario", hint: "Elegí la fecha de inicio para ver qué día va cada servicio.", rc: "Itinerario" } : { h: "Roteiro", hint: "Escolha a data de início para ver em que dia é cada serviço.", rc: "Roteiro" };
  const bundleData = bundleOn ? JSON.stringify({ mode: bMeta.pmode === "libre" ? "libre" : "fijo", span: bMeta.pmode === "libre" ? winOf(p, bItems) : spanOf(bItems), disc: bAuto ? extra.quote.disc : 0, sum: bAuto ? extra.quote.sum : 0,
    comp: bAuto ? bItems.map((i) => ({ t: i.title, o: i.option, u: i.unit })) : null }) : "";
  const itinBlock = bundleOn ? `<div data-itin class="gvi"><span class="${label}">${esc(IT.h)}</span><p data-itin-hint class="m-0 mt-0.5 text-xs leading-tight text-mute">${esc(IT.hint)}</p><ol data-itin-list class="gvi-list" hidden></ol><p data-err="plan" id="gv-plan-err" class="${err}" hidden></p><input type="hidden" name="plan" value=""></div>` : "";
  const dateBlock = bk.enabled
    ? `<div data-cal><span class="${label}">${esc(L.fDateExact)}</span><div class="tw-cal mt-1.5"><div class="tw-cal-head"><button type="button" data-cal-nav="-1" class="tw-cal-nav" aria-label="${esc(L.calPrev)}">‹</button><p data-cal-title class="tw-cal-title" aria-live="polite"></p><button type="button" data-cal-nav="1" class="tw-cal-nav" aria-label="${esc(L.calNext)}">›</button></div><div data-cal-grid class="tw-cal-grid"></div><p data-cal-note class="tw-cal-note" role="status" aria-live="polite"></p></div><input type="hidden" name="date"><p data-err="date" id="gv-date-err" class="${err}" hidden></p></div>`
    : `<div><label for="gv-date" class="${label}">${esc(L.fDate)}</label><input id="gv-date" name="date" type="date" class="${field}"></div>`;
  const lead = `${opts.length || pols.length || bItems.length || bk.enabled ? '<link rel="stylesheet" href="/assets/options.css?v=5">' : ""}<form id="pedir" class="tw-lead relative scroll-mt-24" data-gv-lead data-package="${esc(p.title)}" data-slug="${esc(p.slug)}"${kids ? ' data-kids="1"' : ""}${kidTiers.length ? ` data-kid-tiers="${esc(JSON.stringify(kidTiers))}"` : ""}${scopeAttr}${qtyAttr}${optTimesAttr}${kidTab ? ' data-kid-mode="tab"' : ""}${bk.enabled ? ` data-min-pax="${bk.min_pax}" data-max-pax="${bk.max_pax}" data-hold-min="${holdMinutes(env)}"${unitC ? ` data-unit="${unitC}" data-cur="${priceCurrency(env, best ? best.price : p.price)}"` : ""}${payPix ? ' data-paymode="pix"' : ""}` : ""}${bundleOn ? ` data-bundle="${esc(bundleData)}"` : ""} novalidate>
<div data-fields>
<h3 class="m-0 font-display text-[1.65rem] font-semibold leading-tight text-ink">${esc(L.formTitle)}</h3>
<p class="m-0 mt-1.5 text-[0.95rem] leading-snug text-mute">${esc(bk.enabled ? (L.lang === "es" ? "Elegí la opción, la fecha y cuántos viajan. Ves el total antes de confirmar." : "Escolha a opção, a data e quantas pessoas viajam. Você vê o total antes de confirmar.") : L.formSub)}</p>
<ol data-steps aria-label="${esc(ST.aria)}" class="tw-steps"><li data-stepi="1" data-s="now" aria-current="step"><span data-sdot class="tw-steps-dot">1</span><span>${esc(ST.s1)}</span></li><li data-stepi="2" data-s="todo"><span data-sdot class="tw-steps-dot">2</span><span>${esc(ST.s2)}</span></li></ol>
<div data-step="1" tabindex="-1" aria-labelledby="gv-st1" class="mt-6 outline-none">
<h4 id="gv-st1" class="${stepH}">${esc(bundleOn ? (L.lang === "es" ? "Inicio, itinerario y personas" : "Início, roteiro e pessoas") : opts.length ? (L.lang === "es" ? "Opción, fecha y personas" : "Opção, data e pessoas") : ST.h1)}</h4>
<div class="mt-4 grid gap-5">
${optBlock}
${dateBlock}
${itinBlock}
${timeBlock}
${paxBlock}
${polForm}
</div>
<div data-summary hidden class="mt-5 rounded-lg bg-mist p-4" aria-live="polite"><p data-sum-pkg class="m-0 font-display text-lg font-semibold leading-tight text-ink"></p><div class="mt-2 flex items-baseline justify-between gap-3 text-sm text-ink"><span data-sum-line></span><span data-sum-date class="text-right text-mute"></span></div><dl data-sum-break class="gvb" hidden></dl><div class="mt-1.5 flex items-baseline justify-between gap-3"><span data-sum-label class="text-sm font-semibold text-ink"></span><span data-sum-total class="font-display text-2xl font-semibold leading-none text-primary"></span></div><p data-sum-note class="m-0 mt-2 text-xs leading-snug text-mute"></p><p data-sum-hold class="m-0 mt-2 text-xs font-semibold leading-snug text-primary"></p></div>
<p class="gv-lead-msg" role="status" aria-live="polite"></p>
<button type="button" data-next-step class="tw-btn tw-btn--primary mt-6 min-h-14 w-full text-base"><span>${esc(ST.next)}</span>${NEXT_ICON}</button>
</div>
<div data-step="2" hidden tabindex="-1" aria-labelledby="gv-st2" class="mt-6 outline-none">
<h4 id="gv-st2" class="${stepH}">${esc(ST.h2)}</h4>
<div data-recap class="mt-4 flex items-start justify-between gap-4 rounded-lg bg-mist p-4"><dl class="m-0 grid min-w-0 flex-1 gap-1.5 text-sm">${opts.length ? rcRow("option", OT.rc) : ""}${rcRow("date", bundleOn ? (L.lang === "es" ? "Inicio" : "Início") : ST.rcDate)}${rcRow("time", TT.rc, true)}${bundleOn ? rcRow("itin", IT.rc, true) : ""}${rcRow("pax", ST.rcPax)}${rcRow("total", ST.rcTotal, true)}</dl><button type="button" data-edit-step class="tw-link min-h-11 shrink-0 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-primary">${esc(ST.change)}</button></div>
<div class="mt-5 grid gap-5">
<div><label for="gv-name" class="${label}">${esc(L.fName)}</label><input id="gv-name" name="name" autocomplete="name" maxlength="80" class="${field}"><p data-err="name" id="gv-name-err" class="${err}" hidden></p></div>
${phoneField}
<div><label for="gv-msg" class="${label}">${esc(L.fMsg)}</label><textarea id="gv-msg" name="message" rows="2" maxlength="300" placeholder="${esc(L.fMsgPh)}" class="${field} min-h-24 resize-y leading-snug"></textarea></div>
</div>
<button type="submit" class="${bk.enabled ? "tw-btn tw-btn--primary" : "tw-btn tw-btn--wa"} mt-6 min-h-14 w-full text-base">${bk.enabled ? BOOK_ICON : WA_ICON}<span>${esc(bk.enabled ? BT.send : L.fSend)}</span></button>
<input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="absolute -left-[9999px] size-px opacity-0">
<p class="gv-lead-msg" role="status" aria-live="polite"></p>
<p class="m-0 mt-4 text-xs leading-relaxed text-mute">${esc(bk.enabled ? BT.legal : L.legal)}</p>
<button type="button" data-back-step class="tw-link mx-auto mt-2 flex min-h-11 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-4 text-sm font-semibold text-mute">${BACK_ICON}<span>${esc(ST.back)}</span></button>
</div>
</div>
<div data-sent hidden tabindex="-1" class="py-4 text-center outline-none">
<span data-badge class="mx-auto grid size-16 place-items-center rounded-full bg-cta/10 text-cta"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path data-check d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
<ol data-track hidden class="mx-auto mt-5 flex max-w-sm list-none items-start gap-1 p-0">${[1, 2, 3].map((n) => `<li data-tstep data-s="todo" class="tw-tstep"><span data-tdot>${n}</span><span data-tlabel></span></li>`).join("")}</ol>
<p data-sent-title class="m-0 mt-4 font-display text-2xl font-semibold text-ink"></p>
<p data-sent-body class="m-0 mt-2 text-[0.95rem] leading-relaxed text-mute"></p>
<div data-booking hidden class="mt-4 rounded-lg bg-mist p-4 text-left"><p data-ref class="m-0 text-sm font-semibold leading-snug text-ink"></p><p data-hold class="m-0 mt-1 font-display text-3xl font-semibold text-primary" role="timer"></p><p data-hold-note class="m-0 mt-1 text-sm leading-snug text-mute"></p></div>
<dl data-detail hidden class="m-0 mt-4 grid gap-2.5 rounded-lg bg-mist p-4 text-left text-sm"><div class="flex justify-between gap-4"><dt data-dl="pkg" class="text-mute"></dt><dd data-dv="pkg" class="m-0 text-right font-semibold text-ink"></dd></div><div class="flex justify-between gap-4"><dt data-dl="date" class="text-mute"></dt><dd data-dv="date" class="m-0 text-right font-semibold text-ink"></dd></div><div class="flex justify-between gap-4" data-time-row hidden><dt data-dl="time" class="text-mute"></dt><dd data-dv="time" class="m-0 text-right font-semibold text-ink"></dd></div><div class="gvd-it" hidden><dt data-dl="itin" class="text-mute"></dt><dd data-dv="itin" class="m-0 font-semibold text-ink"></dd></div><div class="flex justify-between gap-4"><dt data-dl="pax" class="text-mute"></dt><dd data-dv="pax" class="m-0 text-right font-semibold text-ink"></dd></div><div class="flex justify-between gap-4"><dt data-dl="total" class="text-mute"></dt><dd data-dv="total" class="m-0 text-right font-semibold text-ink"></dd></div><div class="flex justify-between gap-4"><dt data-dl="ref" class="text-mute"></dt><dd data-dv="ref" class="m-0 text-right font-semibold text-ink"></dd></div></dl><p data-next hidden class="m-0 mt-4 text-center text-sm font-semibold leading-snug text-primary"></p>
<div data-pay hidden class="mt-4 text-left"><button type="button" data-pay-btn class="tw-btn tw-btn--primary min-h-14 w-full text-base"><span></span></button><div data-pix hidden class="rounded-lg border border-ink/20 p-4 text-center"><p data-pix-amount class="m-0 font-display text-2xl font-semibold text-primary"></p><p class="m-0 mt-1 text-sm leading-snug text-mute">${esc(PT.scan)}</p><p class="m-0 mt-1 text-xs leading-snug text-mute">${esc(PT.steps)}</p><img data-pix-qr alt="Pix QR" width="192" height="192" class="mx-auto mt-3 size-48 rounded bg-white"><input data-pix-code readonly aria-label="${esc(PT.copy)}" class="tw-field mt-3 text-xs" value=""><button type="button" data-pix-copy class="tw-btn tw-btn--line mt-2 min-h-12 w-full"><span>${esc(PT.copy)}</span></button><p data-pix-wait role="status" aria-live="polite" class="m-0 mt-3 text-sm font-semibold leading-snug text-primary"></p></div></div>
<a data-wa-again data-gv-nolog href="#" target="_blank" rel="noopener" class="tw-btn tw-btn--wa mt-5 min-h-14 w-full">${WA_ICON}<span>${esc(L.sentOpen)}</span></a>
<a data-ics hidden href="#" class="tw-btn tw-btn--line mt-3 min-h-12 w-full"><span></span></a>
<button type="button" data-release hidden class="tw-link mt-1 min-h-11 cursor-pointer border-0 bg-transparent px-4 text-sm font-semibold text-mute"></button>
<button type="button" data-again class="tw-link mt-2 min-h-11 cursor-pointer border-0 bg-transparent px-4 text-sm font-semibold text-primary">${esc(L.sentAgain)}</button>
</div>
</form>`;

  const crumbLink = (href, text) => `<a href="${esc(href)}" class="no-underline"><span class="transition duration-200 hover:text-ink">${text}</span></a><span aria-hidden="true">›</span>`;
  const catHref = cat ? cat.listing || `/paquetes/categoria/${cat.slug}/` : "";
  const crumb = `<nav aria-label="${esc(L.crumb)}" class="flex flex-wrap items-center gap-x-2 gap-y-1 py-5 text-sm text-mute">${crumbLink("/", L.home)}${cat ? crumbLink(catHref, esc(cat.label)) : ""}${cat && extra.sub ? crumbLink(`${catHref}?sub=${encodeURIComponent(extra.sub.slug)}`, esc(extra.sub.label)) : ""}<span aria-current="page" class="text-ink">${esc(p.title)}</span></nav>`;

  // Barra fija en móvil: precio + botón que lleva al formulario de reserva (data-gv-sticky).
  const barPrice = p.price
    ? `<small class="block text-xs text-mute">${esc(L.from)}</small><strong class="block truncate font-display text-xl font-semibold text-primary">${esc(p.price)}</strong>`
    : `<strong class="font-display text-base font-semibold text-primary">${esc(L.askPrice)}</strong>`;
  const bar = `<div data-gv-sticky class="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-ink/15 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md lg:hidden"><div class="mr-auto min-w-0 leading-tight">${barPrice}</div><a href="#pedir" class="tw-btn tw-btn--primary min-h-12"><span>${esc(L.formCta)}</span></a></div>`;

  // "Otras experiencias"
  const rel = related.length
    ? `<section data-fx="up" class="border-t border-ink/10 bg-mist tw-section"><div class="tw-wrap"><h2 class="m-0 font-display text-h2 font-semibold text-ink">${esc(L.related)}</h2><div class="${CARD_GRID} mt-10">${related.map((x) => pkgCard(x, waLink(env, x.title, L.waTitle), L)).join("")}</div></div></section>`
    : "";

  // Cabecera: título, resumen y una línea con lo clave (horario, duración, lugar). Debajo, la galería en mosaico (la foto principal primero).
  const es = L.lang === "es";
  const FX = parseMetaSafe(p.meta).facts || [], tms = timesOf(p);
  const quick = [
    tms.length ? [L.timesShort || "Horários", tms.slice(0, 3).map((r) => r[0]).join(" · ")] : null,
    FX.find((r) => /dura[cç]/i.test(r[0])), FX.find((r) => /ubica|locali|regi/i.test(r[0])),
  ].filter(Boolean).slice(0, 3);
  const CLK = '<svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const PIN = '<svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  const quickRow = quick.length ? `<ul class="gvh-q">${quick.map(([k, v]) => `<li>${/ubica|locali|regi/i.test(k) ? PIN : CLK}<span>${esc(v)}</span></li>`).join("")}</ul>` : "";
  // Tarjeta de la derecha (fija al bajar): precio, botón que abre la reserva y lo que da confianza. El formulario va en una ventana aparte.
  const MB = parseMetaSafe(p.meta), isBest = MB.best === 1 || MB.best === true, boxP = String(MB.box || "").trim();
  const TR = es
    ? { book: bk.enabled ? "Ver fechas disponibles" : "Consultar disponibilidad", pix: "Pago seguro con Pix", inst: "Confirmación al instante", nopay: "Elegís la fecha y recién después pagás", lang: "Atención en español y portugués", ask: "¿Dudas? Escribinos por WhatsApp", close: "Cerrar",
        best: "Mejor precio del mercado", bestP: "Más barato que comprar directo en el lugar", box: "En la boletería", save: "Ahorrás", per: "por persona", pax: "Personas", adults: "Adultos", total: "Total", choose: "Elegí tu opción", proof: "Más de 100.000 viajeros desde 2006", less: "Menos personas", more: "Más personas", kids: "Niños", kidsH: "Hasta 17 años", kLess: "Menos niños", kMore: "Más niños", age: "Edad", child: "Niño {n}", less1: "Menos de 1 año", one: "1 año", yrs: "{n} años", askAge: "Indicá la edad: los niños pagan menos", kidsTab: "Hasta 17 años · el precio depende de la edad" }
    : { book: bk.enabled ? "Ver datas disponíveis" : "Consultar disponibilidade", pix: "Pagamento seguro com Pix", inst: "Confirmação na hora", nopay: "Você escolhe a data e só depois paga", lang: "Atendimento em português", ask: "Dúvidas? Fale no WhatsApp", close: "Fechar",
        best: "Melhor preço do mercado", bestP: "Mais barato que comprar direto no local", box: "Na bilheteria", save: "Você economiza", per: "por pessoa", pax: "Pessoas", adults: "Adultos", total: "Total", choose: "Escolha sua opção", proof: "Mais de 100.000 viajantes desde 2006", less: "Menos pessoas", more: "Mais pessoas", kids: "Crianças", kidsH: "Até 17 anos", kLess: "Menos crianças", kMore: "Mais crianças", age: "Idade", child: "Criança {n}", less1: "Menos de 1 ano", one: "1 ano", yrs: "{n} anos", askAge: "Informe a idade: crianças pagam menos", kidsTab: "Até 17 anos · o preço depende da idade" };
  const TICK = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ticks = [payPix && TR.pix, bk.enabled && TR.inst, bk.enabled && TR.nopay, TR.lang].filter(Boolean);
  // Ahorro: contra el precio anterior y, si el panel lo tiene, contra la boletería del lugar (misma moneda).
  const numP = (x) => Number(parsePrice(x)) || 0, curP = (x) => String(x || "").match(/^[^\d]*/)[0].trim();
  const baseP = best ? best.price : p.price, baseOld = best ? best.old : p.price_old;
  const saveOld = numP(baseOld) > numP(baseP) && numP(baseP) > 0 ? numP(baseOld) - numP(baseP) : 0;
  // Con varias opciones no se sabe a cuál corresponde la boletería: ahí no se calcula ahorro (el panel lo explica).
  const saveBox = opts.length <= 1 && boxP && numP(boxP) > numP(baseP) && numP(baseP) > 0 && curP(boxP) === curP(baseP) ? numP(boxP) - numP(baseP) : 0;
  const money = (n) => `${curP(baseP)} ${Math.round(n).toLocaleString("es-AR")}`.trim();
  const ribbon = isBest ? `<div class="gvs-best"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/></svg><span><b>${esc(TR.best)}</b><small>${esc(TR.bestP)}</small></span></div>` : "";
  const saveLine = saveBox ? `<p class="gvs-save"><span>${esc(TR.box)}: <s>${esc(boxP)}</s></span><b>${esc(TR.save)} ${esc(money(saveBox))}</b></p>`
    : saveOld ? `<p class="gvs-save"><b>${esc(TR.save)} ${esc(money(saveOld))} ${esc(TR.per)}</b></p>` : "";
  // Selección rápida en la tarjeta (opción y personas): ficha.js la pasa al formulario al abrir la reserva (compromiso pequeño antes del calendario).
  const kidsForm = kids;
  const qOpts = opts.length > 1 ? `<fieldset class="gvs-o"><legend>${esc(TR.choose)}</legend>${opts.map((o) => `<label><input type="radio" name="q-opt" value="${o.i}" data-unit="${o.cents}"${best && o.i === best.i ? " checked" : ""}><span class="gvs-on">${esc(o.name)}</span><span class="gvs-op">${o.old ? `<s>${esc(o.old)}</s>` : ""}<b>${esc(o.price)}</b></span></label>`).join("")}</fieldset>` : "";
  const qPax = `<div class="gvs-x"><span>${esc(kidsForm ? TR.adults : TR.pax)}</span><div><button type="button" data-q-pax="-1" aria-label="${esc(TR.less)}">−</button><output data-q-n>${paxVal}</output><button type="button" data-q-pax="1" aria-label="${esc(TR.more)}">+</button></div></div>`;
  // Niños en la tarjeta: el cliente ve el total con los chicos incluidos antes de abrir la reserva (misma regla de precio por edad que el formulario).
  // Texto corto bajo "Crianças": la regla por edad; en un paquete que combina servicios (cada uno con su regla) solo "precio según la edad".
  const kidHintOn = kidTab ? TR.kidsTab : kidLines.length ? kidLines.join(" · ") : TR.kidsH;
  const qKids = kidsForm
    ? `<div class="gvs-x"><span>${esc(TR.kids)}<small data-q-khint data-on="${esc(kidHintOn)}" data-off="${esc(KP.full)}">${esc(kidHintOn)}</small></span><div><button type="button" data-q-kid="-1" aria-label="${esc(TR.kLess)}" disabled>−</button><output data-q-k>0</output><button type="button" data-q-kid="1" aria-label="${esc(TR.kMore)}">+</button></div></div>${kidTiers.length ? `<div class="gvs-ages" data-q-ages hidden data-l="${esc(JSON.stringify({ age: TR.age, child: TR.child, less1: TR.less1, one: TR.one, n: TR.yrs, ask: TR.askAge }))}"></div>` : ""}`
    : "";
  const qTotal = unitC ? `<p class="gvs-tot" data-q-total${qtyAttr}${kidsForm ? ` data-kid-tiers="${esc(JSON.stringify(kidTiers))}"${scopeAttr}` : ""} data-cur="${esc(curP(baseP))}" data-unit="${unitC}" data-min="${bk.enabled ? bk.min_pax : 1}" data-max="${bk.enabled ? bk.max_pax : 20}"><span>${esc(TR.total)}</span><b></b></p>` : "";
  // Calificación de Google (solo si hay al menos 5 opiniones): junto al título, en la tarjeta de reserva y con los comentarios al final.
  const gR = Number(extra.g?.rating) || 0, gN = Number(extra.g?.count) || 0, gOk = gR >= 1 && gN >= 5;
  const gTxt = gOk ? { n: gR.toFixed(1).replace(".", ","), c: es ? `${gN} opiniones en Google` : `${gN} avaliações no Google` } : null;
  const STAR5 = `<span class="gvg-st" aria-hidden="true">★★★★★</span>`;
  const gLine = gOk ? `<a data-fx="hero" href="#avaliacoes" class="gvg-l">${STAR5}<b>${esc(gTxt.n)}</b><span>· ${esc(gTxt.c)}</span></a>` : "";
  const gCard = gOk ? `<a href="#avaliacoes" class="gvg-c">${STAR5}<span><b>${esc(gTxt.n)}</b> · ${esc(gTxt.c)}</span></a>` : "";
  const gSec = extra.gBlock ? `<section id="avaliacoes" data-fx="up" class="tw-wrap mt-16 scroll-mt-24"><h2 class="m-0 mb-6 font-display text-h3 font-semibold text-ink">${esc(es ? "Quienes viajaron con nosotros" : "Quem viajou com a gente")}</h2>${extra.gBlock}</section>` : "";
  const card = `<div class="gvs" data-q>${ribbon}<div class="gvs-in"><div class="gvs-p">${priceHtml(p, L, true)}${pct ? `<span class="gvs-off">-${pct}%</span>` : ""}</div>${saveLine}${qOpts}${qPax}${qKids}${qTotal}<a href="#pedir" data-bk-open class="tw-btn tw-btn--primary gvs-cta"><span>${esc(TR.book)}</span><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a><ul class="gvs-t">${ticks.map((t) => `<li>${TICK}<span>${esc(t)}</span></li>`).join("")}</ul><p class="gvs-proof">${esc(TR.proof)}</p>${gCard}<a href="${esc(waFor(p))}" data-gv-wa="${esc(p.title)}" target="_blank" rel="noopener" class="gvs-wa">${esc(TR.ask)}</a></div></div>`;
  // Franja de beneficios debajo de la galería: lo que nos diferencia, bien visible antes de leer la ficha.
  const BI = { star: '<path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>', bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>' };
  const benef = [
    isBest && ["star", TR.best, saveBox ? `${TR.box}: ${boxP} · ${TR.save} ${money(saveBox)}` : TR.bestP, true],
    payPix && ["shield", TR.pix, es ? "Pagás en reales, sin sorpresas" : "Você paga em reais, sem surpresas"],
    bk.enabled && ["bolt", TR.inst, es ? "Tu lugar queda reservado al momento" : "Sua vaga fica garantida na hora"],
    ["chat", TR.lang, TR.proof],
  ].filter(Boolean);
  const benefits = `<ul class="gvben">${benef.map(([ic, t, d, hi]) => `<li${hi ? ' class="is-hi"' : ""}><span class="gvben-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="${ic === "star" ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${BI[ic]}</svg></span><span><b>${esc(t)}</b><small>${esc(d)}</small></span></li>`).join("")}</ul>`;
  // Ventana de reserva: en PC se abre centrada sobre la ficha; en el celular, como hoja a pantalla completa (public/assets/ficha.js).
  // Sin JavaScript queda como bloque normal debajo de la tarjeta.
  const modal = `<div data-bk class="gvbk"><div class="gvbk-back" data-bk-close></div><div class="gvbk-panel" role="dialog" aria-modal="true" aria-labelledby="gvbk-t"><div class="gvbk-top"><div class="min-w-0"><p class="gvbk-k">${esc(L.formTitle)}</p><p id="gvbk-t" class="gvbk-t">${esc(p.title)}</p></div><button type="button" data-bk-close class="gvbk-x" aria-label="${esc(TR.close)}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="gvbk-body">${lead}</div></div></div>`;

  const body = `<div class="tw tw-page bg-white">
<link rel="stylesheet" href="/assets/ficha.css?v=5">
<div class="tw-wrap">
${crumb}
<header class="gvh">
${kindOf(p) === "paquete" ? `<p data-fx="hero" class="gvh-k">${esc(K.paquete)}${partsOf(p).length ? ` · ${esc(K.includesN(extra.parts.length || partsOf(p).length))}` : ""}</p>` : ""}
<h1 data-fx="hero" class="gvh-t">${esc(p.title)}</h1>
${p.excerpt ? `<p data-fx="hero" class="gvh-e">${esc(p.excerpt)}</p>` : ""}
${gLine}
${quickRow}
</header>
${F.ga}
${benefits}
<div class="gvcols">
<article class="min-w-0">
${F.top}
${videoBlock(p, "mt-10")}
${optSection}
${F.inc}
${p.content ? `<section data-fx="up" class="mt-16"><h2 class="m-0 mb-6 font-display text-h3 font-semibold text-ink">${esc(L.about)}</h2><div data-more data-more-l="${es ? "Leer más" : "Ler mais"}" data-less-l="${es ? "Leer menos" : "Ler menos"}" class="tw-prose">${sanitizeHtml(p.content)}</div></section>` : ""}
${F.st}${bundle}${opts.length ? "" : F.tb}${F.pl}${F.fq}${inB}
</article>
<aside class="gv-aside lg:sticky lg:top-24">${card}${modal}</aside>
</div>
</div>
${gSec}
${rel}
${bar}
<script src="/assets/ficha.js?v=5" defer></script>
</div>`;
  return renderPage(shellHtml, { env,
    title: pageTitle(SEO.title),
    desc,
    body,
    canonical,
    image: shareImgs[0] || image,
    images: shareImgs,
    imageAlt: p.image_alt || p.title,
    ogType: "website",
    // Píxel de Meta: qué paquete se está viendo (ViewContent) con el mismo id que el catálogo (/meta-catalogo.csv) para los anuncios dinámicos.
    metaExtra: `<script>window.__GVP=${JSON.stringify({ id: p.slug, name: p.title, value: Number(parsePrice(cheapestOption(opts)?.price || p.price)) || 0, currency: priceCurrency(env, cheapestOption(opts)?.price || p.price) }).replace(/</g, "\\u003c")}</script>`,
    ld: ldScript(packageLd(env, p, { url: canonical, desc, image, listing: cat, lang: L.lang, times: timesOf(p).map((r) => r[0]), kind: kindOf(p), options: opts })) + (F.ld ? ldScript(F.ld) : ""),
  });
}

// Catálogo para Meta (anuncios dinámicos / Advantage+ catálogo): todos los paquetes y servicios publicados, en CSV.
// Meta lo descarga una vez por día (Administrador de ventas › Catálogo › Orígenes de datos): los paquetes nuevos entran solos.
async function metaCatalog(env) {
  const list = env.DB ? (await env.DB.prepare("SELECT * FROM packages WHERE published=1 ORDER BY featured DESC, id DESC").all()).results || [] : [];
  const cats = new Map((await listCategories(env.DB, "packages").catch(() => [])).map((c) => [c.slug, c.label]));
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\s+/g, " ").trim()}"`;
  const head = ["id", "title", "description", "availability", "condition", "price", "sale_price", "link", "image_link", "brand", "product_type", "google_product_category", "custom_label_0"];
  const lines = [head.join(",")];
  for (const p of list) {
    const opt = cheapestOption(optionsOf(p));
    const raw = opt ? opt.price : p.price, n = parsePrice(raw);
    if (!n || !p.image) continue; // Meta exige precio e imagen
    const cur = priceCurrency(env, raw), old = parsePrice(p.price_old);
    const price = old && Number(old) > Number(n) ? `${Number(old).toFixed(2)} ${cur}` : `${Number(n).toFixed(2)} ${cur}`;
    const sale = old && Number(old) > Number(n) ? `${Number(n).toFixed(2)} ${cur}` : "";
    const desc = clip(stripTags(p.excerpt || p.content || p.title), 4900) || p.title;
    lines.push([p.slug, clip(p.title, 150), desc, "in stock", "new", price, sale, `${siteUrl(env)}/paquetes/${p.slug}/`, absUrl(env, p.image), BRAND_NAME(env), cats.get(p.category) || p.category, "Arts & Entertainment > Event Tickets", kindOf(p)].map(q).join(","));
  }
  return new Response(lines.join("\n") + "\n", { headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
const BRAND_NAME = (env) => String(env.BRAND_NAME || "Gasparotto Viajes").trim() || "Gasparotto Viajes";

async function sitemap(env) {
  const lastmod = new Map(STATIC_PAGES);
  const bump = (path, d) => {
    d = ymd(d);
    if (d && (!lastmod.get(path) || d > lastmod.get(path))) lastmod.set(path, d);
  };
  const dynamic = [];
  if (env.DB) {
    const read = async (table, cols, extra = "") => {
      try { return (await env.DB.prepare(`SELECT ${cols} FROM ${table} WHERE published=1${extra}`).all()).results; }
      catch { return (await env.DB.prepare(`SELECT ${cols.replace(", updated_at", "")} FROM ${table} WHERE published=1`).all()).results; }
    };
    try {
      const cats = new Map((await listCategories(env.DB)).map((c) => [c.kind + ":" + c.slug, c]));
      const catDate = new Map();
      const note = (kind, slug, d) => { const k = kind + ":" + slug; d = ymd(d); if (d && d > (catDate.get(k) || "")) catDate.set(k, d); };
      for (const r of await read("posts", "slug, category, created_at, updated_at, image", " AND " + LIVE)) {
        const d = r.updated_at || r.created_at;
        dynamic.push({ path: `/blog/${r.slug}/`, lastmod: ymd(d), image: r.image || "" });
        bump("/blog/", d); note("posts", r.category, d);
      }
      for (const r of await read("packages", "slug, category, created_at, updated_at, image")) {
        const d = r.updated_at || r.created_at;
        dynamic.push({ path: `/paquetes/${r.slug}/`, lastmod: ymd(d), image: r.image || "" });
        note("packages", r.category, d);
      }
      // Páginas de categoría: las fijas actualizan su fecha; las nuevas se agregan (solo si tienen contenido)
      for (const [k, d] of catDate) {
        const c = cats.get(k);
        if (!c) continue;
        const path = catPath(c.kind, c);
        if (c.listing) bump(path, d); else dynamic.push({ path, lastmod: d });
      }
      // Nossos clientes: entra al sitemap cuando hay al menos una foto publicada
      try {
        const cl = await env.DB.prepare("SELECT MAX(created_at) lm FROM client_photos WHERE published=1").first();
        if (cl && cl.lm) dynamic.push({ path: CLIENTES_PATH, lastmod: ymd(cl.lm) });
      } catch { /* tabla todavía no creada */ }
      // Autores con perfil público y al menos un artículo publicado
      try {
        const au = (await env.DB.prepare(`SELECT u.slug, (SELECT MAX(COALESCE(NULLIF(p.updated_at,''), p.created_at)) FROM posts p WHERE p.author_id=u.id AND p.published=1 AND ${LIVE.replace(/publish_date/g, "p.publish_date")}) lm FROM users u WHERE u.active=1 AND u.profile_public=1 AND u.slug<>''`).all()).results;
        for (const r of au) if (r.lm) dynamic.push({ path: `/autor/${r.slug}/`, lastmod: ymd(r.lm) });
      } catch { /* sin columnas de autoría todavía */ }
    } catch { /* base aún sin crear: solo páginas estáticas */ }
  }
  const entries = [...lastmod].map(([path, d]) => ({ path, lastmod: d })).sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : 0));
  await addAlternates(env, dynamic);
  return new Response(buildSitemap(env, [...entries, ...dynamic]), {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}


const html = (body, status = 200, env = null) =>
  new Response(env ? injectTheme(body, env, labels(body)) : body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": NO_CACHE } });

const rows = async (env, sql, ...b) => (env.DB ? await env.DB.prepare(sql).bind(...b).all().then((r) => r.results).catch(() => []) : []);

// Página fija: src/pages/fragmentos/<nombre>.astro (Astro) o public/_pages/<nombre>/index.html (1ª línea: <!--{"title","description"}-->)
async function staticPage(env, url, name, status = 200, extra = (b) => b) {
  // Primero el fragmento generado por Astro (src/pages/fragmentos → dist/fragmentos); si no existe, el HTML de public/_pages.
  let r = await env.ASSETS.fetch(new URL(`/fragmentos/${name}/`, url));
  if (!r.ok) r = await env.ASSETS.fetch(new URL(`/_pages/${name}/`, url));
  if (!r.ok) return null;
  let src = fillTokens((await r.text()).replace(/^\s*<!doctype html>\s*/i, "").trimStart(), env);
  const m = src.match(/^<!--(\{.*?\})-->\n?/);
  const meta = m ? JSON.parse(m[1]) : {};
  src = dropMarks(extra(m ? src.slice(m[0].length) : src));
  // Reseñas de Google (API de Places): el bloque reemplaza el marcador <div data-panel="google"> de portada y contacto.
  if (src.includes('data-panel="google"')) src = putPanel(src, "google", await googleBlock(env, (src.match(/data-panel="google"[^>]*data-v="(\w+)"/) || [])[1]));
  const path = new URL(url).pathname;
  const home = path === "/";
  const crumbName = String(meta.title || "").split("|")[0].trim();
  const inicio = langOf(env) === "es" ? "Inicio" : "Início";
  const ld = home
    ? ldScript({ "@context": "https://schema.org", "@graph": [orgLd(env), websiteLd(env)] })
    : status === 200 && crumbName
      ? ldScript({ "@context": "https://schema.org", ...breadcrumbLd(env, [{ name: inicio, path: "/" }, { name: crumbName, path }]) })
      : "";
  return html(renderPage("", { env, title: meta.title || BRAND, desc: meta.description || "", body: src, canonical: status === 200 ? siteUrl(env) + path : undefined, ld }), status, env);
}

function listPage(env, title, desc, path, body, kind, ldObj) {
  const canonical = siteUrl(env) + path;
  const ld = ldScript(ldObj || { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: tr(env).pk, item: canonical }] });
  return html(renderPage("", { env, title: pageTitle(title), desc, body, canonical, ld }), 200, env);
}

// RSS del blog: las 30 entradas más recientes (los lectores de feeds y algunos buscadores lo usan para descubrir contenido nuevo).
async function feed(env) {
  const [list, cats] = await Promise.all([
    rows(env, `SELECT * FROM posts WHERE published=1 AND ${LIVE} ORDER BY COALESCE(NULLIF(publish_date,''),created_at) DESC, id DESC LIMIT 30`),
    listCategories(env.DB, "posts").catch(() => []),
  ]);
  return new Response(rssXml(env, list, new Map(cats.map((c) => [c.slug, c]))), { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=900" } });
}

// Enrutado por idioma. En español solo hay fichas traducidas (/es/paquetes/<slug>/ y /es/blog/<slug>/) y en inglés solo artículos (/en/blog/<slug>/);
// el resto de las páginas en /es/ y /en/ responde 404 para no mezclar portugués en una URL de otro idioma.
const ITEM_RE = /^\/(paquetes|blog)\/([^/]+)\/$/;
const NOT_FOUND_TXT = { es: ["No encontrado", "Esta página no está disponible en español."], en: ["Not found", "This page is not available in English."] };
const langNotFound = (lang) => new Response(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${NOT_FOUND_TXT[lang][0]}</title></head><body><p>${NOT_FOUND_TXT[lang][1]}</p></body></html>`, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": NO_CACHE } });

async function handle(ctx) {
  const url0 = new URL(ctx.request.url);
  const { lang, path: relPath } = splitLang(url0.pathname);
  if (lang === PT) return handlePt({ ...ctx, lang: PT });
  const m = relPath.match(ITEM_RE);
  if (!m || m[1] === "categoria" || m[2] === "categoria") return langNotFound(lang);
  if (lang === EN && m[1] !== "blog") return langNotFound(lang); // el inglés es solo para el blog
  const request = new Request(new URL(relPath + url0.search, url0.origin), ctx.request);
  const res = await handlePt({ ...ctx, request, lang, env: { ...ctx.env, SITE_LANG: lang } });
  return res.status === 200 ? res : langNotFound(lang);
}

async function handlePt(ctx) {
  const { request, env, next, lang: reqLang = PT } = ctx;
  const url = new URL(request.url), path = url.pathname;
  if (path === "/" && url.searchParams.has("p")) {
    const id = (url.searchParams.get("p") || "").replace(/\D/g, "");
    const post = id && (await rows(env, "SELECT slug FROM posts WHERE legacy_id=? AND published=1", id))[0];
    return Response.redirect(url.origin + (post ? `/blog/${post.slug}/` : legacyTarget(id) || SITE.legacyFallback), 301);
  }
  if (path.startsWith("/google-foto/")) return googlePhoto(env, path.slice("/google-foto/".length).replace(/\/$/, ""));
  if (path === "/robots.txt") return new Response(buildRobots(env, isProdHost(env, url)), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
  if (path === "/sitemap.xml") return sitemap(env);
  if (path === "/privacidade/" || path === "/privacidade" || path === "/privacidad/") return privacyPage(env);
  // Enlace corto al perfil de Google (lo usa la IA de WhatsApp para no mandar una URL larga).
  if ((path === "/google" || path === "/google/") && String(env.GOOGLE_PLACE_ID || "").trim()) return Response.redirect(`https://www.google.com/maps/place/?q=place_id:${String(env.GOOGLE_PLACE_ID).trim()}`, 302);
  if (path === "/blog/feed.xml") return feed(env);
  if (path === "/meta-catalogo.csv") return metaCatalog(env);
  if (path.startsWith("/api/") || path.startsWith("/admin") || path === "/mcp" || path.startsWith("/mcp/")) return next();
  const fixed = staticRedirect(path);
  if (fixed) return Response.redirect(url.origin + fixed, 301);
  const tm = path.match(/^\/trip\/([^/]+)\/?$/); // WordPress anterior: /trip/<slug> -> /paquetes/<slug>/
  if (tm) return Response.redirect(url.origin + "/paquetes/" + (tm[1] === "tango-porte" ? "tango-porteno" : tm[1]) + "/", 301);
  // Sin barra final: /blog, /paquetes, /reservas y los listados fijos redirigen a su versión con barra (antes daban 404).
  if (path.length > 1 && !path.endsWith("/") && !path.includes(".")) {
    const slashed = path + "/";
    if (/^\/(blog|paquetes|servicios)$/.test(path) || SITE.pages[slashed] || SITE.listings.some((l) => l.listing === slashed)) return Response.redirect(url.origin + slashed + url.search, 301);
  }
  if (path.startsWith("/_pages") || path.startsWith("/fragmentos")) return new Response("Not found", { status: 404 });
  if (path.startsWith("/media/")) {
    if (!env.IMAGES) return new Response("Not found", { status: 404 });
    let key; try { key = decodeURIComponent(path.slice(7)); } catch { return new Response("Not found", { status: 404 }); }
    const wantsRange = /^bytes=/i.test(request.headers.get("range") || "");
    let obj;
    try { obj = await env.IMAGES.get(key, wantsRange ? { range: request.headers } : undefined); }
    catch { obj = await env.IMAGES.get(key); } // Range mal formado: se entrega el archivo completo en vez de un error
    if (!obj) return new Response("Not found", { status: 404 });
    const mh = { "content-type": obj.httpMetadata?.contentType || "application/octet-stream", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff", "accept-ranges": "bytes" };
    if (wantsRange && obj.range && obj.range.offset !== undefined) {
      const off = obj.range.offset, len = obj.range.length ?? obj.size - off;
      mh["content-range"] = `bytes ${off}-${off + len - 1}/${obj.size}`; mh["content-length"] = String(len);
      return new Response(obj.body, { status: 206, headers: mh });
    }
    mh["content-length"] = String(obj.size);
    return new Response(obj.body, { headers: mh });
  }
  if (/^\/(blog|paquetes)\/(categoria\/)?[^/.]+$/.test(path) || /^\/blog\/(categoria\/[^/.]+\/)?pagina\/\d+$/.test(path)) return Response.redirect(url.origin + path + "/" + url.search, 301);
  const last = path.split("/").pop();
  if (!(path.endsWith("/") || !last.includes("."))) return next();

  const L = labels(stubShell(env));
  const wa = (p) => waLink(env, p.title, L.waTitle);
  const cats = await listCategories(env.DB).catch(() => []);
  // Conteo por categoría: se guarda 60 s (recorre toda la tabla de notas; sin esto se repetía en cada visita).
  const counts = env.DB ? await memoize("counts", 60e3, () => liveCounts(env.DB), (v) => v.size > 0) : new Map();
  const catMap = new Map(cats.filter((x) => x.kind === "posts").map((x) => [x.slug, x]));
  const pkgChips = (cur, active) => chipsRow(toChips("packages", publicCats(cats, counts, "packages", cur)), active);

  // Portada
  if (path === "/") {
    // Destacados ordenados por demanda real: consultas de los últimos 60 días (formulario y WhatsApp).
    // Favoritos: primero los que se ordenaron a mano en el panel (home_order), después por demanda. Si la columna todavía no existe, se usa solo la demanda.
    const demandSql = "SELECT p.*, (SELECT COUNT(*) FROM leads l WHERE l.package_title = p.title AND l.created_at >= date('now', '-60 days')) AS demand FROM packages p WHERE p.published=1 AND p.featured=1 ORDER BY ";
    // Paquetes favoritos y últimas notas: se guardan 60 s (misma lectura para todas las visitas).
    const { pk, ps } = await memoize("home", 60e3, async () => {
      let pk = await rows(env, demandSql + "(p.home_order = 0), p.home_order, demand DESC, p.created_at DESC, p.id DESC LIMIT 3");
      if (!pk.length) pk = await rows(env, demandSql + "demand DESC, p.created_at DESC, p.id DESC LIMIT 3");
      if (!pk.length) pk = await rows(env, "SELECT * FROM packages WHERE published=1 AND featured=1 ORDER BY created_at DESC, id DESC LIMIT 3");
      // Blog en la portada: siempre las 3 últimas notas (las destacadas van primero).
      const ps = await rows(env, `SELECT * FROM posts WHERE published=1 AND ${LIVE} ORDER BY featured DESC, COALESCE(NULLIF(publish_date,''),created_at) DESC, id DESC LIMIT 3`);
      return { pk, ps };
    }, (v) => v.pk.length > 0 || v.ps.length > 0);
    // A/B del botón principal: la variante se fija con cookie (así la misma persona siempre ve lo mismo).
    const cur = (request.headers.get("cookie") || "").match(/gv_ab=([ab])/)?.[1];
    const v = cur || (Math.random() < 0.5 ? "a" : "b");
    ctx.ab = v;
    const blogHead = `<div data-fx="up" class="mb-12 flex flex-wrap items-end justify-between gap-x-8 gap-y-3"><h2 class="m-0 font-display text-h2 font-semibold text-ink">${esc(tr(env).blog)}</h2><a href="/blog/" class="tw-link font-semibold text-primary">${esc(L.lang === "es" ? "Ver todo el blog" : "Ver todo o blog")}</a></div>`;
    // Fotos de clientes (franja "Nossos clientes"): también se guardan 60 s; al subir o borrar una foto se limpia la caché.
    const fotos = await memoize("clientes", 60e3, () => rows(env, PHOTOS_SQL + " LIMIT 8"), () => true);
    const r = await staticPage(env, url, "home", 200, (b) => putPanel(putPanel(putPanel(b, "clientes", clientesStrip(fotos, L.lang)), "featured", pk.length ? pkgSection(pk, "", wa, L, "") : `<p class="m-0 text-lg text-mute">${esc(L.empty)}</p>`), "posts", ps.length ? `<section class="tw tw-section bg-white"><div class="tw-wrap">${blogHead}<div class="${CARD_GRID}">${ps.map((p) => postCardHtml(p, catMap.get(p.category))).join("")}</div></div></section>` : "")
      .replaceAll("{{AB_CTA}}", AB_CTA[v]).replaceAll("{{AB}}", v));
    if (!r) return next();
    if (!cur) r.headers.append("set-cookie", `gv_ab=${v}; Path=/; Max-Age=2592000; SameSite=Lax`);
    r.headers.append("vary", "Cookie");
    return r;
  }
  // Nossos clientes: galería de fotos de clientes (se cargan en el panel → Nuestros clientes).
  if (path === CLIENTES_PATH) {
    const fotos = await rows(env, PHOTOS_SQL + " LIMIT 600");
    const t = clientesText(L.lang), canonical = siteUrl(env) + CLIENTES_PATH;
    const ld = ldScript({ "@context": "https://schema.org", ...breadcrumbLd(env, [{ name: L.lang === "es" ? "Inicio" : "Início", path: "/" }, { name: t.title, path: CLIENTES_PATH }]) });
    return html(renderPage("", { env, title: pageTitle(t.title), desc: t.desc, body: clientesBody(fotos, L.lang), canonical, ld, ...(fotos.length ? {} : { robots: "noindex,follow" }) }), 200, env);
  }
  // Páginas fijas
  const fixedPage = Object.entries(SITE.pages).find(([k]) => k === path);
  // Traslados: la página fija muestra, si existen, los paquetes/servicios publicados que son traslados (por título, categoría o subcategoría).
  if (fixedPage && fixedPage[1] === "traslados") {
    const isTransfer = (x) => /trasl|transfer/i.test(`${x.title} ${x.category} ${x.subcategory || ""}`);
    const list = (await rows(env, "SELECT * FROM packages WHERE published=1 ORDER BY featured DESC, created_at DESC, id DESC")).filter(isTransfer);
    const block = list.length ? `<section class="tw tw-section bg-white"><div class="tw-wrap"><h2 data-fx="up" class="m-0 mb-12 font-display text-h2 font-semibold text-ink">${esc(L.lang === "es" ? "Traslados disponibles" : "Traslados disponíveis")}</h2>${pkgSection(list, "", wa, L, "")}</div></section>` : "";
    return (await staticPage(env, url, "traslados", 200, (b) => putPanel(b, "traslados", block))) || next();
  }
  if (fixedPage) return (await staticPage(env, url, fixedPage[1])) || next();

  if (env.DB) {
    // Servicios: todo lo que se vende solo (lo que no es un paquete). Un paquete combina varios de estos servicios.
    if (path === "/servicios/") {
      const every = await rows(env, "SELECT * FROM packages WHERE published=1 ORDER BY featured DESC, created_at DESC, id DESC");
      const all = every.filter((x) => kindOf(x) !== "paquete"), hasBundles = every.some((x) => kindOf(x) === "paquete");
      const es = L.lang === "es", T = tr(env);
      const svcCats = [...new Set(all.map((x) => x.category))].map((sl) => cats.find((c) => c.kind === "packages" && c.slug === sl)).filter(Boolean);
      const want = url.searchParams.get("categoria") || "", active = svcCats.some((c) => c.slug === want) ? want : "";
      const list = active ? all.filter((x) => x.category === active) : all;
      const chips = chipsRow([{ label: L.all, path: "/servicios/" }, ...svcCats.map((c) => ({ label: c.label, path: `/servicios/?categoria=${c.slug}` }))], active ? `/servicios/?categoria=${active}` : "/servicios/");
      const lead = es ? "Cada servicio se reserva por separado, con su propio precio. ¿Preferís todo resuelto? Mirá los paquetes." : "Cada serviço é reservado separadamente, com preço próprio. Prefere tudo resolvido? Veja os pacotes.";
      const banner = hasBundles
        ? `<aside class="mt-16 flex flex-wrap items-center justify-between gap-5 rounded-xl bg-mist p-6 sm:p-8"><div><p class="m-0 font-display text-xl font-semibold text-ink">${es ? "¿Preferís todo resuelto?" : "Prefere tudo resolvido?"}</p><p class="m-0 mt-1 text-mute">${es ? "Los paquetes combinan varios servicios en una sola reserva." : "Os pacotes combinam vários serviços em uma só reserva."}</p></div><a href="/paquetes/?tipo=paquete" class="tw-btn tw-btn--primary"><span>${esc(es ? "Ver paquetes" : "Ver pacotes")}</span></a></aside>`
        : "";
      const canonical = siteUrl(env) + path;
      const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: T.sv, item: canonical }] };
      return listPage(env, T.sv, lead, path, listShell(T.sv, lead, `${pkgSection(list, chips + filterBar(list.length, L.lang), wa, L, "")}${banner}`), "servicios", ld);
    }
    // Paquetes: todos, por categoría (incluye los listados fijos de site.js) y ficha
    if (path === "/paquetes/" || SITE.listings.some((l) => l.listing === path) || /^\/paquetes\/categoria\/[^/]+\/$/.test(path)) {
      const c = path === "/paquetes/" ? null : cats.find((x) => x.kind === "packages" && (x.listing === path || path === `/paquetes/categoria/${x.slug}/`));
      // Categoría que ya no existe (borrada o renombrada): nunca un 404. Si el panel dejó una redirección (borrar/renombrar la crea),
      // se usa esa (301); si no, se lleva a la lista de todos los paquetes (302). Así los enlaces fijos, como los de la portada, no se rompen.
      if (path !== "/paquetes/" && !c) {
        const rd = (await rows(env, "SELECT to_path FROM redirects WHERE from_path=?", path))[0];
        return Response.redirect(url.origin + (rd ? rd.to_path : "/paquetes/"), rd ? 301 : 302);
      }
      if (c && c.listing && path !== c.listing) return Response.redirect(url.origin + c.listing, 301);
      const every = await rows(env, c ? "SELECT * FROM packages WHERE published=1 AND category=? ORDER BY featured DESC, created_at DESC, id DESC" : "SELECT * FROM packages WHERE published=1 ORDER BY featured DESC, created_at DESC, id DESC", ...(c ? [c.slug] : []));
      // ?tipo=paquete | servicio filtra el listado (los paquetes combinan varios servicios; los servicios se venden solos).
      const tipo = ["paquete", "servicio"].includes(url.searchParams.get("tipo")) ? url.searchParams.get("tipo") : "";
      // Subcategorías de la categoría (solo las que tienen algo publicado): segunda fila de botones y filtro ?sub=.
      const subs = c ? (await rows(env, "SELECT * FROM subcategories WHERE parent=? ORDER BY sort_order, id", c.slug)).filter((sc) => every.some((x) => x.subcategory === sc.slug)) : [];
      const subWant = url.searchParams.get("sub") || "", subOn = subs.some((sc) => sc.slug === subWant) ? subWant : "";
      const subChips = subs.length ? chipsRow([{ label: L.all, path }, ...subs.map((sc) => ({ label: sc.label, path: `${path}?sub=${encodeURIComponent(sc.slug)}` }))], subOn ? `${path}?sub=${encodeURIComponent(subOn)}` : path).replace('aria-label="Categorías"', `aria-label="${esc(c.label)}" data-subcats`) : "";
      const byKind = tipo ? every.filter((x) => (tipo === "paquete" ? kindOf(x) === "paquete" : kindOf(x) !== "paquete")) : every;
      const list = subOn ? byKind.filter((x) => x.subcategory === subOn) : byKind;
      const kinds = new Set(every.map((x) => (kindOf(x) === "paquete" ? "paquete" : "servicio")));
      // Sin categoría: "Passeios e pacotes" (lista todo); con ?tipo=paquete, "Pacotes". Antes decía "Pacotes" y mostraba servicios sueltos.
      const label = c ? c.label : tipo === "paquete" ? tr(env).pk : tr(env).all || tr(env).pk;
      return listPage(env, label, c?.description || `${label} | ${BRAND}`, path, listShell(label, c?.description, `${kindSwitch(path, kinds, tipo, L)}${pkgSection(list, pkgChips(c?.slug || "", path) + subChips + filterBar(list.length, L.lang), wa, L, "")}${c && !tipo ? compareTable(list, L) : ""}`));
    }
    // Buscador del blog: /blog/buscar/?q=… (no se indexa y no entra al caché de páginas, que no distingue el ?q=).
    if (path === "/blog/buscar/") {
      const T = blogText(env), q = (url.searchParams.get("q") || "").replace(/\s+/g, " ").trim().slice(0, 80);
      const list = q ? await searchPosts(env, q) : [];
      const tabs = publicCats(cats, counts, "posts", "").map((x) => ({ label: x.label, path: `/blog/categoria/${x.slug}/` }));
      const body = searchBody(env, { q, list, catMap, tabs, wa: waUrl(env, "Hola, quiero consultar por sus experiencias") });
      return html(renderPage("", { env, title: pageTitle(q ? `${T.searchT(q)} | Blog` : T.searchTitle), desc: T.searchLead, body, canonical: siteUrl(env) + path, robots: "noindex,follow" }), 200, env);
    }
    const pm = path.match(/^\/paquetes\/([^/]+)\/$/), bm = path.match(/^\/blog\/([^/]+)\/$/);
    for (const [m, table, render] of [[pm, "packages", packagePage], [bm, "posts", postPage]]) {
      if (!m || m[1] === "categoria") continue;
      const hit = await itemForLang(env.DB, table, table, m[1], reqLang);
      const p = hit?.p;
      if (p) {
        const cat = (await rows(env, "SELECT * FROM categories WHERE kind=? AND slug=?", table, p.category))[0];
        const isPost = table === "posts";
        if (isPost) Object.assign(p, await peopleFor(env.DB, p));
        // En inglés no se muestran paquetes ni notas relacionadas: solo existen en portugués y español, y quedarían títulos en otro idioma dentro de la página.
        const noExtras = reqLang === EN;
        const blogPkgs = isPost && !noExtras ? await rows(env, "SELECT * FROM packages WHERE published=1 ORDER BY featured DESC, created_at DESC, id DESC LIMIT 3") : [];
        let extra;
        if (!isPost) {
          // Paquete → sus servicios (en el orden elegido). Servicio → los paquetes que lo incluyen.
          const slugs = partsOf(p).filter((x) => x !== p.slug).slice(0, 12);
          const got = slugs.length ? await rows(env, `SELECT * FROM packages WHERE published=1 AND slug IN (${slugs.map(() => "?").join(",")})`, ...slugs) : [];
          const bySlug = new Map(got.map((x) => [x.slug, x]));
          const inBundles = (await rows(env, "SELECT * FROM packages WHERE published=1 AND slug != ? AND meta LIKE ? ORDER BY featured DESC, created_at DESC, id DESC LIMIT 12", p.slug, `%"${p.slug}"%`)).filter((x) => partsOf(x).includes(p.slug)).slice(0, 3);
          // Subcategoría (si la tiene): aparece en la ruta de navegación y lleva al listado filtrado.
          const sub = p.subcategory ? (await rows(env, "SELECT * FROM subcategories WHERE parent=? AND slug=?", p.category, p.subcategory))[0] || null : null;
          // Paquete que combina servicios: itinerario completo (incluye servicios no publicados) y precio automático para el desglose.
          const items = isBundle(p) ? bundleItems(p, await loadParts(env.DB, p)) : [];
          // Reseñas de Google en la ficha: la calificación arriba (junto al título y en la tarjeta) y los comentarios al final.
          const g = await placesData(env).catch(() => null);
          const gBlock = await googleBlock(env, "quotes").catch(() => "");
          extra = { parts: slugs.map((x) => bySlug.get(x)).filter(Boolean), inBundles, sub, items, quote: items.length ? bundleQuote(p, items) : null, g, gBlock };
        } else if (reqLang === PT) extra = { adj: await adjacentFor(env, p) }; // anterior / siguiente (los títulos están en portugués: no se muestran en /es/ ni /en/)
        return itemResponse(env, reqLang, hit, table, html(render(env, stubShell(env), p, isPost ? (noExtras ? [] : await relatedFor(env, p)) : await relatedPkgsFor(env, p, [...extra.parts, ...extra.inBundles].map((x) => x.slug)), cat, blogPkgs, catMap, extra), 200, env));
      }
      const rd = (await rows(env, "SELECT to_path FROM redirects WHERE from_path=?", path))[0];
      if (rd) return Response.redirect(url.origin + rd.to_path, 301);
      return notFound(env, url);
    }
    // Autor: /autor/<slug>/ (solo perfiles públicos)
    const am = path.match(/^\/autor\/([^/]+)\/$/);
    if (am) {
      const a = await authorBySlug(env.DB, am[1]);
      if (!a) return notFound(env, url);
      const posts = await rows(env, `SELECT id,slug,title,excerpt,image,image_alt,category,publish_date,created_at,read_mins,CASE WHEN read_mins>0 THEN 0 ELSE LENGTH(content) END AS content_len FROM posts WHERE published=1 AND author_id=? AND ${LIVE} ORDER BY COALESCE(NULLIF(publish_date,''),created_at) DESC, id DESC LIMIT 30`, a.id);
      const canonical = siteUrl(env) + path, T = blogText(env);
      const ld = { "@context": "https://schema.org", "@graph": [
        { "@type": "ProfilePage", "@id": canonical + "#page", url: canonical, name: a.name, mainEntity: personLd(env, a) },
        breadcrumbLd(env, [{ name: T.home, path: "/" }, { name: a.name, path }]),
      ] };
      return html(renderPage("", { env, title: pageTitle(`${a.name}${a.headline ? " · " + a.headline : ""}`), desc: clip(a.bio || a.headline || a.name, 155), body: authorBody(env, { a, posts, catMap }), canonical, image: a.avatar ? absUrl(env, a.avatar) : "", ld: ldScript(ld) }), 200, env);
    }
    // Blog: índice y categorías
    const bc = path.match(/^\/blog\/categoria\/([^/]+)\/(?:pagina\/(\d+)\/)?$/);
    const bp = path.match(/^\/blog\/pagina\/(\d+)\/$/);
    if (path === "/blog/" || bc || bp) {
      const c = bc && cats.find((x) => x.kind === "posts" && x.slug === bc[1]);
      if (bc && !c) {
        const rd = (await rows(env, "SELECT to_path FROM redirects WHERE from_path=?", path))[0];
        return rd ? Response.redirect(url.origin + rd.to_path, 301) : notFound(env, url);
      }
      const base = c ? `/blog/categoria/${c.slug}/` : "/blog/";
      const page = Number((bc ? bc[2] : bp && bp[1]) || 1);
      // /pagina/1/ es la misma lista que la base: se redirige para no duplicar contenido.
      if (page === 1 && (bc ? bc[2] : bp)) return Response.redirect(url.origin + base, 301);
      // Total de notas (para la paginación): se cuenta aparte y sin traer filas. Se reutiliza `counts` (ya calculado arriba);
      // si por algún motivo no estuviera, se cuenta con una consulta chica.
      let total = 0;
      for (const [k, n] of counts) if (k.startsWith("posts:") && (!c || k === "posts:" + c.slug)) total += n;
      if (!total && env.DB) total = Number((await rows(env, `SELECT COUNT(*) n FROM posts WHERE published=1 AND ${LIVE}${c ? " AND category=?" : ""}`, ...(c ? [c.slug] : [])))[0]?.n) || 0;
      const pages = Math.max(1, Math.ceil(total / BLOG_PER_PAGE));
      if (page > pages) return notFound(env, url);
      // Solo las 10 de esta página y sin el texto completo (read_mins trae los minutos exactos; content_len solo se calcula para entradas viejas que aún no lo tienen).
      const list = await rows(env, `SELECT id,slug,title,excerpt,image,image_alt,category,publish_date,created_at,read_mins,CASE WHEN read_mins>0 THEN 0 ELSE LENGTH(content) END AS content_len FROM posts WHERE published=1 AND ${LIVE}${c ? " AND category=?" : ""} ORDER BY COALESCE(NULLIF(publish_date,''),created_at) DESC, id DESC LIMIT ? OFFSET ?`, ...(c ? [c.slug] : []), BLOG_PER_PAGE, (page - 1) * BLOG_PER_PAGE);
      if (page > 1 && !list.length) return notFound(env, url); // el conteo guardado puede estar unos segundos desactualizado
      const tabs = publicCats(cats, counts, "posts", c?.slug || "").map((x) => ({ label: x.label, path: `/blog/categoria/${x.slug}/` }));
      const T = blogText(env), lang = langOf(env), canonical = siteUrl(env) + path;
      const pageTag = page > 1 ? ` | ${T.page} ${page}` : "";
      const title = (c ? `${c.label} | Blog` : T.title) + pageTag, desc = c?.description || (c ? `${c.label} | ${BRAND}` : T.desc);
      const ld = blogIndexLd(env, { url: canonical, title, desc, lang, posts: list, crumbs: [{ name: "Blog", path: "/blog/" }, ...(c ? [{ name: c.label, path: base }] : []), ...(page > 1 ? [{ name: `${T.page} ${page}`, path }] : [])] });
      return listPage(env, title, desc, path, blogIndexBody(env, { list, cat: c || null, catMap, tabs, active: base, wa: waUrl(env, "Hola, quiero consultar por sus experiencias"), page, pages, base, total }), "blog", ld);
    }
  }
  return notFound(env, url);
}

// Ficha publicada: si tiene traducciones, la página lleva hreflang hacia todas las versiones (portugués, español, inglés).
// En español e inglés además se cambian las URLs de la versión portuguesa (canonical, og:url, JSON-LD) por las del idioma de la página.
async function itemResponse(env, lang, hit, table, res) {
  const ptPath = itemPath(table, hit.base.slug);
  const live = await liveTranslations(env.DB, table, hit.base.id);
  if (!live.length) return res;
  const alts = [{ lang: PT, path: ptPath }, ...live.map((t) => ({ lang: t.lang, path: langPathOf(t.lang, itemPath(table, t.slug)) }))];
  let body = await res.text();
  const own = lang === PT ? null : alts.find((a) => a.lang === lang);
  if (own) body = localizeUrls(body, siteUrl(env), ptPath, own.path);
  body = addToHead(body, alternateLinks(siteUrl(env), alts));
  return new Response(body, res);
}

// Sitemap: las fichas con traducción salen en todas sus versiones, con sus alternativas (xhtml:link).
async function addAlternates(env, dynamic) {
  if (!env.DB) return;
  const trs = await rows(env,
    "SELECT 'packages' AS kind, p.id AS id, p.slug AS pt, t.slug AS slug, t.lang AS lang FROM translations t JOIN packages p ON p.id = t.ref_id WHERE t.kind='packages' AND t.status='publicada' AND p.published=1 UNION ALL SELECT 'posts', p.id, p.slug, t.slug, t.lang FROM translations t JOIN posts p ON p.id = t.ref_id WHERE t.kind='posts' AND t.status='publicada' AND p.published=1");
  const groups = new Map();
  for (const x of trs) {
    if (x.lang === EN && x.kind !== "posts") continue; // el inglés es solo del blog
    const k = x.kind + ":" + x.id;
    if (!groups.has(k)) groups.set(k, { kind: x.kind, pt: x.pt, list: [] });
    groups.get(k).list.push({ lang: x.lang, path: langPathOf(x.lang, itemPath(x.kind, x.slug)) });
  }
  for (const g of groups.values()) {
    const ptP = itemPath(g.kind, g.pt);
    const pt = dynamic.find((e) => e.path === ptP);
    if (!pt) continue; // la versión portuguesa no está publicada (o no entra en el sitemap): no se anuncian las traducciones
    const alts = [{ lang: PT, path: ptP }, ...g.list];
    pt.alts = alts;
    for (const t of g.list) dynamic.push({ path: t.path, lastmod: pt.lastmod, image: pt.image, alts });
  }
}

async function notFound(env, url) {
  return (await staticPage(env, url, "404", 404)) || new Response("Not found", { status: 404 });
}

// Ofertas vencidas: como mucho una vez por minuto (por instancia) se reponen los precios de antes y se limpia la caché de esas páginas.
let offersAt = 0;
async function offersTick(env, origin) {
  if (Date.now() - offersAt < 60e3) return;
  offersAt = Date.now();
  try { const paths = await restoreExpired(env.DB); if (paths.length) await purge(origin, ["/", "/paquetes/", "/servicios/", ...paths]); } catch { /* sin base todavía */ }
}

export async function onRequest(ctx) {
  initBrand(ctx.env, new URL(ctx.request.url).origin);
  initLayout(ctx.env);
  const url0 = new URL(ctx.request.url);
  await offersTick(ctx.env, url0.origin);
  // Páginas públicas de contenido: si hay copia reciente (60 s) se sirve sin tocar D1; si no, se arma y se guarda.
  // El caché se arma por ruta e ignora el ?query: las páginas con query (buscador, ?categoria=, ?tipo=) se arman siempre.
  const edge = ctx.request.method === "GET" && EDGE_RE.test(url0.pathname) && !url0.search;
  let res = edge ? await edgeGet(url0) : null;
  if (res) { res = new Response(res.body, res); res.headers.set("cache-control", NO_CACHE); res.headers.set("x-edge-cache", "HIT"); }
  else {
    res = await handle(ctx);
    if (edge && res.status === 200) { const job = edgePut(url0, res); if (ctx.waitUntil) ctx.waitUntil(job); else await job; }
  }
  if (ctx.request.method === "GET" && res.status === 200) {
    const p = new URL(ctx.request.url).pathname;
    if (p === "/" || VIEW_RE.test(p)) {
      const job = recordView(ctx.env, ctx.request, p, p === "/" ? ctx.ab : "");
      if (ctx.waitUntil) ctx.waitUntil(job);
    }
  }
  if (isProdHost(ctx.env, new URL(ctx.request.url))) return res;
  const out = new Response(res.body, res);
  out.headers.set("x-robots-tag", "noindex, nofollow");
  return out;
}

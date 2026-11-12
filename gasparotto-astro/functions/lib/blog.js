// Blog editorial: índice (nota destacada + grilla), artículo (cabecera, índice lateral, cuerpo, autor, experiencias, lectura relacionada) y RSS.
// Solo arma HTML: las consultas a la base y las rutas viven en functions/_middleware.js. Estilos: src/styles/tw.css (.tw-prose--post, .tw-toc, .tw-icon-btn).
import { videoBlock, esc, chipsRow, CARD_GRID, WA_ICON, pkgCard } from "./html.js";
import { LOGO, BRAND, siteUrl, sanitizeHtml } from "./seo.js";
import { postCardHtml, stripTags, readMins, postDay, fmtDate, waUrl, langOf } from "./render.js";

// Textos editables (voseo rioplatense / portugués de Brasil). Cambiar acá cambia el blog entero.
const TXT = {
  es: {
    kicker: "Blog", h1: "Guías para viajar a Buenos Aires y Argentina", lead: "Itinerarios, consejos y planes de quienes recorremos la ciudad todos los días.",
    title: "Blog de viajes a Buenos Aires: guías, consejos y planes", desc: "Guías, itinerarios y consejos para viajar a Buenos Aires y Argentina, escritos por el equipo de una agencia de viajes que recorre la ciudad todos los días.",
    all: "Todo", page: "Página", pagerLabel: "Paginación del blog", prev: "Anterior", next: "Siguiente", latest: "Últimas notas", articles: (n) => (n === 1 ? "1 artículo" : `${n} artículos`), read: "Leer artículo", min: "min de lectura",
    home: "Inicio", team: "Equipo", teamRole: "Agencia de viajes en Buenos Aires", published: "Publicado el", updated: "Actualizado el",
    toc: "En este artículo", share: "Compartir", copy: "Copiar enlace", copied: "¡Enlace copiado!", shareOn: "Compartir en",
    aboutT: "Escrito por el equipo de", aboutP: "Somos una agencia de viajes de Buenos Aires. Armamos experiencias a medida y escribimos estas guías con lo que vemos todos los días con los viajeros.", aboutL: "Conocé al equipo",
    expT: "Para vivir lo que leíste", expP: "Experiencias reservables con atención personalizada por WhatsApp.", expAll: "Ver todos los paquetes",
    moreT: "Seguí leyendo", back: "← Volver al blog",
    searchLabel: "Buscar en el blog", searchPh: "Buscá una guía, un destino, un consejo…", searchBtn: "Buscar", searchT: (q) => `Resultados para “${q}”`, searchTitle: "Buscar en el blog", searchLead: "Encontrá guías, itinerarios y consejos por tema o destino.", searchCount: (n) => (n === 1 ? "1 resultado" : `${n} resultados`), searchNone: "No encontramos artículos con esa búsqueda. Probá con otra palabra o explorá por categoría.", searchEmpty: "Escribí una palabra para buscar.", searchTop: "Seguí explorando", olderPost: "Artículo anterior", newerPost: "Artículo siguiente",
    by: "Por", reviewedBy: "Revisado por", sourcesT: "Fuentes y referencias", authorKicker: "Autor", authorExp: "Experiencia", authorLinks: "En la web", authorPosts: (n) => `Artículos de ${n}`, authorMore: "Ver perfil y artículos", authorNone: "Todavía no publicó artículos.",
    ctaT: "¿Querés vivir Buenos Aires con nosotros?", ctaP: "Contanos tus fechas y cuántos viajan. Te armamos una propuesta a tu medida.", ctaWa: "Consultar por WhatsApp", ctaPk: "Ver paquetes",
    miniT: "¿Planeando tu viaje?", miniP: "Te ayudamos a armarlo por WhatsApp.", empty: "Todavía no hay contenido en esta categoría.", crumbs: "Ruta de navegación", cats: "Categorías",
    waMsg: (t) => `Hola, leí el artículo "${t}" y quiero consultar`, shareMsg: (t) => t, rssT: "Blog",
    catLabels: { "tips-de-viaje": "Consejos de viaje", "noche-portena": "Noche porteña" },
  },
  en: {
    kicker: "Blog", h1: "Guides for traveling to Buenos Aires and Argentina", lead: "Itineraries, tips and plans from people who walk the city every day.",
    title: "Buenos Aires travel blog: guides, tips and plans", desc: "Guides, itineraries and tips for traveling to Buenos Aires and Argentina, written by the team of a travel agency that explores the city every day.",
    all: "All", page: "Page", pagerLabel: "Blog pagination", prev: "Previous", next: "Next", latest: "Latest posts", articles: (n) => (n === 1 ? "1 article" : `${n} articles`), read: "Read article", min: "min read",
    home: "Home", team: "Team", teamRole: "Travel agency in Buenos Aires", published: "Published on", updated: "Updated on",
    toc: "In this article", share: "Share", copy: "Copy link", copied: "Link copied!", shareOn: "Share on",
    aboutT: "Written by the team at", aboutP: "We are a travel agency based in Buenos Aires. We build tailor-made experiences and write these guides from what we see every day with travelers.", aboutL: "Meet the team",
    expT: "Live what you just read", expP: "Bookable experiences with personal support on WhatsApp.", expAll: "See all packages",
    moreT: "Keep reading", back: "← Back to the blog",
    searchLabel: "Search the blog", searchPh: "Search a guide, a destination, a tip…", searchBtn: "Search", searchT: (q) => `Results for “${q}”`, searchTitle: "Search the blog", searchLead: "Find guides, itineraries and tips by topic or destination.", searchCount: (n) => (n === 1 ? "1 result" : `${n} results`), searchNone: "We could not find articles for that search. Try another word or browse by category.", searchEmpty: "Type a word to search.", searchTop: "Keep exploring", olderPost: "Older article", newerPost: "Newer article",
    by: "By", reviewedBy: "Reviewed by", sourcesT: "Sources and references", authorKicker: "Author", authorExp: "Experience", authorLinks: "On the web", authorPosts: (n) => `Articles by ${n}`, authorMore: "View profile and articles", authorNone: "No articles published yet.",
    ctaT: "Want to experience Buenos Aires with us?", ctaP: "Tell us your dates and how many people are traveling. We will put together a proposal tailored to you.", ctaWa: "Message us on WhatsApp", ctaPk: "See packages",
    miniT: "Planning your trip?", miniP: "We can help you plan it on WhatsApp.", empty: "There is no content in this category yet.", crumbs: "Breadcrumb", cats: "Categories",
    waMsg: (t) => `Hi, I read the article "${t}" and I would like to ask about it`, shareMsg: (t) => t, rssT: "Blog",
    // Etiquetas de categorías del sitio (las cargadas desde el panel están en portugués): se usan en las páginas traducidas.
    catLabels: { "tips-de-viaje": "Travel tips", "noche-portena": "Buenos Aires nights" },
  },
  "pt-BR": {
    kicker: "Blog", h1: "Guias para viajar a Buenos Aires e Argentina", lead: "Roteiros, dicas e planos de quem percorre a cidade todos os dias.",
    title: "Blog de viagem a Buenos Aires: guias, dicas e roteiros", desc: "Guias, roteiros e dicas para viajar a Buenos Aires e Argentina, escritos pela equipe de uma agência de viagens que percorre a cidade todos os dias.",
    all: "Tudo", page: "Página", pagerLabel: "Paginação do blog", prev: "Anterior", next: "Próxima", latest: "Últimos artigos", articles: (n) => (n === 1 ? "1 artigo" : `${n} artigos`), read: "Ler artigo", min: "min de leitura",
    home: "Início", team: "Equipe", teamRole: "Agência de viagens em Buenos Aires", published: "Publicado em", updated: "Atualizado em",
    toc: "Neste artigo", share: "Compartilhar", copy: "Copiar link", copied: "Link copiado!", shareOn: "Compartilhar no",
    aboutT: "Escrito pela equipe da", aboutP: "Somos uma agência de viagens de Buenos Aires. Montamos experiências sob medida e escrevemos estes guias com o que vemos todos os dias com os viajantes.", aboutL: "Conheça a equipe",
    expT: "Para viver o que você leu", expP: "Experiências reserváveis com atendimento personalizado pelo WhatsApp.", expAll: "Ver todos os pacotes",
    moreT: "Continue lendo", back: "← Voltar ao blog",
    searchLabel: "Buscar no blog", searchPh: "Busque um guia, um destino, uma dica…", searchBtn: "Buscar", searchT: (q) => `Resultados para “${q}”`, searchTitle: "Buscar no blog", searchLead: "Encontre guias, roteiros e dicas por tema ou destino.", searchCount: (n) => (n === 1 ? "1 resultado" : `${n} resultados`), searchNone: "Não encontramos artigos para essa busca. Tente outra palavra ou explore por categoria.", searchEmpty: "Digite uma palavra para buscar.", searchTop: "Continue explorando", olderPost: "Artigo anterior", newerPost: "Próximo artigo",
    by: "Por", reviewedBy: "Revisado por", sourcesT: "Fontes e referências", authorKicker: "Autor", authorExp: "Experiência", authorLinks: "Na web", authorPosts: (n) => `Artigos de ${n}`, authorMore: "Ver perfil e artigos", authorNone: "Ainda não publicou artigos.",
    ctaT: "Quer viver Buenos Aires com a gente?", ctaP: "Conte as suas datas e quantas pessoas viajam. Montamos uma proposta sob medida.", ctaWa: "Falar no WhatsApp", ctaPk: "Ver pacotes",
    miniT: "Planejando a sua viagem?", miniP: "Ajudamos a montar pelo WhatsApp.", empty: "Ainda não há conteúdo nesta categoria.", crumbs: "Navegação", cats: "Categorias",
    waMsg: (t) => `Olá, li o artigo "${t}" e quero saber mais`, shareMsg: (t) => t, rssT: "Blog",
  },
};
export const blogText = (env) => TXT[langOf(env)] || TXT.es;
// Categoría con su etiqueta en el idioma de la página (en portugués se deja la del panel, que ya está en portugués).
export const catIn = (env, cat) => (cat && langOf(env) !== "pt-BR" && blogText(env).catLabels?.[cat.slug] ? { ...cat, label: blogText(env).catLabels[cat.slug] } : cat);

// ---------- Piezas comunes ----------
const DOT = '<i aria-hidden="true" class="block size-1 rounded-full bg-current opacity-40"></i>';
const kicker = (parts) => `<p class="m-0 flex flex-wrap items-center gap-2.5 text-[0.75rem] font-bold uppercase leading-none tracking-[0.14em] text-mute">${parts.filter(Boolean).join(DOT)}</p>`;
const catLink = (cat) => (cat ? `<a href="/blog/categoria/${esc(cat.slug)}/" class="relative z-10 text-accent no-underline hover:underline">${esc(cat.label)}</a>` : "");

// Banda de cierre (color de marca): invitación a consultar. Los trazos son la "ruta punteada con pines" de la marca.
export function ctaBand(env, wa, source) {
  const T = blogText(env);
  return `<section class="tw-cta-bg text-white"><div class="tw-wrap relative overflow-hidden py-16 sm:py-24">
<svg aria-hidden="true" viewBox="0 0 372 180" fill="none" class="pointer-events-none absolute right-6 top-1/2 hidden h-60 w-auto -translate-y-1/2 text-white/45 lg:block"><path d="M8 150C70 150 70 60 140 60s60 90 130 90 60-110 88-110" stroke="currentColor" stroke-width="2" stroke-dasharray="2 9" stroke-linecap="round"/><circle cx="8" cy="150" r="7" fill="currentColor"/><circle cx="140" cy="60" r="7" fill="currentColor"/><circle cx="270" cy="150" r="7" fill="currentColor"/><circle cx="352" cy="40" r="9" fill="#fff"/></svg>
<div class="relative max-w-2xl"><h2 data-fx="up" class="m-0 font-display text-h2 font-semibold text-white">${esc(T.ctaT)}</h2><p data-fx="up" class="m-0 mt-5 max-w-lg text-lead text-white/85">${esc(T.ctaP)}</p><div data-fx="up" class="mt-9 flex flex-wrap gap-3"><a data-gv-wa="${esc(source)}" href="${esc(wa)}" rel="noopener" class="tw-btn tw-btn--light"><span>${esc(T.ctaWa)}</span></a><a href="/paquetes/" class="tw-btn tw-btn--ghost"><span>${esc(T.ctaPk)}</span></a></div></div></div></section>`;
}

// ---------- Buscador ----------
export const searchBox = (T, q = "", cls = "") => `<form role="search" action="/blog/buscar/" method="get" class="flex w-full max-w-xl items-center gap-2 ${cls}"><label for="blog-q" class="sr-only">${esc(T.searchLabel)}</label><input id="blog-q" type="search" name="q" value="${esc(q)}" maxlength="80" placeholder="${esc(T.searchPh)}" autocomplete="off" enterkeyhint="search" class="min-h-12 min-w-0 flex-1 rounded-full border border-ink/20 bg-white px-5 text-base text-ink placeholder:text-mute focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"><button type="submit" class="tw-btn tw-btn--primary tw-btn--sm"><span>${esc(T.searchBtn)}</span></button></form>`;

// Página de resultados (/blog/buscar/?q=). q: texto buscado · list: notas encontradas (ya ordenadas) · tabs: categorías para seguir explorando.
export function searchBody(env, { q, list, catMap, tabs, wa }) {
  const T = blogText(env);
  const head = `<header class="tw-wrap pt-12 sm:pt-20"><p data-fx="hero" class="m-0 text-sm font-bold uppercase tracking-[0.18em] text-accent"><a href="/blog/" class="no-underline hover:underline">${esc(T.kicker)}</a></p><h1 data-fx="hero" class="m-0 mt-5 max-w-5xl text-balance font-display text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.04] tracking-[-0.025em] text-ink">${esc(q ? T.searchT(q) : T.searchTitle)}</h1><p data-fx="hero" class="m-0 mt-6 max-w-2xl text-lead text-mute">${esc(q ? T.searchCount(list.length) : T.searchLead)}</p><div data-fx="hero" class="mt-8">${searchBox(T, q)}</div></header>`;
  const grid = list.length ? `<div class="${CARD_GRID}">${list.map((p, i) => postCardHtml(p, catMap.get(p.category), { i, env })).join("")}</div>` : `<p class="m-0 max-w-xl py-6 text-lg text-mute">${esc(q ? T.searchNone : T.searchEmpty)}</p>`;
  const more = !list.length && tabs.length ? `<div class="mt-8"><p class="m-0 mb-4 text-sm font-bold uppercase tracking-[0.14em] text-mute">${esc(T.searchTop)}</p>${chipsRow([{ label: T.all, path: "/blog/" }, ...tabs], "")}</div>` : "";
  return `<div class="tw tw-page bg-white">${head}<div class="tw-wrap pb-20 pt-10 sm:pb-28 sm:pt-14"><div class="mb-10 border-t border-ink/15"></div>${grid}${more}</div>${ctaBand(env, wa, "blog-search")}</div>`;
}

// ---------- Índice del blog ----------
function featured(p, cat, T, lang) {
  const mins = readMins(p), day = fmtDate(postDay(p), lang);
  const photo = p.image
    ? `<img src="${esc(p.image)}" alt="${esc(p.image_alt || p.title)}" fetchpriority="high" decoding="async" width="1280" height="880" class="block aspect-[4/3] w-full object-cover transition duration-1000 ease-soft group-hover:scale-[1.03] lg:aspect-[16/11]">`
    : `<span class="grid aspect-[16/11] place-items-center"><img src="${esc(LOGO)}" alt="" class="h-20 w-auto opacity-30"></span>`;
  return `<article data-fx="hero" class="group relative grid items-center gap-7 lg:grid-cols-12 lg:gap-14"><div class="overflow-hidden rounded-xl bg-mist lg:col-span-7">${photo}</div><div class="lg:col-span-5">${kicker([cat ? `<span class="text-accent">${esc(cat.label)}</span>` : "", `<span>${mins} ${esc(T.min)}</span>`])}<h2 class="m-0 mt-4 font-display text-[clamp(1.875rem,3.4vw,3rem)] font-semibold leading-[1.06] tracking-[-0.02em] text-ink"><a href="/blog/${esc(p.slug)}/" class="tw-card-title no-underline after:absolute after:inset-0 after:content-['']"><span>${esc(p.title)}</span></a></h2>${p.excerpt ? `<p class="m-0 mt-5 line-clamp-4 text-lead text-mute">${esc(p.excerpt)}</p>` : ""}${day ? `<p class="m-0 mt-5 text-sm text-mute"><time datetime="${esc(postDay(p))}">${esc(day)}</time></p>` : ""}<span class="mt-7 inline-flex items-center gap-3 font-semibold text-primary"><span>${esc(T.read)}</span><i class="tw-arrow"></i></span></div></article>`;
}


// Paginación: Anterior · números (con "…" si hay muchas) · Siguiente. Página 1 vive en la ruta base; las demás en <base>pagina/N/.
const pageHref = (base, n) => (n <= 1 ? base : `${base}pagina/${n}/`);
function pager(T, { page, pages, base }) {
  if (pages < 2) return "";
  // Además de la vecindad, saltos de 10, 100 y 1000 páginas: con miles de notas cualquier página queda a pocos clics de la primera (profundidad de rastreo para Google).
  const jumps = [10, 100, 1000].filter((j) => j < pages).flatMap((j) => [page - j, page + j, Math.round(page / j) * j]);
  const nums = [...new Set([1, 2, page - 1, page, page + 1, pages - 1, pages, ...jumps])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const items = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) items.push('<span aria-hidden="true" class="grid min-h-11 min-w-8 place-items-center text-mute">…</span>');
    items.push(n === page
      ? `<span aria-current="page" class="grid min-h-11 min-w-11 place-items-center rounded-full bg-primary px-3 font-semibold text-white">${n}</span>`
      : `<a href="${esc(pageHref(base, n))}" aria-label="${esc(T.page)} ${n}" class="grid min-h-11 min-w-11 place-items-center rounded-full px-3 font-semibold text-ink no-underline transition hover:bg-mist">${n}</a>`);
  });
  const step = (n, label, arrow, rel) => (n < 1 || n > pages
    ? ""
    : `<a href="${esc(pageHref(base, n))}" rel="${rel}" class="inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold text-primary no-underline transition hover:bg-mist">${arrow === "←" ? `<span aria-hidden="true">←</span>` : ""}<span>${esc(label)}</span>${arrow === "→" ? `<span aria-hidden="true">→</span>` : ""}</a>`);
  return `<nav aria-label="${esc(T.pagerLabel)}" class="mt-16 flex flex-wrap items-center justify-center gap-1 sm:mt-20">${step(page - 1, T.prev, "←", "prev")}${items.join("")}${step(page + 1, T.next, "→", "next")}</nav>`;
}

// list: entradas de esta página (más nueva primero). cat: categoría actual o null. cats: [{label, path}] para las pestañas.
export function blogIndexBody(env, { list, cat, catMap, tabs, active, wa, page = 1, pages = 1, base = "/blog/", total = list.length }) {
  const T = blogText(env), lang = langOf(env);
  const h1 = (cat ? cat.label : T.h1), lead = cat ? cat.description : T.lead;
  // Solo la primera página destaca una nota; las demás son grilla pareja.
  const first = page === 1 ? list[0] : null, rest = page === 1 ? list.slice(1) : list;
  const chips = chipsRow([{ label: T.all, path: "/blog/" }, ...tabs], active);
  const head = `<header class="tw-wrap pt-12 sm:pt-20"><p data-fx="hero" class="m-0 text-sm font-bold uppercase tracking-[0.18em] text-accent">${cat ? `<a href="/blog/" class="no-underline hover:underline">${esc(T.kicker)}</a>` : esc(T.kicker)}</p><h1 data-fx="hero" class="m-0 mt-5 max-w-5xl text-balance font-display text-[clamp(2.5rem,5.6vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-ink">${esc(h1)}</h1>${lead ? `<p data-fx="hero" class="m-0 mt-6 max-w-2xl text-lead text-mute">${esc(lead)}</p>` : ""}<div data-fx="hero" class="mt-8">${searchBox(T)}</div></header>`;
  const nav = chips ? `<div data-fx="hero" class="tw-wrap mt-10 sm:mt-14 [&_.tw-tabs]:mb-0">${chips}</div>` : `<div class="tw-wrap mt-10 sm:mt-14"><div class="border-b border-ink/15"></div></div>`;
  const grid = (items) => `<div class="${CARD_GRID}">${items.map((p, i) => postCardHtml(p, catMap.get(p.category), { i, env })).join("")}</div>`;
  const latestHead = `<div class="mb-9 flex items-baseline justify-between gap-4 border-t border-ink/15 pt-6"><h2 class="m-0 font-display text-h3 font-semibold text-ink">${esc(T.latest)}</h2><p class="m-0 text-sm text-mute">${esc(T.articles(total))}${pages > 1 ? ` · ${esc(T.page)} ${page}/${pages}` : ""}</p></div>`;
  const main = list.length
    ? `<div class="tw-wrap pb-20 pt-10 sm:pb-28 sm:pt-14">${first ? featured(first, catMap.get(first.category), T, lang) : ""}${rest.length ? `<div class="${first ? "mt-16 sm:mt-24" : ""}">${latestHead}${grid(rest)}</div>` : ""}${pager(T, { page, pages, base })}</div>`
    : `<div class="tw-wrap pb-24 pt-14"><p class="m-0 py-10 text-center text-mute">${esc(T.empty)}</p></div>`;
  return `<div class="tw tw-page bg-white">${head}${nav}${main}${ctaBand(env, wa, "blog-index")}</div>`;
}

// ---------- Artículo ----------
// Cada <h2> recibe un id (s1, s2…) para el índice automático.
// Cada <h2> y <h3> recibe un id con el texto del título (#como-llegar): Google lo usa para los enlaces "Ir a" bajo el resultado y el índice lateral.
// Si el título no deja letras o se repite, queda s1, s2… o como-llegar-2.
export const addHeadingIds = (h) => {
  const used = new Set(["fuentes"]); let i = 0;
  return h.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, lv, inner) => {
    i++;
    const base = stripTags(inner).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || `s${i}`;
    let id = base, n = 2; while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    return `<h${lv} id="${id}">${inner}</h${lv}>`;
  });
};
const tocItems = (h) => [...h.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map((m) => [m[1], stripTags(m[2])]);

const ICON = {
  link: '<svg class="i-link size-[1.15rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7"/></svg><svg class="i-ok hidden size-[1.15rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  fb: '<svg class="size-[1.15rem]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3z"/></svg>',
};
function shareRow(env, p, url) {
  const T = blogText(env), msg = encodeURIComponent(`${p.title} ${url}`);
  const item = (href, label, icon, ext = true) => `<a href="${esc(href)}" ${ext ? 'target="_blank" rel="noopener"' : ""} aria-label="${esc(label)}" title="${esc(label)}" class="tw-icon-btn">${icon}</a>`;
  return `<div class="flex items-center gap-2.5" data-share data-url="${esc(url)}" data-title="${esc(p.title)}"><span class="mr-1 text-sm font-semibold text-mute">${esc(T.share)}</span>${item(`https://wa.me/?text=${msg}`, `${T.shareOn} WhatsApp`, WA_ICON.replace('size-5', "size-[1.15rem]"))}${item(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, `${T.shareOn} Facebook`, ICON.fb)}<button type="button" data-copy data-ok="${esc(T.copied)}" aria-label="${esc(T.copy)}" title="${esc(T.copy)}" class="tw-icon-btn">${ICON.link}</button></div>`;
}

function tocBlocks(items, T, wa) {
  if (items.length < 3) return { side: "", mobile: "" };
  const list = `<ol class="m-0 grid list-none gap-0.5 p-0">${items.map(([id, t]) => `<li><a href="#${id}" class="tw-toc-link"><span>${esc(t)}</span></a></li>`).join("")}</ol>`;
  const mini = `<div class="mt-8 rounded-xl border border-ink/12 p-5"><p class="m-0 font-display text-lg font-semibold leading-tight text-ink">${esc(T.miniT)}</p><p class="m-0 mt-1.5 text-sm text-mute">${esc(T.miniP)}</p><a data-gv-wa="blog-toc" href="${esc(wa)}" rel="noopener" class="tw-btn tw-btn--wa tw-btn--sm mt-4 w-full"><span>${esc(T.ctaWa)}</span></a></div>`;
  return {
    side: `<aside class="hidden lg:block"><div class="sticky top-28"><nav data-toc aria-label="${esc(T.toc)}"><p class="m-0 mb-3 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-mute">${esc(T.toc)}</p>${list}</nav>${mini}</div></aside>`,
    mobile: `<details data-toc class="group mb-10 rounded-xl border border-ink/12 bg-mist/60 lg:hidden"><summary class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 text-[0.9375rem] font-bold text-ink [&::-webkit-details-marker]:hidden"><span>${esc(T.toc)}</span><span aria-hidden="true" class="tw-plus"></span></summary><nav aria-label="${esc(T.toc)}" class="px-5 pb-4">${list}</nav></details>`,
  };
}

// ---------- Autoría ----------
const initialsOf = (n) => String(n || "").trim().split(/\s+/).slice(0, 2).map((x) => x[0] || "").join("").toUpperCase() || "•";
const avatarHtml = (a, size = "size-11", text = "text-sm") => a.avatar
  ? `<span class="grid ${size} shrink-0 place-items-center overflow-hidden rounded-full bg-mist ring-1 ring-ink/10"><img src="${esc(a.avatar)}" alt="" loading="lazy" decoding="async" class="size-full object-cover"></span>`
  : `<span class="grid ${size} shrink-0 place-items-center rounded-full bg-mist ${text} font-semibold text-primary ring-1 ring-ink/10" aria-hidden="true">${esc(initialsOf(a.name))}</span>`;
const nameLink = (a, cls = "") => a.isPublic ? `<a href="/autor/${esc(a.slug)}/" rel="author" class="${cls} no-underline hover:underline">${esc(a.name)}</a>` : `<span class="${cls}">${esc(a.name)}</span>`;
const paras = (t) => String(t || "").split(/\n{2,}/).map((x) => x.trim()).filter(Boolean).map((x) => `<p class="m-0 mt-3 leading-relaxed">${esc(x).replace(/\n/g, "<br>")}</p>`).join("");
const sourcesBlock = (list, T) => !list?.length ? "" : `<section class="mt-12 border-t border-ink/15 pt-6" aria-labelledby="fuentes"><h2 id="fuentes" class="m-0 font-display text-xl font-semibold text-ink">${esc(T.sourcesT)}</h2><ul class="m-0 mt-4 grid list-none gap-2 p-0">${list.map((x) => { let host = ""; try { host = new URL(x.url).hostname.replace(/^www\./, ""); } catch { /* ya validada */ } return `<li class="text-[0.95rem]"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" class="tw-link font-semibold text-primary">${esc(x.label)}</a>${host && host !== x.label ? ` <span class="text-mute">· ${esc(host)}</span>` : ""}</li>`; }).join("")}</ul></section>`;

// Anterior / siguiente: la nota más vieja y la más nueva que esta (mantiene al lector recorriendo el archivo y le da un enlace interno más a cada nota).
function adjNav(T, adj) {
  if (!adj || (!adj.older && !adj.newer)) return "";
  const card = (x, label, align) => !x ? "<span></span>" : `<a href="/blog/${esc(x.slug)}/" class="group flex flex-col gap-1.5 rounded-xl border border-ink/12 p-5 no-underline transition hover:border-primary/40 hover:bg-mist/60 ${align === "right" ? "sm:items-end sm:text-right" : ""}"><span class="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-mute">${align === "right" ? "" : "← "}${esc(label)}${align === "right" ? " →" : ""}</span><span class="font-display text-lg font-semibold leading-snug text-ink group-hover:text-primary">${esc(x.title)}</span></a>`;
  return `<nav aria-label="${esc(T.moreT)}" class="mt-12 grid gap-4 sm:grid-cols-2">${card(adj.older, T.olderPost, "left")}${card(adj.newer, T.newerPost, "right")}</nav>`;
}

// p: entrada · cat: categoría · related: entradas · pkgs: paquetes para "Para vivir lo que leíste" · L: etiquetas de html.js
export function postBody(env, { p, cat, related, pkgs, L, shellWa, catMap = new Map(), adj = null }) {
  const T = blogText(env), lang = langOf(env), site = siteUrl(env);
  const url = `${site}/blog/${p.slug}/`;
  const content = addHeadingIds(sanitizeHtml(p.content));
  const mins = readMins({ content }), day = postDay(p);
  const mod = String(p.updated_at || "").slice(0, 10);
  const upd = mod && mod > day && Date.parse(mod) - Date.parse(day) > 864e5 ? mod : "";
  const wa = waUrl(env, T.waMsg(p.title));
  const toc = tocBlocks(tocItems(content), T, wa);
  const crumbs = `<nav aria-label="${esc(T.crumbs)}" class="mb-7 text-sm text-mute"><ol class="m-0 flex list-none flex-wrap items-center justify-center gap-x-2 gap-y-1 p-0"><li><a href="/" class="no-underline hover:text-ink hover:underline">${esc(T.home)}</a></li><li aria-hidden="true">/</li><li><a href="/blog/" class="no-underline hover:text-ink hover:underline">Blog</a></li>${cat ? `<li aria-hidden="true">/</li><li><a href="/blog/categoria/${esc(cat.slug)}/" class="no-underline hover:text-ink hover:underline">${esc(cat.label)}</a></li>` : ""}</ol></nav>`;
  const A = p.author, R = p.reviewer;
  const who = A
    ? `<span class="flex items-center gap-3 text-left">${avatarHtml(A)}<span class="leading-tight"><span class="block text-xs uppercase tracking-wider text-mute">${esc(T.by)}</span><strong class="block font-semibold text-ink">${nameLink(A)}</strong>${A.headline ? `<span>${esc(A.headline)}</span>` : ""}</span></span>`
    : `<span class="flex items-center gap-3 text-left"><span class="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-mist ring-1 ring-ink/10"><img src="${esc(LOGO)}" alt="" class="size-7 object-contain"></span><span class="leading-tight"><strong class="block font-semibold text-ink">${esc(T.team)} ${esc(BRAND)}</strong><span>${esc(T.teamRole)}</span></span></span>`;
  const byline = `<div data-fx="hero" class="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 text-sm text-mute">${who}<i aria-hidden="true" class="hidden h-9 w-px bg-ink/15 sm:block"></i><span class="leading-snug"><time datetime="${esc(day)}">${esc(T.published)} ${esc(fmtDate(day, lang))}</time>${upd ? `<br><time datetime="${esc(upd)}">${esc(T.updated)} ${esc(fmtDate(upd, lang))}</time>` : ""}${R ? `<br>${esc(T.reviewedBy)} <strong class="font-semibold text-ink">${nameLink(R)}</strong>` : ""}<br>${mins} ${esc(T.min)}</span></div>`;
  const hero = p.image ? `<figure data-fx="hero" class="tw-wrap mx-auto mb-0 mt-12 max-w-6xl"><img src="${esc(p.image)}" alt="${esc(p.image_alt || p.title)}" fetchpriority="high" decoding="async" width="1600" height="900" class="block aspect-[4/3] w-full rounded-xl object-cover sm:aspect-[16/9]"></figure>` : "";
  const vid = p.video ? `<div class="tw-wrap mx-auto mt-8 max-w-6xl">${videoBlock(p)}</div>` : "";
  const header = `<header class="tw-wrap max-w-4xl pt-10 text-center sm:pt-14">${crumbs}${cat ? `<p data-fx="hero" class="m-0 text-sm font-bold uppercase tracking-[0.16em]"><a href="/blog/categoria/${esc(cat.slug)}/" class="text-accent no-underline hover:underline">${esc(cat.label)}</a></p>` : ""}<h1 data-fx="hero" class="m-0 mt-5 text-balance font-display text-[clamp(2.125rem,4.8vw,3.75rem)] font-semibold leading-[1.06] tracking-[-0.025em] text-ink">${esc(p.title)}</h1>${p.excerpt ? `<p data-fx="hero" class="mx-auto m-0 mt-6 max-w-2xl text-balance text-lead text-mute sm:text-[1.375rem]">${esc(p.excerpt)}</p>` : ""}${byline}</header>`;
  const article = `<div class="mx-auto min-w-0 max-w-[45rem]">${toc.mobile}<div class="tw-prose tw-prose--post">${content}</div>
${sourcesBlock(p.sourcesList, T)}
<div class="mt-14 flex flex-wrap items-center justify-between gap-5 border-t border-ink/15 pt-6">${cat ? `<a href="/blog/categoria/${esc(cat.slug)}/" class="inline-flex min-h-10 items-center rounded-full bg-mist px-4 text-sm font-semibold text-primary no-underline transition hover:bg-celeste/60">${esc(cat.label)}</a>` : "<span></span>"}${shareRow(env, p, url)}</div>
${A && A.isPublic ? `<aside class="mt-10 flex flex-col gap-5 rounded-2xl bg-mist p-6 sm:flex-row sm:items-start sm:p-8">${avatarHtml(A, "size-16", "text-lg")}<div><p class="m-0 font-display text-xl font-semibold leading-tight text-ink">${nameLink(A)}</p>${A.headline ? `<p class="m-0 mt-1 text-sm font-semibold text-primary">${esc(A.headline)}</p>` : ""}${A.bio ? `<p class="m-0 mt-2 text-[0.95rem] leading-relaxed text-mute">${esc(A.bio.length > 320 ? A.bio.slice(0, 320).replace(/\s+\S*$/, "") + "…" : A.bio)}</p>` : ""}<a href="/autor/${esc(A.slug)}/" class="tw-link mt-3 inline-block text-[0.95rem] font-semibold text-primary">${esc(T.authorMore)}</a></div></aside>` : `<aside class="mt-10 flex flex-col gap-5 rounded-2xl bg-mist p-6 sm:flex-row sm:items-center sm:p-8"><span class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-ink/10"><img src="${esc(LOGO)}" alt="" class="size-10 object-contain"></span><div><p class="m-0 font-display text-xl font-semibold leading-tight text-ink">${esc(T.aboutT)} ${esc(BRAND)}</p><p class="m-0 mt-2 text-[0.95rem] leading-relaxed text-mute">${esc(T.aboutP)}</p><a href="/nosotros/" class="tw-link mt-3 inline-block text-[0.95rem] font-semibold text-primary">${esc(T.aboutL)}</a></div></aside>`}
${adjNav(T, adj)}</div>`;
  const body = toc.side
    ? `<div class="tw-wrap mt-14 max-w-5xl lg:mt-20"><div class="grid gap-12 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-16">${toc.side}${article}</div></div>`
    : `<div class="tw-wrap mt-14 max-w-5xl lg:mt-20">${article}</div>`;
  const exp = pkgs?.length
    ? `<section class="tw-section pb-0"><div class="tw-wrap"><div class="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-3"><div><h2 class="m-0 font-display text-h3 font-semibold text-ink">${esc(T.expT)}</h2><p class="m-0 mt-2 text-mute">${esc(T.expP)}</p></div><a href="/paquetes/" class="tw-link font-semibold text-primary">${esc(T.expAll)}</a></div><div class="${CARD_GRID}">${pkgs.map((x, i) => pkgCard(x, shellWa(x), L, i)).join("")}</div></div></section>`
    : "";
  const more = related.length
    ? `<section class="tw-section mt-16 bg-mist sm:mt-24"><div class="tw-wrap"><h2 data-fx="up" class="m-0 mb-10 font-display text-h2 font-semibold text-ink">${esc(T.moreT)}</h2><div class="${CARD_GRID}">${related.map((x, i) => postCardHtml(x, catMap.get(x.category), { i, env })).join("")}</div><p class="m-0 mt-12"><a href="/blog/" class="tw-link font-semibold text-primary">${esc(T.back)}</a></p></div></section>`
    : `<p class="m-0 pb-16 pt-12 text-center"><a href="/blog/" class="tw-link font-semibold text-primary">${esc(T.back)}</a></p>`;
  return `<div class="tw tw-page bg-white"><article>${header}${hero}${vid}${body}</article>${exp}${more}${ctaBand(env, wa, "blog")}</div>`;
}

// ---------- Página del autor ----------
export function authorBody(env, { a, posts, catMap }) {
  const T = blogText(env);
  const exp = a.experience ? `<section class="mt-10"><h2 class="m-0 font-display text-h3 font-semibold text-ink">${esc(T.authorExp)}</h2><div class="text-ink/80">${paras(a.experience)}</div></section>` : "";
  const links = a.links.length ? `<section class="mt-10"><h2 class="m-0 font-display text-h3 font-semibold text-ink">${esc(T.authorLinks)}</h2><ul class="m-0 mt-3 grid list-none gap-2 p-0">${a.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="me noopener noreferrer" class="tw-link font-semibold text-primary">${esc(l.label)}</a></li>`).join("")}</ul></section>` : "";
  const list = posts.length ? `<div class="${CARD_GRID}">${posts.map((x, i) => postCardHtml(x, catMap.get(x.category), { i, env })).join("")}</div>` : `<p class="m-0 text-mute">${esc(T.authorNone)}</p>`;
  return `<div class="tw tw-page bg-white"><section data-hero class="bg-night text-white"><div class="tw-wrap flex flex-col gap-8 py-14 sm:flex-row sm:items-center sm:py-20">${a.avatar ? `<img src="${esc(a.avatar)}" alt="${esc(a.name)}" width="160" height="160" class="size-32 shrink-0 rounded-full object-cover ring-4 ring-white/20 sm:size-40">` : `<span class="grid size-32 shrink-0 place-items-center rounded-full bg-white/10 font-display text-4xl font-semibold text-white ring-4 ring-white/20 sm:size-40" aria-hidden="true">${esc(initialsOf(a.name))}</span>`}<div><p data-fx="hero" class="m-0 text-sm font-bold uppercase tracking-[0.16em] text-white/70">${esc(T.authorKicker)}</p><h1 data-fx="hero" class="m-0 mt-3 font-display text-title font-semibold text-white">${esc(a.name)}</h1>${a.headline ? `<p data-fx="hero" class="m-0 mt-3 max-w-xl text-lead text-white/80">${esc(a.headline)}</p>` : ""}</div></div></section>
<div class="tw-wrap pb-24 pt-12 sm:pt-16"><div class="max-w-3xl">${a.bio ? `<div class="text-lg text-ink/80">${paras(a.bio)}</div>` : ""}${exp}${links}</div><h2 class="m-0 mb-8 mt-16 font-display text-h3 font-semibold text-ink">${esc(T.authorPosts(a.name))}</h2>${list}</div></div>`;
}

// ---------- RSS ----------
const cdata = (s) => `<![CDATA[${String(s).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
export function rssXml(env, posts, catMap) {
  const T = blogText(env), site = siteUrl(env), lang = langOf(env);
  const items = posts.map((p) => {
    const link = `${site}/blog/${p.slug}/`, cat = catMap.get(p.category), d = Date.parse(postDay(p));
    return `<item><title>${cdata(p.title)}</title><link>${esc(link)}</link><guid isPermaLink="true">${esc(link)}</guid>${d ? `<pubDate>${new Date(d).toUTCString()}</pubDate>` : ""}${cat ? `<category>${cdata(cat.label)}</category>` : ""}<description>${cdata(p.excerpt || stripTags(p.content).slice(0, 280))}</description><content:encoded>${cdata(sanitizeHtml(p.content))}</content:encoded></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${cdata(`${T.rssT} | ${BRAND}`)}</title><link>${esc(site)}/blog/</link><description>${cdata(T.desc)}</description><language>${{ "pt-BR": "pt-br", en: "en-us" }[lang] || "es-ar"}</language><atom:link href="${esc(site)}/blog/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`;
}

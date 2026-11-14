// Utilidades HTML compartidas.
import { BRAND, LANG, parsePrice } from "./seo.js";

import { hoursOf, cardFacts, kindOf, optionsOf, partsOf, parseMeta, timesOf } from "./ficha.js";
export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const slugify = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

// Dado el índice del "<div" de apertura, devuelve el índice justo después de su "</div>" de cierre.
export function balancedEnd(html, start) {
  const re = /<(\/?)div\b/gi;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.indexOf(">", m.index) + 1;
  }
  return -1;
}

const mainRange = (html) => {
  const s = html.indexOf("<main"), e = html.indexOf("</main>");
  return s < 0 || e < 0 ? null : [s, e];
};

// Reproductor de video de una ficha o nota (el archivo se sube desde el panel). Vacío si no hay video.
export function videoBlock(p, extra = "") {
  const v = String(p?.video || "").trim();
  if (!v) return "";
  const type = /\.webm(\?|$)/i.test(v) ? "video/webm" : /\.mov(\?|$)/i.test(v) ? "video/quicktime" : "video/mp4";
  const poster = p.image ? ` poster="${esc(p.image)}"` : "";
  return `<div data-fx="up" class="${extra} overflow-hidden rounded-lg bg-night"><video controls playsinline preload="metadata"${poster} aria-label="${esc(p.title || "Video")}" class="block aspect-video w-full"><source src="${esc(v)}" type="${type}"></video></div>`;
}

// Widgets de texto dentro de <main> que contienen precios o descuentos.
export const TOKEN_RE = /R\$\s?[\d.,]+|Desconto\s\d+%/g;
export function findPriceWidgets(html) {
  const r = mainRange(html);
  if (!r) return [];
  const out = [];
  const re = /<div class="elementor-element[^"]*"\s+data-id="(\w+)"[^>]*data-widget_type="text-editor\.default"[^>]*>\s*<div class="elementor-widget-container">/g;
  re.lastIndex = r[0];
  let m;
  while ((m = re.exec(html)) && m.index < r[1]) {
    const innerStart = m.index + m[0].length;
    const cStart = m.index + m[0].lastIndexOf('<div class="elementor-widget-container">');
    const cEnd = balancedEnd(html, cStart);
    const inner = html.slice(innerStart, cEnd - "</div>".length);
    const tokens = inner.match(TOKEN_RE);
    if (tokens && /R\$/.test(inner)) out.push({ id: m[1], inner, tokens });
  }
  return out;
}

export function applyTokens(inner, values) {
  let i = 0;
  return inner.replace(TOKEN_RE, (t) => (values[i] !== undefined ? values[i++] : (i++, t)));
}

export function waLink(env, title, prefix = "Hola, me interesa") {
  const n = String(env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const msg = prefix === "Hola, quisiera recibir información sobre el paquete" ? `${prefix} ${title}. ¿Podrían enviarme disponibilidad y detalles?` : `${prefix} ${title}`;
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(msg)}` : "/reservas/";
}

// Porcentaje de descuento a partir de "precio anterior" y "precio" (null si no se puede calcular).
export function discountPct(oldP, price) {
  const o = Number(parsePrice(oldP)), n = Number(parsePrice(price));
  if (!o || !n || n >= o) return null;
  const pct = Math.round((1 - n / o) * 100);
  return pct >= 1 && pct <= 90 ? pct : null;
}

export const WA_ICON = '<svg class="size-5 shrink-0" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.5c.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"/><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>';

// Páginas nuevas: se reutiliza <head>+header+footer de una página real y solo se cambia <main>.
// Del <head> original se descartan título, canonical, meta de descripción/OG/Twitter/robots y el JSON-LD
// (describen la página /blog/, no la nueva) y se reemplazan por los de la página nueva.
export function buildHead(head, { title, desc = "", canonical = "", image = "", ogType = "website", ld = "" }) {
  const lang = (head.match(/<html[^>]*\blang="([^"]+)"/) || [])[1] || "pt-BR";
  const locale = /^es/i.test(lang) ? "es_AR" : lang.replace("-", "_");
  head = head
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<link rel=["'](?:canonical|alternate|shortlink|prev|next)["'][^>]*>/gi, "")
    .replace(/<meta (?:name|property)=["'](?:description|robots|og:[^"']*|twitter:[^"']*)["'][^>]*>/gi, "")
    .replace(/<script type="application\/ld\+json"[\s\S]*?<\/script>/gi, "");
  const t = esc(title), d = esc(desc);
  const tags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}">`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`,
    canonical && `<link rel="canonical" href="${esc(canonical)}">`,
    `<meta property="og:locale" content="${locale}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    canonical && `<meta property="og:url" content="${esc(canonical)}">`,
    `<meta property="og:site_name" content="${esc(BRAND)}">`,
    image && `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${t}">`,
    `<meta name="twitter:description" content="${d}">`,
    image && `<meta name="twitter:image" content="${esc(image)}">`,
    ld,
  ].filter(Boolean).join("\n");
  return head.replace(/<\/head>/i, tags + "\n</head>");
}

// Páginas nuevas: se reutiliza <head>+header+footer de una página real y solo se cambia <main>.
export function renderPage(shellHtml, opts) {
  const r = mainRange(shellHtml);
  const head = buildHead(shellHtml.slice(0, r[0]), opts), tail = shellHtml.slice(r[1] + 7);
  const css = `<style>.dyn{max-width:860px;margin:0 auto;padding:40px 20px 60px}.dyn img{max-width:100%;height:auto;border-radius:8px}.dyn h1{margin:.4em 0}.dyn h2{margin:1.4em 0 .4em}.dyn .dyn-price{font-size:1.6em;margin:.4em 0 1em}.dyn .dyn-body{line-height:1.7}.dyn .dyn-bc{font-size:.85em;color:#6b7280;margin-bottom:12px}.dyn .dyn-bc a{color:inherit}.dyn .dyn-meta{color:#6b7280;font-size:.9em}</style>`;
  if (opts.bare) return `${head}<main id="content" class="site-main"><div class="page-content">${opts.body}</div></main>${tail}`;
  return `${head}<main id="content" class="site-main"><div class="page-content">${css}<div class="dyn">${opts.body}</div></div></main>${tail}`;
}

// Etiquetas en inglés (blog en /en/). Mismas claves que las de español.
const LABELS_EN = {
  home: "Home", blog: "Blog", back: "← Back to the blog", book: "Book now >", all: "All", empty: "There is no content in this category yet.",
  more: "See details", lang: "en",
  ask: "Ask", askPrice: "Ask for your price", from: "From", perPerson: "per person", includes: "What's included", about: "About this experience",
  waBook: "Book on WhatsApp", waTitle: "Hi, I would like to get information about", leadTitle: "Prefer that we write to you?", leadSub: "Leave your details and we will reply on WhatsApp.", formTitle: "Book your experience", formCta: "Book", legal: "WhatsApp opens with your details so you can send us the message. No commitment: the booking is only confirmed when you decide.", formSub: "Choose the date and how many people are traveling. WhatsApp opens with your inquiry ready to send.", fMsgPh: "E.g. we are traveling with a 6-year-old", fPaxLess: "Fewer people", fPaxMore: "More people", sentOpen: "Open WhatsApp", sentAgain: "Make another inquiry", fMsg: "Comments (optional)",
  fName: "Your name", fPhone: "Your WhatsApp", fDate: "Approximate date", fDateExact: "Choose the date", calPrev: "Previous month", calNext: "Next month", fPax: "People", fSend: "Book on WhatsApp", fSending: "Sending…", fOk: "Done! We opened WhatsApp so you can continue.",
  fErr: "We couldn't save your details, but you can message us on WhatsApp.", related: "Other experiences you might like", off: "OFF", featured: "Featured",
  moreInfo: "More details", seeAll: "See all", featuredTitle: "Featured experiences", payNote: "Price per person. Ask about availability and dates.",
  noIncludes: "Not included", stops: "Stops on the route", times: "Departure times", timesShort: "Times", options: "Choose your option", optionsAria: "Options table", gallery: "Gallery", faq: "Frequently asked questions", compare: "Compare the options", compareAria: "Comparison", crumb: "Breadcrumb", policies: "Policies", policyOnly: "Only for", policyTypes: { menores: "Children", cancelacion: "Cancellation", documentacion: "Documents", pagos: "Payment", otra: "Other conditions" },
};

// Etiquetas según el idioma de la página base (<html lang>).
export function labels(shellHtml) {
  // El <html lang> de la página (stubShell, según el idioma de la petición) manda; sin él se usa SITE_LANG y, si tampoco hay, español (igual que el layout de render.js).
  const code = (String(shellHtml || "").match(/<html[^>]*\blang="([^"]+)"/i) || [])[1] || LANG || "es";
  if (/^en/i.test(code)) return LABELS_EN;
  const es = /^es/i.test(code);
  return es
    ? {
        home: "Inicio", blog: "Blog", back: "← Volver al blog", book: "Reservar ahora >", all: "Todo", empty: "Todavía no hay contenido en esta categoría.",
        more: "Ver detalles", lang: "es",
        ask: "Consultar", askPrice: "Consultá tu precio", from: "Desde", perPerson: "por persona", includes: "Qué incluye", about: "Sobre esta experiencia",
        waBook: "Reservar por WhatsApp", waTitle: "Hola, quisiera recibir información sobre el paquete", leadTitle: "¿Preferís que te escribamos?", leadSub: "Dejanos tus datos y te respondemos por WhatsApp.", formTitle: "Reservá tu experiencia", formCta: "Reservar", legal: "Se abre WhatsApp con tus datos para que nos envíes el mensaje. Sin compromiso: la reserva se confirma recién cuando lo decidas.", formSub: "Elegí la fecha y cuántos viajan. Se abre WhatsApp con tu consulta lista para enviar.", fMsgPh: "Ej: viajamos con un niño de 6 años", fPaxLess: "Menos personas", fPaxMore: "Más personas", sentOpen: "Abrir WhatsApp", sentAgain: "Hacer otra consulta", fMsg: "Comentarios (opcional)",
        fName: "Tu nombre", fPhone: "Tu WhatsApp", fDate: "Fecha aproximada", fDateExact: "Elegí la fecha", calPrev: "Mes anterior", calNext: "Mes siguiente", fPax: "Personas", fSend: "Reservar por WhatsApp", fSending: "Enviando…", fOk: "¡Listo! Abrimos WhatsApp para continuar.",
        fErr: "No pudimos guardar tus datos, pero podés escribirnos por WhatsApp.", related: "Otras experiencias que te pueden gustar", off: "OFF", featured: "Destacado",
        moreInfo: "Más detalles", seeAll: "Ver todo", featuredTitle: "Experiencias destacadas", payNote: "Precio por persona. Consultá disponibilidad y fechas.",
        noIncludes: "No incluye", stops: "Paradas del recorrido", times: "Horarios de salida", timesShort: "Horarios", options: "Elegí tu opción", optionsAria: "Tabla de opciones", gallery: "Galería", faq: "Preguntas frecuentes", compare: "Compará las opciones", compareAria: "Comparador", crumb: "Ruta de navegación", policies: "Políticas", policyOnly: "Solo para", policyTypes: { menores: "Menores", cancelacion: "Cancelación", documentacion: "Documentación", pagos: "Pagos", otra: "Otras condiciones" },
      }
    : {
        home: "Início", blog: "Blog", back: "← Voltar ao blog", book: "Reservar agora >", all: "Tudo", empty: "Ainda não há conteúdo nesta categoria.",
        more: "Ver detalhes", lang: "pt-BR",
        ask: "Consultar", askPrice: "Consulte o preço", from: "A partir de", perPerson: "por pessoa", includes: "O que inclui", about: "Sobre esta experiência",
        waBook: "Reservar pelo WhatsApp", waTitle: "Olá, tenho interesse em", leadTitle: "Prefere que a gente te escreva?", leadSub: "Deixe seus dados e respondemos pelo WhatsApp.", formTitle: "Reserve sua experiência", formCta: "Reservar", legal: "O WhatsApp abre com seus dados para você enviar a mensagem. Sem compromisso: a reserva só é confirmada quando você decidir.", formSub: "Escolha a data e quantas pessoas viajam. O WhatsApp abre com a sua consulta pronta para enviar.", fMsgPh: "Ex.: viajamos com uma criança de 6 anos", fPaxLess: "Menos pessoas", fPaxMore: "Mais pessoas", sentOpen: "Abrir o WhatsApp", sentAgain: "Fazer outra consulta", fMsg: "Comentários (opcional)",
        fName: "Seu nome", fPhone: "Seu WhatsApp", fDate: "Data aproximada", fDateExact: "Escolha a data", calPrev: "Mês anterior", calNext: "Próximo mês", fPax: "Pessoas", fSend: "Reservar pelo WhatsApp", fSending: "Enviando…", fOk: "Pronto! Abrimos o WhatsApp para continuar.",
        fErr: "Não conseguimos salvar seus dados, mas você pode falar pelo WhatsApp.", related: "Outras experiências que você pode gostar", off: "OFF", featured: "Destaque",
        moreInfo: "Mais detalhes", seeAll: "Ver tudo", featuredTitle: "Experiências em destaque", payNote: "Preço por pessoa. Consulte disponibilidade e datas.",
        noIncludes: "Não inclui", stops: "Paradas do passeio", times: "Horários de saída", timesShort: "Horários", options: "Escolha sua opção", optionsAria: "Tabela de opções", gallery: "Galeria", faq: "Perguntas frequentes", compare: "Compare as opções", compareAria: "Comparador", crumb: "Navegação", policies: "Políticas", policyOnly: "Só para", policyTypes: { menores: "Menores de idade", cancelacion: "Cancelamento", documentacion: "Documentação", pagos: "Pagamento", otra: "Outras condições" },
      };
}

// ---------- Categorías en el sitio ----------
// Fila de enlaces entre categorías (paquetes y blog). items: [{label, path}]
export function chipsRow(items, activePath = "") {
  if (items.length < 2) return "";
  const tab = (c) => `<a href="${esc(c.path)}"${c.path === activePath ? ' aria-current="page"' : ""}>${esc(c.label)}</a>`;
  return `<nav class="tw-tabs" aria-label="Categorías">${items.map(tab).join("")}</nav>`;
}

// Contenedor de las páginas de listado (paquetes, blog, categorías): banda azul noche con título y bajada, y el contenido debajo.
export const listShell = (h1, lead, inner) =>
  `<div class="tw tw-page bg-white"><section data-hero class="bg-night text-white"><div class="tw-wrap py-14 sm:py-20"><h1 data-fx="hero" class="m-0 max-w-4xl font-display text-title font-semibold text-white">${esc(h1)}</h1>${lead ? `<p data-fx="hero" class="m-0 mt-6 max-w-xl text-lead text-white/80">${esc(lead)}</p>` : ""}</div></section><div class="tw-wrap pb-24 pt-12 sm:pt-16">${inner}</div></div>`;

// Grilla común de tarjetas (paquetes y blog).
export const CARD_GRID = "grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-x-8 gap-y-14";

// Precio de un paquete (tarjeta y ficha). big = versión grande de la ficha; dark = sobre fondo oscuro.
export function priceHtml(p, L, big = false, dark = false) {
  const main = dark ? "text-white" : "text-primary", soft = dark ? "text-white/70" : "text-mute";
  if (!p.price) return `<p class="m-0"><strong class="font-display ${big ? "text-3xl" : "text-lg"} font-semibold leading-tight ${main}">${esc(L.askPrice)}</strong></p>`;
  return `<p class="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span class="text-sm ${soft}">${esc(L.from)}</span>${p.price_old ? `<s class="${big ? "text-base" : "text-sm"} ${soft}">${esc(p.price_old)}</s>` : ""}<strong class="font-display ${big ? "text-4xl" : "text-[1.65rem]"} font-semibold leading-none ${main}">${esc(p.price)}</strong><span class="text-sm ${soft}">${esc(parseMeta(p.meta).unit_lbl || L.perPerson)}</span></p>`;
}

// Textos de paquetes / servicios (es · pt-BR).
export const kindText = (lang) => (lang === "es"
  ? { paquete: "Paquete", servicio: "Servicio", includesN: (n) => (n === 1 ? "Incluye 1 servicio" : `Incluye ${n} servicios`),
      bundleH: "Qué incluye este paquete", bundleP: "Podés reservar todo junto o elegir solo lo que necesitás: cada servicio también se vende por separado.",
      detail: "Ver detalle", ask: "Consultar solo este", apart: "Por separado", together: "En el paquete", save: "Ahorrás", inH: "También forma parte de estos paquetes", inP: "Si lo combinás con otros servicios, el precio mejora.",
      all: "Todo", kinds: "Tipo de producto", kindsP: "Paquetes", kindsS: "Servicios", book: "Reservar", pkgN: (n) => `Paquete · ${n} servicios` }
  : { paquete: "Pacote", servicio: "Serviço", includesN: (n) => (n === 1 ? "Inclui 1 serviço" : `Inclui ${n} serviços`),
      bundleH: "O que inclui este pacote", bundleP: "Você pode reservar tudo junto ou escolher só o que precisa: cada serviço também é vendido separadamente.",
      detail: "Ver detalhe", ask: "Consultar só este", apart: "Separadamente", together: "No pacote", save: "Você economiza", inH: "Também faz parte destes pacotes", inP: "Combinando com outros serviços, o preço melhora.",
      all: "Tudo", kinds: "Tipo de produto", kindsP: "Pacotes", kindsS: "Serviços", book: "Reservar", pkgN: (n) => `Pacote · ${n} serviços` });

const CLOCK = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const STACK = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>';

// Tarjeta de producto (paquete o servicio), al estilo de los buscadores de experiencias: foto grande con etiquetas, datos con ícono,
// título, y abajo el precio ("Desde … por persona") junto al botón. Toda la tarjeta es clicable (enlace "estirado" en el título;
// el botón de WhatsApp queda por encima con relative z-10).
// Contrato que se mantiene: data-dur (filter.js), data-gv-wa (conv.js), data-kind (filtro Paquetes/Servicios) y el atributo hidden.
export function pkgCard(p, wa, L, i = 0) {
  const href = `/paquetes/${esc(p.slug)}/`, K = kindText(L.lang);
  const pct = discountPct(p.price_old, p.price), kind = kindOf(p), n = partsOf(p).length;
  const pill = "rounded-full bg-white/95 px-3 py-1.5 text-[0.75rem] font-bold uppercase leading-none tracking-[0.08em] text-night shadow-sm";
  // Etiqueta solo en los paquetes ("Pacote · 3 serviços"): lo normal es el servicio suelto, y poner "Serviço" en todas confundía.
  const kindTag = kind === "paquete" ? `<span class="${pill}">${esc(n > 1 ? K.pkgN(n) : K.paquete)}</span>` : "";
  // Sello "Mejor precio" (se marca en el panel): va arriba a la izquierda, antes que el tipo.
  const best = parseMeta(p.meta).best ? `<span class="inline-flex items-center gap-1 rounded-full bg-ok px-3 py-1.5 text-[0.75rem] font-bold uppercase leading-none tracking-[0.06em] text-white shadow-sm">★ ${esc(L.lang === "es" ? "Mejor precio" : "Melhor preço")}</span>` : "";
  const sale = pct ? `<span class="rounded-full bg-accent px-3 py-1.5 text-[0.8125rem] font-bold leading-none text-white shadow-sm">-${pct}%</span>` : "";
  const img = p.image
    ? `<div class="tw-pkg-img relative overflow-hidden rounded-xl bg-mist"><img loading="lazy" alt="${esc(p.image_alt || p.title)}" src="${esc(p.image)}" class="block aspect-[4/3] w-full object-cover transition duration-700 ease-soft group-hover:scale-[1.04]"><div class="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2"><span class="flex flex-wrap gap-1.5">${best}${kindTag}</span>${sale}</div></div>`
    : "";
  const facts = cardFacts(p);
  const dur = (() => { const r = (parseMeta(p.meta).facts || []).find((x) => /duraci/i.test(x[0])); return r ? `<span class="inline-flex items-center gap-1.5">${CLOCK}<span>${esc(r[1])}</span></span>` : ""; })();
  const incl = n && !img ? `<span class="inline-flex items-center gap-1.5 font-semibold text-primary">${STACK}<span>${esc(K.includesN(n))}</span></span>` : "";
  // Horarios de salida (máx. 3 en la tarjeta; el resto se ve en la ficha)
  const tm = timesOf(p);
  const hor = tm.length ? `<span><span>${esc(L.timesShort || "Horarios")}</span> <span class="font-semibold text-ink">${esc(tm.slice(0, 3).map((r) => r[0]).join(" · ") + (tm.length > 3 ? " …" : ""))}</span></span>` : "";
  const meta = dur || incl || hor ? `<p class="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-mute">${dur}${hor}${incl}</p>` : facts;
  // Con reserva online, el botón lleva al formulario de la ficha; si no, consulta por WhatsApp.
  const cta = Number(p.booking_enabled) === 1
    ? `<a href="${href}#pedir" class="tw-btn tw-btn--sm tw-btn--primary relative z-10 shrink-0"><span>${esc(K.book)}</span></a>`
    : `<a data-gv-wa="${esc(p.title)}" href="${esc(wa)}" target="_blank" rel="noopener" class="tw-btn tw-btn--sm tw-btn--wa-line relative z-10 shrink-0">${WA_ICON}<span>${esc(L.ask)}</span></a>`;
  const ex = p.excerpt ? `<p class="m-0 line-clamp-2 text-[0.95rem] leading-relaxed text-mute">${esc(p.excerpt)}</p>` : "";
  return `<article data-dur="${hoursOf(p)}" data-kind="${esc(kind)}" data-fx="up" data-fx-delay="${(i % 3) * 0.08}" class="tw-pkg group relative flex flex-col [&[hidden]]:hidden">${img}<div class="flex flex-1 flex-col gap-2.5 pt-4">${meta}<h3 class="m-0 font-display text-[1.3125rem] font-semibold leading-tight text-ink"><a href="${href}" class="tw-card-title no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary"><span>${esc(p.title)}</span></a></h3>${ex}<div class="mt-auto flex items-end justify-between gap-3 pt-3">${priceHtml(p, L)}${cta}</div></div></article>`;
}

// Ahorro real de un paquete: solo si TODOS sus servicios tienen precio en la misma moneda y la suma supera el precio del paquete.
export function bundleSavings(p, parts) {
  const cur = (s) => String(s || "").match(/^[^\d]*/)[0].trim().toUpperCase(), num = (s) => Number(parsePrice(s));
  if (!p.price || !parts.length || !num(p.price)) return null;
  let sum = 0;
  for (const x of parts) { if (!x.price || !num(x.price) || cur(x.price) !== cur(p.price)) return null; sum += num(x.price); }
  const price = num(p.price);
  if (sum <= price) return null;
  const fmt = (n) => `${String(p.price).match(/^[^\d]*/)[0].trim()} ${Math.round(n).toLocaleString("es-AR")}`.trim();
  return { sum: fmt(sum), price: fmt(price), save: fmt(sum - price), pct: Math.round(((sum - price) / sum) * 100) };
}

// Ficha de un paquete: lista de servicios incluidos. Cada uno tiene su página, su precio y su consulta propios.
export function bundleSection(p, parts, L, waFor, plan = {}) {
  if (!parts.length) return "";
  const K = kindText(L.lang), q = plan.quote, items = plan.items || [];
  // Precio automático: el ahorro sale del mismo cálculo que el precio (suma de los servicios con la opción del itinerario − descuento).
  const fmt = (c) => `${q.cur} ${Math.round(c / 100).toLocaleString("es-AR")}`.trim();
  const sav = q ? (q.disc > 0 ? { sum: fmt(q.sum), price: fmt(q.unit), save: fmt(q.sum - q.unit), pct: q.disc } : null) : bundleSavings(p, parts);
  // Día y horario de cada servicio en el itinerario (solo si el paquete dura más de un día o algún servicio tiene hora u opción fija).
  const span = Math.max(1, ...items.map((i) => i.day)), byS = new Map(items.map((i) => [i.slug, i]));
  const tag = (x) => { const i = byS.get(x.slug); if (!i || (span < 2 && !i.planTime && !i.option)) return ""; const d = (L.lang === "es" ? "Día " : "Dia ") + i.day; return `<span class="gvi-tag">${esc([span > 1 ? d : "", i.planTime, i.option].filter(Boolean).join(" · "))}</span>`; };
  // Precio de cada servicio: el de la opción elegida en el itinerario (ej. Catulo "Cena Show" R$ 290), no el "a partir de" del servicio.
  const priced = (x) => { const i = byS.get(x.slug); if (!i || !i.option || !i.txt) return x; const o = optionsOf(x).find((y) => y.name === i.option); return { ...x, price: i.txt, price_old: o ? o.old || "" : "" }; };
  const row = (x) => {
    const thumb = x.image ? `<img src="${esc(x.image)}" alt="${esc(x.image_alt || x.title)}" loading="lazy" decoding="async" class="block size-24 shrink-0 rounded-lg object-cover sm:size-32">` : `<span class="grid size-24 shrink-0 place-items-center rounded-lg bg-mist text-mute sm:size-32">${STACK}</span>`;
    return `<li class="group relative flex gap-4 rounded-xl border border-ink/15 bg-white p-3 transition hover:border-primary/60 hover:shadow-sm sm:gap-5 sm:p-4">${thumb}<div class="flex min-w-0 flex-1 flex-col gap-1.5">${tag(x)}<h3 class="m-0 font-display text-lg font-semibold leading-snug text-ink"><a href="/paquetes/${esc(x.slug)}/" class="tw-card-title no-underline after:absolute after:inset-0 after:content-['']"><span>${esc(x.title)}</span></a></h3>${x.excerpt ? `<p class="m-0 line-clamp-2 text-[0.9375rem] leading-snug text-mute">${esc(x.excerpt)}</p>` : ""}<div class="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-2">${priceHtml(priced(x), L)}<span class="flex items-center gap-3 text-sm font-semibold"><span class="text-primary">${esc(K.detail)} →</span><a data-gv-wa="${esc(x.title)}" href="${esc(waFor(x))}" target="_blank" rel="noopener" class="relative z-10 text-mute underline-offset-4 hover:text-ink hover:underline">${esc(K.ask)}</a></span></div></div></li>`;
  };
  // En el orden del itinerario: por día y horario (no en el orden en que se cargaron).
  const ordered = [...parts].sort((a, b) => { const x = byS.get(a.slug), y = byS.get(b.slug); return (x ? x.day : 99) - (y ? y.day : 99) || String((x && x.planTime) || "").localeCompare(String((y && y.planTime) || "")); });
  const box = sav
    ? `<div class="mt-6 grid gap-1 rounded-xl bg-mist p-5 sm:grid-cols-3 sm:gap-6"><p class="m-0 text-sm text-mute">${esc(K.apart)}<br><s class="font-display text-xl font-semibold text-mute">${esc(sav.sum)}</s></p><p class="m-0 text-sm text-mute">${esc(K.together)}<br><strong class="font-display text-xl font-semibold text-ink">${esc(sav.price)}</strong></p><p class="m-0 text-sm text-mute">${esc(K.save)}<br><strong class="font-display text-xl font-semibold text-cta">${esc(sav.save)} (${sav.pct}%)</strong></p></div>`
    : "";
  return `<section id="servicios-incluidos" data-fx="up" class="mt-16 scroll-mt-24"><h2 class="m-0 font-display text-h3 font-semibold text-ink">${esc(K.bundleH)}</h2><p class="m-0 mb-6 mt-2 max-w-2xl text-mute">${esc(K.bundleP)}</p><ul class="m-0 grid list-none gap-4 p-0">${ordered.map(row).join("")}</ul>${box}</section>`;
}

// Filtro Paquetes / Servicios de los listados (solo si hay de los dos tipos). active: "", "paquete" o "servicio".
export function kindSwitch(base, kinds, active, L) {
  if (!(kinds.has("paquete") && kinds.has("servicio"))) return "";
  const K = kindText(L.lang);
  const a = (k, label) => `<a href="${esc(k === "servicio" ? "/servicios/" : base + (k ? `?tipo=${k}` : ""))}"${k === active ? ' aria-current="true"' : ""} class="inline-flex min-h-11 items-center rounded-full border px-5 text-[0.9375rem] font-semibold no-underline transition ${k === active ? "border-primary bg-primary text-white" : "border-ink/20 text-ink hover:border-primary hover:text-primary"}">${esc(label)}</a>`;
  return `<nav aria-label="${esc(K.kinds)}" class="mb-8 flex flex-wrap gap-2">${a("", K.all)}${a("paquete", K.kindsP)}${a("servicio", K.kindsS)}</nav>`;
}

// Bloque de una lista de paquetes: título opcional + chips/filtros + grilla de tarjetas.
export function pkgSection(pkgs, chips, wa, L, title = "") {
  const cards = pkgs.map((p, i) => pkgCard(p, wa(p), L, i)).join("");
  return `<div>${title ? `<h2 class="m-0 mb-8 font-display text-h3 font-semibold text-ink">${esc(title)}</h2>` : ""}${chips}${cards ? `<div class="${CARD_GRID}">${cards}</div>` : `<p class="m-0 py-10 text-center text-mute">${esc(L.empty)}</p>`}</div>`;
}

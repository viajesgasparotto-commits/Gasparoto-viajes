// Layout único del sitio público: cabecera, pie, SEO. Todas las páginas pasan por renderPage().
import { esc } from "./html.js";
import { BRAND, LOGO, siteUrl, absUrl, ldScript } from "./seo.js";

// Animaciones (Motion): se ocultan los [data-fx] solo si hay JS y el usuario no pidió "reducir movimiento".
// Si fx.js no carga en 4 s, se muestra todo igual. Cuando cambie tw.css o fx.js, subir ?v= en renderPage() (tw.css ?v=19, fx.js ?v=8).
const FX_BOOT = `(function(d){if(!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("fx-on");setTimeout(function(){if(!window.__fx)d.classList.remove("fx-on")},4000)}})(document.documentElement)`;

// ---- Utilidades del blog (las usan las tarjetas, la ficha y el RSS) ----
export const stripTags = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
// Con el texto: cuenta palabras. En los listados no se trae el texto: se usa read_mins (guardado al publicar) y,
// para entradas viejas que aún no lo tienen, se estima con content_len (largo del HTML, ~8 caracteres por palabra).
export const readMins = (p) => (p.content != null
  ? Math.max(1, Math.ceil(stripTags(p.content).split(" ").filter(Boolean).length / 200))
  : Number(p.read_mins) > 0 ? Number(p.read_mins)
  : Math.max(1, Math.ceil(Number(p.content_len || 0) / 8 / 200)));
export const postDay = (p) => String(p.publish_date || p.created_at || "").slice(0, 10);
const LOCALE = { "pt-BR": "pt-BR", es: "es-AR", en: "en-US" }; // para fechas
const OG_LOCALE = { "pt-BR": "pt_BR", es: "es_AR", en: "en_US" };
export const fmtDate = (d, lang = "es") => {
  const s = String(d || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  try { return new Intl.DateTimeFormat(LOCALE[lang] || "es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(s + "T12:00:00Z")); }
  catch { return s.split("-").reverse().join("/"); }
};

let E = {};
export const initLayout = (env) => { E = env; };
export const langOf = (env = E) => String(env.SITE_LANG || "es").trim();
export const stubShell = (env = E) => `<html lang="${esc(langOf(env))}">`;

const T = {
  es: { pk: "Paquetes", sv: "Servicios", all: "Paseos y paquetes", nav1: "Paseos", blog: "Blog", about: "Nosotros", book: "Reservar", skip: "Ir al contenido", menu: "Menú", terms: "Términos y condiciones", how: "Cómo reservar", nav: "Principal", foot: "Pie", contact: "Contacto", explore: "Explorá", follow: "Seguinos", addr: "Florida 537, Local 356, C1005 Ciudad Autónoma de Buenos Aires" },
  en: { pk: "Packages", sv: "Services", all: "Tours and packages", nav1: "Tours", blog: "Blog", about: "About us", book: "Book now", skip: "Skip to content", menu: "Menu", terms: "Terms and conditions", how: "How to book", nav: "Main", foot: "Footer", contact: "Contact", explore: "Explore", tr: "Transfers", follow: "Follow us", addr: "Florida 537, Local 356, C1005 Autonomous City of Buenos Aires" },
  "pt-BR": { pk: "Pacotes", sv: "Serviços", all: "Passeios e pacotes", nav1: "Passeios", blog: "Blog", about: "Sobre nós", book: "Reservar", skip: "Ir para o conteúdo", menu: "Menu", terms: "Termos e condições", how: "Como reservar", nav: "Principal", foot: "Rodapé", contact: "Contato", explore: "Explore", tr: "Traslados", follow: "Siga-nos", addr: "Florida 537, Local 356, C1005 Cidade Autônoma de Buenos Aires" },
};
export const tr = (env = E) => T[langOf(env)] || T.es;

export const waUrl = (env, text = "") => {
  const n = String(env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  return n ? `https://wa.me/${n}${text ? "?text=" + encodeURIComponent(text) : ""}` : "/reservas/";
};


// ---- Cabecera y pie (Tailwind). Animación del menú: src/scripts/fx.ts. Sistema visual: src/styles/tw.css.
// Marca en texto (no imagen): "Gasparotto" grande y "Viajes" debajo, como el logotipo. El logo PNG queda para favicon, OG y JSON-LD.
const wordmark = (cls = "", subCls = "") => { const [a, ...r] = String(BRAND).split(" "); return `<span class="block font-display font-bold leading-none tracking-tight ${cls}">${esc(a)}</span>${r.length ? `<span class="mt-1 block text-[0.8125rem] font-semibold leading-none tracking-[0.32em] tw-sub ${subCls}">${esc(r.join(" "))}</span>` : ""}`; };
const NAV_LINK = (href, label) =>
  `<a href="${href}" class="group relative py-2 no-underline"><span class="font-semibold text-current/80 transition duration-200 group-hover:text-current">${label}</span><i class="absolute inset-x-0 -bottom-0.5 block h-0.5 origin-left scale-x-0 bg-current transition duration-300 group-hover:scale-x-100"></i></a>`;
const MENU_LINK = (href, label) =>
  `<a data-menu-item href="${href}" class="block border-b border-ink/10 py-4 no-underline"><span class="font-display text-3xl font-semibold text-ink">${label}</span></a>`;
const CTA = (href, label, extra = "") =>
  `<a href="${href}" class="tw-btn tw-btn--primary min-h-11 px-5 ${extra}"><span>${label}</span></a>`;

function siteHeader(t) {
  const links = [["/paquetes/", t.nav1 || t.pk], ["/paquetes/?tipo=paquete", t.pk], ["/blog/", t.blog], ["/nosotros/", t.about], ["/contacto/", t.contact]];
  return `<header data-site-header class="tw-header sticky top-0 z-50 border-b transition-[background-color,box-shadow,color] duration-300 data-[stuck]:shadow-soft">
<div class="tw-wrap flex h-18 items-center justify-between gap-4">
<a href="/" aria-label="${esc(BRAND)}" class="shrink-0 no-underline"><span class="block">${wordmark("text-[1.65rem]")}</span></a>
<nav aria-label="${t.nav}" class="hidden items-center gap-6 md:flex lg:gap-9">${links.map(([h, l]) => NAV_LINK(h, l)).join("")}${CTA("/paquetes/", t.book)}</nav>
<details data-menu class="group md:hidden">
<summary aria-label="${t.menu}" class="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg border border-current/30 px-4 [&::-webkit-details-marker]:hidden"><span class="text-sm font-semibold">${t.menu}</span><span aria-hidden="true" class="relative block h-3 w-5"><i class="absolute inset-x-0 top-0 block h-0.5 bg-current transition duration-300 group-open:translate-y-[5px] group-open:rotate-45"></i><i class="absolute inset-x-0 bottom-0 block h-0.5 bg-current transition duration-300 group-open:-translate-y-[5px] group-open:-rotate-45"></i></span></summary>
<nav data-menu-panel aria-label="${t.nav}" class="absolute inset-x-0 top-full border-b border-ink/10 bg-white px-5 pb-6 pt-2 text-ink shadow-soft">${links.map(([h, l]) => MENU_LINK(h, l)).join("")}<div data-menu-item class="pt-5">${CTA("/paquetes/", t.book, "w-full")}</div></nav>
</details>
</div>
<i data-progress aria-hidden="true" class="tw-progress"></i>
</header>`;
}

function siteFooter(t) {
  const col = (title, items) => `<div><p class="m-0 mb-4 text-[0.9375rem] font-semibold text-celeste">${title}</p><ul class="m-0 grid list-none gap-2.5 p-0">${items.map(([h, l, ext]) => `<li><a href="${h}"${ext ? ' rel="noopener me"' : ""} class="no-underline"><span class="text-white/75 transition duration-200 hover:text-white">${l}</span></a></li>`).join("")}</ul></div>`;
  return `<footer class="bg-night text-white">
<div class="tw-wrap grid gap-14 py-16 sm:py-24 md:grid-cols-[1.6fr_1fr_1fr]">
<div><a href="/" aria-label="${esc(BRAND)}" class="block no-underline"><span class="block text-white">${wordmark("text-[clamp(2.75rem,6vw,4.75rem)] !tracking-[-0.03em]", "text-celeste")}</span></a><p class="m-0 mt-8 max-w-xs leading-relaxed text-white/75">${t.addr}</p><a href="tel:+541164199083" class="mt-3 inline-block no-underline"><span class="font-semibold text-white">+54 11 6419-9083</span></a></div>
${col(t.explore, [["/paquetes/", t.nav1 || t.pk], ["/paquetes/?tipo=paquete", t.pk], ["/servicios/", t.sv], ["/traslados/", t.tr || "Traslados"], ["/nosotros/", t.about], ["/contacto/", t.contact], ["/blog/", t.blog]])}
${col(t.follow, [["https://www.instagram.com/gasparottoviajes/", "Instagram", 1], ["https://www.facebook.com/profile.php?id=61578579680087", "Facebook", 1], ["https://www.tiktok.com/@gasparotto.viajes", "TikTok", 1]])}
</div>
<div class="border-t border-white/15"><p class="tw-wrap m-0 py-5 text-sm text-white/60">© ${new Date().getFullYear()} ${esc(BRAND)}</p></div>
</footer>`;
}

export function renderPage(_shell, m) {
  const env = m.env || E, t = tr(env), lang = langOf(env), site = siteUrl(env);
  const canonical = m.canonical || site + "/";
  const img = m.image || absUrl(env, LOGO);
  // Vista previa al compartir: varias fotos del paquete (m.images); si no hay ninguna, la imagen de siempre (y el logo como último recurso).
  const shareImgs = Array.isArray(m.images) && m.images.length ? m.images : (img ? [img] : []);
  const ld = m.ld || "";
  return `<!doctype html>
<html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(m.title)}</title><meta name="description" content="${esc(m.desc || "")}"><link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${esc(m.ogType || "website")}"><meta property="og:site_name" content="${esc(BRAND)}"><meta property="og:title" content="${esc(m.title)}"><meta property="og:description" content="${esc(m.desc || "")}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:locale" content="${OG_LOCALE[lang] || "es_AR"}"><meta name="robots" content="${esc(m.robots || "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1")}">${shareImgs.map((u) => `<meta property="og:image" content="${esc(u)}">`).join("")}${img ? `<meta property="og:image:alt" content="${esc(m.imageAlt || m.title)}">` : ""}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(m.title)}"><meta name="twitter:description" content="${esc(m.desc || "")}">${img ? `<meta name="twitter:image" content="${esc(img)}">` : ""}${m.metaExtra || ""}
<link rel="icon" href="${esc(LOGO)}"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Besley:ital,wght@0,500..800;1,500..800&family=Familjen+Grotesk:wght@400..700&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..600&display=swap"><link rel="stylesheet" href="/assets/tw.css?v=21"><link rel="alternate" type="application/rss+xml" title="${esc(BRAND)} · Blog" href="/blog/feed.xml"><script>${FX_BOOT}</script>${ld}</head>
<body><a href="#contenido" class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[99] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-soft"><span class="font-bold text-primary">${t.skip}</span></a>
${siteHeader(t)}
<main id="contenido">${m.body}</main>
${siteFooter(t)}
<script defer src="/assets/fx.js?v=9"></script></body></html>`;
}

// Tarjeta de entrada del blog (listados, portada y "Seguí leyendo"): foto, rótulo de categoría + minutos de lectura, título, bajada y fecha.
// opts: { i: posición (escalona la entrada), eager: foto de la primera pantalla (sin lazy, prioridad alta) }.
export const postCardHtml = (p, cat, opts = {}) => {
  const lang = langOf(opts.env || E), delay = ((opts.i || 0) % 3) * 0.08;
  const mins = p.content != null || p.read_mins != null || p.content_len != null ? readMins(p) : 0, day = fmtDate(postDay(p), lang);
  const photo = p.image
    ? `<img src="${esc(p.image)}" alt="${esc(p.image_alt || p.title)}" ${opts.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="720" height="480" class="block aspect-[3/2] w-full object-cover transition duration-700 ease-soft group-hover:scale-[1.04]">`
    : `<span class="grid aspect-[3/2] place-items-center"><img src="${esc(LOGO)}" alt="" loading="lazy" class="h-14 w-auto opacity-30"></span>`;
  const kick = [cat ? `<span class="text-accent">${esc(cat.label)}</span>` : "", mins ? `<span>${mins} min</span>` : ""].filter(Boolean).join('<i aria-hidden="true" class="block size-1 rounded-full bg-current opacity-40"></i>');
  return `<article data-fx="up" data-fx-delay="${delay}" class="group relative flex flex-col"><div class="overflow-hidden rounded-lg bg-mist">${photo}</div><div class="flex flex-1 flex-col pt-5">${kick ? `<p class="m-0 flex items-center gap-2.5 text-[0.75rem] font-bold uppercase leading-none tracking-[0.14em] text-mute">${kick}</p>` : ""}<h3 class="m-0 mt-3 font-display text-[1.375rem] font-semibold leading-[1.2] tracking-[-0.01em] text-ink"><a href="/blog/${esc(p.slug)}/" class="tw-card-title no-underline after:absolute after:inset-0 after:content-['']"><span>${esc(p.title)}</span></a></h3>${p.excerpt ? `<p class="m-0 mt-2.5 line-clamp-3 text-[0.95rem] leading-relaxed text-mute">${esc(p.excerpt)}</p>` : ""}${day ? `<p class="m-0 mt-4 text-sm text-mute"><time datetime="${esc(postDay(p))}">${esc(day)}</time></p>` : ""}</div></article>`;
};

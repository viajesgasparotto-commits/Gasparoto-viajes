// Utilidades SEO y de seguridad de contenido.
import { SITE } from "./site.js";
import { alternateLinks } from "./i18n.js";

// Marca por defecto neutra; cada agencia la define con BRAND_NAME / BRAND_LOGO (ver WHITE-LABEL.md).
// "let" exportado: los módulos que importan BRAND ven el valor actualizado después de initBrand(env).
export let BRAND = "Agencia de viajes";
export let LOGO = "/assets/logo.png";
let ORIGIN = ""; // origen de la petición; solo se usa para armar URLs si falta SITE_URL
// SITE_LANG ("es" | "pt-BR"): idioma de los textos nuevos (botones, fichas); si no se define, sigue el <html lang> de la página.
export let LANG = "";
export function initBrand(env = {}, origin = "") {
  ORIGIN = origin;
  LANG = env.SITE_LANG ? String(env.SITE_LANG).trim() : "";
  if (env.BRAND_NAME) BRAND = String(env.BRAND_NAME).trim();
  if (env.BRAND_LOGO) LOGO = String(env.BRAND_LOGO).trim();
}

const escAttr = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Sin SITE_URL el sitio se sirve como "no indexar" (seguro por defecto: nunca se indexa un dominio de prueba por olvido).
// Si SITE_URL se cargó sin "https://" se lo agrega; si es inválida, el sitio no se cae: sale como "no indexar".
export const siteUrl = (env) => {
  let u = String(env.SITE_URL || "").trim();
  if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;
  return (u || ORIGIN).replace(/\/+$/, "");
};
export const isProdHost = (env, url) => {
  try { return !!env.SITE_URL && new URL(siteUrl(env)).host === url.host; } catch { return false; }
};

// Moneda para el JSON-LD: se deduce del texto del precio; si es ambiguo ("$ 100") usa PRICE_CURRENCY (ej. ARS); por defecto BRL.
export function priceCurrency(env, text) {
  const t = String(text || "");
  if (/AR\$|\bARS\b/i.test(t)) return "ARS";
  if (/US\$|U\$S|\bUSD\b/i.test(t)) return "USD";
  if (/€|\bEUR\b/i.test(t)) return "EUR";
  if (/R\$|\bBRL\b/i.test(t)) return "BRL";
  const c = String((env && env.PRICE_CURRENCY) || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : "BRL";
}
export const absUrl = (env, u) => (!u ? "" : /^https?:\/\//i.test(u) ? u : siteUrl(env) + (u.startsWith("/") ? u : "/" + u));

export const stripTags = (h = "") =>
  String(h).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// Recorta en límite de palabra, para descripciones de ~155 caracteres.
export function clip(s, n = 155) {
  s = stripTags(s);
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > 80 ? cut.slice(0, sp) : cut).replace(/[,.;:\s]+$/, "") + "…";
}

export const pageTitle = (t) => {
  t = String(t || "").trim();
  const key = BRAND.split(/\s+/)[0].toLowerCase();
  return t.toLowerCase().includes(key) ? t : `${t} | ${BRAND}`;
};

// "R$ 1.234,50" -> "1234.50" · "R$ 445" -> "445" · "R$ 1.234" -> "1234"
export function parsePrice(s) {
  const m = String(s || "").match(/\d[\d.,]*/);
  if (!m) return null;
  let n = m[0];
  if (/,\d{1,2}$/.test(n)) n = n.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(n)) n = n.replace(/[.,]/g, "");
  return Number.isFinite(Number(n)) ? n : null;
}

// SQLite guarda "YYYY-MM-DD HH:MM:SS" en UTC.
export const isoDate = (d) => (d ? String(d).replace(" ", "T").replace(/Z?$/, "Z") : undefined);
export const ymd = (d) => String(d || "").slice(0, 10);

// ---------- Sanitizador HTML (allowlist) ----------
const ALLOWED = new Set("p br strong b em i u s h2 h3 h4 ul ol li a img blockquote figure figcaption hr span div table thead tbody tr th td".split(" "));
const VOID = new Set(["br", "img", "hr"]);
const ATTRS = { a: ["href", "title", "target", "rel", "class"], img: ["src", "alt", "title", "width", "height", "loading"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"], div: ["class"], p: ["class"], span: ["class"], figure: ["class"], figcaption: [], blockquote: ["class"] };
// Solo clases de diseño del blog (gvb-*): el resto del HTML pegado se descarta.
const cleanClass = (v) => String(v).split(/\s+/).filter((c) => /^gvb(-[a-z0-9]+)?$/.test(c)).join(" ");

const decodeEntities = (s) =>
  s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16) || 32))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d) || 32))
    .replace(/&colon;/gi, ":")
    .replace(/&(tab|newline);/gi, "")
    .replace(/&amp;/gi, "&");

const safeUrl = (u) => /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(decodeEntities(String(u)).replace(/[\u0000-\u0020]+/g, ""));

export function sanitizeHtml(html = "") {
  const s = String(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi, "");
  return s.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_m, close, tag, rest) => {
    tag = tag.toLowerCase();
    if (!ALLOWED.has(tag)) return "";
    if (close) return VOID.has(tag) ? "" : `</${tag}>`;
    const keep = ATTRS[tag] || [];
    let out = "";
    const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let a;
    while ((a = re.exec(rest))) {
      const name = a[1].toLowerCase();
      const val = a[2] ?? a[3] ?? a[4] ?? "";
      if (!keep.includes(name)) continue;
      if ((name === "href" || name === "src") && !safeUrl(val)) continue;
      if (name === "class") { const c = cleanClass(val); if (c) out += ` class="${c}"`; continue; }
      out += ` ${name}="${val.replace(/"/g, "&quot;")}"`;
    }
    if (tag === "a" && / target="_blank"/.test(out)) out = out.replace(/ rel="[^"]*"/, "") + ' rel="noopener noreferrer"';
    if (tag === "img") {
      if (!/ src="/.test(out)) return ""; // sin src válido no hay imagen
      if (!/ loading=/.test(out)) out += ' loading="lazy"';
    }
    return `<${tag}${out}>`;
  });
}

// ---------- JSON-LD ----------
export const ldScript = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

export function breadcrumbLd(env, items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absUrl(env, it.path) })),
  };
}

const orgRef = (env) => ({ "@id": `${siteUrl(env)}/#organization` });

// VideoObject para Google (necesita miniatura y fecha: sin imagen no se emite).
function videoLd(env, p, url, desc, image) {
  if (!p.video || !image) return null;
  return { "@type": "VideoObject", "@id": url + "#video", name: p.title, description: desc || p.title, thumbnailUrl: [image], uploadDate: isoDate(p.created_at) || isoDate(p.updated_at) || new Date().toISOString().slice(0, 10), contentUrl: absUrl(env, p.video) };
}

// Persona (autor o revisor) para schema.org. Con perfil público lleva URL, cargo, foto y enlaces; si no, solo el nombre.
export function personLd(env, a) {
  const site = siteUrl(env);
  if (!a || !a.name) return null;
  if (!a.isPublic) return { "@type": "Person", name: a.name };
  const same = (a.links || []).map((l) => l.url).filter(Boolean);
  return {
    "@type": "Person", "@id": `${site}/autor/${a.slug}/#person`, name: a.name, url: `${site}/autor/${a.slug}/`,
    ...(a.headline ? { jobTitle: a.headline } : {}),
    ...(a.bio ? { description: a.bio.replace(/\s+/g, " ").slice(0, 300) } : {}),
    ...(a.avatar ? { image: absUrl(env, a.avatar) } : {}),
    ...(same.length ? { sameAs: same } : {}),
    worksFor: orgRef(env),
  };
}

export function postLd(env, p, { url, desc, image }) {
  const site = siteUrl(env), lang = p.lang || "es";
  const pub = p.publish_date || isoDate(p.created_at);
  const mod = isoDate(p.updated_at) || pub;
  const author = personLd(env, p.author), reviewer = personLd(env, p.reviewer);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": url + "#article",
        mainEntityOfPage: { "@type": "WebPage", "@id": url, ...(reviewer ? { reviewedBy: reviewer } : {}) },
        url,
        headline: String(p.title).slice(0, 110),
        description: desc,
        isAccessibleForFree: true,
        ...(image ? { image: [image], thumbnailUrl: image } : {}),
        datePublished: pub,
        dateModified: mod > pub ? mod : pub,
        author: author || { "@type": "Organization", "@id": site + "/#organization", name: BRAND, url: site + "/" },
        ...(p.sourcesList && p.sourcesList.length ? { citation: p.sourcesList.map((x) => ({ "@type": "CreativeWork", name: x.label, url: x.url })) } : {}),
        publisher: { ...orgRef(env), "@type": "Organization", name: BRAND, logo: { "@type": "ImageObject", url: absUrl(env, LOGO) } },
        isPartOf: { "@type": "Blog", "@id": site + "/blog/#blog", name: BRAND + " · Blog", url: site + "/blog/" },
        ...(p.section ? { articleSection: p.section, keywords: p.section } : {}),
        ...(p.words ? { wordCount: p.words } : {}),
        inLanguage: lang,
      },
      ...[videoLd(env, p, url, desc, image)].filter(Boolean),
      breadcrumbLd(env, [
        { name: ({ es: "Inicio", en: "Home" }[lang] || "Início"), path: "/" },
        { name: "Blog", path: "/blog/" },
        ...(p.section && p.sectionPath ? [{ name: p.section, path: p.sectionPath }] : []),
        { name: p.title, path: new URL(url).pathname },
      ]),
    ],
  };
}

// Índice del blog y páginas de categoría: CollectionPage + Blog (con las últimas entradas) + migas de pan.
export function blogIndexLd(env, { url, title, desc, lang = "es", posts = [], crumbs = [] }) {
  const site = siteUrl(env);
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": url + "#page", url, name: title, description: desc, inLanguage: lang, isPartOf: { "@id": site + "/blog/#blog" } },
      {
        "@type": "Blog", "@id": site + "/blog/#blog", url: site + "/blog/", name: BRAND + " · Blog", inLanguage: lang, publisher: orgRef(env),
        blogPost: posts.slice(0, 12).map((x) => ({ "@type": "BlogPosting", headline: String(x.title).slice(0, 110), url: `${site}/blog/${x.slug}/`, datePublished: x.publish_date || isoDate(x.created_at), ...(x.image ? { image: absUrl(env, x.image) } : {}) })),
      },
      breadcrumbLd(env, [{ name: ({ es: "Inicio", en: "Home" }[lang] || "Início"), path: "/" }, ...crumbs]),
    ],
  };
}

// Título y descripción de la ficha de paquete o servicio. Lo que la agencia escribió para Google (seo_title / seo_description) manda;
// si falta, se arma con el nombre, la categoría, el tipo y el precio, así ninguna ficha queda sin descripción ni con un título genérico.
export function packageSeo(p, { kindLabel = "", catLabel = "", priceTxt = "", lang = "es" } = {}) {
  const pt = lang !== "es";
  let title = String(p.seo_title || "").trim();
  if (!title) {
    title = String(p.title || "").trim();
    const cat = String(catLabel || "").trim();
    if (cat && !title.toLowerCase().includes(cat.toLowerCase()) && title.length + cat.length + 3 <= 48) title = `${title} · ${cat}`;
  }
  let desc = String(p.seo_description || "").trim();
  if (!desc) {
    const excerpt = stripTags(p.excerpt || "") || stripTags(p.content || "");
    if (excerpt.length >= 100) desc = clip(excerpt);
    else {
      const kind = kindLabel ? `${kindLabel} ` : "";
      const price = priceTxt ? (pt ? ` a partir de ${priceTxt}` : ` desde ${priceTxt}`) : "";
      const head = `${kind}${p.title}${price}.`;
      const cta = pt ? "Consulte disponibilidade pelo WhatsApp." : "Consultá disponibilidad por WhatsApp.";
      const room = 155 - head.length - cta.length - 2;
      const extra = room > 40 && excerpt ? clip(excerpt, room) : "";
      desc = clip([head, extra, cta].filter(Boolean).join(" "));
    }
  }
  return { title, desc };
}

export function packageLd(env, p, { url, desc, image, listing, lang, times = [], kind = "", options = [] }) {
  const isService = kind === "servicio";
  const price = parsePrice(p.price);
  // Con 2 o más opciones con precio: AggregateOffer (precio mínimo y máximo) con una Offer por opción.
  const priced = options.filter((o) => o.cents > 0);
  const agg = priced.length >= 2
    ? { "@type": "AggregateOffer", url, priceCurrency: priceCurrency(env, priced[0].price), lowPrice: (Math.min(...priced.map((o) => o.cents)) / 100).toFixed(2), highPrice: (Math.max(...priced.map((o) => o.cents)) / 100).toFixed(2), offerCount: priced.length, availability: "https://schema.org/InStock", seller: orgRef(env),
        offers: priced.map((o) => ({ "@type": "Offer", name: o.name, price: (o.cents / 100).toFixed(2), priceCurrency: priceCurrency(env, o.price), url, availability: "https://schema.org/InStock" })) }
    : null;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": isService ? "Service" : "Product",
        "@id": url + (isService ? "#service" : "#product"),
        name: p.title,
        description: desc,
        ...(image ? { image: [image] } : {}),
        ...(isService ? { provider: orgRef(env) } : { brand: { "@type": "Brand", name: BRAND } }),
        ...(listing ? { category: listing.label } : {}),
        ...(times.length ? { additionalProperty: [{ "@type": "PropertyValue", name: lang === "es" ? "Horarios de salida" : "Horários de saída", value: times.join(", ") }] } : {}),
        url,
        ...(agg ? { offers: agg } : price
          ? { offers: { "@type": "Offer", url, priceCurrency: priceCurrency(env, p.price), price, availability: "https://schema.org/InStock", seller: orgRef(env) } }
          : {}),
      },
      ...[videoLd(env, p, url, desc, image)].filter(Boolean),
      breadcrumbLd(env, [
        { name: ({ es: "Inicio", en: "Home" }[lang] || "Início"), path: "/" },
        ...(listing ? [{ name: listing.label, path: listing.listing }] : []),
        { name: p.title, path: new URL(url).pathname },
      ]),
    ],
  };
}

// Organization + TravelAgency de la portada. Los datos salen de SITE.business (site.js), nunca del código.
export function orgLd(env) {
  const site = siteUrl(env), b = SITE.business || {}, name = BRAND;
  const hasAddr = !!b.street;
  const hasGeo = Number.isFinite(b.lat) && Number.isFinite(b.lng);
  return {
    "@type": ["Organization", "TravelAgency"],
    "@id": `${site}/#organization`,
    name,
    url: site + "/",
    logo: { "@type": "ImageObject", url: absUrl(env, LOGO) },
    image: absUrl(env, LOGO),
    ...(b.phone ? { telephone: b.phone, contactPoint: { "@type": "ContactPoint", telephone: b.phone, contactType: "customer service" } } : {}),
    ...(hasAddr ? { address: { "@type": "PostalAddress", streetAddress: b.street, postalCode: b.postalCode || undefined, addressLocality: b.locality || undefined, addressCountry: b.country || undefined } } : {}),
    ...(hasGeo ? { geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng } } : {}),
    ...(hasAddr ? { hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([b.street, b.locality].filter(Boolean).join(", "))}` } : {}),
    ...(b.locality ? { areaServed: { "@type": "City", name: b.locality } } : {}),
    ...(Array.isArray(b.sameAs) && b.sameAs.length ? { sameAs: b.sameAs } : {}),
  };
}

export function websiteLd(env) {
  const site = siteUrl(env);
  return { "@type": "WebSite", "@id": `${site}/#website`, url: site + "/", name: BRAND, inLanguage: "pt-BR", publisher: { "@id": `${site}/#organization` },
    // Caja de búsqueda del blog (habilita el buscador en los resultados de Google).
    potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${site}/blog/buscar/?q={search_term_string}` }, "query-input": "required name=search_term_string" } };
}

// ---------- sitemap.xml / robots.txt ----------
export function buildSitemap(env, entries) {
  const base = siteUrl(env);
  // Imágenes de entradas y paquetes (sitemap de imágenes): ayudan a aparecer en la búsqueda de imágenes.
  const pic = (src) => (/^https?:\/\//i.test(src) ? src : base + (src.startsWith("/") ? src : "/" + src));
  const rows = entries
    .map(({ path, lastmod, image, alts }) => {
      const img = image ? `<image:image><image:loc>${escAttr(pic(image))}</image:loc></image:image>` : "";
      const xl = alts && alts.length ? alternateLinks(base, alts, "xhtml:link") : "";
      return `  <url><loc>${escAttr(base + path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${img}${xl}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows}\n</urlset>\n`;
}

export function buildRobots(env, prod) {
  if (!prod) return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /mcp/\nDisallow: /blog/buscar/\nDisallow: /?p=\n\nSitemap: ${siteUrl(env)}/sitemap.xml\n`;
}

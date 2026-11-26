// Idiomas del sitio público. El portugués es el idioma principal (raíz, URLs actuales sin cambios).
// El español vive bajo /es/ y el inglés bajo /en/; ambos solo tienen páginas para el contenido que tiene traducción (ver translations.js).
export const PT = "pt-BR", ES = "es", EN = "en";
// Idiomas con traducción (prefijo de URL = código). Para sumar otro idioma: agregarlo acá, en HREFLANG y en los textos de render.js / blog.js / html.js.
export const TRANSLATED = [ES, EN];
const HREFLANG = { [PT]: "pt-BR", [ES]: "es-AR", [EN]: "en-US" };

// Separa el prefijo de idioma: /es/paquetes/x/ → { lang: "es", path: "/paquetes/x/" } · /en/blog/x/ → { lang: "en", path: "/blog/x/" }
export function splitLang(pathname) {
  const m = pathname.match(/^\/(es|en)(\/.*)?$/);
  if (!m) return { lang: PT, path: pathname };
  return { lang: m[1], path: m[2] || "/" };
}
// Ruta pública en un idioma a partir de la ruta interna: langPathOf("en", "/blog/x/") → /en/blog/x/
export const langPathOf = (lang, path) => (lang === PT ? path : "/" + lang + path);
// Ruta de una ficha según su tipo: packages → /paquetes/<slug>/, posts → /blog/<slug>/
export const itemPath = (table, slug) => `/${table === "posts" ? "blog" : "paquetes"}/${slug}/`;

const attr = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Lista de { lang, path } → etiquetas <link rel="alternate" hreflang> más x-default (la versión portuguesa).
// Sirve tanto para el <head> de las páginas como para el sitemap (con el mismo formato de Google).
export function alternateLinks(base, alts, tag = "link") {
  const out = alts.map((a) => `<${tag} rel="alternate" hreflang="${HREFLANG[a.lang]}" href="${attr(base + a.path)}"${tag === "link" ? "" : "/"}>`);
  const pt = alts.find((a) => a.lang === PT);
  if (pt) out.push(`<${tag} rel="alternate" hreflang="x-default" href="${attr(base + pt.path)}"${tag === "link" ? "" : "/"}>`);
  return out.join("");
}

// Inserta las etiquetas dentro del <head> (sin tocar el resto de la página).
export function addToHead(html, tags) {
  return tags ? html.replace(/<\/head>/i, tags + "</head>") : html;
}

// Cambia las URLs de la versión portuguesa por las españolas dentro de una página ya armada
// (canonical, og:url, JSON-LD). Debe correr antes de agregar las etiquetas hreflang.
export function localizeUrls(html, base, fromPath, toPath) {
  return html.split(base + fromPath).join(base + toPath);
}

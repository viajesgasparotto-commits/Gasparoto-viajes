// Traducciones de paquetes y artículos (español e inglés). Cada contenido tiene un slug propio por idioma
// (/es/paquetes/<slug-es>/, /en/blog/<slug-en>/) y los textos traducidos se guardan como JSON en la tabla translations.
import { ES, EN, TRANSLATED } from "./i18n.js";

// Idiomas disponibles por tipo de contenido. El inglés es solo para el blog: las fichas de paquetes (reserva, precios, formularios) siguen en portugués y español.
export const LANGS_BY_KIND = { packages: [ES], posts: [ES, EN] };
export const langAllowed = (kind, lang) => (LANGS_BY_KIND[kind] || []).includes(lang);

// Campos traducibles y su largo máximo. Lo que no está acá sigue siendo el contenido portugués (fechas, imágenes, categorías, paquetes incluidos).
export const TRANS_FIELDS = {
  packages: { title: 200, excerpt: 600, content: 200000, details: 20000, times: 2000, seo_title: 120, seo_description: 320, image_alt: 200, price: 60, price_old: 60 },
  posts: { title: 200, excerpt: 600, content: 200000, seo_title: 120, seo_description: 320, image_alt: 200 },
};
export const KINDS = Object.keys(TRANS_FIELDS);
// Estado editorial de una traducción. Solo "publicada" se ve en el sitio, en el hreflang y en el sitemap.
export const STATUSES = ["borrador", "revision", "publicada"];
export const LIVE_STATUS = "publicada";
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const parse = (s) => { try { return JSON.parse(s || "{}") || {}; } catch { return {}; } };
const one = (db, sql, ...b) => db.prepare(sql).bind(...b).first().catch(() => null);

// Solo guarda los campos permitidos, recortados al largo máximo.
export function cleanTranslation(kind, data) {
  const out = {};
  for (const [k, max] of Object.entries(TRANS_FIELDS[kind] || {}))
    if (data && data[k] !== undefined && data[k] !== null) out[k] = String(data[k]).trim().slice(0, max);
  return out;
}

const rowOf = (r) => (r ? { ref_id: r.ref_id, slug: r.slug, data: parse(r.data), status: r.status || LIVE_STATUS, updated_at: r.updated_at || "", updated_by: r.updated_by || "" } : null);
const COLS = "ref_id, slug, data, status, updated_at, updated_by";

// live = true (por defecto): solo traducciones publicadas (lo que ve el público). live = false: cualquiera (panel).
export async function translationBySlug(db, kind, slug, live = true, lang = ES) {
  return rowOf(await one(db, `SELECT ${COLS} FROM translations WHERE kind=? AND lang=? AND slug=?${live ? " AND status=?" : ""}`, kind, lang, slug, ...(live ? [LIVE_STATUS] : [])));
}
export async function translationByRef(db, kind, refId, live = true, lang = ES) {
  return rowOf(await one(db, `SELECT ${COLS} FROM translations WHERE kind=? AND lang=? AND ref_id=?${live ? " AND status=?" : ""}`, kind, lang, refId, ...(live ? [LIVE_STATUS] : [])));
}
// Todas las traducciones publicadas de un contenido, para armar el hreflang: [{ lang, slug }].
export async function liveTranslations(db, kind, refId) {
  const r = await db.prepare("SELECT lang, slug FROM translations WHERE kind=? AND ref_id=? AND status=?").bind(kind, refId, LIVE_STATUS).all().catch(() => ({ results: [] }));
  return (r.results || []).filter((x) => TRANSLATED.includes(x.lang) && langAllowed(kind, x.lang));
}

// Notas de los horarios traducidas: una línea "HH:MM | nota" por horario. Cambia solo la nota; la hora no se traduce.
export function withTimeNotes(metaText, text) {
  let m; try { m = typeof metaText === "string" ? JSON.parse(metaText || "{}") : (metaText || {}); } catch { m = {}; }
  if (!text || !Array.isArray(m.times)) return typeof metaText === "string" ? metaText : JSON.stringify(m);
  const notes = new Map();
  for (const line of String(text).split("\n")) {
    const x = line.trim().match(/^(\d{1,2}:\d{2})\s*(?:\|\s*(.*))?$/);
    if (x) notes.set(x[1].padStart(5, "0"), (x[2] || "").trim());
  }
  m.times = m.times.map((r) => { const t = Array.isArray(r) ? r[0] : r; return notes.has(t) ? [t, notes.get(t)] : r; });
  return JSON.stringify(m);
}

// Ficha publicada para una URL.
//  - portugués: la URL trae el slug portugués → ficha base.
//  - español / inglés: la URL trae el slug de ese idioma → se busca la traducción y se usa la ficha base con los textos traducidos.
// Devuelve { p (lo que se renderiza), base (fila original), es (traducción o null) } o null si no corresponde mostrarla.
// (La propiedad se llama "es" por compatibilidad; guarda la traducción del idioma pedido, sea español o inglés.)
export async function itemForLang(db, table, kind, slug, lang) {
  if (!db) return null;
  const live = table === "posts" ? " AND (publish_date='' OR publish_date<=date('now','-3 hours'))" : "";
  if (!TRANSLATED.includes(lang) || !langAllowed(kind, lang)) {
    if (TRANSLATED.includes(lang)) return null; // idioma sin traducciones para este tipo de contenido
    const base = await one(db, `SELECT * FROM ${table} WHERE slug=? AND published=1${live}`, slug);
    return base ? { p: base, base, es: null } : null;
  }
  const t = await translationBySlug(db, kind, slug, true, lang);
  if (!t) return null;
  const base = await one(db, `SELECT * FROM ${table} WHERE id=? AND published=1${live}`, t.ref_id);
  if (!base) return null;
  const { times, ...rest } = t.data;
  return { p: { ...base, ...rest, meta: times ? withTimeNotes(base.meta, times) : base.meta, id: base.id, slug: base.slug }, base, es: t };
}

// Autoría: perfil de cada persona del equipo (foto, cargo, biografía, experiencia, enlaces) y su versión pública.
// Un perfil solo tiene página propia (/autor/<slug>/) y datos estructurados completos si profile_public = 1.
import { cleanLinks, parseLinks } from "./activity.js";
import { slugify } from "./html.js";

export const PROFILE_MAX = { name: 80, headline: 120, bio: 1500, experience: 1500 };
const AVATAR_RE = /^(https:\/\/|\/media\/|\/assets\/)/i;
export const AUTHOR_COLS = "id, name, slug, headline, bio, experience, avatar, links, profile_public";

// Texto plano: sin etiquetas ni caracteres de control, conserva los saltos de línea (párrafos).
const plain = (t, max) => String(t ?? "").replace(/<[^>]*>/g, " ").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);

// Valida y normaliza lo que manda el panel. Devuelve { data } o { error }.
export function cleanProfile(b) {
  const name = plain(b.name, PROFILE_MAX.name).replace(/\s+/g, " ");
  if (!name) return { error: "El nombre es obligatorio" };
  const avatar = String(b.avatar ?? "").trim();
  if (avatar && !AVATAR_RE.test(avatar)) return { error: "La foto debe ser una URL https o una imagen subida desde el panel." };
  const l = cleanLinks(b.links);
  if (l.bad) return { error: "Algún enlace no es válido. Usá una dirección http(s) por línea, hasta 8." };
  return { data: {
    name, avatar,
    headline: plain(b.headline, PROFILE_MAX.headline).replace(/\s+/g, " "),
    bio: plain(b.bio, PROFILE_MAX.bio), experience: plain(b.experience, PROFILE_MAX.experience),
    links: l.links.length ? JSON.stringify(l.links) : "",
    profile_public: b.profile_public === 1 || b.profile_public === true || b.profile_public === "1" ? 1 : 0,
  } };
}

// Dirección /autor/<slug>/ única entre usuarios (si ya existe se agrega -2, -3…).
export async function uniqueSlug(db, name, selfId, wanted = "") {
  const base = slugify(wanted || name).slice(0, 60) || "autor";
  for (let n = 1; n < 50; n++) {
    const s = n === 1 ? base : `${base}-${n}`;
    const hit = await db.prepare("SELECT id FROM users WHERE slug=? AND id<>?").bind(s, selfId).first();
    if (!hit) return s;
  }
  return `${base}-${Date.now() % 100000}`;
}

// Fila de la base → objeto listo para mostrar. Sin perfil público solo se conoce el nombre.
export function publicAuthor(r) {
  if (!r) return null;
  const isPublic = !!r.profile_public && !!r.slug;
  return isPublic
    ? { id: r.id, name: r.name || "", slug: r.slug, isPublic, headline: r.headline || "", bio: r.bio || "", experience: r.experience || "", avatar: r.avatar || "", links: parseLinks(r.links) }
    : { id: r.id, name: r.name || "", slug: "", isPublic: false, headline: "", bio: "", experience: "", avatar: "", links: [] };
}

// Autor, revisor y fuentes de un artículo. Si la base todavía no tiene las columnas o la persona está desactivada, se ignora (queda la firma del equipo).
export async function peopleFor(db, p) {
  const out = { author: null, reviewer: null, sourcesList: parseLinks(p?.sources) };
  const ids = [...new Set([Number(p?.author_id) || 0, Number(p?.reviewer_id) || 0].filter(Boolean))];
  if (!db || !ids.length) return out;
  try {
    const got = (await db.prepare(`SELECT ${AUTHOR_COLS} FROM users WHERE active=1 AND id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all()).results;
    const by = new Map(got.map((r) => [r.id, publicAuthor(r)]));
    out.author = by.get(Number(p.author_id)) || null;
    out.reviewer = by.get(Number(p.reviewer_id)) || null;
  } catch { /* sin columnas aún */ }
  return out;
}

export async function authorBySlug(db, slug) {
  if (!db) return null;
  try {
    const r = await db.prepare(`SELECT ${AUTHOR_COLS} FROM users WHERE active=1 AND profile_public=1 AND slug=?`).bind(slug).first();
    return r ? publicAuthor(r) : null;
  } catch { return null; }
}

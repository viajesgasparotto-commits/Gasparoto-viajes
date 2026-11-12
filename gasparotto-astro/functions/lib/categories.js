// Categorías administrables (Paquetes y Blog). Sin dependencias.
import { slugify } from "./html.js";
import { SITE } from "./site.js";

// Categorías de paquetes que ya tienen una página fija en el sitio (listing). Se siembran una sola vez.
// Definidas en lib/site.js (datos de la agencia).
export const BUILTIN_PACKAGES = SITE.listings;

// Categorías que mostraba la barra de filtros del blog original (se conservan para no perder nada).
export const SEED_POSTS = SITE.seedPostCategories;

export const KINDS = ["packages", "posts"];

export async function listCategories(db, kind) {
  const q = kind
    ? db.prepare("SELECT * FROM categories WHERE kind=? ORDER BY sort_order, id").bind(kind)
    : db.prepare("SELECT * FROM categories ORDER BY kind, sort_order, id");
  return (await q.all()).results;
}

// Acepta la clave ("tangos") o la etiqueta ("Tangos"). Devuelve la fila o null.
export function resolveCategory(rows, v) {
  const s = slugify(String(v || ""));
  if (!s) return null;
  return rows.find((c) => c.slug === s) || rows.find((c) => slugify(c.label) === s) || null;
}

// Dirección pública de la página de una categoría.
export const catPath = (kind, c) => c.listing || (kind === "posts" ? `/blog/categoria/${c.slug}/` : `/paquetes/categoria/${c.slug}/`);

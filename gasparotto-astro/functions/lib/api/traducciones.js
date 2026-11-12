// Panel: traducciones (español e inglés) de paquetes y artículos (GET/PUT/DELETE /api/translations). Parámetro `lang`: es (por defecto) | en (solo artículos).
// Cada traducción tiene un estado editorial: borrador → revisión → publicada. Solo las publicadas salen en el sitio.
// Para publicar una traducción hace falta ser administrador; un editor puede guardarla como borrador o enviarla a revisión
// (y seguir editando una que ya está publicada sin cambiarle el estado).
import { logActivity } from "../activity.js";
import { ES, TRANSLATED } from "../i18n.js";
import { ensureSchema } from "../schema.js";
import { sanitizeHtml } from "../seo.js";
import { cleanTranslation, KINDS, langAllowed, LIVE_STATUS, SLUG_RE, STATUSES, translationByRef } from "../translations.js";
import { json } from "./http.js";

const validRef = (kind, ref) => KINDS.includes(kind) && Number.isInteger(ref) && ref > 0;
// Idioma pedido (es por defecto, para no romper a quien llame sin `lang`). null = idioma inválido o sin traducciones para ese tipo.
const langOfReq = (kind, raw) => { const lang = String(raw || ES).trim(); return TRANSLATED.includes(lang) && langAllowed(kind, lang) ? lang : null; };
const LANG_ERR = "Idioma no disponible para este tipo de contenido";

export async function manejarTraducciones({ request, env, url, res, method, user }) {
  if (res !== "translations") return null;
  if (!env.DB) return json({ error: "Base no disponible" }, 503);
  try { await ensureSchema(env.DB); } catch { return json({ error: "Base no disponible" }, 503); }
  const isAdmin = !user || user.role === "admin";

  if (method === "GET") {
    // Sin parámetros: resumen de todas las traducciones (para el listado del panel)
    if (!url.searchParams.has("kind")) {
      const items = (await env.DB.prepare("SELECT kind, ref_id, lang, slug, status, updated_at, updated_by FROM translations WHERE lang IN (" + TRANSLATED.map(() => "?").join(",") + ")").bind(...TRANSLATED).all()).results;
      return json({ items, statuses: STATUSES, langs: TRANSLATED });
    }
    const kind = url.searchParams.get("kind"), ref = Number(url.searchParams.get("ref"));
    if (!validRef(kind, ref)) return json({ error: "Parámetros inválidos" }, 400);
    const lang = langOfReq(kind, url.searchParams.get("lang"));
    if (!lang) return json({ error: LANG_ERR }, 400);
    const t = await translationByRef(env.DB, kind, ref, false, lang);
    // "es" se mantiene como nombre de la propiedad por compatibilidad (guarda la traducción del idioma pedido); "tr" es el nombre neutro.
    const out = t ? { slug: t.slug, data: t.data, status: t.status, updated_at: t.updated_at, updated_by: t.updated_by } : null;
    return json({ es: out, tr: out, lang });
  }

  if (method === "PUT") {
    const b = await request.json().catch(() => ({}));
    const kind = b.kind, ref = Number(b.ref_id);
    if (!validRef(kind, ref)) return json({ error: "Contenido inválido" }, 400);
    const lang = langOfReq(kind, b.lang);
    if (!lang) return json({ error: LANG_ERR }, 400);
    const base = await env.DB.prepare(`SELECT id, title FROM ${kind} WHERE id=?`).bind(ref).first();
    if (!base) return json({ error: "No existe el contenido" }, 404);
    const slug = String(b.slug || "").trim().toLowerCase().slice(0, 80);
    if (!SLUG_RE.test(slug)) return json({ error: "El slug solo puede tener letras minúsculas, números y guiones" }, 400);
    const data = cleanTranslation(kind, b.data);
    if (data.content) data.content = sanitizeHtml(data.content);
    if (!data.title) return json({ error: "El título traducido es obligatorio" }, 400);
    const clash = await env.DB.prepare("SELECT ref_id FROM translations WHERE kind=? AND lang=? AND slug=? AND ref_id<>?").bind(kind, lang, slug, ref).first();
    if (clash) return json({ error: "Ese slug ya lo usa otra traducción" }, 409);

    const prev = await translationByRef(env.DB, kind, ref, false, lang);
    // Sin "status": se conserva el que tenía; una traducción nueva sin estado queda publicada (compatibilidad con la versión anterior de la API).
    const status = b.status === undefined || b.status === null || b.status === "" ? (prev ? prev.status : LIVE_STATUS) : String(b.status);
    if (!STATUSES.includes(status)) return json({ error: "Estado inválido" }, 400);
    if (status === LIVE_STATUS && !isAdmin && prev?.status !== LIVE_STATUS)
      return json({ error: "Solo un administrador puede publicar una traducción. Enviala a revisión." }, 403);

    const who = String(user?.name || user?.email || "").slice(0, 80);
    await env.DB.prepare(
      "INSERT INTO translations (kind, ref_id, lang, slug, data, status, updated_by, updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(kind, ref_id, lang) DO UPDATE SET slug=excluded.slug, data=excluded.data, status=excluded.status, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP"
    ).bind(kind, ref, lang, slug, JSON.stringify(data), status, who).run();
    const st = status === prev?.status || !prev ? status : `${prev.status} → ${status}`;
    await logActivity(env.DB, user, prev ? "editó" : "creó", "traducción", ref, data.title, lang === ES ? st : `${lang} · ${st}`);
    return json({ ok: true, es: { slug, data, status }, tr: { slug, data, status }, lang });
  }

  if (method === "DELETE") {
    const kind = url.searchParams.get("kind"), ref = Number(url.searchParams.get("ref"));
    if (!validRef(kind, ref)) return json({ error: "Parámetros inválidos" }, 400);
    const lang = langOfReq(kind, url.searchParams.get("lang"));
    if (!lang) return json({ error: LANG_ERR }, 400);
    const prev = await translationByRef(env.DB, kind, ref, false, lang);
    if (prev?.status === LIVE_STATUS && !isAdmin) return json({ error: "Solo un administrador puede borrar una traducción publicada" }, 403);
    const r = await env.DB.prepare("DELETE FROM translations WHERE kind=? AND lang=? AND ref_id=?").bind(kind, lang, ref).run();
    if (!r.meta?.changes) return json({ error: "No había traducción" }, 404);
    await logActivity(env.DB, user, "borró", "traducción", ref, prev?.data?.title || "", lang === ES ? prev?.status || "" : `${lang} · ${prev?.status || ""}`);
    return json({ ok: true });
  }
  return json({ error: "Método no permitido" }, 405);
}

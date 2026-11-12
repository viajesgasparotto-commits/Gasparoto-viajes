// Panel: perfiles de autor. /api/profile (el propio perfil, cualquier usuario con email) y /api/authors (lista para elegir autor/revisor;
// /api/authors/<id> permite a un administrador ver y editar el perfil de otra persona).
import { logActivity } from "../activity.js";
import { AUTHOR_COLS, cleanProfile, uniqueSlug } from "../autores.js";
import { json } from "./http.js";

const withLinks = (r) => ({ ...r, links: (() => { try { return JSON.parse(r.links || "[]"); } catch { return []; } })() });

async function guardar(env, user, id, body) {
  const c = cleanProfile(body || {});
  if (c.error) return json({ error: c.error }, 400);
  const cur = await env.DB.prepare("SELECT id, slug FROM users WHERE id=?").bind(id).first();
  if (!cur) return json({ error: "No existe la persona" }, 404);
  const d = c.data;
  // La dirección solo cambia si se pide o si todavía no tiene (cambiarla rompe los enlaces ya publicados).
  const slug = cur.slug && !body.slug ? cur.slug : await uniqueSlug(env.DB, d.name, id, body.slug);
  await env.DB.prepare("UPDATE users SET name=?, avatar=?, headline=?, bio=?, experience=?, links=?, profile_public=?, slug=? WHERE id=?")
    .bind(d.name, d.avatar, d.headline, d.bio, d.experience, d.links, d.profile_public, slug, id).run();
  await logActivity(env.DB, user, "editó", "perfil", id, d.name, d.profile_public ? "público" : "privado");
  return json({ ok: true, slug, profile_public: d.profile_public });
}

export async function manejarAutores({ request, env, res, id, method, user }) {
  if (res !== "profile" && res !== "authors") return null;
  const isAdmin = user.role === "admin";

  if (res === "profile") {
    if (!user.id) return json({ error: "La clave general no tiene perfil. Entrá con tu email para completar el tuyo." }, 400);
    if (method === "GET") {
      const r = await env.DB.prepare(`SELECT ${AUTHOR_COLS}, email, role FROM users WHERE id=?`).bind(user.id).first();
      return r ? json(withLinks(r)) : json({ error: "No existe" }, 404);
    }
    if (method === "PUT") return guardar(env, user, user.id, await request.json().catch(() => ({})));
    return json({ error: "Método no permitido" }, 405);
  }

  // /api/authors
  if (!id) {
    if (method !== "GET") return json({ error: "Método no permitido" }, 405);
    const list = (await env.DB.prepare("SELECT id, name, headline, avatar, slug, profile_public, active FROM users ORDER BY name").all()).results;
    return json({ authors: list.map((r) => ({ ...r, name: r.name || "(sin nombre)" })), me: user.id });
  }
  if (!isAdmin) return json({ error: "No tenés permiso" }, 403);
  const uid = /^\d+$/.test(id) ? Number(id) : 0;
  if (!uid) return json({ error: "No existe" }, 404);
  if (method === "GET") {
    const r = await env.DB.prepare(`SELECT ${AUTHOR_COLS}, email, role FROM users WHERE id=?`).bind(uid).first();
    return r ? json(withLinks(r)) : json({ error: "No existe" }, 404);
  }
  if (method === "PUT") return guardar(env, user, uid, await request.json().catch(() => ({})));
  return json({ error: "Método no permitido" }, 405);
}

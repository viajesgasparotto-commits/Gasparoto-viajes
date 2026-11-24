// /api/clientes: fotos de clientes para "Nuestros clientes" (página /clientes/ y franja de la portada).
// Las puede subir cualquier usuario del panel, incluido el rol "fotos" (que no ve nada más).
// El rol "fotos" solo edita y borra las fotos que subió él; administradores y editores manejan todas y pueden ocultarlas.
import { cleanTxt, json } from "./http.js";

const MAX_PHOTOS = 600;
// Solo imágenes subidas al sitio (/media/…) o, para administradores y editores, una dirección https.
const okImage = (s, staff) => /^\/media\/[\w.-]+\.(jpe?g|png|webp|gif|avif)$/i.test(s) || (staff && /^https:\/\/[^\s"'<>]+$/i.test(s));

export async function manejarClientes({ ctx, request, env, res, id, method, user }) {
  if (res !== "clientes") return null;
  const db = env.DB, staff = user.role === "admin" || user.role === "editor";
  const rid = id && /^\d+$/.test(id) ? Number(id) : null;
  if (method === "GET") {
    const photos = (await db.prepare("SELECT c.id, c.image, c.caption, c.published, c.created_by, c.created_at, COALESCE(u.name, '') AS by_name FROM client_photos c LEFT JOIN users u ON u.id = c.created_by ORDER BY c.id DESC").all()).results;
    return json({ photos, me: user.id, staff });
  }
  const b = await request.json().catch(() => ({}));
  if (method === "POST" && !rid) {
    const image = String(b.image ?? "").trim(), caption = cleanTxt(b.caption, 140);
    if (!okImage(image, staff)) return json({ error: "Subí la foto desde el panel (JPG, PNG o WEBP)." }, 400);
    if (((await db.prepare("SELECT COUNT(*) n FROM client_photos").first())?.n || 0) >= MAX_PHOTOS) return json({ error: `Llegaste al máximo de ${MAX_PHOTOS} fotos. Borrá algunas viejas para subir nuevas.` }, 400);
    const r = await db.prepare("INSERT INTO client_photos (image, caption, created_by) VALUES (?,?,?)").bind(image, caption, user.id).run();
    ctx.act = { title: caption || "foto" };
    return json({ ok: true, id: r.meta?.last_row_id, url: "/clientes/" }, 201);
  }
  if (!rid) return json({ error: "Método no permitido" }, 405);
  const cur = await db.prepare("SELECT id, caption, created_by FROM client_photos WHERE id=?").bind(rid).first();
  if (!cur) return json({ error: "Esa foto ya no existe" }, 404);
  if (!staff && cur.created_by !== user.id) return json({ error: "Solo podés cambiar las fotos que subiste vos" }, 403);
  if (method === "PUT") {
    const set = [], vals = [];
    if (b.caption !== undefined) { set.push("caption=?"); vals.push(cleanTxt(b.caption, 140)); }
    if (b.published !== undefined) {
      if (!staff) return json({ error: "No tenés permiso para ocultar fotos" }, 403);
      set.push("published=?"); vals.push(b.published === true || b.published === 1 || b.published === "1" ? 1 : 0);
    }
    if (!set.length) return json({ error: "Nada para cambiar" }, 400);
    await db.prepare(`UPDATE client_photos SET ${set.join(", ")} WHERE id=?`).bind(...vals, rid).run();
    ctx.act = { title: cur.caption || "foto" };
    return json({ ok: true, url: "/clientes/" });
  }
  if (method === "DELETE") {
    await db.prepare("DELETE FROM client_photos WHERE id=?").bind(rid).run();
    ctx.act = { title: cur.caption || "foto" };
    return json({ ok: true, url: "/clientes/" });
  }
  return json({ error: "Método no permitido" }, 405);
}

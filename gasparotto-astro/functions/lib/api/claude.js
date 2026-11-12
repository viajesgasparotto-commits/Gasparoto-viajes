// Panel → Conectar Claude: claves del conector MCP del blog (functions/lib/mcp.js). Solo administradores.
// GET /api/claude-keys (lista, sin la clave), POST {name, can_publish} (crea y devuelve la dirección UNA vez), DELETE /:id (revoca).
import { newToken, sha256 } from "../mcp.js";
import { stripTags } from "../seo.js";
import { json } from "./http.js";

export async function manejarClaude({ ctx, request, env, url, res, id, method, user }) {
  if (res !== "claude-keys") return null;
  if (user.role !== "admin") return json({ error: "Solo un administrador puede conectar Claude." }, 403);
  if (method === "GET") {
    const rows = (await env.DB.prepare("SELECT k.id, k.name, k.prefix, k.can_publish, k.created_at, k.last_used, k.uses, k.revoked, COALESCE(u.name, '') AS by_name FROM api_keys k LEFT JOIN users u ON u.id = k.user_id ORDER BY k.revoked, k.id DESC").all()).results;
    return json({ keys: rows, endpoint: `${url.origin}/mcp/` });
  }
  if (method === "POST") {
    const d = await request.json().catch(() => ({}));
    const name = stripTags(String(d.name || "")).trim().slice(0, 60) || "Claude";
    const active = (await env.DB.prepare("SELECT COUNT(*) n FROM api_keys WHERE revoked=0").first()).n;
    if (active >= 10) return json({ error: "Ya hay 10 conexiones activas. Revocá alguna antes de crear otra." }, 409);
    const token = newToken();
    const r = await env.DB.prepare("INSERT INTO api_keys (name, prefix, hash, can_publish, user_id) VALUES (?,?,?,?,?)")
      .bind(name, token.slice(0, 10), await sha256(token), d.can_publish ? 1 : 0, user.id || 0).run();
    ctx.act = { title: name, detail: d.can_publish ? "puede publicar" : "solo borradores" };
    return json({ ok: true, id: r.meta?.last_row_id, url: `${url.origin}/mcp/${token}`, token });
  }
  const rid = /^\d+$/.test(String(id || "")) ? Number(id) : 0;
  if (method === "DELETE" && rid) {
    const k = await env.DB.prepare("SELECT name FROM api_keys WHERE id=?").bind(rid).first();
    if (!k) return json({ error: "No existe" }, 404);
    await env.DB.prepare("UPDATE api_keys SET revoked=1 WHERE id=?").bind(rid).run();
    ctx.act = { action: "revocó", title: k.name };
    return json({ ok: true });
  }
  return json({ error: "Método no permitido" }, 405);
}

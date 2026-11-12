// Consultas de clientes: formulario y clics de WhatsApp (público) y su gestión en el panel.

import { ensureSchema } from "../schema.js";
import { leadLimited } from "./guard.js";
import { cleanTxt, json, sameOrigin } from "./http.js";

// ---------- Consultas (leads): el endpoint de alta es público; el resto requiere sesión ----------
const LEAD_STATUS = ["nuevo", "contactado", "vendido", "perdido"];

export async function crearConsulta(request, env) {
  if (!env.DB) return json({ error: "sin base" }, 503);
  const ip = request.headers.get("cf-connecting-ip") || "x";
  const b = await request.json().catch(() => ({}));
  const source = b.source === "whatsapp" ? "whatsapp" : "form";
  // Formularios y clics de WhatsApp tienen cupos separados: muchos clics no deben impedir que se guarde un formulario.
  if (leadLimited(ip + "|" + source, source === "form" ? 6 : 40)) return json({ error: "Demasiados envíos. Probá en unos minutos." }, 429);
  if (b.website) return json({ ok: true }); // honeypot: los bots llenan este campo oculto
  const phone = cleanTxt(b.phone, 40), name = cleanTxt(b.name, 80);
  // El teléfono del visitante solo se exige si la agencia no tiene WHATSAPP_NUMBER (sin WhatsApp, es la única forma de contestarle).
  const needPhone = !String(env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (source === "form" && (!name || (needPhone && phone.replace(/\D/g, "").length < 6))) return json({ error: "Faltan datos" }, 400);
  try { await ensureSchema(env.DB); } catch { return json({ error: "base no disponible" }, 503); }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || "") ? b.date : "";
  const pax = Math.min(99, Math.max(0, parseInt(b.pax, 10) || 0));
  const message = cleanTxt(b.message, 500), pkg = cleanTxt(b.package, 200);
  await env.DB.prepare("INSERT INTO leads (name, phone, travel_date, pax, message, package_title, package_slug, page, source) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(name, phone, date, pax, message, pkg, cleanTxt(b.slug, 80), cleanTxt(b.page, 200), source).run();
  // La consulta se guarda para el panel (Consultas); el mensaje a la agencia lo abre el visitante en wa.me desde conv.js.
  return json({ ok: true });
}

// POST /api/lead (público).
export async function manejarConsultasPublicas({ request, env, url, res, method }) {
  if (res === "lead" && method === "POST") {
    const origin = request.headers.get("origin");
    if (origin && sameOrigin(origin, url) === false) return json({ error: "Origen no permitido" }, 403);
    return crearConsulta(request, env);
  }
  return null;
}

// /api/leads (panel).
export async function manejarConsultas({ request, env, res, id, method }) {
  // Consultas de clientes
  if (res === "leads") {
    const rid = id && /^\d+$/.test(id) ? Number(id) : null;
    if (method === "GET") {
      const rows = (await env.DB.prepare("SELECT * FROM leads ORDER BY id DESC LIMIT 500").all()).results;
      const stats = (await env.DB.prepare("SELECT status, COUNT(*) n FROM leads GROUP BY status").all()).results;
      return json({ leads: rows, stats });
    }
    if (method === "PUT" && rid) {
      const b = await request.json().catch(() => ({}));
      if (!LEAD_STATUS.includes(b.status)) return json({ error: "Estado inválido" }, 400);
      await env.DB.prepare("UPDATE leads SET status=? WHERE id=?").bind(b.status, rid).run();
      return json({ ok: true });
    }
    // Borrado en lote desde el panel: POST leads/borrar con { ids: [...] } (máximo 500 por pedido).
    if (method === "POST" && id === "borrar") {
      const b = await request.json().catch(() => ({}));
      const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
      if (!ids.length) return json({ error: "No hay consultas seleccionadas." }, 400);
      const r = await env.DB.prepare(`DELETE FROM leads WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).run();
      return json({ ok: true, deleted: r.meta?.changes || 0 });
    }
    if (method === "DELETE" && rid) {
      await env.DB.prepare("DELETE FROM leads WHERE id=?").bind(rid).run();
      return json({ ok: true });
    }
    return json({ error: "Método no permitido" }, 405);
  }
  return null;
}

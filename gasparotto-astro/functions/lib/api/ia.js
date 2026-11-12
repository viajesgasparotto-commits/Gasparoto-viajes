// Panel → Asistente IA: estado de la configuración, prueba del asistente, indicaciones y conversaciones de WhatsApp.
// GET /api/ia (resumen) · GET /api/ia?count=1 (para el aviso del menú) · GET /api/ia/:id (mensajes)
// POST /api/ia/probar {messages} · PUT /api/ia/config {instrucciones} (admin) · PUT /api/ia/:id {paused} · POST /api/ia/:id {text} (responder como persona)
import { aiConfig } from "../ai.js";
import { pensar, instrucciones, guardarMensaje, iaActiva, SETTING_KEY } from "../asistente.js";
import { enviarTexto, waMissing } from "../whatsapp.js";
import { json } from "./http.js";

export async function manejarIA({ request, env, url, res, id, method, user }) {
  if (res !== "ia") return null;
  const db = env.DB;
  const rid = /^\d+$/.test(String(id || "")) ? Number(id) : 0;

  if (method === "GET" && !id) {
    const pending = (await db.prepare("SELECT COUNT(*) n FROM ia_chats WHERE handoff=1 OR pay_check=1").first())?.n || 0;
    if (url.searchParams.get("count")) return json({ pending });
    const chats = (await db.prepare(`SELECT c.*, (SELECT text FROM ia_messages m WHERE m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) AS last_text
      FROM ia_chats c ORDER BY MAX(c.handoff, c.pay_check) DESC, c.updated_at DESC LIMIT 100`).all()).results;
    const hoy = (await db.prepare("SELECT COUNT(*) n FROM ia_messages WHERE role='assistant' AND at > datetime('now','-1 day')").first())?.n || 0;
    return json({
      ia: { ...aiConfig(env), activa: iaActiva(env), hoy, tope: parseInt(env.IA_MAX_DIARIO, 10) || 400 },
      whatsapp: { missing: waMissing(env), webhook: `${url.origin}/api/whatsapp` },
      instrucciones: await instrucciones(db), puedeEditar: user.role === "admin", pending, chats,
    });
  }
  if (method === "GET" && rid) {
    const chat = await db.prepare("SELECT * FROM ia_chats WHERE id=?").bind(rid).first();
    if (!chat) return json({ error: "No existe" }, 404);
    const messages = (await db.prepare("SELECT id, role, text, at FROM (SELECT * FROM ia_messages WHERE chat_id=? ORDER BY id DESC LIMIT 200) ORDER BY id").bind(rid).all()).results;
    return json({ chat, messages });
  }
  if (method === "POST" && id === "probar") {
    const b = await request.json().catch(() => ({}));
    const messages = (Array.isArray(b.messages) ? b.messages : []).slice(-20).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", text: String(m.text || "").slice(0, 2000) }));
    if (!messages.length) return json({ error: "Escribí un mensaje" }, 400);
    if (!aiConfig(env).ready) return json({ error: "Falta la clave de la IA (GEMINI_API_KEY o ANTHROPIC_API_KEY)." }, 400);
    try { return json(await pensar(env, messages)); }
    catch (e) { return json({ error: String(e?.message || "Error de la IA") }, 502); }
  }
  if (method === "PUT" && id === "config") {
    if (user.role !== "admin") return json({ error: "Solo un administrador puede cambiar las indicaciones." }, 403);
    const b = await request.json().catch(() => ({}));
    const v = String(b.instrucciones ?? "").replace(/\r/g, "").trim().slice(0, 6000);
    await db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(SETTING_KEY, v).run();
    return json({ ok: true });
  }
  if (rid && (method === "PUT" || method === "POST")) {
    const chat = await db.prepare("SELECT * FROM ia_chats WHERE id=?").bind(rid).first();
    if (!chat) return json({ error: "No existe" }, 404);
    const b = await request.json().catch(() => ({}));
    if (method === "PUT" && "pay_check" in b) {
      // "Pago verificado": el equipo ya vio el dinero en la cuenta. No cambia si la IA atiende o no.
      await db.prepare("UPDATE ia_chats SET pay_check=? WHERE id=?").bind(b.pay_check ? 1 : 0, rid).run();
      return json({ ok: true });
    }
    if (method === "PUT") {
      // paused = true: la IA deja de contestar (atiende una persona). false: la IA vuelve a atender. En ambos casos el aviso queda resuelto.
      await db.prepare("UPDATE ia_chats SET paused=?, handoff=0, handoff_reason='' WHERE id=?").bind(b.paused ? 1 : 0, rid).run();
      return json({ ok: true });
    }
    const text = String(b.text || "").trim().slice(0, 3800);
    if (!text) return json({ error: "Escribí la respuesta" }, 400);
    if (chat.channel !== "whatsapp") return json({ error: "Canal no disponible" }, 400);
    if (waMissing(env).length) return json({ error: "WhatsApp no está configurado" }, 400);
    try { await enviarTexto(env, chat.contact, text); }
    catch (e) {
      const m = String(e?.message || "");
      // Fuera de las 24 h desde el último mensaje del cliente, WhatsApp solo permite plantillas aprobadas.
      return json({ error: /131047|re-engagement|24 hour/i.test(m) ? "Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp no deja escribirle texto libre. Esperá a que vuelva a escribir." : m || "No se pudo enviar" }, 502);
    }
    await guardarMensaje(db, rid, "agent", text);
    // Si contesta una persona, la IA queda en pausa en esa charla hasta que la reactiven.
    await db.prepare("UPDATE ia_chats SET paused=1, handoff=0, handoff_reason='' WHERE id=?").bind(rid).run();
    return json({ ok: true });
  }
  return json({ error: "Método no permitido" }, 405);
}

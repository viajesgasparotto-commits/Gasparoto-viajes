// Panel → Asistente IA. La IA contesta todo; desde acá el equipo la DETIENE (en todo el sitio o en una charla), mira las charlas
// marcadas, responde como persona y ajusta las indicaciones.
// GET /api/ia (resumen) · GET /api/ia?count=1 (aviso del menú) · GET /api/ia/:id (mensajes)
// POST /api/ia/probar {messages, origen?} · PUT /api/ia/config {instrucciones?, detenida?, pausaCelular?} (admin)
// PUT /api/ia/:id {paused? | atendida? | pay_check?} · POST /api/ia/:id {text} (responder como persona)
import { aiConfig } from "../ai.js";
import { pensar, instrucciones, guardarMensaje, iaActiva, SETTING_KEY, KEY_DETENIDA, KEY_PAUSA_CELULAR } from "../asistente.js";
import { enviarTexto, waMissing } from "../whatsapp.js";
import { json } from "./http.js";

const getSetting = async (db, k) => (await db.prepare("SELECT value FROM settings WHERE key=?").bind(k).first().catch(() => null))?.value ?? "";
const putSetting = (db, k, v) => db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(k, v).run();

export async function manejarIA({ request, env, url, res, id, method, user }) {
  if (res !== "ia") return null;
  const db = env.DB;
  const rid = /^\d+$/.test(String(id || "")) ? Number(id) : 0;

  if (method === "GET" && !id) {
    const pending = (await db.prepare("SELECT COUNT(*) n FROM ia_chats WHERE handoff=1 OR pay_check=1").first())?.n || 0;
    if (url.searchParams.get("count")) return json({ pending });
    const chats = (await db.prepare(`SELECT c.*, (SELECT text FROM ia_messages m WHERE m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) AS last_text
      FROM ia_chats c ORDER BY MAX(c.handoff, c.pay_check) DESC, c.updated_at DESC LIMIT 150`).all()).results;
    const n = async (sql) => (await db.prepare(sql).first())?.n || 0;
    const stats = {
      respuestas: await n("SELECT COUNT(*) n FROM ia_messages WHERE role='assistant' AND at > datetime('now','-1 day')"),
      charlasHoy: await n("SELECT COUNT(DISTINCT chat_id) n FROM ia_messages WHERE role='user' AND at > datetime('now','-1 day')"),
      nuevas7: await n("SELECT COUNT(*) n FROM ia_chats WHERE created_at > datetime('now','-7 day')"),
      persona: await n("SELECT COUNT(*) n FROM ia_chats WHERE handoff=1"),
      pago: await n("SELECT COUNT(*) n FROM ia_chats WHERE pay_check=1"),
    };
    return json({
      ia: { ...aiConfig(env), envActiva: iaActiva(env), detenida: (await getSetting(db, KEY_DETENIDA)) === "1", tope: parseInt(env.IA_MAX_DIARIO, 10) || 400 },
      pausaCelular: (await getSetting(db, KEY_PAUSA_CELULAR)) === "1",
      whatsapp: { missing: waMissing(env), webhook: `${url.origin}/api/whatsapp` },
      instrucciones: await instrucciones(db), puedeEditar: user.role === "admin", pending, stats, chats,
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
    const messages = (Array.isArray(b.messages) ? b.messages : []).slice(-24).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", text: String(m.text || "").slice(0, 2000) }));
    if (!messages.length) return json({ error: "Escribí un mensaje" }, 400);
    if (!aiConfig(env).ready) return json({ error: "Falta la clave de la IA (GEMINI_API_KEY o ANTHROPIC_API_KEY)." }, 400);
    const origen = { anuncio: "Anuncio de Meta (prueba)", promo: "Promoción u oferta (lo menciona el cliente)", web: "Web: consulta por un paquete" }[b.origen] || "Contacto directo";
    try { return json(await pensar(env, messages, { primera: !messages.some((m) => m.role === "assistant"), nombre: "", origen })); }
    catch (e) { return json({ error: String(e?.message || "Error de la IA") }, 502); }
  }
  if (method === "PUT" && id === "config") {
    if (user.role !== "admin") return json({ error: "Solo un administrador puede cambiar esto." }, 403);
    const b = await request.json().catch(() => ({}));
    if ("instrucciones" in b) await putSetting(db, SETTING_KEY, String(b.instrucciones ?? "").replace(/\r/g, "").trim().slice(0, 8000));
    if ("detenida" in b) await putSetting(db, KEY_DETENIDA, b.detenida ? "1" : "0");
    if ("pausaCelular" in b) await putSetting(db, KEY_PAUSA_CELULAR, b.pausaCelular ? "1" : "0");
    return json({ ok: true });
  }
  if (rid && (method === "PUT" || method === "POST")) {
    const chat = await db.prepare("SELECT * FROM ia_chats WHERE id=?").bind(rid).first();
    if (!chat) return json({ error: "No existe" }, 404);
    const b = await request.json().catch(() => ({}));
    if (method === "PUT") {
      // "Pago verificado": el equipo ya vio el dinero en la cuenta.
      if ("pay_check" in b) await db.prepare("UPDATE ia_chats SET pay_check=? WHERE id=?").bind(b.pay_check ? 1 : 0, rid).run();
      // "Ya la atendí": se quita la marca de "pide una persona".
      if (b.atendida) await db.prepare("UPDATE ia_chats SET handoff=0, handoff_reason='' WHERE id=?").bind(rid).run();
      // Detener / reanudar la IA solo en esta charla.
      if ("paused" in b) await db.prepare("UPDATE ia_chats SET paused=? WHERE id=?").bind(b.paused ? 1 : 0, rid).run();
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
    // Responder como persona no detiene la IA (para eso está "Detener IA en esta charla"); sí resuelve el aviso.
    await db.prepare("UPDATE ia_chats SET handoff=0, handoff_reason='' WHERE id=?").bind(rid).run();
    return json({ ok: true });
  }
  return json({ error: "Método no permitido" }, 405);
}

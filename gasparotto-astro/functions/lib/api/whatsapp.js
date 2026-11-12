// Webhook público de WhatsApp: GET /api/whatsapp (verificación que hace Meta al configurarlo) y POST /api/whatsapp (mensajes entrantes).
// Responde 200 enseguida y procesa en segundo plano (Meta reintenta si tarda). La lógica del asistente vive en functions/lib/asistente.js.
import { recibir, recibirAdjunto, recibirBoton, respuestaDelCelular, seguimientos, reintentos, BTN_SI, BTN_NO } from "../asistente.js";
import { firmaValida, mensajesDe, ecosDe, enviarBotonLink, enviarTexto, enviarBotones, marcarLeido, waReady } from "../whatsapp.js";
import { json } from "./http.js";

const NO_TEXT = {
  pt: "Por enquanto consigo ler apenas mensagens de texto. Pode me escrever? 😊",
  es: "Por ahora solo puedo leer mensajes de texto. ¿Me lo escribís? 😊",
};

// Si la respuesta lleva el enlace de UN paquete, sale con un botón "Reservar" (más fácil de tocar que un enlace suelto).
// Si WhatsApp rechaza el botón, se manda como texto normal.
const RESERVAR = { pt: "Reservar agora", es: "Reservar ahora", en: "Book now" };
export async function responder(env, to, text, lang = "pt") {
  const urls = [...new Set(String(text).match(/https?:\/\/[^\s)]+\/paquetes\/[a-z0-9-]+\/?/gi) || [])];
  if (urls.length === 1 && text.length <= 1000) {
    const body = text.replace(urls[0], "").replace(/[:\-–—]\s*$/m, "").replace(/\s+([.,!?])/g, "$1").replace(/\n{3,}/g, "\n\n").trim();
    try { return await enviarBotonLink(env, to, body || text, urls[0], RESERVAR[lang] || RESERVAR.pt); }
    catch (e) { console.error("botón:", e?.message); }
  }
  return enviarTexto(env, to, text);
}

export async function procesarWhatsapp(env, body) {
  const phoneId = String(env.WHATSAPP_PHONE_ID || "").trim();
  // Alguien del equipo contestó desde el celular: se guarda y la IA se pausa en esa charla.
  for (const m of ecosDe(body, phoneId)) {
    try { await respuestaDelCelular(env, { channel: "whatsapp", contact: m.to, text: m.text.slice(0, 2000), extId: "wa:" + m.id }); }
    catch (e) { console.error("whatsapp eco:", e?.message || e); }
  }
  for (const m of mensajesDe(body, phoneId)) {
    try {
      marcarLeido(env, m.id);
      const base = { channel: "whatsapp", contact: m.from, name: m.name, extId: "wa:" + m.id, referral: m.referral };
      let r;
      if (m.type === "image" || m.type === "document") {
        // Foto o archivo: la IA no lo ve. Se le pregunta al cliente con botones si es el comprobante de pago.
        r = await recibirAdjunto(env, { ...base, kind: m.type === "image" ? "imagen" : "archivo" });
        if (r.buttons) await enviarBotones(env, m.from, r.buttons.body, r.buttons.options);
        continue;
      }
      if (m.buttonId === BTN_SI || m.buttonId === BTN_NO) r = await recibirBoton(env, { ...base, id: m.buttonId, title: m.text });
      else if (m.text) r = await recibir(env, { ...base, text: m.text.slice(0, 2000) });
      else {
        // Audio, video, sticker, ubicación…: se pide texto (la charla sigue con la IA).
        if (["audio", "video", "sticker"].includes(m.type)) await enviarTexto(env, m.from, NO_TEXT[/^pt/i.test(String(env.SITE_LANG || "")) ? "pt" : "es"]);
        continue;
      }
      if (r.reply) await responder(env, m.from, r.reply, r.lang);
    } catch (e) { console.error("whatsapp:", e?.message || e); }
  }
}

// POST /api/ia-seguimiento (lo llama el cron "gasparotto-ia-cron" con la cabecera x-cron-key = IA_CRON_KEY).
async function manejarSeguimiento(request, env) {
  const key = String(env.IA_CRON_KEY || "").trim();
  if (!key || request.headers.get("x-cron-key") !== key) return json({ error: "No autorizado" }, 401);
  if (!env.DB || !waReady(env)) return json({ error: "WhatsApp no está configurado" }, 503);
  const enviar = (to, text, lang) => responder(env, to, text, lang);
  const r = await reintentos(env, { enviar });
  return json({ ...(await seguimientos(env, { enviar })), ...r });
}

export async function manejarWhatsappPublico({ ctx, request, env, url, res, method }) {
  if (res === "ia-seguimiento") return method === "POST" ? manejarSeguimiento(request, env) : json({ error: "Método no permitido" }, 405);
  if (res !== "whatsapp") return null;
  if (method === "GET") {
    const p = url.searchParams, token = String(env.WHATSAPP_VERIFY_TOKEN || "").trim();
    if (p.get("hub.mode") === "subscribe" && token && p.get("hub.verify_token") === token)
      return new Response(p.get("hub.challenge") || "", { status: 200, headers: { "content-type": "text/plain" } });
    return new Response("Forbidden", { status: 403 });
  }
  if (method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!env.DB || !waReady(env)) return json({ error: "WhatsApp no está configurado" }, 503);
  const raw = await request.text();
  if (raw.length > 512000 || !(await firmaValida(env, raw, request.headers.get("x-hub-signature-256")))) return json({ error: "Firma inválida" }, 401);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "JSON inválido" }, 400); }
  const job = procesarWhatsapp(env, body);
  if (ctx?.waitUntil) ctx.waitUntil(job); else await job;
  return json({ ok: true });
}

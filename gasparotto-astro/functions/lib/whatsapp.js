// Canal WhatsApp (WhatsApp Business Platform / Cloud API de Meta): firma del webhook y envío de mensajes.
// Variables: WHATSAPP_TOKEN (token de acceso permanente), WHATSAPP_PHONE_ID (ID del número), WHATSAPP_APP_SECRET (clave secreta de la app,
// valida que los avisos vengan de Meta), WHATSAPP_VERIFY_TOKEN (texto que inventás vos y pegás en Meta al configurar el webhook).
// Opcional: WHATSAPP_GRAPH_VERSION (por defecto v23.0).

export const WA_VARS = ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN"];
export const waMissing = (env) => WA_VARS.filter((k) => !String(env[k] || "").trim());
export const waReady = (env) => waMissing(env).length === 0;
const graph = (env) => `https://graph.facebook.com/${String(env.WHATSAPP_GRAPH_VERSION || "v23.0").trim()}/${String(env.WHATSAPP_PHONE_ID).trim()}/messages`;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
// Meta firma cada aviso con HMAC-SHA256 del cuerpo usando la clave secreta de la app (cabecera X-Hub-Signature-256: sha256=<hex>).
export async function firmaValida(env, raw, header) {
  const secret = String(env.WHATSAPP_APP_SECRET || "").trim();
  const got = String(header || "").replace(/^sha256=/, "").toLowerCase();
  if (!secret || !/^[0-9a-f]{64}$/.test(got)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const want = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  let diff = 0; // comparación en tiempo constante
  for (let i = 0; i < 64; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

// Saca los mensajes de texto de un aviso de Meta: [{ from, name, text, id, type }].
// phoneId: si se pasa, ignora avisos de otros números de la misma cuenta.
export function mensajesDe(body, phoneId = "") {
  const out = [];
  for (const e of body?.entry || []) for (const ch of e?.changes || []) {
    const v = ch?.value || {};
    if (phoneId && v.metadata?.phone_number_id && String(v.metadata.phone_number_id) !== String(phoneId)) continue;
    const names = new Map((v.contacts || []).map((c) => [c.wa_id, c?.profile?.name || ""]));
    for (const m of v.messages || []) {
      const text = m.type === "text" ? m.text?.body
        : m.type === "button" ? m.button?.text
        : m.type === "interactive" ? (m.interactive?.button_reply?.title || m.interactive?.list_reply?.title)
        : "";
      const buttonId = String(m.interactive?.button_reply?.id || m.button?.payload || "");
      out.push({ from: String(m.from || ""), name: names.get(m.from) || "", text: String(text || "").trim(), id: String(m.id || ""), type: m.type || "", buttonId });
    }
  }
  return out.filter((m) => /^\d{6,20}$/.test(m.from));
}

// Coexistencia: el número también está en la app WhatsApp Business del celular. Lo que alguien del equipo escribe desde el
// celular llega como "eco" (campo smb_message_echoes). Devuelve [{ to, text, id }] (to = el cliente).
export function ecosDe(body, phoneId = "") {
  const out = [];
  for (const e of body?.entry || []) for (const ch of e?.changes || []) {
    if (ch?.field && ch.field !== "smb_message_echoes") continue;
    const v = ch?.value || {};
    if (phoneId && v.metadata?.phone_number_id && String(v.metadata.phone_number_id) !== String(phoneId)) continue;
    for (const m of v.message_echoes || []) {
      const text = m.type === "text" ? m.text?.body : `[${m.type || "mensaje"} enviado desde el celular]`;
      out.push({ to: String(m.to || ""), text: String(text || "").trim(), id: String(m.id || "") });
    }
  }
  return out.filter((m) => /^\d{6,20}$/.test(m.to) && m.text);
}

async function graphPost(env, body) {
  const r = await fetch(graph(env), { method: "POST", headers: { authorization: `Bearer ${String(env.WHATSAPP_TOKEN).trim()}`, "content-type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", ...body }), signal: AbortSignal.timeout(15000) });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(`WhatsApp ${r.status}: ${String(d?.error?.message || "").slice(0, 200)}`);
  }
  return r.json().catch(() => ({}));
}

// Envía texto (partido en trozos si supera el máximo de WhatsApp).
export async function enviarTexto(env, to, text) {
  const parts = [];
  let t = String(text || "").trim();
  while (t.length > 3800) { const cut = t.lastIndexOf("\n", 3800) > 1000 ? t.lastIndexOf("\n", 3800) : 3800; parts.push(t.slice(0, cut)); t = t.slice(cut).trim(); }
  if (t) parts.push(t);
  for (const p of parts) await graphPost(env, { recipient_type: "individual", to, type: "text", text: { preview_url: true, body: p } });
}

// Mensaje con hasta 3 botones de respuesta rápida. options: [[id, título (máx. 20 caracteres)], ...]
export async function enviarBotones(env, to, body, options) {
  await graphPost(env, { recipient_type: "individual", to, type: "interactive", interactive: { type: "button", body: { text: String(body).slice(0, 1024) },
    action: { buttons: options.slice(0, 3).map(([id, title]) => ({ type: "reply", reply: { id: String(id).slice(0, 256), title: String(title).slice(0, 20) } })) } } });
}

// Marca el mensaje como leído (los dos tildes azules). Si falla, no importa.
export const marcarLeido = (env, id) => graphPost(env, { status: "read", message_id: id }).catch(() => {});

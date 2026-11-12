// Asistente IA por WhatsApp: webhook (verificación y firma), Gemini y Claude, derivación a una persona, panel.
// Uso: npm run test:ia   (Node 22+ por node:sqlite). No llama a ninguna API real: fetch está simulado.
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { onRequest as api } from "../functions/api/[[path]].js";
import { aiConfig, normalizeTurns } from "../functions/lib/ai.js";
import { resetCatalogo } from "../functions/lib/asistente.js";

function d1() {
  const db = new DatabaseSync(":memory:");
  const mk = (sql, args = []) => ({
    bind: (...a) => mk(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: (s) => mk(s), batch: async (l) => { for (const x of l) await x.run(); return []; } };
}
const env = {
  DB: d1(), ADMIN_PASSWORD: "clave-general-123", SITE_URL: "https://gasparottoviajes.com", SITE_LANG: "pt-BR", BRAND_NAME: "Gasparotto Viajes",
  IA_PROVEEDOR: "gemini", GEMINI_API_KEY: "g-key", WHATSAPP_TOKEN: "wa-token", WHATSAPP_PHONE_ID: "123456", WHATSAPP_APP_SECRET: "app-secret", WHATSAPP_VERIFY_TOKEN: "verificame",
};

// ---------- fetch simulado: Gemini, Claude y la Graph API de WhatsApp ----------
const calls = [];
let aiReply = "Olá! Para 4 pessoas recomendo o *City Tour Zona Sul*: https://gasparottoviajes.com/paquetes/city-tour-zona-sur/";
let aiFail = false;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url), body = init.body ? JSON.parse(init.body) : null;
  calls.push({ url: u, headers: init.headers || {}, body });
  if (u.includes("generativelanguage.googleapis.com")) {
    if (aiFail) return new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 });
    return Response.json({ candidates: [{ content: { parts: [{ text: aiReply }] }, finishReason: "STOP" }] });
  }
  if (u.includes("api.anthropic.com")) return Response.json({ content: [{ type: "text", text: aiReply }] });
  if (u.includes("graph.facebook.com")) return Response.json({ messages: [{ id: "wamid.out" }] });
  throw new Error("fetch inesperado: " + u);
};
const of = (host) => calls.filter((c) => c.url.includes(host));
const reset = () => { calls.length = 0; };

let ip = 0;
async function call(method, path, body, { cookie, raw, headers = {} } = {}) {
  const h = { "content-type": "application/json", "cf-connecting-ip": "10.9." + (ip++ % 250) + ".1", ...headers };
  if (cookie) h.cookie = cookie;
  const waits = [];
  const r = await api({ request: new Request("https://gasparottoviajes.com/api/" + path, { method, headers: h, body: raw ?? (body && JSON.stringify(body)) }), env, params: { path: path.split("?")[0].split("/") }, waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, data, cookie: ck ? "gv_admin=" + ck : "" };
}
const sign = (raw, secret = env.WHATSAPP_APP_SECRET) => "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
let mid = 0;
const waMsg = (text, from = "5511999990000", name = "Ana", type = "text") => ({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: {
  contacts: [{ wa_id: from, profile: { name } }],
  messages: [{ from, id: "wamid.in" + ++mid, type, ...(type === "text" ? { text: { body: text } } : { [type]: { id: "media" } }) }] } }] }] });
async function inbound(payload, secret) {
  const raw = JSON.stringify(payload);
  return call("POST", "whatsapp", null, { raw, headers: { "x-hub-signature-256": sign(raw, secret) } });
}
const one = (sql, ...a) => env.DB.prepare(sql).bind(...a).first();

// Preparación: base, un paquete publicado y uno sin publicar
const admin = (await call("POST", "login", { password: "clave-general-123" })).cookie;
assert.ok(admin);
await call("GET", "categories", null, { cookie: admin });
await env.DB.prepare("INSERT INTO packages (slug,title,category,price,excerpt,published,booking_enabled,pay_mode,meta) VALUES ('city-tour-zona-sur','City Tour Zona Sul','city-tour','R$ 180','4 horas por San Telmo, La Boca e Puerto Madero',1,1,'pix',?)")
  .bind(JSON.stringify({ times: [["09:00"], ["14:00"]], facts: [["Duração", "4 h"]] })).run();
await env.DB.prepare("INSERT INTO packages (slug,title,category,price,published) VALUES ('secreto','Paquete borrador','paseos','R$ 1',0)").run();

await env.DB.prepare("INSERT INTO posts (slug,title,excerpt,published) VALUES ('guia-palermo','Guia de Palermo','Como conhecer Palermo por conta própria',1)").run();
await env.DB.prepare("INSERT INTO settings (key,value) VALUES ('google_places',?)").bind(JSON.stringify({ rating: 4.9, count: 312, reviews: [{ name: "Carla", stars: 5, text: "Passeio incrível, recomendo!" }] })).run();
env.GOOGLE_PLACE_ID = "ChIJtest";

// 1) Proveedor
assert.deepEqual(aiConfig({ GEMINI_API_KEY: "x" }), { provider: "gemini", model: "gemini-2.5-flash", ready: true });
assert.equal(aiConfig({ GEMINI_API_KEY: "x", ANTHROPIC_API_KEY: "y" }).provider, "claude", "sin IA_PROVEEDOR, Claude tiene prioridad si tiene clave");
assert.equal(aiConfig({ IA_PROVEEDOR: "claude", GEMINI_API_KEY: "x" }).ready, false);
assert.equal(aiConfig({ IA_PROVEEDOR: "gemini", GEMINI_API_KEY: "x", GEMINI_MODEL: "gemini-3-flash" }).model, "gemini-3-flash");
assert.deepEqual(normalizeTurns([{ role: "assistant", text: "hola" }, { role: "user", text: "a" }, { role: "user", text: "b" }]), [{ role: "user", text: "a\nb" }]);
console.log("✓ proveedor: Gemini o Claude por variable; los turnos se ordenan para ambas APIs");

// 2) Verificación del webhook
let r = await call("GET", "whatsapp?hub.mode=subscribe&hub.verify_token=verificame&hub.challenge=4242");
assert.equal(r.status, 200); assert.equal(r.data, 4242);
r = await call("GET", "whatsapp?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=4242");
assert.equal(r.status, 403);
console.log("✓ webhook: Meta lo verifica solo con el token correcto");

// 3) Firma
reset();
r = await inbound(waMsg("Oi"), "clave-falsa");
assert.equal(r.status, 401); assert.equal(calls.length, 0);
r = await call("POST", "whatsapp", null, { raw: JSON.stringify(waMsg("Oi")) });
assert.equal(r.status, 401, "sin firma no entra");
console.log("✓ webhook: rechaza avisos sin la firma de Meta");

// 4) Mensaje real → Gemini → respuesta por WhatsApp
reset();
r = await inbound(waMsg("Oi! Somos 4 pessoas, o que vocês recomendam?"));
assert.equal(r.status, 200);
const gem = of("generativelanguage")[0];
assert.ok(gem, "llama a Gemini");
assert.equal(gem.headers["x-goog-api-key"], "g-key");
assert.ok(gem.url.includes("/models/gemini-2.5-flash:generateContent"));
const sys = gem.body.system_instruction.parts[0].text;
assert.ok(sys.includes("City Tour Zona Sul") && sys.includes("https://gasparottoviajes.com/paquetes/city-tour-zona-sur/") && sys.includes("R$ 180") && sys.includes("09:00, 14:00"), "el catálogo va en el contexto");
assert.ok(!sys.includes("Paquete borrador"), "lo no publicado no se ofrece");
assert.ok(/empleado/.test(sys) && /No sos guía/.test(sys) && /TU TRABAJO ES VENDER/.test(sys), "actúa como empleado, solo habla de la agencia y empuja la venta");
assert.ok(/ESTE ES TU PRIMER MENSAJE/.test(sys) && /a Ana por su nombre/.test(sys) && /desde 2006/.test(sys), "primer mensaje: presentación institucional con el nombre");
assert.ok(/portugués de Brasil, español o inglés/.test(sys), "tres idiomas");
assert.ok(/primera vez que visita Argentina/.test(sys) && /qué destinos/.test(sys) && /NUNCA vuelvas a preguntar/.test(sys), "preguntas de descubrimiento sin repetir");
assert.ok(/ORIGEN del contacto: Contacto directo/.test(sys), "origen del contacto");
assert.ok(sys.includes("BLOG (notas para recomendar") && sys.includes("https://gasparottoviajes.com/blog/guia-palermo/"), "el blog va en el contexto");
assert.ok(sys.includes("4.9 estrellas en Google (312 reseñas)") && sys.includes("place_id:ChIJtest") && sys.includes("Passeio incrível"), "reputación de Google");
assert.deepEqual(gem.body.contents, [{ role: "user", parts: [{ text: "Oi! Somos 4 pessoas, o que vocês recomendam?" }] }]);
const sends = of("graph.facebook.com").filter((c) => c.body.type === "text");
assert.equal(sends.length, 1);
assert.equal(sends[0].body.to, "5511999990000");
assert.equal(sends[0].body.text.body, aiReply);
assert.equal(sends[0].headers.authorization, "Bearer wa-token");
assert.ok(of("graph.facebook.com").some((c) => c.body.status === "read"), "marca como leído");
const chat = await one("SELECT * FROM ia_chats WHERE contact='5511999990000'");
assert.equal(chat.name, "Ana"); assert.equal(chat.msgs, 2); assert.equal(chat.paused, 0);
const lead = await one("SELECT * FROM leads WHERE source='ia'");
assert.equal(lead.phone, "+5511999990000"); assert.equal(lead.name, "Ana");
console.log("✓ mensaje: Gemini responde con el catálogo, sale por WhatsApp y la conversación entra a Consultas");

// 5) Segundo mensaje: lleva el historial; Meta reintenta el mismo aviso → no se contesta dos veces
reset();
const p2 = waMsg("Dia 10 de março");
await inbound(p2);
const g5 = of("generativelanguage")[0];
assert.equal(g5.body.contents.length, 3, "historial: cliente, IA, cliente");
assert.ok(/Ya te presentaste/.test(g5.body.system_instruction.parts[0].text), "no repite la presentación");
reset();
await inbound(p2);
assert.equal(of("generativelanguage").length, 0, "aviso repetido: no se contesta de nuevo");
assert.equal((await one("SELECT COUNT(*) n FROM leads WHERE source='ia'")).n, 1, "una sola consulta por conversación");
console.log("✓ historial: la IA ve la charla; los avisos repetidos de Meta se ignoran");

// 6) Derivación a una persona
reset();
aiReply = "Claro! Uma pessoa da nossa equipe já vai te escrever. [[HUMANO]]";
await inbound(waMsg("Quero falar com uma pessoa"));
assert.equal(of("graph.facebook.com").filter((c) => c.body.type === "text")[0].body.text.body, "Claro! Uma pessoa da nossa equipe já vai te escrever.", "la marca no le llega al cliente");
let c2 = await one("SELECT * FROM ia_chats WHERE contact='5511999990000'");
assert.equal(c2.paused, 0, "la IA no se detiene sola"); assert.equal(c2.handoff, 1, "queda marcada para mirar");
reset(); aiReply = "Claro, estou aqui!";
await inbound(waMsg("Alô?"));
assert.equal(of("generativelanguage").length, 1, "la IA sigue respondiendo todo");
console.log("✓ marcar para una persona: la IA marca la charla y sigue respondiendo");

// 7) Claude (mismo código, otra variable)
reset();
aiReply = "Hola! Te recomiendo el City Tour.";
env.IA_PROVEEDOR = "claude"; env.ANTHROPIC_API_KEY = "sk-ant-test";
await inbound(waMsg("Hola, somos 2", "5491100000000", "Juan"));
const cl = of("api.anthropic.com")[0];
assert.ok(cl, "llama a Claude");
assert.equal(cl.headers["x-api-key"], "sk-ant-test"); assert.equal(cl.headers["anthropic-version"], "2023-06-01");
assert.equal(cl.body.model, "claude-sonnet-5-5");
assert.ok(cl.body.system.includes("City Tour Zona Sul"));
assert.deepEqual(cl.body.messages, [{ role: "user", content: "Hola, somos 2" }]);
assert.equal(of("generativelanguage").length, 0);
env.IA_PROVEEDOR = "gemini"; delete env.ANTHROPIC_API_KEY;
console.log("✓ Claude: cambiando IA_PROVEEDOR=claude usa la API de Anthropic sin tocar código");

// 8) Error de la IA → aviso amable y la charla pasa a una persona
reset(); aiFail = true;
await inbound(waMsg("Olá", "5511888880000", "Bia"));
const fb = of("graph.facebook.com").filter((c) => c.body.type === "text")[0];
assert.ok(fb && /atendente/.test(fb.body.text.body), "aviso de que responde una persona");
const c3 = await one("SELECT * FROM ia_chats WHERE contact='5511888880000'");
assert.equal(c3.handoff, 1); assert.ok(/límite/.test(c3.handoff_reason)); assert.equal(c3.paused, 0);
reset();
await inbound(waMsg("Alô??", "5511888880000", "Bia"));
assert.equal(of("graph.facebook.com").filter((c) => c.body.type === "text").length, 0, "el aviso no se repite en cada mensaje");
aiFail = false;
reset(); aiReply = "Oi Bia!";
await inbound(waMsg("Oi de novo", "5511888880000", "Bia"));
assert.equal(of("graph.facebook.com").filter((c) => c.body.type === "text")[0].body.text.body, "Oi Bia!", "cuando la IA vuelve, responde sola");
// Audio: se pide texto, sin llamar a la IA
reset();
await inbound(waMsg("", "5511777770000", "Caio", "audio"));
assert.equal(of("generativelanguage").length, 0);
assert.ok(/texto/.test(of("graph.facebook.com").filter((c) => c.body.type === "text")[0].body.text.body));
console.log("✓ fallas: si la IA no responde, el cliente recibe un aviso y la charla queda para el equipo; los audios piden texto");

// 9) IA_ACTIVA=0 apaga las respuestas
reset(); env.IA_ACTIVA = "0";
await inbound(waMsg("Oi", "5511666660000"));
assert.equal(of("generativelanguage").length, 0); assert.equal(of("graph.facebook.com").filter((c) => c.body.type === "text").length, 0);
env.IA_ACTIVA = "1";
console.log("✓ IA_ACTIVA=0 apaga las respuestas sin perder los mensajes");

// 10) Panel
assert.equal((await call("GET", "ia")).status, 401, "sin sesión, nada");
r = await call("GET", "ia", null, { cookie: admin });
assert.equal(r.status, 200);
assert.equal(r.data.ia.provider, "gemini"); assert.equal(r.data.ia.ready, true);
assert.deepEqual(r.data.whatsapp.missing, []);
assert.equal(r.data.whatsapp.webhook, "https://gasparottoviajes.com/api/whatsapp");
assert.equal(r.data.pending, 2);
assert.equal(r.data.chats[0].handoff, 1, "primero las que piden una persona");
assert.equal(r.data.ia.detenida, false); assert.ok(r.data.stats.charlasHoy >= 1);
assert.ok(!JSON.stringify(r.data).includes("g-key") && !JSON.stringify(r.data).includes("wa-token"), "el panel nunca muestra claves");
assert.equal((await call("GET", "ia?count=1", null, { cookie: admin })).data.pending, 2);
// Indicaciones
r = await call("PUT", "ia/config", { instrucciones: "Ofrecé como extra el City Fotográfico Privado." }, { cookie: admin });
assert.equal(r.status, 200);
reset(); resetCatalogo();
r = await call("POST", "ia/probar", { messages: [{ role: "user", text: "Oi" }] }, { cookie: admin });
assert.equal(r.status, 200); assert.equal(r.data.reply, aiReply);
assert.ok(of("generativelanguage")[0].body.system_instruction.parts[0].text.includes("City Fotográfico Privado"), "las indicaciones van al contexto");
assert.equal(of("graph.facebook.com").length, 0, "la prueba no envía nada por WhatsApp");
// Responder como persona y devolver a la IA
const cid = (await one("SELECT id FROM ia_chats WHERE contact='5511999990000'")).id;
reset();
r = await call("POST", "ia/" + cid, { text: "Oi Ana, sou o Mario! Te ajudo com a reserva." }, { cookie: admin });
assert.equal(r.status, 200);
assert.equal(of("graph.facebook.com")[0].body.text.body, "Oi Ana, sou o Mario! Te ajudo com a reserva.");
assert.deepEqual({ ...(await one("SELECT handoff, paused FROM ia_chats WHERE id=?", cid)) }, { handoff: 0, paused: 0 }, "responder como persona no detiene la IA");
r = await call("GET", "ia/" + cid, null, { cookie: admin });
assert.equal(r.data.messages.at(-1).role, "agent");
// Detener la IA en una charla y reanudarla
await call("PUT", "ia/" + cid, { paused: true }, { cookie: admin });
reset(); await inbound(waMsg("Tem vaga?"));
assert.equal(of("generativelanguage").length, 0, "detenida en esa charla no contesta");
await call("PUT", "ia/" + cid, { paused: false }, { cookie: admin });
reset();
aiReply = "Perfeito!";
await inbound(waMsg("Obrigada!"));
assert.equal(of("generativelanguage").length, 1, "reanudada, vuelve a contestar");
assert.ok(of("generativelanguage")[0].body.contents.some((t) => t.role === "model" && t.parts[0].text.includes("sou o Mario")), "la IA ve lo que escribió la persona del equipo");
// Detener todas las respuestas desde el panel (sin tocar Cloudflare)
await call("PUT", "ia/config", { detenida: true }, { cookie: admin });
reset(); await inbound(waMsg("Oi?", "5511555550000", "Leo"));
assert.equal(of("generativelanguage").length + of("graph.facebook.com").filter((c) => c.body.type === "text").length, 0, "detenida en todo el sitio");
assert.ok(await one("SELECT 1 x FROM ia_messages WHERE text='Oi?'"), "el mensaje se guarda igual");
await call("PUT", "ia/config", { detenida: false }, { cookie: admin });
assert.equal((await call("GET", "ia", null, { cookie: admin })).data.ia.detenida, false);
console.log("✓ panel: detener/reanudar (todo o una charla), prueba sin enviar, indicaciones, responder como persona");

// 11) Pago: la venta se cierra en la web y el equipo solo verifica el ingreso
const pkgId = (await one("SELECT id FROM packages WHERE slug='city-tour-zona-sur'")).id;
await env.DB.prepare("INSERT INTO bookings (package_id, day, time, pax, phone, status, total, currency) VALUES (?,?,?,?,?,?,?,?)").bind(pkgId, "2027-03-10", "09:00", 4, "+55 (11) 99999-0000", "pagada", 72000, "BRL").run();
await env.DB.prepare("INSERT INTO bookings (package_id, day, pax, phone, status, total, currency) VALUES (?,?,?,?,?,?,?)").bind(pkgId, "2027-04-02", 2, "21 98765-4321", "pendiente", 36000, "BRL").run();
reset(); aiReply = "Seu pagamento está confirmado! Reserva do City Tour para 10/03 às 09:00.";
await inbound(waMsg("Já paguei, chegou?"));
let ps = of("generativelanguage")[0].body.system_instruction.parts[0].text;
assert.ok(/Reserva #\d+: City Tour Zona Sul, 2027-03-10 09:00, 4 pers\., total 720\.00 BRL · estado: \*pagada\*/.test(ps), "la IA ve la reserva del cliente aunque el teléfono esté escrito distinto");
assert.ok(!ps.includes("2027-04-02"), "no ve reservas de otros clientes");
assert.ok(/La venta se cierra SIEMPRE en la web/.test(ps) && /Nunca digas que un pago está acreditado/.test(ps));
assert.equal((await one("SELECT pay_check FROM ia_chats WHERE contact='5511999990000'")).pay_check, 0);
// Comprobante: Bruno (reserva pendiente) escribe y después manda una foto → botones, sin IA
reset(); aiReply = "Ainda não vejo o pagamento. Pode me mandar o comprovante por aqui?";
await inbound(waMsg("Oi, já paguei a reserva", "552187654321", "Bruno"));
assert.ok(/2027-04-02.*estado: \*pendiente\*/.test(of("generativelanguage")[0].body.system_instruction.parts[0].text), "número de Brasil sin el 9 inicial: igual encuentra la reserva");
assert.equal((await one("SELECT pay_check FROM ia_chats WHERE contact='552187654321'")).pay_check, 0, "decir 'ya pagué' no marca nada: se pide el comprobante");
reset();
await inbound(waMsg("", "552187654321", "Bruno", "image"));
assert.equal(of("generativelanguage").length, 0, "la foto no pasa por la IA");
const btn = of("graph.facebook.com").find((c) => c.body.type === "interactive");
assert.ok(btn, "pregunta con botones");
assert.equal(btn.body.interactive.body.text, "Recebemos seu arquivo. É o comprovante de pagamento de uma reserva?");
assert.deepEqual(btn.body.interactive.action.buttons.map((b) => b.reply.id), ["pago_si", "pago_no"]);
assert.ok(btn.body.interactive.action.buttons.every((b) => b.reply.title.length <= 20), "títulos dentro del límite de WhatsApp");
let cb = await one("SELECT * FROM ia_chats WHERE contact='552187654321'");
assert.equal(cb.pay_check, 0, "la foto sola no marca nada");
const tap = (id, title, from = "552187654321", name = "Bruno") => ({ entry: [{ changes: [{ value: { contacts: [{ wa_id: from, profile: { name } }],
  messages: [{ from, id: "wamid.in" + ++mid, type: "interactive", interactive: { type: "button_reply", button_reply: { id, title } } }] } }] }] });
// "No" → no marca nada
reset();
await inbound(tap("pago_no", "Não, é outra coisa"));
assert.equal(of("generativelanguage").length, 0);
assert.ok(/Me conta como posso te ajudar/.test(of("graph.facebook.com").find((c) => c.body.type === "text").body.text.body));
assert.equal((await one("SELECT pay_check FROM ia_chats WHERE id=?", cb.id)).pay_check, 0);
// "Sí" con la reserva pendiente → Verificar pago, sin pausar la IA
reset();
await inbound(tap("pago_si", "Sim, é comprovante"));
assert.ok(/equipe confere o pagamento/.test(of("graph.facebook.com").find((c) => c.body.type === "text").body.text.body));
cb = await one("SELECT * FROM ia_chats WHERE id=?", cb.id);
assert.equal(cb.pay_check, 1); assert.equal(cb.paused, 0, "la IA sigue atendiendo mientras se verifica");
// Meta reintenta el mismo toque → no se repite
reset(); const again = tap("pago_si", "Sim, é comprovante"); again.entry[0].changes[0].value.messages[0].id = "wamid.in" + (mid - 1);
await inbound(again);
assert.equal(of("graph.facebook.com").filter((c) => c.body.type === "text").length, 0);
// "Sí" con la reserva ya pagada (Ana) → se lo confirma con los datos de la reserva y no molesta al equipo
await call("PUT", "ia/" + cid, { paused: false }, { cookie: admin });
reset();
await inbound(tap("pago_si", "Sim, é comprovante", "5511999990000", "Ana"));
assert.equal(of("graph.facebook.com").find((c) => c.body.type === "text").body.text.body, "Seu pagamento já está confirmado! ✅ *City Tour Zona Sul* no dia 2027-03-10 às 09:00, para 4 pessoas.");
assert.equal((await one("SELECT pay_check FROM ia_chats WHERE id=?", cid)).pay_check, 0);
// Cliente que escribe en español → botones en español
reset();
await inbound(waMsg("Hola! ya pagué, gracias", "5491155556666", "Lucía"));
reset();
await inbound(waMsg("", "5491155556666", "Lucía", "document"));
assert.equal(of("graph.facebook.com").find((c) => c.body.type === "interactive").body.interactive.body.text, "Recibimos tu archivo. ¿Es el comprobante de pago de una reserva?");
reset(); aiReply = "Claro, o passeio começa às 09:00.";
await inbound(waMsg("Que horas começa?", "552187654321", "Bruno"));
assert.equal(of("generativelanguage").length, 1, "sigue contestando");
r = await call("GET", "ia?count=1", null, { cookie: admin });
const before = r.data.pending;
r = await call("GET", "ia", null, { cookie: admin });
{ const cs = r.data.chats, iB = cs.findIndex((c) => c.contact === "552187654321"), iCalm = cs.findIndex((c) => !c.handoff && !c.pay_check); assert.ok(iB >= 0 && iB < iCalm, "las de pago a verificar van arriba"); }
await call("PUT", "ia/" + cb.id, { pay_check: false }, { cookie: admin });
cb = await one("SELECT * FROM ia_chats WHERE id=?", cb.id);
assert.equal(cb.pay_check, 0); assert.equal(cb.paused, 0, "verificar el pago no pausa la IA");
assert.equal((await call("GET", "ia?count=1", null, { cookie: admin })).data.pending, before - 1);
// Prueba del panel: no hay reservas reales
reset();
await call("POST", "ia/probar", { messages: [{ role: "user", text: "já paguei" }] }, { cookie: admin });
assert.ok(of("generativelanguage")[0].body.system_instruction.parts[0].text.includes("(No disponible en esta prueba.)"));
console.log("✓ pagos: se cobra en la web; la IA confirma solo lo que figura pagado y marca para verificar el resto sin dejar de atender");

// 12) Coexistencia: respuesta desde la app del celular → la IA se pausa en esa charla
const eco = (to, text) => ({ entry: [{ changes: [{ field: "smb_message_echoes", value: { metadata: { phone_number_id: "123456" },
  message_echoes: [{ from: "5491164199083", to, id: "wamid.echo" + ++mid, type: "text", text: { body: text } }] } }] }] });
reset();
await inbound(eco("5491155556666", "Hola Lucía, soy Mario, ya te confirmo"));
assert.equal(of("generativelanguage").length + of("graph.facebook.com").length, 0, "el eco no dispara nada");
let cl2 = await one("SELECT * FROM ia_chats WHERE contact='5491155556666'");
assert.equal(cl2.paused, 0, "por defecto la IA sigue respondiendo");
assert.equal((await one("SELECT role FROM ia_messages WHERE chat_id=? ORDER BY id DESC LIMIT 1", cl2.id)).role, "agent");
reset();
await inbound(waMsg("Dale, gracias!", "5491155556666", "Lucía"));
assert.equal(of("generativelanguage").length, 1);
// Con la opción activada, responder desde el celular detiene la IA en esa charla
await call("PUT", "ia/config", { pausaCelular: true }, { cookie: admin });
await inbound(eco("5491155556666", "Te llamo ahora"));
assert.equal((await one("SELECT paused FROM ia_chats WHERE contact='5491155556666'")).paused, 1);
reset(); await inbound(waMsg("Ok!", "5491155556666", "Lucía"));
assert.equal(of("generativelanguage").length, 0, "con la opción activada, la IA no contesta");
// Avisos de otro número de la misma cuenta: se ignoran
reset();
const other = waMsg("Hola", "5491177778888", "Otro"); other.entry[0].changes[0].value.metadata = { phone_number_id: "999" };
await inbound(other);
assert.equal(of("generativelanguage").length, 0);
assert.equal(await one("SELECT 1 x FROM ia_chats WHERE contact='5491177778888'"), null);
// Origen: anuncio de Meta (referral), web (nombra un paquete), promoción
reset(); aiReply = "Oi!";
const ad = waMsg("Oi, quero saber mais", "5511444440000", "Rita"); ad.entry[0].changes[0].value.messages[0].referral = { source_type: "ad", headline: "City Tour com 10% OFF", body: "Só em março", source_url: "https://fb.me/x" };
await inbound(ad);
assert.ok(/Anuncio de Meta: "City Tour com 10% OFF"/.test(of("generativelanguage")[0].body.system_instruction.parts[0].text), "la IA sabe que viene de un anuncio");
assert.ok(/Anuncio/.test((await one("SELECT origin FROM ia_chats WHERE contact='5511444440000'")).origin));
assert.ok(/\[Anuncio de Meta/.test((await one("SELECT message FROM leads WHERE phone='+5511444440000'")).message), "el origen queda en Consultas");
reset(); await inbound(waMsg("Olá, tenho interesse em City Tour Zona Sul", "5511333330000", "Edu"));
assert.equal((await one("SELECT origin FROM ia_chats WHERE contact='5511333330000'")).origin, 'Web: consulta por "City Tour Zona Sul"');
reset(); await inbound(waMsg("Vi a promoção no Instagram", "5511222220000", "Gil"));
assert.ok(/^Promoción/.test((await one("SELECT origin FROM ia_chats WHERE contact='5511222220000'")).origin));
// Inglés: los botones del comprobante salen en inglés
reset(); await inbound(waMsg("Hello! We are 3 people, how much is the tour?", "4477000000000", "John"));
reset(); await inbound(waMsg("", "4477000000000", "John", "image"));
assert.equal(of("graph.facebook.com").find((c) => c.body.type === "interactive").body.interactive.body.text, "We got your file. Is it the payment receipt for a booking?");
console.log("✓ coexistencia (opcional), origen del contacto (anuncio, web, promoción) e inglés");

console.log("\nTodo OK: asistente IA");

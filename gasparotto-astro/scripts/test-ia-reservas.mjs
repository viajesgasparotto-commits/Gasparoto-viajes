// Gaspi consulta disponibilidad en tiempo real y reserva desde WhatsApp (herramientas.js + pensar).
// Base en memoria (node:sqlite) y la IA simulada: cada vuelta devuelve la respuesta siguiente de la lista.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { disponibilidad, reservar } from "../functions/lib/herramientas.js";
import { pensar } from "../functions/lib/asistente.js";
import { ensureSchema } from "../functions/lib/schema.js";
import { addDays, todayBA } from "../functions/lib/booking.js";

function d1() { const db = new DatabaseSync(":memory:"); const mk = (sql, a = []) => ({ bind: (...x) => mk(sql, x), run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; }, first: async () => db.prepare(sql).get(...a) ?? null, all: async () => ({ results: db.prepare(sql).all(...a) }) }); return { prepare: (s) => mk(s), batch: async (l) => { for (const x of l) await x.run(); return []; }, exec: async (s) => db.exec(s) }; }
const DB = d1();
await ensureSchema(DB);
const env = { DB, GEMINI_API_KEY: "g", SITE_URL: "https://x.test", MP_ACCESS_TOKEN: "mp", SITE_LANG: "pt-BR" };
const meta = JSON.stringify({ kind: "servicio", times: [["20:00", ""]], options: [["Jantar e Show", "R$ 475"], ["Somente Show", "R$ 210"]] });
await DB.prepare("INSERT INTO packages (slug, title, category, price, published, meta, booking_enabled, min_pax, max_pax, daily_capacity, weekdays, min_advance_days, horizon_days, pay_mode, time_booking) VALUES ('tango','Tango Porteño','tango','R$ 210',1,?,1,1,8,6,'0,1,2,3,4,5,6',1,60,'pix',1)").bind(meta).run();

const dia = addDays(todayBA(), 3);
let t = await disponibilidad(env, `tango | desde ${dia}`);
assert.ok(t.includes("TEMPO REAL") || t.includes("TIEMPO REAL"), t);
assert.ok(t.includes(`${dia} (`) && t.includes("20:00 quedan 6"), "lista el día con su horario y lugares: " + t);
assert.ok((await disponibilidad(env, "no-existe")).includes("no encontré"));
console.log("✓ disponibilidad en tiempo real (días, horarios y lugares)");

// Charlas (la propuesta de reserva se guarda en la charla)
await DB.prepare("INSERT INTO ia_chats (channel, contact, name) VALUES ('whatsapp','5511988887777','Ana')").run();
await DB.prepare("INSERT INTO ia_chats (channel, contact, name) VALUES ('whatsapp','5511999990000','Bia')").run();
const C1 = 1, C2 = 2;
const RES = `producto: tango | fecha: ${dia} | hora: 20:00 | opcion: Somente Show | adultos: 2 | nombre: Ana Souza`;
const contar = async () => (await DB.prepare("SELECT COUNT(*) n FROM bookings").first()).n;

// Prueba del panel (sin contacto): propone y, si el cliente confirma después del resumen, simula la reserva sin guardar nada
let r = await reservar(env, RES, { ultimo: "quero reservar", previo: "" });
assert.ok(r.texto.startsWith("PROPUESTA") && r.texto.includes("R$ 420"), r.texto);
r = await reservar(env, RES, { ultimo: "sim", previo: "Resumo: total R$ 420. Confirma?" });
assert.ok(r.texto.includes("#PRUEBA") && (await contar()) === 0, r.texto);
console.log("✓ prueba del panel: propone con el total y simula la reserva sin guardar nada");

// Mercado Pago y Gemini simulados
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes("mercadopago")) return Response.json({ id: 987, point_of_interaction: { transaction_data: { qr_code: "00020126PIXCOPIAECOLA", qr_code_base64: "" } } });
  if (u.includes("generativelanguage")) { const text = AI.shift() || "ok"; return Response.json({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] }); }
  return new Response("{}", { status: 404 });
};
let AI = [];

// Paso 1: la primera marca NO reserva (solo propone y guarda la propuesta)
r = await reservar(env, RES, { contact: "5511988887777", chatId: C1, ultimo: "pode reservar", inicio: Date.now() });
assert.ok(r.texto.startsWith("PROPUESTA") && !r.id && (await contar()) === 0, r.texto);
// En el mismo mensaje no se puede confirmar (la propuesta tiene que ser de un mensaje anterior)
r = await reservar(env, RES, { contact: "5511988887777", chatId: C1, ultimo: "pode reservar", inicio: Date.now() - 60e3 });
assert.ok(!r.id && (await contar()) === 0, "una propuesta del mismo mensaje no cuenta como confirmada");
await new Promise((x) => setTimeout(x, 5));
// Paso 2: el cliente dice que sí en un mensaje posterior → se crea
r = await reservar(env, RES, { contact: "5511988887777", chatId: C1, ultimo: "sim, confirmo", inicio: Date.now(), previo: "Oi" });
assert.ok(!r.id, "si el resumen con el total no llegó al cliente, no se reserva (se vuelve a proponer)");
await new Promise((x) => setTimeout(x, 5));
r = await reservar(env, RES, { contact: "5511988887777", chatId: C1, ultimo: "sim, confirmo", inicio: Date.now(), previo: "Resumo: total *R$ 420*. Confirma?" });
assert.ok(r.id && r.pix === "00020126PIXCOPIAECOLA", r.texto);
const b = await DB.prepare("SELECT * FROM bookings WHERE id=?").bind(r.id).first();
assert.equal(b.status, "pendiente"); assert.equal(b.pax, 2); assert.equal(b.total, 42000); assert.equal(b.option_name, "Somente Show"); assert.equal(b.phone, "+5511988887777");
t = await disponibilidad(env, `tango | desde ${dia}`);
assert.ok(t.includes("20:00 quedan 4"), "la reserva descuenta el cupo: " + t);
console.log("✓ confirmación en dos pasos: propone, el cliente dice sí y recién ahí reserva (cupo, total, Pix)");

// Pix manual (sin pasarela): con la clave del panel, al reservar el sistema manda la clave aparte y la IA pide el comprobante.
{
  const envM = { ...env, MP_ACCESS_TOKEN: "" };
  const RESM = `producto: tango | fecha: ${dia} | hora: 20:00 | opcion: Somente Show | adultos: 1 | nombre: Bia Lima`;
  const C3 = (await DB.prepare("INSERT INTO ia_chats (channel, contact, name) VALUES ('whatsapp','5521977776666','Bia')").run()).meta.last_row_id;
  // sin clave cargada: como antes, sin clave ni código
  await reservar(envM, RESM, { contact: "5521977776666", chatId: C3, ultimo: "quero", inicio: Date.now() - 2000 });
  await new Promise((x) => setTimeout(x, 5));
  let m = await reservar(envM, RESM, { contact: "5521977776666", chatId: C3, ultimo: "sim", inicio: Date.now(), previo: "Total *R$ 210*. Confirma?" });
  assert.ok(m.id && !m.pix && !/PIX MANUAL/.test(m.texto), m.texto);
  await DB.prepare("DELETE FROM bookings WHERE id=?").bind(m.id).run();
  await DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('ia_pix_manual', ?)").bind(JSON.stringify({ chave: "pix@agencia.com", nombre: "Eliel Bispo" })).run();
  await reservar(envM, RESM, { contact: "5521977776666", chatId: C3, ultimo: "quero", inicio: Date.now() - 2000 });
  await new Promise((x) => setTimeout(x, 5));
  m = await reservar(envM, RESM, { contact: "5521977776666", chatId: C3, ultimo: "sim", inicio: Date.now(), previo: "Total *R$ 210*. Confirma?" });
  assert.ok(m.id && m.pix === "pix@agencia.com", m.texto); assert.ok(/PIX MANUAL/.test(m.texto) && /Eliel Bispo/.test(m.texto) && /comprobante/.test(m.texto), m.texto);
  const t2 = await reservar(envM, RESM, { ultimo: "sim", previo: "Total R$ 210. Confirma?" });
  assert.equal(t2.pix, "pix@agencia.com", "la prueba del panel también la muestra");
  await DB.prepare("DELETE FROM bookings WHERE id=?").bind(m.id).run();
  await DB.prepare("DELETE FROM settings WHERE key='ia_pix_manual'").run();
  console.log("✓ Pix manual: sin pasarela, manda la clave del panel aparte y pide el comprobante");
}

// Un "no" no reserva
await reservar(env, `producto: tango | fecha: ${dia} | hora: 20:00 | opcion: Somente Show | adultos: 1 | nombre: Ana Souza`, { contact: "5511988887777", chatId: C1, ultimo: "quero", inicio: Date.now() });
await new Promise((x) => setTimeout(x, 5));
r = await reservar(env, `producto: tango | fecha: ${dia} | hora: 20:00 | opcion: Somente Show | adultos: 1 | nombre: Ana Souza`, { contact: "5511988887777", chatId: C1, ultimo: "não, espera", inicio: Date.now() });
assert.ok(!r.id, "si el cliente dice que no, no se reserva");
console.log("✓ si el cliente no confirma, no se reserva");

r = await reservar(env, `producto: tango | fecha: ${dia} | hora: 20:00 | opcion: Somente Show | adultos: 7 | nombre: Ana Souza`, { contact: "5511988887777", chatId: C1, ultimo: "sim", inicio: Date.now() });
assert.ok(!r.id && r.texto.includes("NO CREADA"), r.texto);
console.log("✓ sin lugar suficiente: no propone ni reserva");

// Charla completa con pensar(): consulta → propuesta → confirmación → reserva + Pix aparte
AI = [`[[DISPONIBILIDAD tango | desde ${dia}]]`, "Temos lugar às *20:00*. Reservo para vocês?"];
let out = await pensar(env, [{ role: "user", text: "Oi, tem lugar para sábado?" }], { contact: "5511999990000", chatId: C2, nombre: "Bia" });
assert.equal(out.reply, "Temos lugar às *20:00*. Reservo para vocês?");
const M = `[[RESERVAR producto: tango | fecha: ${dia} | hora: 20:00 | opcion: Jantar e Show | adultos: 2 | nombre: Bia Lima]]`;
AI = [M, "Resumo: *Tango Porteño* (Jantar e Show), 2 adultos, total *R$ 950*. Confirma?"];
out = await pensar(env, [{ role: "user", text: "Oi, tem lugar para sábado?" }, { role: "assistant", text: "Temos lugar às 20:00. Reservo?" }, { role: "user", text: "Pode reservar, jantar e show, 2 adultos, Bia Lima" }], { contact: "5511999990000", chatId: C2, nombre: "Bia" });
assert.ok(!out.reserva && (await contar()) === 1, "primero solo propone");
await new Promise((x) => setTimeout(x, 5));
AI = [M, "Prontinho, Bia! Sua vaga ficou reservada. O código Pix chega na próxima mensagem."];
out = await pensar(env, [{ role: "user", text: "Pode reservar, jantar e show, 2 adultos, Bia Lima" }, { role: "assistant", text: "Resumo: total R$ 950. Confirma?" }, { role: "user", text: "Sim, confirmo" }], { contact: "5511999990000", chatId: C2, nombre: "Bia" });
assert.ok(out.reserva > 0 && out.pix === "00020126PIXCOPIAECOLA" && !/RESERVAR/.test(out.reply), JSON.stringify(out));
assert.equal((await DB.prepare("SELECT total FROM bookings WHERE id=?").bind(out.reserva).first()).total, 95000);
console.log("✓ charla completa: consulta → propuesta → sí → reserva → código Pix aparte");

// Reintento después de un corte: el mismo pedido no duplica
const antes = await contar();
r = await reservar(env, M.slice(11, -2), { contact: "5511999990000", chatId: C2, ultimo: "Sim, confirmo", inicio: Date.now(), previo: "total R$ 950. Confirma?" });
assert.equal(await contar(), antes, "el mismo pedido repetido no crea otra reserva");
console.log("✓ un reintento o una marca repetida no duplica la reserva");

AI = [1, 2, 3].map(() => `[[DISPONIBILIDAD tango | desde ${dia}]]`).concat(["Temos lugar às *20:00*."]);
out = await pensar(env, [{ role: "user", text: "tem lugar?" }], { contact: "5511999990002" });
assert.equal(out.reply, "Temos lugar às *20:00*.", "si la IA insiste con marcas, igual termina con un mensaje para el cliente");
console.log("✓ nunca queda una respuesta vacía");
let llamadas = 0; const f0 = globalThis.fetch;
globalThis.fetch = async (u, i) => { if (String(u).includes("generativelanguage")) llamadas++; return f0(u, i); };
AI = [M, "Resumo pronto. Confirma?"];
await pensar(env, [{ role: "user", text: "Pode reservar, jantar e show, 2 adultos, Bia Lima" }], { contact: "5511999990009" });
globalThis.fetch = f0;
assert.equal(llamadas, 2, "después de una reserva/propuesta, la llamada siguiente es la última (cabe en el tiempo de WhatsApp)");
console.log("✓ después de reservar o proponer, a lo sumo una llamada más (rápido para WhatsApp)");

// Idioma: si sale en español para un cliente brasileño, se reescribe
AI = ["Perfecto, Carla. ¿Me confirmás la reserva para mañana?", "Perfeito, Carla. Confirma a reserva para amanhã?"];
out = await pensar(env, [{ role: "user", text: "Oi! Pode reservar, meu nome é Carla" }], { contact: "5511999990003" });
assert.equal(out.reply, "Perfeito, Carla. Confirma a reserva para amanhã?");
console.log("✓ responde en el idioma del cliente (si sale en otro, se reescribe)");

AI = [`[[RESERVAR producto: tango | fecha: ${dia} | hora: 20:00 | adultos: 1 | nombre: X Y]]`];
out = await pensar(env, [{ role: "user", text: "oi" }], { contact: "5511999990001", seguimiento: 3 });
assert.ok(!out.reserva && !/\[\[/.test(out.reply), "en los seguimientos automáticos no se reserva");
console.log("✓ los seguimientos automáticos no usan las herramientas");
console.log("Todo OK: reservas por WhatsApp");

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

// Prueba del panel (sin contacto): no se guarda nada
let r = await reservar(env, `producto: tango | fecha: ${dia} | hora: 20:00 | opcion: Somente Show | adultos: 2 | nombre: Ana Souza`, {});
assert.ok(r.texto.includes("PRUEBA") && !r.id);
assert.equal((await DB.prepare("SELECT COUNT(*) n FROM bookings").first()).n, 0);
console.log("✓ en la prueba del panel no se crea ninguna reserva");

// Mercado Pago simulado para el Pix
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url); calls.push(u);
  if (u.includes("mercadopago")) return Response.json({ id: 987, point_of_interaction: { transaction_data: { qr_code: "00020126PIXCOPIAECOLA", qr_code_base64: "" } } });
  if (u.includes("generativelanguage")) { const text = AI.shift() || "ok"; return Response.json({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] }); }
  return new Response("{}", { status: 404 });
};
let AI = [];
r = await reservar(env, `producto: tango | fecha: ${dia} | hora: 20:00 | opcion: Somente Show | adultos: 2 | nombre: Ana Souza`, { contact: "5511988887777" });
assert.ok(r.id && r.pix === "00020126PIXCOPIAECOLA", r.texto);
const b = await DB.prepare("SELECT * FROM bookings WHERE id=?").bind(r.id).first();
assert.equal(b.status, "pendiente"); assert.equal(b.pax, 2); assert.equal(b.total, 42000); assert.equal(b.option_name, "Somente Show"); assert.equal(b.phone, "+5511988887777");
assert.ok(r.texto.includes("R$ 420"), r.texto);
t = await disponibilidad(env, `tango | desde ${dia}`);
assert.ok(t.includes("20:00 quedan 4"), "la reserva descuenta el cupo: " + t);
console.log("✓ reserva creada desde el chat (cupo retenido, total y código Pix)");

r = await reservar(env, `producto: tango | fecha: ${dia} | hora: 20:00 | opcion: Somente Show | adultos: 7 | nombre: Ana Souza`, { contact: "5511988887777" });
assert.ok(!r.id && r.texto.includes("NO CREADA"), r.texto);
console.log("✓ sin lugar suficiente: no reserva y explica el motivo");

// Vuelta completa: la IA pide disponibilidad, recibe el resultado y responde; después reserva y el Pix sale aparte.
AI = [`[[DISPONIBILIDAD tango | desde ${dia}]]`, "Temos lugar no dia às *20:00*. Reservo para vocês?"];
let out = await pensar(env, [{ role: "user", text: "tem lugar para sábado?" }], { contact: "5511999990000", nombre: "Bia" });
assert.equal(out.reply, "Temos lugar no dia às *20:00*. Reservo para vocês?");
assert.ok(!/\[\[/.test(out.reply));
AI = [`[[RESERVAR producto: tango | fecha: ${dia} | hora: 20:00 | opcion: Jantar e Show | adultos: 2 | nombre: Bia Lima]]`, "Prontinho, Bia! Sua vaga ficou reservada. O código Pix chega na próxima mensagem."];
out = await pensar(env, [{ role: "user", text: "sim, confirmo" }], { contact: "5511999990000", nombre: "Bia" });
assert.ok(out.reserva > 0 && out.pix === "00020126PIXCOPIAECOLA" && !/RESERVAR/.test(out.reply), JSON.stringify(out));
console.log("✓ charla completa: consulta → resultado → reserva → código Pix aparte");
const antes = (await DB.prepare("SELECT COUNT(*) n FROM bookings").first()).n;
r = await reservar(env, `producto: tango | fecha: ${dia} | hora: 20:00 | opcion: Jantar e Show | adultos: 2 | nombre: Bia Lima`, { contact: "5511999990000" });
assert.equal((await DB.prepare("SELECT COUNT(*) n FROM bookings").first()).n, antes, "el mismo pedido repetido no crea otra reserva");
assert.ok(r.id && r.pix === "00020126PIXCOPIAECOLA", r.texto);
console.log("✓ un reintento o una marca repetida no duplica la reserva");

AI = [1, 2, 3, 4].map(() => `[[DISPONIBILIDAD tango | desde ${dia}]]`).concat(["Temos lugar às *20:00*."]);
out = await pensar(env, [{ role: "user", text: "tem lugar?" }], { contact: "5511999990002" });
assert.equal(out.reply, "Temos lugar às *20:00*.", "si la IA insiste con marcas, igual termina con un mensaje para el cliente");
assert.equal(out.pasos.length, 3);
console.log("✓ nunca queda una respuesta vacía (la IA que insiste con consultas igual responde)");

AI = [`[[RESERVAR producto: tango | fecha: ${dia} | hora: 20:00 | adultos: 1 | nombre: X Y]]`];
out = await pensar(env, [{ role: "user", text: "oi" }], { contact: "5511999990001", seguimiento: 3 });
assert.ok(!out.reserva && !/\[\[/.test(out.reply), "en los seguimientos automáticos no se reserva");
console.log("✓ los seguimientos automáticos no usan las herramientas");
console.log("Todo OK: reservas por WhatsApp");

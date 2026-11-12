// Prueba del cobro con Pix (fase 3) contra SQLite real y una API de Mercado Pago simulada. No usa la red.
// Uso: npm run test:pix   (Node 22+)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { ensureSchema } from "../functions/lib/schema.js";
import { createBooking, addDays, todayBA, bookingConfig } from "../functions/lib/booking.js";
import { createPix, syncPayment, verifyWebhook, canPayPix, PIX_MINUTES } from "../functions/lib/pix.js";

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

// Mercado Pago simulado
const payments = new Map(); let nextId = 5550001;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url), m = init.method || "GET";
  const res = (o, s = 200) => ({ ok: s < 300, status: s, json: async () => o });
  if (u.endsWith("/v1/payments") && m === "POST") {
    assert.equal(init.headers.authorization, "Bearer TEST-TOKEN");
    assert.ok(init.headers["X-Idempotency-Key"]);
    const b = JSON.parse(init.body), id = nextId++;
    assert.equal(b.payment_method_id, "pix");
    payments.set(id, { id, status: "pending", transaction_amount: b.transaction_amount, currency_id: "BRL", external_reference: b.external_reference });
    return res({ id, status: "pending", point_of_interaction: { transaction_data: { qr_code: "00020126PIXCODE" + id, qr_code_base64: "QkFTRTY0" } } }, 201);
  }
  const g = u.match(/\/v1\/payments\/(\d+)$/);
  if (g && m === "GET") return payments.has(+g[1]) ? res(payments.get(+g[1])) : res({ message: "not found" }, 404);
  if (g && m === "PUT") { payments.get(+g[1]).status = "cancelled"; return res({}); }
  return res({}, 500);
};

const db = d1(); await ensureSchema(db);
await db.prepare("INSERT INTO packages (slug,title,category,price,booking_enabled,min_pax,max_pax,daily_capacity,weekdays,min_advance_days,horizon_days,published) VALUES ('tango','Tango','tangos','R$ 250,00',1,1,6,10,'0,1,2,3,4,5,6',0,180,1)").run();
const p = await db.prepare("SELECT * FROM packages WHERE slug='tango'").first();
const env = { MP_ACCESS_TOKEN: "TEST-TOKEN", SITE_URL: "https://gasparottoviajes.com" };
const day = addDays(todayBA(), 5), who = { day, name: "Ana Souza", phone: "+55 11 99999 0000", message: "" };
const row = async (id) => ({ ...(await db.prepare("SELECT *, 600 AS hold_left FROM bookings WHERE id=?").bind(id).first()) });

// 1) Pix solo con token, en reales y con monto
assert.equal(canPayPix({}, { currency: "BRL", total: 25000 }), false);
assert.equal(canPayPix(env, { currency: "BRL", total: 25000 }), true);
assert.equal(canPayPix(env, { currency: "ARS", total: 25000 }), false);
assert.equal(canPayPix(env, { currency: "BRL", total: 0 }), false);
console.log("✓ Pix solo se ofrece con token, moneda BRL y monto");

// 2) crea el cobro, guarda código y alarga la retención; segunda llamada es idempotente (no cobra dos veces)
const bk = await createBooking(db, env, p, { ...who, pax: 2 });
assert.ok(bk.ok); assert.equal(bk.total, 50000);
let x = await createPix(db, env, await row(bk.id), p);
assert.ok(x.ok); assert.match(x.code, /^00020126PIXCODE/); assert.equal(x.expires_in, PIX_MINUTES * 60);
const after = await db.prepare("SELECT payment_ref, pix_code, CAST(ROUND((julianday(hold_until)-julianday('now'))*1440) AS INTEGER) m FROM bookings WHERE id=?").bind(bk.id).first();
assert.ok(after.payment_ref && after.pix_code); assert.ok(after.m >= PIX_MINUTES - 1);
const y = await createPix(db, env, await row(bk.id), p);
assert.equal(y.code, x.code); assert.equal(payments.size, 1);
assert.equal(payments.get(+after.payment_ref).transaction_amount, 500);
console.log("✓ crea cobro de R$ 500,00, retención", after.m, "min, segunda llamada reutiliza el mismo código");

// 3) pago pendiente no confirma
let s = await syncPayment(db, env, after.payment_ref);
assert.equal(s.paid, false); assert.equal((await db.prepare("SELECT status FROM bookings WHERE id=?").bind(bk.id).first()).status, "pendiente");
console.log("✓ mientras Mercado Pago dice \"pending\" la reserva sigue pendiente");

// 4) monto distinto o pago ajeno: no confirma
payments.get(+after.payment_ref).status = "approved"; payments.get(+after.payment_ref).transaction_amount = 1;
s = await syncPayment(db, env, after.payment_ref); assert.equal(s.paid, false); assert.equal(s.status, "amount_mismatch");
payments.set(999, { id: 999, status: "approved", transaction_amount: 500, currency_id: "BRL", external_reference: String(bk.id) });
assert.equal((await syncPayment(db, env, 999)).paid, false);
assert.equal((await db.prepare("SELECT status FROM bookings WHERE id=?").bind(bk.id).first()).status, "pendiente");
console.log("✓ monto incorrecto o pago que no creó este servidor no confirman la reserva");

// 5) aprobado y correcto: pagada, con fecha de pago; repetir el aviso no rompe nada
payments.get(+after.payment_ref).transaction_amount = 500;
s = await syncPayment(db, env, after.payment_ref); assert.equal(s.paid, true);
const paid = await db.prepare("SELECT status, paid_at, hold_until FROM bookings WHERE id=?").bind(bk.id).first();
assert.equal(paid.status, "pagada"); assert.ok(paid.paid_at); assert.equal(paid.hold_until, "");
assert.equal((await syncPayment(db, env, after.payment_ref)).paid, true);
console.log("✓ pago aprobado → pagada (con paid_at); el aviso repetido es inofensivo");

// 6) pago tardío con el día lleno: se registra igual (ya entró la plata) y queda marcado para revisar
const full = await createBooking(db, env, p, { ...who, phone: "5511888", pax: 6 });
await createPix(db, env, await row(full.id), p);
const ref2 = (await db.prepare("SELECT payment_ref FROM bookings WHERE id=?").bind(full.id).first()).payment_ref;
await db.prepare("UPDATE bookings SET status='vencida', hold_until='' WHERE id=?").bind(full.id).run();
const other = await createBooking(db, env, p, { ...who, phone: "5511777", pax: 6 }); assert.ok(other.ok, JSON.stringify(other));
await db.prepare("UPDATE bookings SET status='pagada' WHERE id=?").bind(other.id).run();
payments.get(+ref2).status = "approved";
assert.equal((await syncPayment(db, env, ref2)).paid, true);
const late = await db.prepare("SELECT status, message FROM bookings WHERE id=?").bind(full.id).first();
assert.equal(late.status, "pagada"); assert.match(late.message, /sin cupo/);
console.log("✓ pago tardío sin cupo: queda pagada y marcada \"revisar o reembolsar\"");

// 7) firma del webhook
const secret = "whsec_test", e2 = { MP_WEBHOOK_SECRET: secret };
const sig = (id, rid, ts) => `ts=${ts},v1=${createHmac("sha256", secret).update(`id:${String(id).toLowerCase()};request-id:${rid};ts:${ts};`).digest("hex")}`;
const req = (h) => ({ headers: new Headers(h) });
assert.equal(await verifyWebhook(e2, req({ "x-signature": sig("ABC123", "r-1", "1700000000"), "x-request-id": "r-1" }), "ABC123"), true);
assert.equal(await verifyWebhook(e2, req({ "x-signature": sig("ABC123", "r-1", "1700000000"), "x-request-id": "r-2" }), "ABC123"), false);
assert.equal(await verifyWebhook(e2, req({ "x-signature": "ts=1,v1=00", "x-request-id": "r-1" }), "ABC123"), false);
assert.equal(await verifyWebhook(e2, req({}), "1"), false);
assert.equal(await verifyWebhook({}, req({}), "1"), true);
console.log("✓ firma del webhook: válida pasa; request-id cambiado, firma falsa o ausente se rechazan");
// 8) modo de reserva por paquete: solo "pix" cobra; todo lo demás (incluido lo viejo sin la columna) confirma por WhatsApp
assert.equal(bookingConfig({ booking_enabled: 1, pay_mode: "pix" }).pay, "pix");
assert.equal(bookingConfig({ booking_enabled: 1, pay_mode: "whatsapp" }).pay, "whatsapp");
assert.equal(bookingConfig({ booking_enabled: 1 }).pay, "whatsapp");
assert.equal(bookingConfig({ booking_enabled: 1, pay_mode: "otro" }).pay, "whatsapp");
assert.equal((await db.prepare("SELECT pay_mode FROM packages WHERE slug='tango'").first()).pay_mode, "whatsapp");
console.log("✓ modo de reserva: por defecto WhatsApp; Pix solo si el paquete lo elige");
console.log("\nTodo OK");

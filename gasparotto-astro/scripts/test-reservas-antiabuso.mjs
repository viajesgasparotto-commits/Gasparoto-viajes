// Anti-abuso de reservas: el tope de retenciones por teléfono no se saltea cambiando el formato, tope por IP en la base,
// y el panel no mueve una reserva a un horario que ya salió hoy.
// Uso: npm run test:reservas-antiabuso   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";
import { normMeta } from "../functions/lib/ficha.js";
import { addDays, todayBA } from "../functions/lib/booking.js";

function d1() {
  const db = new DatabaseSync(":memory:");
  const mk = (sql, args = []) => ({
    bind: (...a) => mk(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: (s) => mk(s), batch: async (l) => { for (const x of l) await x.run(); return []; }, _raw: db };
}
const PAGE = '<main><div class="elementor-element" data-id="abc1" data-widget_type="text-editor.default"><div class="elementor-widget-container">R$ 1.000</div></div></main>';
const env = { DB: d1(), IMAGES: { put: async () => {} }, ASSETS: { fetch: async () => new Response(PAGE) }, ADMIN_PASSWORD: "clave-general-123", WHATSAPP_NUMBER: "5491155551234" };
let ip = 0;
async function call(method, path, body, cookie) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.7." + (ip++ % 250) + ".1" };
  if (cookie) headers.cookie = cookie;
  const r = await onRequest({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: path.split("?")[0].split("/") } });
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, data, cookie: ck ? "gv_admin=" + ck : "" };
}
const admin = (await call("POST", "login", { password: "clave-general-123" })).cookie; assert.ok(admin);
await call("GET", "avail"); // dispara ensureSchema
const ins = (slug, meta) => env.DB.prepare("INSERT INTO packages (slug,title,category,price,meta,booking_enabled,min_pax,max_pax,daily_capacity,weekdays,min_advance_days,horizon_days,published) VALUES (?,?,?,?,?,1,1,6,10,'0,1,2,3,4,5,6',0,60,1)").bind(slug, "Tour " + slug, "tangos", "R$ 100,00", meta).run();
await ins("dia", "{}");
const day = addDays(todayBA(), 5);
const book = (phone, extra = {}) => ({ slug: "dia", date: day, pax: 1, name: "Ana", phone, website: "", ...extra });

// 1) tope de 3 retenciones por teléfono: el formato no importa
for (const ph of ["+55 11 99999-0000", "5511999990000", "(55) 11 99999.0000"]) {
  const r = await call("POST", "book", book(ph)); assert.equal(r.status, 200, ph + " " + JSON.stringify(r.data));
}
let r = await call("POST", "book", book("55 11 99999 0000"));
assert.equal(r.status, 429); assert.equal(r.data.code, "limit");
r = await call("POST", "book", book("+55 11 88888-0000")); assert.equal(r.status, 200, "otro teléfono sigue pudiendo reservar");
console.log("✓ teléfono: +55 11 99999-0000, 5511999990000 y (55) 11 99999.0000 cuentan como el mismo (tope de 3)");

// 2) tope por IP guardado en la base (otra instancia del servidor ya lo había sumado)
const fixedIp = "10.99.99.99";
for (let i = 0; i < 10; i++) await env.DB.prepare("INSERT INTO login_fails (k, at) VALUES (?, ?)").bind("book:" + fixedIp, Date.now()).run();
const rr = await onRequest({ request: new Request("https://x.test/api/book", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": fixedIp }, body: JSON.stringify(book("+54 11 7777-0000")) }), env, params: { path: ["book"] } });
assert.equal(rr.status, 429); assert.equal((await rr.json()).code, "rate");
const ok = await call("POST", "book", book("+54 11 6666-0000")); assert.equal(ok.status, 200, "otra IP no se ve afectada");
console.log("✓ tope por IP en la base: con 10 intentos registrados la IP queda frenada, las demás no");

// 3) el panel no mueve una reserva a un horario que ya salió hoy
await ins("alba", normMeta({ times: [["00:00"], ["23:59"]] }));
const pid = (await env.DB.prepare("SELECT id FROM packages WHERE slug='alba'").first()).id;
r = await call("PUT", "booking-config/" + pid, { booking_enabled: 1, min_pax: 1, max_pax: 6, daily_capacity: 10, weekdays: [0, 1, 2, 3, 4, 5, 6], min_advance_days: 0, horizon_days: 60, pay_mode: "whatsapp", time_booking: 1 }, admin);
assert.equal(r.status, 200, JSON.stringify(r.data));
r = await call("POST", "book", { slug: "alba", date: addDays(todayBA(), 3), time: "23:59", pax: 1, name: "Luis", phone: "+54 11 4444-0000", website: "" }); assert.equal(r.status, 200, JSON.stringify(r.data));
const bid = r.data.id;
r = await call("PUT", "bookings/" + bid, { day: todayBA(), time: "00:00" }, admin);
assert.equal(r.status, 400); assert.equal(r.data.code, "time"); assert.ok(/ya salió/.test(r.data.error), r.data.error);
r = await call("PUT", "bookings/" + bid, { day: todayBA(), time: "23:59" }, admin); assert.equal(r.status, 200, JSON.stringify(r.data));
console.log("✓ panel: mover a un horario que ya salió hoy da 400; a uno que falta, bien");

console.log("\nAnti-abuso de reservas: todo OK");

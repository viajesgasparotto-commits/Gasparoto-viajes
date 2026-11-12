// Reserva por horario, de punta a punta por la API: panel (activar), público (avail/book), listado, voucher.
// Uso: npm run test:reservas-horario-api   (Node 22+ por node:sqlite)
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

const ins = (slug, meta) => env.DB.prepare("INSERT INTO packages (slug,title,category,price,meta,booking_enabled,min_pax,max_pax,daily_capacity,weekdays,min_advance_days,horizon_days,published) VALUES (?,?,?,?,?,1,1,6,10,'0,1,2,3,4,5,6',1,60,1)").bind(slug, "Tigre " + slug, "tangos", "R$ 100,00", meta).run();
await ins("tigre", normMeta({ times: [["09:00", "Mañana"], ["14:30"]] })); await ins("sinhora", "{}");
const pid = (await env.DB.prepare("SELECT id FROM packages WHERE slug='tigre'").first()).id;
const pid2 = (await env.DB.prepare("SELECT id FROM packages WHERE slug='sinhora'").first()).id;
const cfg = (extra = {}) => ({ booking_enabled: 1, min_pax: 1, max_pax: 6, daily_capacity: 10, weekdays: [0, 1, 2, 3, 4, 5, 6], min_advance_days: 1, horizon_days: 60, pay_mode: "whatsapp", ...extra });
const day = addDays(todayBA(), 5), month = day.slice(0, 7);

// 1) por defecto: por día
let r = await call("GET", "avail?slug=tigre&month=" + month);
assert.equal(r.data.enabled, true); assert.equal(r.data.by_time, false); assert.deepEqual(r.data.times, []); assert.deepEqual(r.data.slots, {});
console.log("✓ /api/avail: por defecto no pide horario");

// 2) el panel lo activa (y exige horarios cargados)
r = await call("PUT", "booking-config/" + pid2, cfg({ time_booking: 1 }), admin);
assert.equal(r.status, 400); assert.ok(/horarios/i.test(r.data.error), r.data.error);
r = await call("PUT", "booking-config/" + pid, cfg({ time_booking: 1 }), admin); assert.equal(r.status, 200, JSON.stringify(r.data));
r = await call("PUT", "booking-config/" + pid, cfg({ daily_capacity: 8 }), admin); assert.equal(r.status, 200); // el panel actual no manda time_booking
assert.equal((await env.DB.prepare("SELECT time_booking t, daily_capacity c FROM packages WHERE id=?").bind(pid).first()).t, 1, "guardar sin el campo no lo apaga");
r = await call("PUT", "booking-config/" + pid, cfg({ daily_capacity: 10, time_booking: 0 }), admin);
assert.equal((await env.DB.prepare("SELECT time_booking t FROM packages WHERE id=?").bind(pid).first()).t, 0, "se puede apagar");
await call("PUT", "booking-config/" + pid, cfg({ time_booking: 1 }), admin);
console.log("✓ panel: activar exige horarios, guardar sin el campo conserva el modo, se puede apagar");

// 3) público: horarios con lugar por día
r = await call("GET", "avail?slug=tigre&month=" + month);
assert.equal(r.data.by_time, true); assert.deepEqual(r.data.times, ["09:00", "14:30"]);
assert.deepEqual(r.data.slots[day], [{ t: "09:00", left: 10 }, { t: "14:30", left: 10 }]); assert.equal(r.data.days[day], 10);
console.log("✓ /api/avail: by_time, times y slots por día");

// 4) reservar: la hora es obligatoria; con hora queda guardada
const book = { slug: "tigre", date: day, pax: 6, name: "Ana", phone: "+54 9 11 5555 1234", website: "" };
r = await call("POST", "book", book); assert.equal(r.status, 400); assert.equal(r.data.code, "time");
r = await call("POST", "book", { ...book, time: "11:00" }); assert.equal(r.data.code, "time");
r = await call("POST", "book", { ...book, time: "09:00" }); assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.ok, true); assert.equal(r.data.time, "09:00"); const { id, token } = r.data;
r = await call("GET", "avail?slug=tigre&month=" + month);
assert.deepEqual(r.data.slots[day], [{ t: "09:00", left: 4 }, { t: "14:30", left: 10 }]);
r = await call("POST", "book", { ...book, time: "09:00", pax: 5, phone: "222222222" }); assert.equal(r.status, 409); assert.equal(r.data.code, "full"); assert.equal(r.data.left, 4);
r = await call("POST", "book", { ...book, time: "14:30", phone: "333333333" }); assert.equal(r.data.ok, true);
const lead = await env.DB.prepare("SELECT message FROM leads WHERE phone='+54 9 11 5555 1234'").first();
assert.ok(lead.message.includes("09:00"), lead.message);
console.log("✓ /api/book: exige horario, guarda la hora, descuenta del horario correcto y la consulta del panel la lleva");

// 5) panel: listado y detalle por día traen la hora
r = await call("GET", "bookings", null, admin); assert.equal(r.data.bookings.find((b) => b.id === id).time, "09:00");
r = await call("GET", `slots?package_id=${pid}&month=${month}`, null, admin);
assert.equal(r.data.config.by_time, true); assert.deepEqual(r.data.config.times, ["09:00", "14:30"]); assert.equal(r.data.res.find((x) => x.id === id).time, "09:00");
assert.equal(r.data.days.find((d) => d.day === day).slots[0].left, 4);
console.log("✓ panel: /api/bookings y /api/slots traen la hora y los cupos por horario");

// 6) voucher y enlace muestran la hora
r = await call("PUT", "bookings/" + id, { status: "pagada" }, admin); assert.equal(r.status, 200);
r = await call("GET", `bookings?voucher=${id}`, null, admin); assert.equal(r.status, 200); assert.ok(String(r.data).includes("09:00 h"), "voucher con hora");
r = await call("GET", `bookings?link=${id}`, null, admin); assert.equal(r.data.time, "09:00");
r = await call("GET", `book/voucher?id=${id}&token=${token}`); assert.equal(r.status, 200); assert.ok(String(r.data).includes("09:00 h"));
console.log("✓ voucher (cliente y panel) y enlace incluyen la hora");

// 7) sin horarios cargados sigue por día
r = await call("POST", "book", { slug: "sinhora", date: day, pax: 2, name: "Beto", phone: "444444444" }); assert.equal(r.data.ok, true); assert.equal(r.data.time, "");
console.log("✓ productos sin horarios: se reserva por día como siempre");
console.log("\nReserva por horario (API): todo OK");

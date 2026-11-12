// Cambiar la fecha u horario de una reserva desde el panel: cupo, horarios y días cerrados, y que el voucher se actualiza.
// Uso: npm run test:reagendar   (Node 22+ por node:sqlite)
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
const env = { DB: d1(), IMAGES: { put: async () => {} }, ASSETS: { fetch: async () => new Response(PAGE) }, ADMIN_PASSWORD: "clave-general-123", WHATSAPP_NUMBER: "5491155551234", SITE_URL: "https://x.test" };
let ip = 0;
async function call(method, path, body, cookie) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.9." + (ip++ % 250) + ".1" };
  if (cookie) headers.cookie = cookie;
  const r = await onRequest({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: path.split("?")[0].split("/") } });
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, data, cookie: ck ? "gv_admin=" + ck : "" };
}
const admin = (await call("POST", "login", { password: "clave-general-123" })).cookie; assert.ok(admin);
await call("GET", "avail"); // dispara ensureSchema (crea availability_slots)



await env.DB.prepare("INSERT INTO packages (slug,title,category,price,meta,booking_enabled,time_booking,min_pax,max_pax,daily_capacity,weekdays,min_advance_days,horizon_days,published) VALUES (?,?,?,?,?,1,1,1,6,10,'0,1,2,3,4,5,6',1,60,1)")
  .bind("tigre", "Tigre", "tangos", "R$ 100,00", normMeta({ times: [["09:00", "Mañana"], ["14:30", "Salida desde el hotel"]] })).run();
const pid = (await env.DB.prepare("SELECT id FROM packages WHERE slug='tigre'").first()).id;
const d1d = addDays(todayBA(), 5), d2d = addDays(todayBA(), 6), d3d = addDays(todayBA(), 7);
const ph = "+54 9 11 5555 1234";
const book = async (day, time, pax) => {
  const r = await call("POST", "book", { slug: "tigre", date: day, time, pax, name: "Ana", phone: ph, website: "" });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  await call("PUT", "bookings/" + r.data.id, { status: "pagada" }, admin);
  return r.data.id;
};
const row = async (id) => ({ ...(await env.DB.prepare("SELECT day, time, status FROM bookings WHERE id=?").bind(id).first()) });
const move = (id, body) => call("PUT", "bookings/" + id, body, admin);

// A: 4 personas a las 09:00 del primer día, pagada
const A = await book(d1d, "09:00", 4);

// 1) mismo día, otro horario: el voucher muestra la nueva hora
let r = await move(A, { day: d1d, time: "14:30" });
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.deepEqual(await row(A), { day: d1d, time: "14:30", status: "pagada" });
const v = await call("GET", `bookings?voucher=${A}`, null, admin);
assert.match(String(v.data), /14:30/, "el voucher muestra el horario nuevo");
console.log("✓ cambiar el horario del mismo día y el voucher lo muestra");

// 2) otro día (solo la fecha)
r = await move(A, { day: d2d, time: "09:00" });
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal((await row(A)).day, d2d);
console.log("✓ cambiar la fecha");

// 3) cupo: B llena 6 en ese día y horario; A (4) cabe justo; D (1) ya no entra
await book(d2d, "14:30", 6);
r = await move(A, { day: d2d, time: "14:30" });
assert.equal(r.status, 200, "4 + 6 = 10 entra justo en el cupo");
const D = await book(d1d, "09:00", 1);
r = await move(D, { day: d2d, time: "14:30" });
assert.equal(r.status, 409, "11 personas no entran");
assert.match(r.data.error, /no tiene lugar/);
assert.equal((await row(D)).day, d1d, "si no entra, la reserva no cambia");
console.log("✓ cupo: entra hasta el límite y, si no, la reserva queda como estaba");

// 4) horarios y días cerrados
await call("PUT", "slots", { package_id: pid, dates: [d1d], action: "close_time", time: "14:30" }, admin);
r = await move(A, { day: d1d, time: "14:30" });
assert.equal(r.status, 409); assert.match(r.data.error, /cerrado/);
await call("PUT", "slots", { package_id: pid, dates: [d3d], action: "close" }, admin);
r = await move(A, { day: d3d, time: "09:00" });
assert.equal(r.status, 409); assert.match(r.data.error, /cerrado/);
console.log("✓ no se puede pasar a un horario ni a un día cerrados");

// 5) validaciones: horario fuera de la ficha, fecha pasada
r = await move(A, { time: "11:00" });
assert.equal(r.status, 400); assert.equal(r.data.code, "time");
const ayer = addDays(todayBA(), -1);
r = await move(A, { day: ayer, time: "09:00" });
assert.equal(r.status, 400); assert.match(r.data.error, /pasada/);
console.log("✓ validaciones: horario inexistente y fecha pasada");

// 6) reserva cancelada no se mueve; sin sesión, no
const E = await book(d2d, "09:00", 1);
await call("PUT", "bookings/" + E, { status: "cancelada" }, admin);
r = await move(E, { day: d1d, time: "09:00" });
assert.equal(r.status, 409);
r = await call("PUT", "bookings/" + A, { day: d1d, time: "09:00" });
assert.equal(r.status, 401, "sin sesión no se cambia nada");
console.log("✓ una reserva cancelada no se mueve; sin sesión, 401");

console.log("\nCambiar fecha u horario: todo OK");

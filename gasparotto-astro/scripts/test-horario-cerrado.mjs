// Cerrar un solo horario de un día (availability_slots), notas de horarios traducidas y horarios en los datos estructurados.
// Uso: npm run test:horario-cerrado   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";
import { normMeta } from "../functions/lib/ficha.js";
import { addDays, todayBA } from "../functions/lib/booking.js";
import { withTimeNotes } from "../functions/lib/translations.js";
import { packageLd } from "../functions/lib/seo.js";

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
const day = addDays(todayBA(), 5), month = day.slice(0, 7);
const dayOf = (d) => d.days.find((x) => x.day === day);

// 1) cerrar 14:30 de ese día
let r = await call("PUT", "slots", { package_id: pid, dates: [day], action: "close_time", time: "14:30" }, admin);
assert.equal(r.status, 200, JSON.stringify(r.data));
r = await call("GET", `slots?package_id=${pid}&month=${month}`, null, admin);
let dd = dayOf(r.data);
assert.equal(dd.slots.find((s) => s.t === "14:30").st, "closed");
assert.equal(dd.slots.find((s) => s.t === "09:00").st, "open");
assert.equal(dd.left, 10, "el día vale por sus horarios abiertos (09:00 con 10)");
console.log("✓ cerrar un horario: el panel lo ve como cerrado y el día sigue con lugar en 09:00");

// 2) público: el horario cerrado no se ofrece
r = await call("GET", "avail?slug=tigre&month=" + month);
assert.deepEqual(r.data.slots[day], [{ t: "09:00", left: 10 }]);
console.log("✓ /api/avail no lista el horario cerrado");

// 3) reservar el horario cerrado: rechazado; el abierto: sí
const book = { slug: "tigre", date: day, pax: 6, name: "Ana", phone: "+54 9 11 5555 1234", website: "" };
r = await call("POST", "book", { ...book, time: "14:30" });
assert.equal(r.status, 409); assert.equal(r.data.code, "unavailable");
r = await call("POST", "book", { ...book, time: "09:00" });
assert.equal(r.status, 200, JSON.stringify(r.data));
console.log("✓ reservar un horario cerrado da 409; el abierto se reserva");

// 4) el cierre no cancela las reservas que ya tiene
const st = (await env.DB.prepare("SELECT status FROM bookings WHERE day=? AND time='09:00'").bind(day).first()).status;
assert.equal(st, "pendiente");
await call("PUT", "slots", { package_id: pid, dates: [day], action: "close_time", time: "09:00" }, admin);
const still = (await env.DB.prepare("SELECT status FROM bookings WHERE day=? AND time='09:00'").bind(day).first()).status;
assert.equal(still, "pendiente", "cerrar el horario no cancela la reserva");
console.log("✓ cerrar un horario no cancela sus reservas");

// 5) todos cerrados: el día figura completo; abrir uno lo devuelve
r = await call("GET", `slots?package_id=${pid}&month=${month}`, null, admin);
assert.equal(dayOf(r.data).st, "full");
r = await call("PUT", "slots", { package_id: pid, dates: [day], action: "open_time", time: "14:30" }, admin);
assert.equal(r.status, 200);
r = await call("GET", `slots?package_id=${pid}&month=${month}`, null, admin);
assert.equal(dayOf(r.data).st, "open"); assert.equal(dayOf(r.data).left, 10 - 0);
console.log("✓ día con todos los horarios cerrados figura completo; al abrir uno vuelve a tener lugar");

// 6) validaciones
r = await call("PUT", "slots", { package_id: pid, dates: [day], action: "close_time", time: "11:00" }, admin);
assert.equal(r.status, 400, "un horario que no está en la ficha no se puede cerrar");
r = await call("PUT", "slots", { package_id: pid, dates: [day], action: "close_time", time: "14:30" });
assert.equal(r.status, 401, "sin sesión no se cierra nada");
console.log("✓ validaciones: horario inexistente y sin sesión");

// 7) notas de horarios traducidas: cambian solo la nota
const base = JSON.stringify({ times: [["09:00", "Mañana"], ["14:30", "Salida desde el hotel"]], facts: [["Duración", "4 h"]] });
const es = JSON.parse(withTimeNotes(base, "09:00 | Morning departure\n14:30 | Departure from the hotel\n99:99 | nada"));
assert.deepEqual(es.times, [["09:00", "Morning departure"], ["14:30", "Departure from the hotel"]]);
assert.deepEqual(es.facts, [["Duración", "4 h"]], "lo demás de la ficha no cambia");
assert.equal(withTimeNotes(base, ""), base, "sin traducción queda el original");
assert.deepEqual(JSON.parse(withTimeNotes(base, "14:30")).times[1], ["14:30", ""], "una línea sin nota deja la nota vacía");
console.log("✓ notas de horarios traducidas (la hora no cambia)");

// 8) datos estructurados: horarios de salida en el Product
const ld = packageLd(env, { title: "Tigre", price: "" }, { url: "https://x.test/paquetes/tigre/", desc: "d", image: "", listing: null, lang: "es", times: ["09:00", "14:30"] });
const product = ld["@graph"].find((x) => x["@type"] === "Product");
assert.deepEqual(product.additionalProperty, [{ "@type": "PropertyValue", name: "Horarios de salida", value: "09:00, 14:30" }]);
const ld2 = packageLd(env, { title: "Tigre", price: "" }, { url: "https://x.test/paquetes/tigre/", desc: "d", image: "", listing: null, lang: "pt" });
assert.equal(ld2["@graph"].find((x) => x["@type"] === "Product").additionalProperty, undefined, "sin horarios no se agrega");
console.log("✓ datos estructurados: horarios en el Product (solo si el paquete los tiene)");

console.log("\nHorario cerrado, notas traducidas y datos estructurados: todo OK");

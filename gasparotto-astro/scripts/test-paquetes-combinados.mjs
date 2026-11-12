// Paquetes que combinan servicios, de punta a punta por la API: precio automático (suma − descuento), recálculo al cambiar un servicio,
// itinerario fijo y libre, calendario que cruza el cupo de cada servicio, reserva que descuenta cupo en cada servicio, estados, cambio de fecha,
// cancelación, listado del panel y voucher.
// Uso: npm run test:paquetes   (Node 22+ por node:sqlite)
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
const env = { DB: d1(), IMAGES: { put: async () => {} }, ASSETS: { fetch: async () => new Response("", { status: 404 }) }, ADMIN_PASSWORD: "clave-general-123", WHATSAPP_NUMBER: "5491155551234", SITE_LANG: "pt-BR" };
let ip = 0;
async function call(method, path, body, cookie) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.6." + (ip++ % 250) + ".1" };
  if (cookie) headers.cookie = cookie;
  const r = await onRequest({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: path.split("?")[0].split("/") } });
  const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  return { status: r.status, data, cookie: ck ? "gv_admin=" + ck : "" };
}
const one = (sql, ...a) => env.DB.prepare(sql).bind(...a).first();
const all = async (sql, ...a) => (await env.DB.prepare(sql).bind(...a).all()).results;
const admin = (await call("POST", "login", { password: "clave-general-123" })).cookie; assert.ok(admin);
await call("GET", "categories", null, admin);
const cfg = (extra = {}) => ({ booking_enabled: 1, min_pax: 1, max_pax: 8, daily_capacity: 10, weekdays: [0, 1, 2, 3, 4, 5, 6], min_advance_days: 1, horizon_days: 90, pay_mode: "whatsapp", ...extra });
const save = async (body, id) => { const r = await call(id ? "PUT" : "POST", "packages" + (id ? "/" + id : ""), { category: "paseos", published: 1, content: "<p>x</p>", price_old: "", ...body }, admin); assert.equal(r.status, 200, JSON.stringify(r.data)); return r.data; };
const row = (slug) => one("SELECT * FROM packages WHERE slug=?", slug);

// Servicios: City tour (por día, cupo 10), Tango (por horario 20:00/22:00, cupo 4, con opciones), Tigre (por día, cupo 3), Traslado (sin reserva por fecha)
await save({ title: "City tour", price: "R$ 200", meta: JSON.stringify({ kind: "servicio" }) });
await save({ title: "Tango", price: "R$ 1", meta: JSON.stringify({ kind: "servicio", times: [["20:00", ""], ["22:00", ""]], options: [["Só show", "R$ 250"], ["Jantar show", "R$ 450"]] }) });
await save({ title: "Tigre", price: "R$ 300", meta: JSON.stringify({ kind: "servicio" }) });
await save({ title: "Traslado", price: "R$ 50", meta: JSON.stringify({ kind: "servicio" }) });
const S = {}; for (const s of ["city-tour", "tango", "tigre", "traslado"]) S[s] = await row(s);
await call("PUT", "booking-config/" + S["city-tour"].id, cfg(), admin);
await call("PUT", "booking-config/" + S.tango.id, cfg({ daily_capacity: 4, time_booking: 1 }), admin);
await call("PUT", "booking-config/" + S.tigre.id, cfg({ daily_capacity: 3 }), admin);

// 1) Precio automático: City 200 + Tango Jantar 450 + Tigre 300 + Traslado 50 = 1.000; −10 % = 900
const plan = [["traslado", 1, "", ""], ["city-tour", 1, "", ""], ["tango", 1, "20:00", "Jantar show"], ["tigre", 2, "", ""]];
const meta = (x = {}) => JSON.stringify({ kind: "paquete", parts: ["city-tour", "tango", "tigre", "traslado"], plan, pmode: "fijo", auto: 1, disc: 10, ...x });
const pk = await save({ title: "Buenos Aires completo", price: "R$ 1", meta: meta() });
let P = await row("buenos-aires-completo");
assert.equal(P.price, "R$ 900"); assert.equal(P.price_old, "R$ 1.000");
assert.deepEqual(JSON.parse(P.meta).parts, ["traslado", "city-tour", "tango", "tigre"], "los servicios quedan en el orden del itinerario");
await save({ title: "Buenos Aires completo", price: "R$ 1", meta: meta({ disc: 0 }) }, pk.id);
P = await row("buenos-aires-completo"); assert.equal(P.price, "R$ 1.000"); assert.equal(P.price_old, "");
await save({ title: "Buenos Aires completo", price: "R$ 777", meta: meta({ auto: 0 }) }, pk.id);
assert.equal((await row("buenos-aires-completo")).price, "R$ 777", "sin automático, el precio es el que escribió la agencia");
await save({ title: "Buenos Aires completo", price: "R$ 1", meta: meta() }, pk.id);
console.log("✓ precio automático: suma de servicios (con la opción del itinerario) − descuento; apagado = precio a mano");

// 2) Cambia el precio de un servicio → el paquete se recalcula solo
let r = await save({ title: "Tigre", price: "R$ 400", meta: JSON.stringify({ kind: "servicio" }) }, S.tigre.id);
assert.equal(r.bundles, 1);
P = await row("buenos-aires-completo"); assert.equal(P.price, "R$ 990"); assert.equal(P.price_old, "R$ 1.100");
await save({ title: "Tigre", price: "R$ 300", meta: JSON.stringify({ kind: "servicio" }) }, S.tigre.id);
assert.equal((await row("buenos-aires-completo")).price, "R$ 900");
// Un servicio sin precio: el paquete conserva el último precio (no inventa uno)
await save({ title: "Traslado", price: "", meta: JSON.stringify({ kind: "servicio" }) }, S.traslado.id);
assert.equal((await row("buenos-aires-completo")).price, "R$ 900");
await save({ title: "Traslado", price: "R$ 50", meta: JSON.stringify({ kind: "servicio" }) }, S.traslado.id);
console.log("✓ al cambiar el precio de un servicio, los paquetes automáticos se recalculan; sin precio, no se toca");

// 3) Calendario del paquete: cruza las reglas del paquete con el cupo de cada servicio (Tigre el día 2)
await call("PUT", "booking-config/" + pk.id, cfg({ daily_capacity: 50 }), admin);
const d0 = addDays(todayBA(), 10), month = d0.slice(0, 7);
r = await call("GET", "avail?slug=buenos-aires-completo&month=" + month);
assert.equal(r.data.enabled, true); assert.equal(r.data.bundle, true); assert.equal(r.data.by_time, false);
assert.equal(r.data.days[d0], 3, "el máximo es el del servicio con menos lugar (Tigre, cupo 3)");
// Cerrar el Tigre el día 2 cierra ese inicio en el paquete
await call("PUT", "slots", { package_id: S.tigre.id, dates: [addDays(d0, 1)], action: "close" }, admin);
r = await call("GET", "avail?slug=buenos-aires-completo&month=" + month);
assert.equal(r.data.days[d0], undefined, "si un servicio no abre en su día, ese inicio no se ofrece");
await call("PUT", "slots", { package_id: S.tigre.id, dates: [addDays(d0, 1)], action: "clear" }, admin);
r = await call("GET", "avail?slug=buenos-aires-completo&start=" + d0);
assert.equal(r.data.mode, "fijo"); assert.equal(r.data.span, 2); assert.equal(r.data.max, 3);
assert.deepEqual(r.data.items.map((x) => [x.slug, x.days.map((d) => d.day)]), [["traslado", [d0]], ["city-tour", [d0]], ["tango", [d0]], ["tigre", [addDays(d0, 1)]]]);
assert.equal(r.data.items.find((x) => x.slug === "traslado").reservable, false);
console.log("✓ calendario: el inicio vale si todos los servicios tienen lugar en su día; el máximo de personas es el del más justo");

// 4) Reserva: crea la del paquete + una por servicio reservable, con el total del paquete y el cupo descontado en cada servicio
const book = (x = {}) => call("POST", "book", { slug: "buenos-aires-completo", date: d0, pax: 2, name: "Ana", phone: "+55 11 99999-0000", ...x });
r = await book();
assert.equal(r.status, 200, JSON.stringify(r.data));
const b1 = r.data; assert.equal(b1.total, 1800);
assert.deepEqual(b1.itin.map((x) => [x.title, x.day, x.time]), [["Traslado", d0, ""], ["City tour", d0, ""], ["Tango", d0, "20:00"], ["Tigre", addDays(d0, 1), ""]], "el itinerario incluye el servicio sin reserva por fecha");
let kids = await all("SELECT package_id, day, time, pax, total, status, option_name FROM bookings WHERE parent_id=? ORDER BY day, id", b1.id);
assert.equal(kids.length, 3, "Traslado no se reserva por fecha: no ocupa cupo");
assert.ok(kids.every((k) => k.total === 0 && k.status === "pendiente" && k.pax === 2));
assert.equal(kids.find((k) => k.package_id === S.tango.id).option_name, "Jantar show");
r = await call("GET", "avail?slug=tigre&month=" + month); assert.equal(r.data.days[addDays(d0, 1)], 1, "el Tigre perdió 2 lugares ese día");
r = await call("GET", "avail?slug=buenos-aires-completo&month=" + month); assert.equal(r.data.days[d0], 1);
console.log("✓ reserva: paquete + cada servicio en su día; el cupo se descuenta en cada servicio y el calendario se actualiza");

// 5) Sin lugar en un servicio: avisa cuál y no crea nada
const before = (await one("SELECT COUNT(*) n FROM bookings")).n;
r = await book({ pax: 2, phone: "+55 11 98888-0000" });
assert.equal(r.status, 409); assert.equal(r.data.code, "item_full"); assert.equal(r.data.item, "Tigre");
assert.equal((await one("SELECT COUNT(*) n FROM bookings")).n, before, "no queda nada a medias");
console.log("✓ sin lugar en un servicio: avisa cuál y no crea ninguna reserva");

// 6) Tope de 3 reservas pendientes por teléfono: cuentan las reservas, no las filas de cada servicio
r = await book({ pax: 1, phone: "+55 11 99999-0000" }); assert.equal(r.status, 200, JSON.stringify(r.data));
console.log("✓ el tope de reservas pendientes por teléfono cuenta reservas, no servicios");
await call("POST", "book/cancel", { id: r.data.id, token: r.data.token });
assert.ok((await all("SELECT status FROM bookings WHERE parent_id=?", r.data.id)).every((k) => k.status === "cancelada"), "cancelar libera todos los servicios");

// 7) Panel: listado agrupado, pagada en grupo, cambio de fecha en grupo, voucher con itinerario
r = await call("GET", "bookings", null, admin);
const lb = r.data.bookings.find((x) => x.id === b1.id);
assert.ok(lb && lb.itin && lb.itin.length === 4, "incluye el traslado (sin reserva por fecha)"); assert.ok(!r.data.bookings.some((x) => kids.length && x.package_title === "Tigre"), "las filas de servicios no aparecen sueltas");
r = await call("PUT", "bookings/" + b1.id, { status: "pagada" }, admin); assert.equal(r.status, 200, JSON.stringify(r.data));
assert.ok((await all("SELECT status FROM bookings WHERE parent_id=?", b1.id)).every((k) => k.status === "pagada"));
r = await call("PUT", "bookings/" + b1.id, { day: addDays(d0, 3) }, admin); assert.equal(r.status, 200, JSON.stringify(r.data));
kids = await all("SELECT day, time FROM bookings WHERE parent_id=? ORDER BY day, id", b1.id);
assert.deepEqual(kids.map((k) => k.day), [addDays(d0, 3), addDays(d0, 3), addDays(d0, 4)], "los servicios se corren los mismos días");
// Mover a un inicio donde el Tigre no tiene lugar: se deshace todo
await call("PUT", "slots", { package_id: S.tigre.id, dates: [addDays(d0, 8)], action: "capacity", capacity: 1 }, admin);
r = await call("PUT", "bookings/" + b1.id, { day: addDays(d0, 7) }, admin); assert.equal(r.status, 409); assert.match(r.data.error, /Tigre/);
assert.equal((await one("SELECT day FROM bookings WHERE id=?", b1.id)).day, addDays(d0, 3), "el paquete vuelve a su fecha");
assert.deepEqual((await all("SELECT day FROM bookings WHERE parent_id=? ORDER BY day, id", b1.id)).map((k) => k.day), [addDays(d0, 3), addDays(d0, 3), addDays(d0, 4)]);
r = await call("GET", "bookings?voucher=" + b1.id, null, admin);
assert.ok(r.data.includes("Roteiro") && r.data.includes("Tango") && r.data.includes("Jantar show") && r.data.includes("Traslado") && r.data.includes("20:00 h"), "voucher con itinerario (incluye el servicio sin reserva por fecha)");
console.log("✓ panel: reserva agrupada, pagada y cambio de fecha en grupo (o nada), voucher con el itinerario");

// 8) Itinerario libre: el cliente mueve cada servicio dentro de los días del paquete y elige el horario del Tango
await save({ title: "Buenos Aires completo", price: "R$ 1", meta: meta({ pmode: "libre", plan: [["city-tour", 1, "", ""], ["tango", 1, "", ""], ["tigre", 3, "", ""], ["traslado", 1, "", ""]] }) }, pk.id);
const d1s = addDays(d0, 20);
r = await call("GET", "avail?slug=buenos-aires-completo&start=" + d1s);
assert.equal(r.data.mode, "libre"); assert.equal(r.data.span, 3);
const tg = r.data.items.find((x) => x.slug === "tango"); assert.equal(tg.days.length, 3); assert.equal(tg.pick_time, true); assert.deepEqual(tg.days[0].slots.map((s) => s.t), ["20:00", "22:00"]);
r = await book({ date: d1s, phone: "+55 21 97777-0000", plan: [{ slug: "tango", day: addDays(d1s, 2) }] });
assert.equal(r.status, 400); assert.equal(r.data.code, "itin_time", "el horario del Tango lo tiene que elegir el cliente");
r = await book({ date: d1s, phone: "+55 21 97777-0000", plan: [{ slug: "tango", day: addDays(d1s, 5), time: "22:00" }] });
assert.equal(r.status, 400); assert.equal(r.data.code, "itin", "fuera de los días del paquete, no");
r = await book({ date: d1s, phone: "+55 21 97777-0000", plan: [{ slug: "tango", day: addDays(d1s, 2), time: "22:00" }, { slug: "city-tour", day: addDays(d1s, 1) }] });
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.deepEqual(r.data.itin.map((x) => [x.title, x.day, x.time]), [["Traslado", d1s, ""], ["City tour", addDays(d1s, 1), ""], ["Tigre", addDays(d1s, 2), ""], ["Tango", addDays(d1s, 2), "22:00"]], "en orden de fecha y hora");
console.log("✓ itinerario libre: cada servicio dentro de los días del paquete; el horario lo elige el cliente si la agencia no lo fijó");

// 9) Paquete viejo (sin plan) y servicio común: siguen igual
await save({ title: "Viejo", price: "R$ 500", meta: JSON.stringify({ kind: "paquete", parts: ["tigre"] }) });
assert.equal((await row("viejo")).price, "R$ 500", "sin automático: precio a mano");
r = await call("GET", "avail?slug=tigre&month=" + month); assert.equal(r.data.bundle, false);
console.log("✓ paquetes sin automático y servicios sueltos: sin cambios");

// 10) Niños en paquetes: cada servicio con su política (City: desde 6 paga completo; Tango: 4 a 11 paga 50%) y fechas distintas por servicio
const kp = (tiers) => JSON.stringify({ tiers });
await save({ title: "City Clasico", price: "R$ 250", accepts_children: 1, kids_policy: kp([{ from: 0, to: 2, pct: 0 }, { from: 3, to: 5, pct: 50 }]), meta: JSON.stringify({ kind: "servicio", policies: [["cancelacion", "Grátis até 24 h antes.", "", ""]] }) });
await save({ title: "Tango Show", price: "R$ 220", accepts_children: 1, kids_policy: kp([{ from: 0, to: 3, pct: 0 }, { from: 4, to: 11, pct: 50 }]), meta: JSON.stringify({ kind: "servicio", policies: [["cancelacion", "Sem reembolso a menos de 48 h.", "", ""]] }) });
for (const s of ["city-clasico", "tango-show"]) await call("PUT", "booking-config/" + (await row(s)).id, cfg(), admin);
await save({ title: "Clasico combo", price: "R$ 1", accepts_children: 0, kids_policy: "", meta: JSON.stringify({ kind: "paquete", parts: ["city-clasico", "tango-show"], plan: [["city-clasico", 1, "", ""], ["tango-show", 1, "", ""]], pmode: "libre", win: 7, auto: 1, disc: 0 }) });
const CC = await row("clasico-combo"); assert.equal(CC.price, "R$ 470");
await call("PUT", "booking-config/" + CC.id, cfg(), admin);
const dk = addDays(d0, 30);
r = await call("GET", "avail?slug=clasico-combo&start=" + dk);
assert.equal(r.data.span, 7, "ventana de 7 días para repartir los servicios");
r = await call("POST", "book", { slug: "clasico-combo", date: dk, pax: 2, adults: 1, children: 1, ages: [6], name: "Mario", phone: "+54 11 5555-1111", plan: [{ slug: "tango-show", day: addDays(dk, 3) }] });
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.total, 470 + 250 + 110, "adulto 470 + niño de 6: City completo (250) + Tango 50% (110)");
assert.deepEqual(r.data.itin.map((x) => [x.title, x.day]), [["City Clasico", dk], ["Tango Show", addDays(dk, 3)]], "cada servicio en su fecha");
r = await call("POST", "book", { slug: "clasico-combo", date: dk, pax: 2, adults: 1, children: 1, ages: [2], name: "Mario", phone: "+54 11 5555-2222" });
assert.equal(r.data.total, 470, "un nene de 2 años no paga en ninguno");
r = await call("POST", "book", { slug: "clasico-combo", date: dk, pax: 2, adults: 1, children: 1, ages: [4], name: "Mario", phone: "+54 11 5555-3333" });
assert.equal(r.data.total, 470 + 125 + 110, "4 años: 50% en los dos");
{
  const { bundlePolicies, bundleItems, loadParts } = await import("../functions/lib/bundle.js");
  const CCr = await row("clasico-combo"), its = bundleItems(CCr, await loadParts(env.DB, CCr));
  const pols = bundlePolicies(CCr, its, { lang: "pt", policyTypes: { menores: "Menores de idade", cancelacion: "Cancelamento" } });
  const men = pols.find((x) => x.type === "menores"), can = pols.find((x) => x.type === "cancelacion");
  assert.ok(men && /City Clasico:\*\* 0 a 2 anos: grátis · 3 a 5 anos: pagam 50% · a partir de 6 anos: tarifa de adulto/.test(men.text), men && men.text);
  assert.ok(/Tango Show:\*\* 0 a 3 anos: grátis · 4 a 11 anos: pagam 50% · a partir de 12 anos/.test(men.text));
  assert.ok(can && can.text.includes("**City Clasico:** Grátis até 24 h antes.") && can.text.includes("**Tango Show:** Sem reembolso a menos de 48 h."));
  const own = bundlePolicies({ ...CCr, meta: JSON.stringify({ ...JSON.parse(CCr.meta), policies: [["cancelacion", "Política própria do pacote.", "", ""]] }) }, its, { lang: "pt", policyTypes: {} });
  assert.deepEqual(own.filter((x) => x.type === "cancelacion").map((x) => x.text), ["Política própria do pacote."], "la escrita a mano reemplaza a la automática");
}
console.log("✓ niños por servicio en paquetes, fecha distinta para cada servicio y políticas unificadas solas");

console.log("\nTodo OK");

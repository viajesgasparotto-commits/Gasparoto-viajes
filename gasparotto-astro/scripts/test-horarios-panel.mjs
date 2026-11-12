// Panel de Disponibilidad: carga visual de horarios (PUT /api/booking-config con "times"), y los ajustes del flujo de reserva por horario.
// Uso: npm run test:horarios-panel   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequest } from "../functions/api/[[path]].js";
import { normMeta, timesOf } from "../functions/lib/ficha.js";
import { addDays, monthState, todayBA } from "../functions/lib/booking.js";

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
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.9." + (ip++ % 250) + ".1" };
  if (cookie) headers.cookie = cookie;
  const r = await onRequest({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: path.split("?")[0].split("/") } });
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, data, cookie: ck ? "gv_admin=" + ck : "" };
}
const admin = (await call("POST", "login", { password: "clave-general-123" })).cookie; assert.ok(admin);
await call("GET", "avail"); // dispara ensureSchema

const ins = (slug, meta, minPax = 1, cap = 10) => env.DB.prepare("INSERT INTO packages (slug,title,category,price,meta,booking_enabled,min_pax,max_pax,daily_capacity,weekdays,min_advance_days,horizon_days,published) VALUES (?,?,?,?,?,1,?,6,?,'0,1,2,3,4,5,6',1,60,1)").bind(slug, "T " + slug, "city-tours", "R$ 100", meta, minPax, cap).run();
await ins("nuevo", normMeta({ facts: [["Duración", "4 horas"]], faq: [["¿Hotel?", "Sí"]] }));
await ins("minimo", normMeta({ times: [["09:00"], ["14:30"]] }), 2, 3);
const idOf = async (slug) => (await env.DB.prepare("SELECT id FROM packages WHERE slug=?").bind(slug).first()).id;
const pid = await idOf("nuevo"), pidMin = await idOf("minimo");
const cfg = (extra = {}) => ({ booking_enabled: 1, min_pax: 1, max_pax: 6, daily_capacity: 10, weekdays: [0, 1, 2, 3, 4, 5, 6], min_advance_days: 1, horizon_days: 60, pay_mode: "whatsapp", ...extra });
const metaOf = async (id) => JSON.parse((await env.DB.prepare("SELECT meta FROM packages WHERE id=?").bind(id).first()).meta);
const day = addDays(todayBA(), 5), month = day.slice(0, 7);

// 1) cargar horarios y activar el modo en UN solo guardado (el paquete no tenía ninguno)
let r = await call("PUT", "booking-config/" + pid, cfg({ time_booking: 1, times: [["14:30", "Tarde"], ["9h", "Salida desde el hotel"], ["09:00", "repetido: gana este"], ["xx", "inválido"]] }), admin);
assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.times, 2); assert.equal(r.data.orphans, 0);
let m = await metaOf(pid);
assert.deepEqual(m.times, [["09:00", "Salida desde el hotel"], ["14:30", "Tarde"]], "normalizados, sin repetir, ordenados");
assert.deepEqual(m.facts, [["Duración", "4 horas"]]); assert.equal(m.faq.length, 1, "el resto de la ficha no se toca");
assert.equal((await env.DB.prepare("SELECT time_booking t FROM packages WHERE id=?").bind(pid).first()).t, 1);
console.log("✓ panel: horarios + modo por horario en un solo guardado, normalizados y sin tocar el resto de la ficha");

// 2) el cliente ya los ve
r = await call("GET", "avail?slug=nuevo&month=" + month);
assert.equal(r.data.by_time, true); assert.deepEqual(r.data.times, ["09:00", "14:30"]);
r = await call("GET", `slots?package_id=${pid}&month=${month}`, null, admin);
assert.deepEqual(r.data.config.time_rows, [["09:00", "Salida desde el hotel"], ["14:30", "Tarde"]], "el editor recibe las notas");
console.log("✓ /api/avail y /api/slots (time_rows para el editor)");

// 3) validaciones
r = await call("PUT", "booking-config/" + pid, cfg({ time_booking: 1, times: [] }), admin);
assert.equal(r.status, 400); assert.ok(/horarios/i.test(r.data.error), r.data.error);
r = await call("PUT", "booking-config/" + pid, cfg({ times: ["25:99", "abc"] }), admin);
assert.equal(r.status, 400); assert.ok(/ningún horario/i.test(r.data.error), r.data.error);
assert.equal((await metaOf(pid)).times.length, 2, "un guardado inválido no borra nada");
r = await call("PUT", "booking-config/999999", cfg({ times: [["09:00"]] }), admin); assert.equal(r.status, 404);
r = await call("PUT", "booking-config/" + pid, cfg({ times: [["09:00"]] })); assert.equal(r.status, 401, "sin sesión no se puede");
console.log("✓ validaciones: activar sin horarios, horarios inválidos, paquete inexistente y sin sesión");

// 4) sin "times" se conservan; con lista vacía se borran y el modo por horario se apaga solo
r = await call("PUT", "booking-config/" + pid, cfg({ daily_capacity: 8 }), admin); assert.equal(r.status, 200);
assert.equal((await metaOf(pid)).times.length, 2, "guardar reglas sin mandar times conserva los horarios");
r = await call("PUT", "booking-config/" + pid, cfg({ times: [] }), admin); assert.equal(r.status, 200);
assert.equal((await metaOf(pid)).times.length, 0);
assert.equal((await env.DB.prepare("SELECT time_booking t FROM packages WHERE id=?").bind(pid).first()).t, 0, "sin horarios, el modo por horario queda apagado");
r = await call("GET", "avail?slug=nuevo&month=" + month); assert.equal(r.data.by_time, false);
console.log("✓ sin times se conservan; lista vacía los borra y apaga el modo");

// 5) quitar un horario que tiene reservas futuras avisa (orphans)
await call("PUT", "booking-config/" + pid, cfg({ time_booking: 1, times: [["09:00"], ["14:30"]] }), admin);
r = await call("POST", "book", { slug: "nuevo", date: day, time: "14:30", pax: 2, name: "Ana", phone: "+54 9 11 5555 1234", website: "" }); assert.equal(r.data.ok, true, JSON.stringify(r.data));
r = await call("PUT", "booking-config/" + pid, cfg({ time_booking: 1, times: [["09:00"]] }), admin);
assert.equal(r.status, 200); assert.equal(r.data.orphans, 1);
r = await call("PUT", "booking-config/" + pid, cfg({ time_booking: 1, times: [["09:00"], ["14:30"]] }), admin); assert.equal(r.data.orphans, 0);
console.log("✓ quitar un horario con reservas futuras lo informa");

// 6) un horario al que le quedan menos lugares que el mínimo por reserva se informa SIN lugar (antes aparecía con left 1 y habilitado)
await env.DB.prepare("UPDATE packages SET time_booking=1 WHERE id=?").bind(pidMin).run();
r = await call("POST", "book", { slug: "minimo", date: day, time: "09:00", pax: 2, name: "Beto", phone: "+54 9 11 4444 0000", website: "" }); assert.equal(r.data.ok, true, JSON.stringify(r.data));
r = await call("GET", "avail?slug=minimo&month=" + month);
const s9 = r.data.slots[day].find((x) => x.t === "09:00"), s14 = r.data.slots[day].find((x) => x.t === "14:30");
assert.equal(s9.left, 0, "09:00 queda en 1 lugar y el mínimo es 2: no se puede reservar"); assert.equal(s14.left, 3);
assert.equal(r.data.days[day], 3, "el día sigue abierto por el otro horario");
console.log("✓ /api/avail: horario que no alcanza el mínimo va con left 0");

// 7) monthState en paralelo y con una sola consulta por horario da los mismos números que antes
const pkg = await env.DB.prepare("SELECT * FROM packages WHERE id=?").bind(pidMin).first();
const st = await monthState(env.DB, pkg, month), dd = st.days.find((x) => x.day === day);
assert.equal(dd.booked, 2, "total del día = suma de sus horarios"); assert.equal(dd.slots.find((x) => x.t === "09:00").booked, 2);
assert.equal(dd.slots.find((x) => x.t === "09:00").st, "full"); assert.equal(dd.left, 3);
await env.DB.prepare("UPDATE packages SET time_booking=0 WHERE id=?").bind(pidMin).run();
const st0 = await monthState(env.DB, { ...pkg, time_booking: 0 }, month), d0 = st0.days.find((x) => x.day === day);
assert.equal(d0.booked, 2); assert.equal(d0.left, 1); assert.deepEqual(d0.slots, []);
console.log("✓ monthState: mismos números por día y por horario");

// 8) contrato estático del panel y de la ficha (no hay navegador en este entorno)
const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const adm = read("public/admin/admin.js"), conv = read("public/assets/conv.js"), brand = read("functions/lib/brand.js"), render = read("functions/lib/render.js");
for (const k of ['id="av-trows"', 'id="av-tadd"', 'class="av-ti"', "times:rows", "Guardar cambios"]) assert.ok(adm.includes(k), "admin.js: falta " + k);
assert.ok(!adm.includes("cargá los horarios de salida en “Datos de la ficha”"), "el aviso ya no manda a buscar el textarea");
for (const k of ["tw-slot", '"gv:pax"', "timeAdj", "slotShort", "scrollIntoView", "prefers-reduced-motion"]) assert.ok(conv.includes(k), "conv.js: falta " + k);
assert.ok(Number(brand.match(/ASSET_V = "(\d+)"/)[1]) >= 16, "ASSET_V sin subir"); assert.ok(Number(render.match(/tw\.css\?v=(\d+)/)[1]) >= 18, "tw.css sin versión nueva");
assert.ok(read("public/assets/tw.css").includes(".tw-slot") && read("src/styles/tw.css").includes(".tw-slot"), "faltan estilos tw-slot");
assert.ok(read("public/admin/admin.css").includes(".av-tr{") && read("src/styles/admin.css").includes(".av-tr{"), "faltan estilos del editor de horarios");
console.log("✓ contrato estático: editor del panel, ficha, versiones y estilos");
console.log("\nHorarios (panel y reserva): todo OK");

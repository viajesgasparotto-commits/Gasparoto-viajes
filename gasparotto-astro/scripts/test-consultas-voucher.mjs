// Prueba de consultas en lote y de corrección del titular del voucher. SQLite real, sin red.
// Uso: npm run test:consultas   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";

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
const env = { DB: d1(), ADMIN_PASSWORD: "clave-general-123" };
let ip = 0;
async function call(method, path, body, cookie) {
  const parts = path.split("?")[0].split("/");
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.2." + (ip++ % 250) + ".1" };
  if (cookie) headers.cookie = cookie;
  const r = await onRequest({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: parts } });
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, data, cookie: ck ? "gv_admin=" + ck : "" };
}
const cookie = (await call("POST", "login", { password: "clave-general-123" })).cookie;
assert.ok(cookie, "login general");

// ---- Consultas: se cargan por el formulario público (así se crea el esquema también) ----
for (let i = 1; i <= 5; i++) {
  const r = await call("POST", "lead", { name: "Cliente " + i, phone: "11555500" + i, source: "form" });
  assert.equal(r.status, 200, JSON.stringify(r.data));
}
let leads = (await call("GET", "leads", null, cookie)).data.leads;
assert.equal(leads.length, 5);
const [a, b, c, d, e] = leads.map((x) => x.id);

// Sin sesión no se puede borrar en lote
assert.equal((await call("POST", "leads/borrar", { ids: [a] })).status, 401);
// Sin selección: 400 y nada se borra
assert.equal((await call("POST", "leads/borrar", { ids: [] }, cookie)).status, 400);
assert.equal((await call("POST", "leads/borrar", {}, cookie)).status, 400);
// Ids inválidos o repetidos se descartan; cuenta solo los reales y sin repetir
let r = await call("POST", "leads/borrar", { ids: [a, a, "x", -4, 1.5, null] }, cookie);
assert.deepEqual(r.data, { ok: true, deleted: 1 });
// Un lote de varios
r = await call("POST", "leads/borrar", { ids: [b, c] }, cookie);
assert.equal(r.data.deleted, 2);
// Un id que ya no existe no rompe el lote
r = await call("POST", "leads/borrar", { ids: [d, 999999] }, cookie);
assert.equal(r.data.deleted, 1);
leads = (await call("GET", "leads", null, cookie)).data.leads;
assert.deepEqual(leads.map((x) => x.id), [e]);
// El borrado individual sigue funcionando
assert.equal((await call("DELETE", "leads/" + e, null, cookie)).status, 200);
assert.equal((await call("GET", "leads", null, cookie)).data.leads.length, 0);
console.log("✓ consultas: borrado en lote con ids válidos, repetidos e inexistentes; sin sesión y sin selección se rechazan");

// ---- Voucher: corregir el titular ----
const raw = env.DB._raw;
raw.exec(`INSERT INTO bookings (package_id, day, pax, adults, children, name, phone, status, total, currency, paid_at)
          VALUES (1, '2026-12-01', 2, 2, 0, 'Juan Prerez', '5491100000000', 'pagada', 250000, 'BRL', '2026-11-20 10:00:00')`);
const bid = raw.prepare("SELECT id FROM bookings").get().id;
const before = raw.prepare("SELECT status, total FROM bookings WHERE id=?").get(bid);

r = await call("PUT", "bookings/" + bid, { name: "Juan Pérez" }, cookie);
assert.equal(r.status, 200, JSON.stringify(r.data));
const after = raw.prepare("SELECT name, status, total FROM bookings WHERE id=?").get(bid);
assert.equal(after.name, "Juan Pérez");
assert.equal(after.status, before.status, "cambiar el titular no cambia el estado");
assert.equal(after.total, before.total, "ni el total");

assert.equal((await call("PUT", "bookings/" + bid, { name: "   " }, cookie)).status, 400, "titular vacío");
assert.equal((await call("PUT", "bookings/999999", { name: "Ana" }, cookie)).status, 404, "reserva inexistente");
assert.equal((await call("PUT", "bookings/" + bid, { name: "Ana" })).status, 401, "sin sesión");

// El voucher muestra el titular corregido
const v = await onRequest({ request: new Request(`https://x.test/api/bookings?voucher=${bid}`, { headers: { cookie } }), env, params: { path: ["bookings"] } });
const html = await v.text();
assert.ok(html.includes("Juan Pérez"), "el voucher muestra el titular nuevo");
assert.ok(!html.includes("Juan Prerez"), "ya no aparece el nombre viejo");
console.log("✓ voucher: el titular se corrige sin tocar estado ni total, y el voucher lo muestra");
console.log("\nTodo OK");

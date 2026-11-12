// Mapa de rutas de /api: cada ruta pública y del panel responde donde corresponde (no queda ninguna huérfana al mover o dividir módulos).
// Uso: npm run test:rutas   (Node 22+ por node:sqlite)
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
  return { prepare: (s) => mk(s), batch: async (l) => { for (const x of l) await x.run(); return []; } };
}
const PAGE = '<main><div class="elementor-element" data-id="abc1" data-widget_type="text-editor.default"><div class="elementor-widget-container">R$ 1.000</div></div></main>';
const env = { DB: d1(), IMAGES: { put: async () => {} }, ASSETS: { fetch: async () => new Response(PAGE) }, ADMIN_PASSWORD: "clave-general-123" };
let ip = 0;
async function call(method, path, body, cookie, extra = {}) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.4." + (ip++ % 250) + ".1", ...extra };
  if (cookie) headers.cookie = cookie;
  const r = await onRequest({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: path.split("?")[0].split("/") } });
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  const text = await r.text();
  return { status: r.status, data: text ? JSON.parse(text) : null, cookie: ck ? "gv_admin=" + ck : "" };
}

// 1) Públicas: responden sin sesión
let r = await call("GET", "brand"); assert.equal(r.status, 200); assert.ok(r.data.brand);
r = await call("POST", "lead", { name: "Ana", phone: "1155551234" }); assert.deepEqual(r.data, { ok: true });
r = await call("POST", "track", { p: "/", v: "m", d: 5, c: [] }); assert.equal(r.status, 204);
r = await call("GET", "avail"); assert.deepEqual(r.data, { enabled: false });
r = await call("POST", "book", {}); assert.equal(r.status, 404); assert.equal(r.data.code, "off");
r = await call("POST", "book/cancel", {}); assert.equal(r.status, 400);
r = await call("POST", "book/pay", {}); assert.equal(r.status, 400);
r = await call("GET", "book/status"); assert.equal(r.status, 400);
r = await call("POST", "pay/webhook", { type: "otro", data: { id: "1" } }); assert.equal(r.status, 200);
console.log("✓ rutas públicas: brand, lead, track, avail, book (alta, cancel, pay, status) y pay/webhook");

// 2) Todo lo demás pide sesión
const PANEL = ["users", "stats", "leads", "bookings", "slots", "booking-config/1", "categories", "team", "heat", "activity", "alerts", "tasks", "favorites", "posts", "packages", "prices", "upload", "me", "logout", "no-existe"];
for (const p of PANEL) { r = await call("GET", p); assert.equal(r.status, 401, `sin sesión debe dar 401: ${p}`); }
console.log(`✓ sin sesión, las ${PANEL.length - 1} rutas del panel (y una inexistente) dan 401`);

// 3) Con sesión, cada sección contesta lo suyo
const admin = (await call("POST", "login", { password: "clave-general-123" })).cookie; assert.ok(admin);
for (const p of ["users", "stats", "leads", "bookings", "categories", "team", "heat", "activity", "alerts", "tasks", "favorites", "posts", "packages", "me", "prices?page=/"]) {
  r = await call("GET", p, null, admin); assert.equal(r.status, 200, `con sesión debe dar 200: ${p}`);
}
r = await call("GET", "slots?package_id=1", null, admin); assert.equal(r.status, 404); assert.match(r.data.error, /paquete/);
r = await call("PUT", "booking-config/1", { booking_enabled: 0 }, admin); assert.equal(r.status, 404); assert.match(r.data.error, /paquete/);
r = await call("PUT", "leads/1", { status: "nuevo" }, admin); assert.equal(r.status, 200);
r = await call("PUT", "bookings/1", { status: "pagada" }, admin); assert.equal(r.status, 404);
r = await call("PUT", "tasks/1/review", { status: "ok", user_id: 1 }, admin); assert.equal(r.status, 404);
r = await call("GET", "tasks/report", null, admin); assert.equal(r.status, 200);
r = await call("POST", "upload", null, admin, { "content-type": "text/plain" }); assert.equal(r.status, 415);
r = await call("GET", "no-existe", null, admin); assert.equal(r.status, 404); assert.equal(r.data.error, "Not found");
console.log("✓ con sesión: usuarios, estadísticas, consultas, reservas, contenido, equipo y medios contestan; lo desconocido da 404");

// 4) Historial: el cambio hecho desde el panel deja su registro; después, logout
const rows = (await call("GET", "activity?days=1", null, admin)).data.rows;
assert.ok(rows.some((x) => x.entity === "consulta"), "el cambio de una consulta queda en el historial");
console.log("✓ el historial registra los cambios hechos desde el panel");
r = await call("POST", "logout", null, admin); assert.equal(r.status, 200);

console.log("\nTodo OK");

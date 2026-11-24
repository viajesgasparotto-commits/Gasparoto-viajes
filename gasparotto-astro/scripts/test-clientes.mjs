// Prueba de "Nuestros clientes": rol "fotos" (solo sube fotos), permisos por dueño, página /clientes/ y franja de la portada.
// Uso: npm run test:clientes   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";
import { clientesBody, clientesStrip } from "../functions/lib/clientes.js";

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
const env = { DB: d1(), ADMIN_PASSWORD: "clave-general-123" };
let ip = 0;
async function call(method, path, body, cookie, type) {
  const [res, id] = path.split("/");
  const headers = { "content-type": type || "application/json", "cf-connecting-ip": "10.1." + (ip++ % 250) + ".1" };
  if (cookie) headers.cookie = cookie;
  const r = await onRequest({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && (type ? body : JSON.stringify(body)) }), env, params: { path: id ? [res, id] : [res] } });
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  return { status: r.status, data: await r.json().catch(() => ({})), cookie: ck ? "gv_admin=" + ck : "" };
}

let r = await call("POST", "login", { password: "clave-general-123" });
const owner = r.cookie;
r = await call("POST", "users", { name: "Lu Fotos", email: "fotos@agencia.com", password: "una-clave-larga", role: "fotos" }, owner);
assert.equal(r.status, 201);
r = await call("POST", "users", { name: "Eva", email: "eva@agencia.com", password: "otra-clave-larga", role: "editor" }, owner);
assert.equal(r.status, 201);
const fotos = (await call("POST", "login", { email: "fotos@agencia.com", password: "una-clave-larga" })).cookie;
const eva = (await call("POST", "login", { email: "eva@agencia.com", password: "otra-clave-larga" })).cookie;
r = await call("GET", "me", null, fotos);
assert.equal(r.data.user.role, "fotos");
console.log("✓ se crea un usuario con el rol \"fotos\" y entra");

// 1) el rol fotos no ve nada más del panel
for (const p of ["posts", "packages", "leads", "bookings", "users", "ia", "stats", "tasks", "favorites", "categories", "alerts"]) {
  r = await call("GET", p, null, fotos);
  assert.equal(r.status, 403, p);
}
r = await call("POST", "packages", { title: "x" }, fotos); assert.equal(r.status, 403);
r = await call("POST", "upload", "x", fotos, "video/mp4"); assert.equal(r.status, 403);
console.log("✓ rol fotos: sin acceso a paquetes, blog, reservas, consultas, IA, usuarios ni videos");

// 2) sube, edita y borra solo lo suyo
r = await call("POST", "clientes", { image: "https://otro.sitio/x.jpg" }, fotos); assert.equal(r.status, 400);
r = await call("POST", "clientes", { image: "/media/abc-1.webp", caption: "Família Souza no City Tour <b>" }, fotos);
assert.equal(r.status, 201); const f1 = r.data.id;
r = await call("POST", "clientes", { image: "/media/abc-2.jpg" }, eva); assert.equal(r.status, 201); const e1 = r.data.id;
r = await call("GET", "clientes", null, fotos);
assert.equal(r.data.photos.length, 2); assert.equal(r.data.staff, false);
assert.ok(!r.data.photos.find((p) => p.id === f1).caption.includes("<"));
r = await call("PUT", "clientes/" + f1, { caption: "Família Souza" }, fotos); assert.equal(r.status, 200);
r = await call("PUT", "clientes/" + e1, { caption: "hack" }, fotos); assert.equal(r.status, 403);
r = await call("DELETE", "clientes/" + e1, null, fotos); assert.equal(r.status, 403);
r = await call("PUT", "clientes/" + f1, { published: false }, fotos); assert.equal(r.status, 403);
console.log("✓ rol fotos: sube, cambia el texto y borra solo sus fotos; no puede ocultar");

// 3) editor y administrador manejan todas
r = await call("PUT", "clientes/" + f1, { published: false }, eva); assert.equal(r.status, 200);
r = await call("GET", "clientes", null, owner); assert.equal(r.data.photos.find((p) => p.id === f1).published, 0);
r = await call("DELETE", "clientes/" + e1, null, owner); assert.equal(r.status, 200);
r = await call("DELETE", "clientes/" + f1, null, fotos); assert.equal(r.status, 200);
r = await call("GET", "clientes", null, owner); assert.equal(r.data.photos.length, 0);
console.log("✓ editor y administrador ocultan y borran cualquier foto");

// 4) página y franja de la portada
const ph = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, image: `/media/f${i}.webp`, caption: i ? "" : 'Família "Souza"' }));
assert.equal(clientesStrip(ph(3), "pt-BR"), "");
const strip = clientesStrip(ph(10), "pt-BR");
assert.equal((strip.match(/<img /g) || []).length, 8); assert.ok(strip.includes("Nossos clientes") && strip.includes('href="/clientes/"'));
const body = clientesBody(ph(2), "pt-BR");
assert.ok(body.includes("<h1") && body.includes("Família &quot;Souza&quot;") && body.includes('alt="Cliente da Gasparotto Viajes"'));
assert.ok(clientesBody([], "es").includes("Muy pronto"));
console.log("✓ página /clientes/ y franja de la portada (solo con 4 fotos o más)");

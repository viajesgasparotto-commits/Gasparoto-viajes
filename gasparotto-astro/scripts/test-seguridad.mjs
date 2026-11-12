// Prueba de seguridad del panel: firma de sesión, bloqueo por intentos, origen de los pedidos y validación real de imágenes.
// Uso: npm run test:seguridad   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
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
const stored = new Map();
const IMAGES = { put: async (k, body, o) => { stored.set(k, { n: body.byteLength, type: o.httpMetadata.contentType }); } };
const DB = d1();
const env = { DB, IMAGES, ADMIN_PASSWORD: "clave-general-123" };
let ip = 0;
async function call(method, path, body, cookie, extra = {}, e = env, fixedIp) {
  const parts = path.split("?")[0].split("/");
  const headers = { "content-type": "application/json", "cf-connecting-ip": fixedIp || "10.2." + (ip++ % 250) + ".1", ...extra };
  if (cookie) headers.cookie = cookie;
  const r = await onRequest({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env: e, params: { path: parts } });
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  const text = await r.text();
  return { status: r.status, data: text ? JSON.parse(text) : null, cookie: ck ? "gv_admin=" + ck : "" };
}
async function upload(bytes, type, cookie) {
  const r = await onRequest({ request: new Request("https://x.test/api/upload", { method: "POST", headers: { "content-type": type, "content-length": String(bytes.length), "cf-connecting-ip": "10.3.0.1", cookie }, body: bytes }), env, params: { path: ["upload"] } });
  return { status: r.status, data: await r.json() };
}

const owner = (await call("POST", "login", { password: "clave-general-123" })).cookie;
assert.ok(owner);
await call("POST", "users", { name: "Ana", email: "ana@a.com", password: "clave-larga-123", role: "editor" }, owner);
await call("POST", "users", { name: "Luis", email: "luis@a.com", password: "clave-larga-123", role: "editor" }, owner);
const ana = (await call("POST", "login", { email: "ana@a.com", password: "clave-larga-123" })).cookie;

// 1) la firma de la sesión no se deriva de la contraseña: una cookie firmada con ADMIN_PASSWORD no sirve
const exp = Math.floor(Date.now() / 1000) + 3600;
const forged = (key, msg) => createHmac("sha256", key).update(msg).digest("hex");
for (const c of [`${exp}.0.${forged("clave-general-123", `gv-session.${exp}.0.`)}`, `${exp}.${forged("clave-general-123", `gv-session.${exp}`)}`])
  assert.equal((await call("GET", "me", null, "gv_admin=" + c)).status, 401, "cookie forjada con la contraseña");
// la cookie del editor tampoco permite verificar contraseñas: firmada con otra clave distinta de la clave general
const [e1, u1, s1] = ana.replace("gv_admin=", "").split(".");
assert.notEqual(s1, forged("clave-general-123", `gv-session.${e1}.${u1}.`), "la sesión no usa la contraseña como clave");
assert.equal((await call("GET", "me", null, ana)).status, 200);
console.log("✓ sesiones: firmadas con clave propia; cookies forjadas con la contraseña (formato nuevo o viejo) se rechazan");

// 2) cambiar la clave general cierra las sesiones de la clave general; las de usuario siguen valiendo
const env2 = { ...env, ADMIN_PASSWORD: "otra-clave-general-456" };
assert.equal((await call("GET", "me", null, owner, {}, env2)).status, 401, "sesión vieja de la clave general tras cambiarla");
assert.equal((await call("GET", "me", null, ana, {}, env2)).status, 200, "la sesión de un usuario no depende de la clave general");
console.log("✓ al cambiar la clave general caen sus sesiones");

// 3) bloqueo por cuenta (aunque cambien de IP) y recuperación
for (let i = 0; i < 8; i++) assert.equal((await call("POST", "login", { email: "luis@a.com", password: "mala-" + i })).status, 401);
let r = await call("POST", "login", { email: "luis@a.com", password: "clave-larga-123" });
assert.equal(r.status, 429, "con 8 fallos la cuenta queda bloqueada incluso con la clave correcta, desde otra IP");
r = await call("POST", "login", { email: "ana@a.com", password: "clave-larga-123" }); assert.equal(r.status, 200, "otra cuenta no se ve afectada");
r = await call("GET", "activity?days=1", null, owner); assert.ok(r.data.rows.some((x) => x.action === "bloqueado" && x.user_name === "Luis"), "el bloqueo queda en el historial");
DB._raw.prepare("UPDATE login_fails SET at = at - ?").run(16 * 60 * 1000); // pasan 16 minutos
r = await call("POST", "login", { email: "luis@a.com", password: "clave-larga-123" }); assert.equal(r.status, 200, "pasada la ventana vuelve a entrar");
assert.equal(DB._raw.prepare("SELECT COUNT(*) n FROM login_fails WHERE k='em:luis@a.com'").get().n, 0, "entrar bien limpia los fallos");
console.log("✓ bloqueo persistente por cuenta (8 fallos / 15 min), no depende de la IP, se registra y se levanta solo");

// 4) lo mismo para la clave general
for (let i = 0; i < 8; i++) await call("POST", "login", { password: "mala-" + i });
assert.equal((await call("POST", "login", { password: "clave-general-123" })).status, 429, "clave general bloqueada tras 8 fallos");
DB._raw.prepare("DELETE FROM login_fails").run();
assert.equal((await call("POST", "login", { password: "clave-general-123" })).status, 200);
console.log("✓ la clave general también se bloquea por fuerza bruta");

// 5) origen de los pedidos que modifican datos
r = await call("POST", "logout", null, ana, { "sec-fetch-site": "cross-site" }); assert.equal(r.status, 403, "pedido de otro sitio");
r = await call("POST", "logout", null, ana, { "sec-fetch-site": "same-site" }); assert.equal(r.status, 403, "otro subdominio tampoco");
r = await call("POST", "tasks", { title: "x", frequency: "daily" }, owner, { origin: "https://malo.com" }); assert.equal(r.status, 403);
r = await call("POST", "logout", null, ana, { "sec-fetch-site": "same-origin", origin: "https://x.test" }); assert.equal(r.status, 200);
console.log("✓ pedidos que modifican datos: solo del mismo origen (Origin y Sec-Fetch-Site)");

// 6) subida de imágenes: se valida el contenido real, no solo lo que declara el navegador
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 0, 0, 0, 0, 0]);
const webp = Uint8Array.from([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP"), 0, 0, 0, 0]);
const html = Buffer.from("<html><script>alert(1)</script></html>");
assert.equal((await upload(png, "image/png", ana)).status, 200);
assert.equal((await upload(jpg, "image/jpeg", ana)).status, 200);
assert.equal((await upload(webp, "image/webp", ana)).status, 200);
assert.equal((await upload(html, "image/png", ana)).status, 415, "HTML disfrazado de PNG");
assert.equal((await upload(jpg, "image/png", ana)).status, 415, "formato declarado distinto del real");
assert.equal((await upload(png, "image/svg+xml", ana)).status, 415, "SVG no permitido");
assert.equal((await upload(png, "image/png", "")).status, 401, "sin sesión no se sube nada");
// videos: MP4/WebM/MOV por firma real, HTML o imágenes disfrazadas rechazados, tope de 50 MB
const mp4 = Uint8Array.from([0, 0, 0, 0x20, ...Buffer.from("ftypisom"), 0, 0, 2, 0, 0, 0, 0, 0]);
const mov = Uint8Array.from([0, 0, 0, 0x14, ...Buffer.from("ftypqt  "), 0, 0, 0, 0, 0, 0, 0, 0]);
const webm = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0, 0, 0, 0, 0, 0, 0]);
const avif = Uint8Array.from([0, 0, 0, 0x1c, ...Buffer.from("ftypavif"), 0, 0, 0, 0, 0, 0, 0, 0]);
assert.equal((await upload(mp4, "video/mp4", ana)).status, 200, "MP4 válido");
assert.equal((await upload(webm, "video/webm", ana)).status, 200, "WebM válido");
assert.equal((await upload(mov, "video/quicktime", ana)).status, 200, "MOV válido");
assert.equal((await upload(html, "video/mp4", ana)).status, 415, "HTML disfrazado de MP4");
assert.equal((await upload(png, "video/mp4", ana)).status, 415, "PNG disfrazado de MP4");
assert.equal((await upload(avif, "video/mp4", ana)).status, 415, "AVIF no es un video");
assert.equal((await upload(mp4, "video/webm", ana)).status, 415, "formato declarado distinto del real");
assert.equal((await upload(mp4, "video/mp4", "")).status, 401, "sin sesión no se sube ningún video");
{ const big = await onRequest({ request: new Request("https://x.test/api/upload", { method: "POST", headers: { "content-type": "video/mp4", "content-length": String(60 * 1024 * 1024), "cf-connecting-ip": "10.3.0.1", cookie: ana }, body: mp4 }), env, params: { path: ["upload"] } }); assert.equal(big.status, 413, "más de 50 MB"); }
assert.equal(stored.size, 6, "solo se guardaron los archivos válidos (3 imágenes y 3 videos)");
console.log("✓ subida: firma real del archivo (JPG/PNG/WEBP y videos MP4/WebM/MOV), HTML o formato falso rechazados, solo con sesión");

// 6b) listado liviano: sin el contenido; la ficha completa por id; una edición rápida (sin "content") no lo borra
{
  const cr = await call("POST", "posts", { title: "Nota de prueba", content: "<p>" + "texto largo ".repeat(50) + "</p>", published: 1 }, ana);
  assert.equal(cr.status, 200, JSON.stringify(cr.data));
  const id = cr.data.id;
  const lst = await call("GET", "posts", null, ana);
  const row = lst.data.find((x) => x.id === id);
  assert.ok(row && row.title === "Nota de prueba" && !("content" in row), "el listado no trae el contenido");
  const full = await call("GET", `posts/${id}`, null, ana);
  assert.ok(full.data.content.includes("texto largo"), "la ficha completa trae el contenido");
  assert.equal((await call("GET", "posts/999999", null, ana)).status, 404);
  const quick = await call("PUT", `posts/${id}`, { ...row, title: "Nota de prueba (editada)" }, ana);
  assert.equal(quick.status, 200, JSON.stringify(quick.data));
  const after = await call("GET", `posts/${id}`, null, ana);
  assert.ok(after.data.title.endsWith("(editada)") && after.data.content.includes("texto largo"), "editar sin enviar el contenido lo conserva");
  console.log("✓ listado liviano (sin contenido), ficha completa por id y edición rápida que conserva el contenido");
}

// 7) avisos de seguridad solo para administradores
r = await call("GET", "me", null, owner); assert.deepEqual(r.data.security, [], "clave general larga: sin aviso");
const env3 = { ...env, ADMIN_PASSWORD: "corta123" }, short = (await call("POST", "login", { password: "corta123" }, null, {}, env3)).cookie;
r = await call("GET", "me", null, short, {}, env3); assert.ok(r.data.security.some((t) => /corta/.test(t)), "clave general corta: aviso al admin");
r = await call("GET", "me", null, ana); assert.deepEqual(r.data.security, [], "el editor no ve avisos de seguridad");
console.log("✓ avisos de seguridad para administradores");

console.log("\nTodo OK");

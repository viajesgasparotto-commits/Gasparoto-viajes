// Prueba de usuarios del panel: alta, login por email, roles, cambio de clave, desactivación. Contra SQLite real, sin red.
// Uso: npm run test:users   (Node 22+ por node:sqlite)
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
const env = { DB: d1(), ADMIN_PASSWORD: "clave-general-123" };
let ip = 0;
async function call(method, path, body, cookie) {
  const [res, id] = path.split("/");
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.0." + (ip++ % 250) + ".1" };
  if (cookie) headers.cookie = cookie;
  const r = await onRequest({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: id ? [res, id] : [res] } });
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  return { status: r.status, data: await r.json(), cookie: ck ? "gv_admin=" + ck : "" };
}

// 1) clave general: sigue entrando como administrador
let r = await call("POST", "login", { password: "clave-general-123" });
assert.equal(r.status, 200); const owner = r.cookie;
r = await call("GET", "me", null, owner);
assert.equal(r.data.user.role, "admin"); assert.equal(r.data.user.id, 0);
console.log("✓ la clave general sigue entrando como administrador");

// 2) crear usuarios (validaciones)
r = await call("POST", "users", { name: "Ana", email: "ana@agencia.com", password: "corta", role: "editor" }, owner);
assert.equal(r.status, 400);
r = await call("POST", "users", { name: "Ana", email: "no-es-email", password: "una-clave-larga", role: "editor" }, owner);
assert.equal(r.status, 400);
r = await call("POST", "users", { name: "Ana", email: "ana@agencia.com", password: "una-clave-larga", role: "superuser" }, owner);
assert.equal(r.status, 400);
r = await call("POST", "users", { name: "Ana", email: "Ana@Agencia.com", password: "una-clave-larga", role: "editor" }, owner);
assert.equal(r.status, 201); const anaId = r.data.id;
r = await call("POST", "users", { name: "Otra", email: "ana@agencia.com", password: "una-clave-larga", role: "editor" }, owner);
assert.equal(r.status, 409);
r = await call("POST", "users", { name: "Beto", email: "beto@agencia.com", password: "otra-clave-larga", role: "admin" }, owner);
assert.equal(r.status, 201); const betoId = r.data.id;
console.log("✓ alta con validaciones, email normalizado y duplicados rechazados");

// 3) la clave nunca se guarda ni se devuelve en claro
r = await call("GET", "users", null, owner);
assert.equal(r.data.users.length, 2); assert.ok(!JSON.stringify(r.data).includes("una-clave-larga") && !JSON.stringify(r.data).includes("pass_hash"));
const stored = env.DB.prepare ? (await env.DB.prepare("SELECT pass_hash FROM users WHERE id=?").bind(anaId).first()).pass_hash : "";
assert.match(stored, /^pbkdf2\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
console.log("✓ clave guardada con PBKDF2 y fuera del listado");

// 4) login por email
r = await call("POST", "login", { email: "ana@agencia.com", password: "mala" });
assert.equal(r.status, 401);
r = await call("POST", "login", { email: "nadie@agencia.com", password: "una-clave-larga" });
assert.equal(r.status, 401);
r = await call("POST", "login", { email: "ANA@agencia.com", password: "una-clave-larga" });
assert.equal(r.status, 200); const ana = r.cookie;
r = await call("GET", "me", null, ana);
assert.equal(r.data.user.email, "ana@agencia.com"); assert.equal(r.data.user.role, "editor");
console.log("✓ login por email (sin distinguir mayúsculas) y rechazo de claves malas");

// 5) el editor no gestiona usuarios; el resto del panel sí
r = await call("GET", "users", null, ana); assert.equal(r.status, 403);
r = await call("POST", "users", { name: "X", email: "x@x.com", password: "una-clave-larga", role: "admin" }, ana); assert.equal(r.status, 403);
r = await call("GET", "leads", null, ana); assert.equal(r.status, 200);
console.log("✓ editor: sin acceso a usuarios, con acceso al resto");

// 6) cookie manipulada o sin sesión
r = await call("GET", "users", null, ana.replace(/\.(\d+)\./, ".$1" + "0."));
assert.equal(r.status, 401);
r = await call("GET", "users", null, "");
assert.equal(r.status, 401);
console.log("✓ cookie alterada y sin cookie: 401");

// 7) protecciones sobre uno mismo
const beto = (await call("POST", "login", { email: "beto@agencia.com", password: "otra-clave-larga" })).cookie;
r = await call("DELETE", "users/" + betoId, null, beto); assert.equal(r.status, 400);
r = await call("PUT", "users/" + betoId, { active: false }, beto); assert.equal(r.status, 400);
r = await call("PUT", "users/" + betoId, { role: "editor" }, beto); assert.equal(r.status, 400);
console.log("✓ nadie se borra, desactiva ni se baja de rol a sí mismo");

// 8) cambiar la clave cierra las sesiones abiertas
r = await call("PUT", "users/" + anaId, { password: "clave-nueva-123" }, beto); assert.equal(r.status, 200);
r = await call("GET", "me", null, ana); assert.equal(r.status, 401);
r = await call("POST", "login", { email: "ana@agencia.com", password: "una-clave-larga" }); assert.equal(r.status, 401);
r = await call("POST", "login", { email: "ana@agencia.com", password: "clave-nueva-123" }); assert.equal(r.status, 200);
const ana2 = r.cookie;
console.log("✓ cambio de clave: la sesión vieja cae y entra la nueva");

// 9) desactivar y borrar
r = await call("PUT", "users/" + anaId, { active: false }, beto); assert.equal(r.status, 200);
r = await call("GET", "me", null, ana2); assert.equal(r.status, 401);
r = await call("POST", "login", { email: "ana@agencia.com", password: "clave-nueva-123" }); assert.equal(r.status, 401);
r = await call("PUT", "users/" + anaId, { active: true, role: "admin", name: "Ana P." }, beto); assert.equal(r.status, 200);
r = await call("POST", "login", { email: "ana@agencia.com", password: "clave-nueva-123" }); assert.equal(r.status, 200);
r = await call("DELETE", "users/" + anaId, null, beto); assert.equal(r.status, 200);
r = await call("POST", "login", { email: "ana@agencia.com", password: "clave-nueva-123" }); assert.equal(r.status, 401);
console.log("✓ desactivar corta el acceso, reactivar lo devuelve, borrar lo elimina");

console.log("\nTodo OK");

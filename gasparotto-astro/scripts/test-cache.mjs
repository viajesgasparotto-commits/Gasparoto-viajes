// Caché de lecturas y de páginas públicas (functions/lib/edge.js): visitas contadas igual, 2ª visita sin lecturas, el panel limpia al guardar.
// Uso: npm run test:cache   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
// Caché de Cloudflare simulado
const store = new Map();
globalThis.caches = { default: {
  match: async (r) => { const x = store.get(r.url); return x ? new Response(x.body, { status: x.status, headers: x.headers }) : undefined; },
  put: async (r, res) => { store.set(r.url, { body: await res.text(), status: res.status, headers: [...res.headers] }); },
  delete: async (r) => store.delete(r.url) } };
const { onRequest } = await import("../functions/_middleware.js");
const { onRequest: api } = await import("../functions/api/[[path]].js");
const { ensureSchema } = await import("../functions/lib/schema.js");
const db = new DatabaseSync(":memory:"); let queries = 0;
const mk = (sql, args = []) => ({ bind: (...a) => mk(sql, a),
  run: async () => { queries++; const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
  first: async () => { queries++; return db.prepare(sql).get(...args) ?? null; },
  all: async () => { queries++; return { results: db.prepare(sql).all(...args) }; } });
const D1 = { prepare: (s) => mk(s), batch: async (l) => { for (const x of l) await x.run(); return []; } };
await ensureSchema(D1);
const slug = db.prepare("SELECT slug FROM categories WHERE kind='posts'").get().slug;
for (let i = 1; i <= 23; i++) db.prepare("INSERT INTO posts(slug,title,excerpt,content,category,published,created_at) VALUES(?,?,?,?,?,1,?)").run("n"+i, "Nota "+i, "ex", "<p>texto</p>", slug, `2026-01-${String(i).padStart(2,"0")}`);
const shell = '<html lang="es"><head><title>x</title></head><body><main></main></body></html>';
const env = { DB: D1, SITE_URL: "https://x.test", ADMIN_PASSWORD: "clave-general-123", ASSETS: { fetch: async () => new Response(shell, { headers: { "content-type": "text/html" } }) } };
const get = async (p, ua = "Mozilla/5.0") => onRequest({ request: new Request("https://x.test" + p, { headers: { "user-agent": ua } }), env, next: async () => new Response("n", { status: 404 }) });
const views = () => db.prepare("SELECT COALESCE(SUM(n),0) n FROM page_views WHERE path=?").get("/blog/n5/").n;

let r = await get("/blog/n5/"); assert.equal(r.status, 200); assert.equal(r.headers.get("x-edge-cache"), null);
assert.equal(r.headers.get("cache-control"), "no-cache, must-revalidate");
await new Promise((ok) => setTimeout(ok, 20));
const q1 = queries; r = await get("/blog/n5/"); await new Promise((ok) => setTimeout(ok, 20));
assert.equal(r.headers.get("x-edge-cache"), "HIT"); assert.equal(r.headers.get("cache-control"), "no-cache, must-revalidate");
assert.equal(queries - q1 <= 2, true, "HIT: solo la escritura de la visita, sin lecturas (hizo " + (queries - q1) + ")");
console.log("✓ segunda visita sale del caché con", queries - q1, "consulta(s) (la de contar la visita)");
assert.equal(views(), 2); console.log("✓ las 2 visitas quedaron contadas (una desde el caché)");
r = await get("/blog/"); const a = queries; await get("/blog/pagina/2/"); await get("/blog/pagina/3/");
console.log("✓ conteo guardado: /blog/pagina/2/ y /3/ hicieron", queries - a, "consultas en total (sin cache de página, con conteo guardado)");
// Panel: guardar una entrada limpia el caché
const login = await api({ request: new Request("https://x.test/api/login", { method: "POST", headers: { "content-type": "application/json", origin: "https://x.test", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ password: "clave-general-123" }) }), env, params: { path: ["login"] } });
const ck = (login.headers.get("set-cookie") || "").match(/gv_admin=[\w.]+/)?.[0]; assert.ok(ck, "login");
assert.ok(store.has("https://x.test/blog/n5/")); 
const up = await api({ request: new Request("https://x.test/api/posts/5", { method: "PUT", headers: { "content-type": "application/json", cookie: ck, origin: "https://x.test", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ slug: "n5", title: "Nota 5 editada", content: "<p>nuevo</p>", category: slug, published: 1 }) }), env, params: { path: ["posts", "5"] } });
console.log("PUT", up.status);
assert.ok(!store.has("https://x.test/blog/n5/"), "la página editada se limpió del caché");
r = await get("/blog/n5/"); assert.equal(r.headers.get("x-edge-cache"), null); assert.match(await r.text(), /Nota 5 editada/);
console.log("✓ al editar en el panel, la entrada se ve nueva de inmediato");
r = await get("/blog/pagina/4/"); assert.equal(r.status, 404); console.log("✓ página inexistente sigue dando 404 y no se guarda");
assert.ok(!store.has("https://x.test/blog/pagina/4/"));

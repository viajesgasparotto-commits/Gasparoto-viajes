// Buscador del blog (/blog/buscar/), anterior/siguiente, relacionadas y caché: sin acentos, sin indexar, sin caché con ?query, sin inyección.
// Uso: npm run test:blog-busqueda   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
const store = new Map();
globalThis.caches = { default: {
  match: async (r) => { const x = store.get(r.url); return x ? new Response(x.body, { status: x.status, headers: x.headers }) : undefined; },
  put: async (r, res) => { store.set(r.url, { body: await res.text(), status: res.status, headers: [...res.headers] }); },
  delete: async (r) => store.delete(r.url) } };
const { onRequest } = await import("../functions/_middleware.js");
const { ensureSchema } = await import("../functions/lib/schema.js");
const db = new DatabaseSync(":memory:");
const mk = (sql, args = []) => ({ bind: (...a) => mk(sql, a),
  run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
  first: async () => db.prepare(sql).get(...args) ?? null,
  all: async () => ({ results: db.prepare(sql).all(...args) }) });
const D1 = { prepare: (s) => mk(s), batch: async (l) => { for (const x of l) await x.run(); return []; } };
await ensureSchema(D1);
const cat = db.prepare("SELECT slug FROM categories WHERE kind='posts'").get().slug;
const add = (slug, title, excerpt, day, extra = "") => db.prepare("INSERT INTO posts(slug,title,excerpt,content,category,published,created_at,publish_date) VALUES(?,?,?,?,?,1,?,?)").run(slug, title, excerpt, "<p>texto " + extra + "</p>", cat, day + " 10:00:00", day);
add("cataratas", "Cataratas del Iguazú: guía completa", "Cómo llegar y cuándo ir", "2026-03-01");
add("tigre", "Paseo por el Delta del Tigre", "Un día en el delta, con iguazu de referencia en el título de otro", "2026-03-02");
add("tango", "Dónde ver tango en Buenos Aires", "Shows y milongas", "2026-03-03");
add("ushuaia", "Ushuaia: 100% fin del mundo", "Qué hacer en la ciudad más austral", "2026-03-04");
db.prepare("INSERT INTO posts(slug,title,excerpt,content,category,published,created_at,publish_date) VALUES('oculta','Iguazú oculta','x','<p>x</p>',?,0,'2026-03-05 10:00:00','2026-03-05')").run(cat);
const shell = '<html lang="es"><head><title>x</title></head><body><main></main></body></html>';
const env = { DB: D1, SITE_URL: "https://x.test", ADMIN_PASSWORD: "clave-general-123", ASSETS: { fetch: async () => new Response(shell, { headers: { "content-type": "text/html" } }) } };
const get = async (p) => onRequest({ request: new Request("https://x.test" + p, { headers: { "user-agent": "Mozilla/5.0" } }), env, next: async () => new Response("n", { status: 404 }) });

// 1) Sin acentos y con mayúsculas; el título pesa más que la bajada; una nota sin publicar no aparece
let r = await get("/blog/buscar/?q=IGUAZU"); let t = await r.text();
assert.equal(r.status, 200);
assert.ok(t.indexOf("/blog/cataratas/") > 0 && t.indexOf("/blog/tigre/") > 0, "encuentra con y sin acento");
assert.ok(t.indexOf("/blog/cataratas/") < t.indexOf("/blog/tigre/"), "la que lo tiene en el título va primero");
assert.ok(!t.includes("/blog/oculta/"), "las no publicadas no salen");
assert.match(t, /noindex,follow/); assert.equal(r.headers.get("x-edge-cache"), null);
console.log("✓ búsqueda sin acentos, ordenada por relevancia, sin notas ocultas y con noindex");
// 2) Varias palabras: todas tienen que estar
t = await (await get("/blog/buscar/?q=tango+shows")).text(); assert.ok(t.includes("/blog/tango/") && !t.includes("/blog/cataratas/"));
t = await (await get("/blog/buscar/?q=tango+glaciares")).text(); assert.ok(!t.includes("/blog/tango/"));
console.log("✓ varias palabras: deben estar todas");
// 3) Comodines y comillas no rompen ni inyectan; vacío y sin resultados dan 200
for (const q of ["%", "_", "'; DROP TABLE posts;--", "\\", "a", ""]) { r = await get("/blog/buscar/?q=" + encodeURIComponent(q)); assert.equal(r.status, 200, q); }
assert.equal(db.prepare("SELECT COUNT(*) n FROM posts").get().n, 5);
t = await (await get("/blog/buscar/?q=%25")).text(); assert.ok(!t.includes("/blog/cataratas/"), "% no es comodín");
t = await (await get("/blog/buscar/?q=%3Cscript%3Ex")).text(); assert.ok(!t.includes("<script>x"), "el texto buscado sale escapado");
console.log("✓ comodines, comillas, HTML y consultas vacías");
// 4) La búsqueda no se guarda en el caché de páginas (ignora el ?q) ni cuenta como visita
await get("/blog/buscar/?q=tango"); t = await (await get("/blog/buscar/?q=ushuaia")).text();
assert.ok(t.includes("/blog/ushuaia/") && !t.includes("/blog/tango/"), "cada ?q se arma de nuevo");
assert.ok(![...store.keys()].some((k) => k.includes("/blog/buscar")), "nada guardado en el caché");
await new Promise((ok) => setTimeout(ok, 20));
assert.equal(db.prepare("SELECT COUNT(*) n FROM page_views WHERE path LIKE '%buscar%'").get().n, 0);
console.log("✓ cada búsqueda se arma de nuevo y no cuenta como visita a una nota");
// 5) /blog/buscar sin barra redirige; /robots.txt lo bloquea; el sitio declara SearchAction
r = await get("/blog/buscar?q=tango"); assert.equal(r.status, 301);
assert.match(await (await get("/robots.txt")).text(), /Disallow: \/blog\/buscar\//);
t = await (await get("/")).text().catch(() => ""); 
console.log("✓ redirección con barra y robots.txt");
// 6) El índice tiene la caja de búsqueda
t = await (await get("/blog/")).text(); assert.match(t, /role="search"[^>]*action="\/blog\/buscar\/"/);
console.log("✓ el índice del blog muestra el buscador");
// 7) Anterior / siguiente
t = await (await get("/blog/tango/")).text();
assert.ok(t.includes('href="/blog/tigre/"') && t.includes('href="/blog/ushuaia/"'), "anterior (más vieja) y siguiente (más nueva)");
t = await (await get("/blog/cataratas/")).text(); assert.ok(t.includes('href="/blog/tigre/"'));
console.log("✓ anterior / siguiente en el orden del blog");
// 8) Relacionadas: se completan hasta 3 aunque la categoría tenga pocas, y con muchas ids manuales no se leen todas las notas
db.prepare("UPDATE posts SET related_ids=? WHERE slug='tango'").run(Array.from({ length: 200 }, (_, i) => 900 + i).join(","));
t = await (await get("/blog/tango/")).text(); assert.equal((t.match(/<article data-fx="up"/g) || []).length, 3);
console.log("✓ relacionadas: siempre 3 y sin recorrer todas las notas");
console.log("\nTodo OK");

// ---- Posicionamiento: ids de títulos, precarga de la portada, datos estructurados y saltos de paginación ----
db.prepare("INSERT INTO posts(slug,title,excerpt,content,image,category,published,created_at,publish_date) VALUES('guia-seo','Guía de prueba','x',?,'/media/portada.webp',?,1,'2026-04-01 10:00:00','2026-04-01')")
  .run("<p>a</p><h2>Cómo llegar</h2><p>b</p><h2>Cómo llegar</h2><p>c</p><h2>Qué ver</h2><h3>Día 1</h3><p>d</p>", cat);
t = await (await get("/blog/guia-seo/")).text();
assert.ok(t.includes('<h2 id="como-llegar">') && t.includes('<h2 id="como-llegar-2">') && t.includes('<h2 id="que-ver">') && t.includes('<h3 id="dia-1">'), "ids con el texto del título");
assert.ok(t.includes('href="#como-llegar"') && t.includes('href="#que-ver"'), "el índice usa esos ids");
assert.ok(t.includes('<link rel="preload" as="image" href="/media/portada.webp" fetchpriority="high">'), "precarga de la portada");
assert.ok(t.includes('"isAccessibleForFree":true') && t.includes('"url":"https://x.test/blog/guia-seo/"'), "datos estructurados");
console.log("✓ ids con el texto del título, precarga de la portada y datos estructurados");
for (let i = 1; i <= 130; i++) db.prepare("INSERT INTO posts(slug,title,excerpt,content,category,published,created_at,publish_date) VALUES(?,?,?,?,?,1,?,?)").run("m" + i, "Masiva " + i, "x", "<p>x</p>", cat, "2025-01-01 10:00:00", "2025-01-01");
const { clearMemo } = await import("../functions/lib/edge.js"); clearMemo(); store.clear(); // el conteo (60 s) y las páginas guardadas son de antes de cargar las 130
t = await (await get("/blog/")).text();
assert.ok(t.includes('href="/blog/pagina/11/"'), "desde la primera se llega a la 11");
t = await (await get("/blog/pagina/11/")).text();
assert.ok(t.includes('href="/blog/pagina/2/"') && t.includes('href="/blog/pagina/10/"') && t.includes('href="/blog/pagina/14/"'), "y desde ahí a las vecinas y a la última");
console.log("✓ paginación con saltos: cualquier página queda a pocos clics");
console.log("\nTodo OK (posicionamiento)");

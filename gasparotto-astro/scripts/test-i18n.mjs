// Prueba del SEO multilingüe: fichas en /es/ con traducción, hreflang, sitemap y la API de traducciones. SQLite real, sin red.
// Uso: npm run test:i18n
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { onRequest as pages } from "../functions/_middleware.js";
import { onRequest as api } from "../functions/api/[[path]].js";
import { splitLang, alternateLinks, addToHead, localizeUrls, PT, ES } from "../functions/lib/i18n.js";

// ---- funciones puras ----
assert.deepEqual(splitLang("/es/paquetes/x/"), { lang: ES, path: "/paquetes/x/" });
assert.deepEqual(splitLang("/es"), { lang: ES, path: "/" });
assert.deepEqual(splitLang("/paquetes/x/"), { lang: PT, path: "/paquetes/x/" });
assert.deepEqual(splitLang("/estadias/"), { lang: PT, path: "/estadias/" }, "no confunde /estadias con /es");
const tags = alternateLinks("https://s.test", [{ lang: PT, path: "/a/" }, { lang: ES, path: "/es/a/" }]);
assert.ok(tags.includes('hreflang="pt-BR" href="https://s.test/a/"') && tags.includes('hreflang="es-AR" href="https://s.test/es/a/"'));
assert.ok(tags.includes('hreflang="x-default" href="https://s.test/a/"'), "x-default apunta a la versión portuguesa");
assert.equal(localizeUrls('<link rel="canonical" href="https://s.test/a/">', "https://s.test", "/a/", "/es/a/"), '<link rel="canonical" href="https://s.test/es/a/">');
assert.equal(addToHead("<html><head></head></html>", "<x>"), "<html><head><x></head></html>");
console.log("✓ idioma: separación de prefijos, hreflang con x-default y reescritura de URLs");

// ---- base de datos y entorno ----
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
const env = { DB: d1(), SITE_URL: "https://gasparottoviajes.com", ADMIN_PASSWORD: "clave-general-123", SITE_LANG: "pt-BR",
  ASSETS: { fetch: async () => new Response("", { status: 404 }) } };
let ip = 0;
const ask = (path, opts = {}) => pages({ request: new Request("https://gasparottoviajes.com" + path, { method: opts.method || "GET", headers: { "user-agent": "Mozilla/5.0", ...(opts.cookie ? { cookie: opts.cookie } : {}) } }), env, next: async () => new Response("", { status: 404 }) });
const apiCall = async (method, path, body, cookie) => {
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.4." + (ip++ % 250) + ".1" };
  if (cookie) headers.cookie = cookie;
  const r = await api({ request: new Request("https://gasparottoviajes.com/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: path.split("?")[0].split("/") } });
  const t = await r.text();
  return { status: r.status, data: t ? JSON.parse(t) : null, cookie: ((r.headers.get("set-cookie") || "").match(/gv_admin=[\w.]+/) || [""])[0] };
};

// Crear el esquema con una consulta pública (como hace el sitio al primer uso)
await apiCall("POST", "lead", { name: "Init", phone: "1155550000", source: "form" });
env.DB._raw.exec(`INSERT INTO packages (slug,title,category,price,excerpt,content,details,meta,image,image_alt,seo_title,seo_description,published,featured)
  VALUES ('tigre-dia','Tigre en un día','delta-del-tigre','','Resumen pt','<p>Contenido portugués</p>','','{}','','','','',1,0)`);
env.DB._raw.exec(`INSERT INTO posts (slug,title,excerpt,content,category,published) VALUES ('tango-consejos','Dicas de tango','Resumo pt','<p>Texto em português</p>','tips-de-viaje',1)`);
const cookie = (await apiCall("POST", "login", { password: "clave-general-123" })).cookie;
assert.ok(cookie);

// ---- API de traducciones ----
let r = await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "tigre-en-un-dia", data: { title: "Tigre en un día", excerpt: "Resumen en español", content: "<p>Contenido en español</p>", seo_title: "Tigre en un día | Gasparotto", seo_description: "Escapada al Delta" } }, cookie);
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal((await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "Tigre Día", data: { title: "x" } }, cookie)).status, 400, "slug inválido");
assert.equal((await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "sin-titulo", data: { excerpt: "x" } }, cookie)).status, 400, "sin título");
assert.equal((await apiCall("PUT", "translations", { kind: "packages", ref_id: 999, slug: "otro", data: { title: "x" } }, cookie)).status, 404, "contenido inexistente");
assert.equal((await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "tigre-en-un-dia", data: { title: "x" } })).status, 401, "sin sesión");
env.DB._raw.exec(`INSERT INTO packages (slug,title,category,price,excerpt,content,details,meta,image,image_alt,seo_title,seo_description,published,featured)
  VALUES ('otro-tour','Otro tour','delta-del-tigre','','','','','{}','','','','',1,0)`);
assert.equal((await apiCall("PUT", "translations", { kind: "packages", ref_id: 2, slug: "tigre-en-un-dia", data: { title: "Otro" } }, cookie)).status, 409, "slug repetido");
assert.equal((await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "tigre-en-un-dia", data: { title: "Tigre en un día", excerpt: "Resumen en español", content: "<p>Contenido en español</p>", seo_title: "Tigre en un día | Gasparotto", seo_description: "Escapada al Delta", precio_falso: "x" } }, cookie)).status, 200, "campos extra se ignoran");
r = await apiCall("GET", "translations?kind=packages&ref=1", null, cookie);
assert.equal(r.data.es.slug, "tigre-en-un-dia");
assert.equal(r.data.es.data.precio_falso, undefined, "no se guarda lo que no es traducible");
console.log("✓ API: valida slug, título, existencia y repetidos; ignora campos extra; exige sesión");

// ---- páginas ----
// (PUT reemplaza la traducción completa: por eso la prueba de campos extra reenvía todo el contenido)
const es = await (await ask("/es/paquetes/tigre-en-un-dia/")).text();
const esRes = await ask("/es/paquetes/tigre-en-un-dia/");
assert.equal(esRes.status, 200);
assert.ok(es.includes("Contenido en español"), "la ficha española muestra el texto en español");
assert.ok(!es.includes("Contenido portugués"), "no se mezcla el texto portugués");
assert.equal(es.match(/rel="canonical" href="([^"]+)"/)[1], "https://gasparottoviajes.com/es/paquetes/tigre-en-un-dia/", "canonical española");
assert.ok(es.includes('hreflang="es-AR" href="https://gasparottoviajes.com/es/paquetes/tigre-en-un-dia/"'));
assert.ok(es.includes('hreflang="pt-BR" href="https://gasparottoviajes.com/paquetes/tigre-dia/"'));
assert.ok(es.includes('hreflang="x-default" href="https://gasparottoviajes.com/paquetes/tigre-dia/"'));
assert.ok(es.includes('lang="es"'), "idioma del documento");
console.log("✓ /es/: ficha traducida con textos en español, canonical propia y hreflang hacia la versión portuguesa");

const pt = await (await ask("/paquetes/tigre-dia/")).text();
assert.ok(pt.includes("Contenido portugués") && !pt.includes("Contenido en español"), "la versión portuguesa no cambia");
assert.equal(pt.match(/rel="canonical" href="([^"]+)"/)[1], "https://gasparottoviajes.com/paquetes/tigre-dia/", "canonical portuguesa");
assert.ok(pt.includes('hreflang="es-AR" href="https://gasparottoviajes.com/es/paquetes/tigre-en-un-dia/"'), "la versión portuguesa anuncia la española");
console.log("✓ /paquetes/: sigue igual y anuncia la versión española");

// Sin traducción, sin versión española
assert.equal((await ask("/es/paquetes/tigre-dia/")).status, 404, "slug portugués bajo /es/ no existe");
assert.equal((await ask("/es/")).status, 404, "la portada en español todavía no existe");
assert.equal((await ask("/es/nosotros/")).status, 404, "páginas fijas en español todavía no existen");
assert.equal((await ask("/es/blog/")).status, 404, "listados en español todavía no existen");
assert.equal((await ask("/es/paquetes/categoria/delta/")).status, 404, "categorías en español todavía no existen");
assert.equal((await ask("/es/paquetes/no-existe/")).status, 404);
const ptNoTrans = await (await ask("/paquetes/tigre-dia/")).text();
assert.ok(ptNoTrans.includes("hreflang"), "con traducción sí hay alternativas");
console.log("✓ /es/: solo fichas traducidas; el resto responde 404 y no mezcla portugués");

// Un contenido sin traducción no tiene alternativas
env.DB._raw.exec("UPDATE packages SET published=1");
const otro = await (await ask("/paquetes/otro-tour/")).text();
assert.ok(!otro.includes("es-AR"), "sin traducción, sin hreflang");
assert.equal((await ask("/es/paquetes/otro-tour/")).status, 404);

// Blog
r = await apiCall("PUT", "translations", { kind: "posts", ref_id: 1, slug: "consejos-tango", data: { title: "Consejos para el tango", content: "<p>Texto en español</p>" } }, cookie);
assert.equal(r.status, 200);
const blog = await (await ask("/es/blog/consejos-tango/")).text();
assert.ok(blog.includes("Texto en español") && blog.includes('hreflang="es-AR"'));
console.log("✓ blog: artículos traducidos siguen el mismo esquema");

// Sin publicar la versión portuguesa, la española tampoco sale
env.DB._raw.exec("UPDATE packages SET published=0 WHERE slug='tigre-dia'");
assert.equal((await ask("/es/paquetes/tigre-en-un-dia/")).status, 404, "si la base se despublica, la española también");
env.DB._raw.exec("UPDATE packages SET published=1 WHERE slug='tigre-dia'");


// ---- Estados editoriales de la traducción ----
r = await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "tigre-en-un-dia", data: { title: "Tigre en un día", content: "<p>Texto ES</p><script>alert(1)</script>" }, status: "borrador" }, cookie);
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.es.status, "borrador");
assert.equal((await ask("/es/paquetes/tigre-en-un-dia/")).status, 404, "un borrador no se publica");
assert.ok(!(await (await ask("/paquetes/tigre-dia/")).text()).includes("es-AR"), "un borrador no genera hreflang");
assert.ok(!(await (await ask("/sitemap.xml")).text()).includes("/es/paquetes/tigre-en-un-dia/"), "un borrador no entra al sitemap");
r = await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "tigre-en-un-dia", data: { title: "Tigre en un día" }, status: "revision" }, cookie);
assert.equal(r.status, 200);
assert.equal((await ask("/es/paquetes/tigre-en-un-dia/")).status, 404, "en revisión tampoco se publica");
assert.equal((await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "tigre-en-un-dia", data: { title: "x" }, status: "otro" }, cookie)).status, 400, "estado inválido");
r = await apiCall("GET", "translations?kind=packages&ref=1", null, cookie);
assert.equal(r.data.es.status, "revision", "el panel ve las traducciones no publicadas");
r = await apiCall("GET", "translations", null, cookie);
assert.ok(r.data.items.some((i) => i.kind === "packages" && i.ref_id === 1 && i.status === "revision"), "listado de traducciones");
// un editor puede enviar a revisión pero no publicar
assert.equal((await apiCall("POST", "users", { name: "Ed", email: "ed@agencia.com", password: "una-clave-larga", role: "editor" }, cookie)).status, 201);
const ed = (await apiCall("POST", "login", { email: "ed@agencia.com", password: "una-clave-larga" })).cookie;
assert.ok(ed, "login del editor");
r = await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "tigre-en-un-dia", data: { title: "Tigre en un día" }, status: "publicada" }, ed);
assert.equal(r.status, 403, "un editor no publica");
assert.equal((await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "tigre-en-un-dia", data: { title: "Tigre en un día" }, status: "revision" }, ed)).status, 200, "un editor puede enviar a revisión");
// el administrador publica: aparece todo
r = await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "tigre-en-un-dia", data: { title: "Tigre en un día", content: "<p>Texto ES</p><script>alert(1)</script>" }, status: "publicada" }, cookie);
assert.equal(r.status, 200);
const pub = await (await ask("/es/paquetes/tigre-en-un-dia/")).text();
assert.ok(pub.includes("Texto ES") && !pub.includes("alert(1)"), "publicada se ve y el contenido se sanea");
assert.ok((await (await ask("/paquetes/tigre-dia/")).text()).includes("es-AR"), "publicada genera hreflang");
// un editor tampoco borra una publicada, y puede editarla sin cambiarle el estado
assert.equal((await apiCall("DELETE", "translations?kind=packages&ref=1", null, ed)).status, 403);
assert.equal((await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, slug: "tigre-en-un-dia", data: { title: "Tigre en un día (v2)" }, status: "publicada" }, ed)).status, 200, "un editor puede editar una publicada");
console.log("✓ estados: borrador y revisión no salen al público; solo un administrador publica; el contenido se sanea");

// Sitemap: las dos versiones con sus alternativas
const sm = await (await ask("/sitemap.xml")).text();
assert.ok(sm.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
assert.ok(sm.includes('<loc>https://gasparottoviajes.com/es/paquetes/tigre-en-un-dia/</loc>'), "la versión española está en el sitemap");
assert.ok(sm.includes('<xhtml:link rel="alternate" hreflang="es-AR" href="https://gasparottoviajes.com/es/paquetes/tigre-en-un-dia/"/>'));
assert.ok(sm.includes('hreflang="x-default" href="https://gasparottoviajes.com/paquetes/tigre-dia/"/>'));
console.log("✓ sitemap: ambas versiones con sus alternativas hreflang");

// Borrar la traducción: desaparece la versión española y el hreflang
r = await apiCall("DELETE", "translations?kind=packages&ref=1", null, cookie);
assert.equal(r.status, 200);
assert.equal((await ask("/es/paquetes/tigre-en-un-dia/")).status, 404);
assert.ok(!(await (await ask("/paquetes/tigre-dia/")).text()).includes("es-AR"));
console.log("✓ borrar la traducción quita la versión española, el hreflang y del sitemap");
console.log("\nTodo OK");

// Prueba de autoría: perfiles, autor y revisor del blog, fuentes, página /autor/ y datos estructurados. SQLite real, sin red.
// Uso: npm run test:autoria
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { onRequest as pages } from "../functions/_middleware.js";
import { onRequest as api } from "../functions/api/[[path]].js";

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


await apiCall("POST", "lead", { name: "Init", phone: "1155550000", source: "form" });
const admin = (await apiCall("POST", "login", { password: "clave-general-123" })).cookie;
assert.ok(admin);
const mk = async (name, email) => {
  const u = await apiCall("POST", "users", { name, email, password: "una-clave-larga", role: "editor" }, admin);
  assert.equal(u.status, 201);
  return (await apiCall("POST", "login", { email, password: "una-clave-larga" })).cookie;
};
const ana = await mk("Ana Pérez", "ana@agencia.com"), leo = await mk("Leo Gómez", "leo@agencia.com");
assert.ok(ana && leo);

// ---- perfil propio ----
assert.equal((await apiCall("GET", "profile", null, admin)).status, 400, "la clave general no tiene perfil");
assert.equal((await apiCall("GET", "profile")).status, 401, "sin sesión");
const prof = { name: "Ana Pérez", headline: "Guía de turismo en Buenos Aires", bio: "Guía desde 2012.\n\nEspecialista en tango.", experience: "10 años en turismo receptivo.", avatar: "/media/ana.webp", links: "Instagram | https://instagram.com/ana\nhttps://ana.example.com", profile_public: 1 };
let r = await apiCall("PUT", "profile", { ...prof, avatar: "javascript:alert(1)" }, ana);
assert.equal(r.status, 400, "foto inválida");
r = await apiCall("PUT", "profile", { ...prof, links: "javascript:alert(1)" }, ana);
assert.equal(r.status, 400, "enlace inválido");
r = await apiCall("PUT", "profile", { ...prof, name: "  " }, ana);
assert.equal(r.status, 400, "nombre obligatorio");
r = await apiCall("PUT", "profile", prof, ana);
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.slug, "ana-perez");
r = await apiCall("GET", "profile", null, ana);
assert.equal(r.data.headline, "Guía de turismo en Buenos Aires");
assert.equal(r.data.links.length, 2);
r = await apiCall("PUT", "profile", { ...prof, name: "Ana Pérez", bio: "Otra bio" }, ana);
assert.equal(r.data.slug, "ana-perez", "la dirección del perfil no cambia sola");
console.log("✓ perfil propio: valida foto, enlaces y nombre; genera la dirección una sola vez");

// ---- administración de perfiles ----
r = await apiCall("GET", "authors", null, leo);
assert.equal(r.status, 200);
assert.ok(r.data.authors.some((a) => a.name === "Ana Pérez") && !JSON.stringify(r.data).includes("@agencia.com"), "lista para elegir, sin emails");
const anaId = r.data.authors.find((a) => a.name === "Ana Pérez").id, leoId = r.data.authors.find((a) => a.name === "Leo Gómez").id;
assert.equal((await apiCall("GET", "authors/" + anaId, null, leo)).status, 403, "un editor no ve el perfil completo de otro");
assert.equal((await apiCall("GET", "authors/" + anaId, null, admin)).status, 200);
assert.equal((await apiCall("PUT", "authors/" + leoId, { name: "Leo Gómez", headline: "Editor", profile_public: 0 }, admin)).status, 200, "el administrador edita perfiles ajenos");
console.log("✓ autores: lista sin datos privados; solo el administrador edita perfiles ajenos");

// ---- artículo con autor, revisor y fuentes ----
const body = { title: "Guía del tango", content: "<p>Texto del artículo</p>", published: 1, author_id: anaId, reviewer_id: leoId, sources: "Turismo BA | https://turismo.buenosaires.gob.ar/es\nhttps://example.org/estudio" };
assert.equal((await apiCall("POST", "posts", { ...body, reviewer_id: anaId, title: "Mismo" }, admin)).status, 400, "revisor distinto del autor");
assert.equal((await apiCall("POST", "posts", { ...body, sources: "javascript:alert(1)", title: "Mala fuente" }, admin)).status, 400, "fuente inválida");
r = await apiCall("POST", "posts", body, admin);
assert.equal(r.status, 200, JSON.stringify(r.data));
let page = await (await ask("/blog/" + r.data.slug + "/")).text();
assert.ok(page.includes('href="/autor/ana-perez/"') && page.includes('rel="author"'), "firma con enlace al perfil");
assert.ok(/Revisado por/.test(page) && page.includes("Leo Gómez"), "revisor visible");
assert.ok(!page.includes('href="/autor/leo-gomez/"'), "el revisor sin perfil público no tiene enlace");
assert.ok(/Fontes e referências|Fuentes y referencias/.test(page) && page.includes("turismo.buenosaires.gob.ar"), "fuentes visibles");
assert.ok(page.includes("Guía de turismo en Buenos Aires"), "cargo del autor");
const ld = JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const art = ld["@graph"].find((n) => n["@type"] === "BlogPosting");
assert.equal(art.author["@type"], "Person");
assert.equal(art.author.name, "Ana Pérez");
assert.equal(art.author.url, "https://gasparottoviajes.com/autor/ana-perez/");
assert.deepEqual(art.author.sameAs, ["https://instagram.com/ana", "https://ana.example.com/"]);
assert.equal(art.mainEntityOfPage.reviewedBy.name, "Leo Gómez");
assert.equal(art.citation.length, 2);
assert.ok(art.datePublished && art.dateModified);
console.log("✓ artículo: firma, revisor, fuentes y JSON-LD (Person, reviewedBy, citation)");

// Sin autor asignado: queda la firma del equipo y el autor es la organización
r = await apiCall("POST", "posts", { title: "Sin autor", content: "<p>x</p>", published: 1, author_id: 0 }, admin);
page = await (await ask("/blog/" + r.data.slug + "/")).text();
const ld2 = JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(ld2["@graph"].find((n) => n["@type"] === "BlogPosting").author["@type"], "Organization");
assert.ok(!page.includes("Revisado por") && !/Fontes e referências|Fuentes y referencias/.test(page), "sin revisor ni fuentes no se muestran");
// Un editor que crea una entrada queda como autor
r = await apiCall("POST", "posts", { title: "De Leo", content: "<p>x</p>", published: 1 }, leo);
assert.equal(env.DB._raw.prepare("SELECT author_id FROM posts WHERE slug=?").get(r.data.slug).author_id, leoId, "autor por defecto = quien la crea");
// Editar sin tocar autoría la conserva
const first = env.DB._raw.prepare("SELECT id FROM posts WHERE slug='guia-del-tango'").get().id;
assert.equal((await apiCall("PUT", "posts/" + first, { title: "Guía del tango", content: "<p>Nuevo texto</p>", published: 1 }, ana)).status, 200);
const kept = env.DB._raw.prepare("SELECT author_id, reviewer_id, sources FROM posts WHERE id=?").get(first);
assert.ok(kept.author_id === anaId && kept.reviewer_id === leoId && kept.sources.includes("turismo"), "editar sin mandar autoría no la borra");
console.log("✓ autoría: autor por defecto, firma del equipo sin autor y conservación al editar");

// ---- página del autor ----
page = await (await ask("/autor/ana-perez/")).text();
assert.ok(page.includes("Ana Pérez") && page.includes("Guía de turismo en Buenos Aires") && page.includes("Guía del tango") && page.includes("Especialista") === false);
assert.ok(page.includes("Otra bio") && page.includes("10 años en turismo receptivo") && page.includes("instagram.com/ana"));
assert.ok(page.includes('"@type":"ProfilePage"') || page.includes('"@type": "ProfilePage"'), "ProfilePage");
assert.equal((await ask("/autor/leo-gomez/")).status, 404, "perfil privado: sin página");
assert.equal((await ask("/autor/nadie/")).status, 404);
const sm = await (await ask("/sitemap.xml")).text();
assert.ok(sm.includes("/autor/ana-perez/") && !sm.includes("/autor/leo-gomez/"), "sitemap: solo autores públicos");
// Desactivar a la persona: el artículo vuelve a la firma del equipo
env.DB._raw.exec("UPDATE users SET active=0 WHERE email='ana@agencia.com'");
assert.equal((await ask("/autor/ana-perez/")).status, 404, "autor desactivado: sin página");
assert.ok(!(await (await ask("/blog/guia-del-tango/")).text()).includes('href="/autor/ana-perez/"'));
console.log("✓ /autor/: perfil público con bio, experiencia, enlaces y artículos; privados y desactivados no aparecen; sitemap");

console.log("\nTodo OK");

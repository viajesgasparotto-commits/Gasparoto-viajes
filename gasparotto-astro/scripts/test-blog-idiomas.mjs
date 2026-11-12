// Prueba del blog en español e inglés: script de traducción (con un traductor falso, sin red), carga por SQL y por la API,
// páginas /es/ y /en/, hreflang entre las tres versiones, sitemap y API del panel con `lang`. SQLite real.
// Uso: npm run test:blog-idiomas
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onRequest as pages } from "../functions/_middleware.js";
import { onRequest as api } from "../functions/api/[[path]].js";
import { splitLang, langPathOf, alternateLinks, PT, ES, EN } from "../functions/lib/i18n.js";
import { parseReply, slugify, uniqueSlug, checkStructure, toSql, systemPrompt, parseArgs, planJobs, run, makeApiClient, callClaude } from "./translate-blog.mjs";

// ---- funciones puras ----
assert.deepEqual(splitLang("/en/blog/x/"), { lang: EN, path: "/blog/x/" });
assert.deepEqual(splitLang("/en"), { lang: EN, path: "/" });
assert.deepEqual(splitLang("/es/blog/x/"), { lang: ES, path: "/blog/x/" });
assert.deepEqual(splitLang("/entradas/"), { lang: PT, path: "/entradas/" }, "no confunde /entradas con /en");
assert.deepEqual(splitLang("/blog/x/"), { lang: PT, path: "/blog/x/" });
assert.equal(langPathOf(EN, "/blog/x/"), "/en/blog/x/");
assert.equal(langPathOf(PT, "/blog/x/"), "/blog/x/");
const tags = alternateLinks("https://s.test", [{ lang: PT, path: "/a/" }, { lang: ES, path: "/es/a/" }, { lang: EN, path: "/en/a/" }]);
assert.ok(tags.includes('hreflang="en-US" href="https://s.test/en/a/"') && tags.includes('hreflang="x-default" href="https://s.test/a/"'));
console.log("✓ idioma: prefijos /es/ y /en/, hreflang en-US y x-default");

assert.equal(slugify("¿Qué ver en Buenos Aires? Guía 2026"), "que-ver-en-buenos-aires-guia-2026");
const taken = new Set(["tango"]);
assert.equal(uniqueSlug("Tango", taken), "tango-2");
assert.equal(uniqueSlug("Tango", taken), "tango-3");
assert.equal(parseReply("<title>T</title><excerpt>E</excerpt><content><p>x</p></content>").content, "<p>x</p>");
assert.equal(parseReply("sin formato"), null);
const SRC = '<h2>A</h2><p>Texto <a href="https://x.test/a">enlace</a></p><div class="gvb-dato">Dato</div><h2>B</h2><ul><li>1</li><li>2</li></ul>';
assert.deepEqual(checkStructure(SRC, SRC.replace("Texto", "Text")), [], "misma estructura");
assert.ok(checkStructure(SRC, SRC.replace("<h2>B</h2>", "")).length, "falta un <h2>");
assert.ok(checkStructure(SRC, SRC.replace("https://x.test/a", "https://otro.test")).length, "enlace cambiado");
assert.ok(toSql({ ref_id: 1, lang: "en", slug: "x", data: { title: "It's" }, status: "revision" }).includes("It''s"), "comillas simples escapadas");
assert.ok(systemPrompt("en").includes("American English") && systemPrompt("es").includes("voseo"));
assert.throws(() => parseArgs(["--langs", "fr"]), /no soportado/);
assert.throws(() => parseArgs(["--status", "x"]), /--status/);
const args = parseArgs(["--dry-run", "--force", "--only", "a,b"]);
assert.ok(args.dryRun && args.force && args.only.length === 2);
console.log("✓ script: formato de respuesta, slugs únicos, control de estructura HTML, SQL y argumentos");

// reintentos de la API de Claude
let tries = 0;
const flaky = async () => (++tries < 2 ? new Response("{}", { status: 529 }) : new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }), { status: 200 }));
const realSetTimeout = globalThis.setTimeout; globalThis.setTimeout = (f) => realSetTimeout(f, 0);
assert.equal(await callClaude({ apiKey: "k", model: "m", system: "s", user: "u", fetchFn: flaky }), "ok");
await assert.rejects(callClaude({ apiKey: "k", model: "m", system: "s", user: "u", fetchFn: async () => new Response(JSON.stringify({ content: [{ type: "text", text: "x" }], stop_reason: "max_tokens" }), { status: 200 }) }), /se cortó/);
globalThis.setTimeout = realSetTimeout;
console.log("✓ API de Claude: reintenta en 5xx/429 y rechaza respuestas cortadas");

// ---- base y entorno ----
function d1() {
  const db = new DatabaseSync(":memory:");
  const mk = (sql, a = []) => ({
    bind: (...x) => mk(sql, x),
    run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    first: async () => db.prepare(sql).get(...a) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...a) }),
  });
  return { prepare: (s) => mk(s), batch: async (l) => { for (const x of l) await x.run(); return []; }, _raw: db };
}
const SITE = "https://gasparottoviajes.com";
const env = { DB: d1(), SITE_URL: SITE, ADMIN_PASSWORD: "clave-general-123", SITE_LANG: "pt-BR", ASSETS: { fetch: async () => new Response("", { status: 404 }) } };
let ip = 0;
const ask = (path) => pages({ request: new Request(SITE + path, { headers: { "user-agent": "Mozilla/5.0" } }), env, next: async () => new Response("", { status: 404 }) });
const apiCall = async (method, path, body, cookie) => {
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.9." + (ip++ % 250) + ".1" };
  if (cookie) headers.cookie = cookie;
  const r = await api({ request: new Request(SITE + "/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: path.split("?")[0].split("/") } });
  const t = await r.text();
  return { status: r.status, data: t ? JSON.parse(t) : null, cookie: ((r.headers.get("set-cookie") || "").match(/gv_admin=[\w.]+/) || [""])[0] };
};
await apiCall("POST", "lead", { name: "Init", phone: "1155550000", source: "form" }); // crea el esquema
env.DB._raw.exec("INSERT OR IGNORE INTO categories(kind,slug,label,description,listing,sort_order) VALUES('posts','tips-de-viaje','Dicas de viagem','','',0),('posts','noche-portena','Noite portenha','','',1)");
const POST1 = '<h2>Roteiro</h2><p>Veja o <a href="/paquetes/tigre-dia/">passeio</a> e a <strong>milonga</strong>.</p><div class="gvb-dato">R$ 100</div><h2>Dicas</h2><ul><li>Uma</li><li>Duas</li></ul><h2>Final</h2><p>Fim.</p>';
env.DB._raw.exec(`INSERT INTO posts (slug,title,excerpt,content,category,published,seo_title,seo_description,image_alt) VALUES ('roteiro-buenos-aires','Roteiro em Buenos Aires','Resumo pt','${POST1}','tips-de-viaje',1,'Roteiro | Gasparotto','Descrição pt','Foto pt')`);
env.DB._raw.exec(`INSERT INTO posts (slug,title,excerpt,content,category,published) VALUES ('dicas-tango','Dicas de tango','Resumo 2','<h2>Um</h2><p>Texto do tango.</p>','noche-portena',1)`);
env.DB._raw.exec(`INSERT INTO posts (slug,title,excerpt,content,category,published) VALUES ('borrador-pt','Rascunho','','<p>Sem publicar</p>','tips-de-viaje',0)`);
env.DB._raw.exec(`INSERT INTO posts (slug,title,excerpt,content,category,published) VALUES ('sem-texto','Sem texto','','','tips-de-viaje',1)`);
const cookie = (await apiCall("POST", "login", { password: "clave-general-123" })).cookie;
assert.ok(cookie);
const readSrc = () => ({
  posts: env.DB._raw.prepare("SELECT id, slug, title, excerpt, content, image_alt, seo_title, seo_description, published FROM posts WHERE published=1 ORDER BY id").all(),
  translations: env.DB._raw.prepare("SELECT ref_id, lang, slug, status FROM translations WHERE kind='posts'").all(),
});

// Traductor falso: devuelve bloques en el idioma pedido. "dicas-tango" en inglés pierde un <h2> (para probar el control de estructura).
const fake = async (system, user) => {
  const en = system.includes("American English");
  const get = (k) => (user.match(new RegExp(`<${k}>([\\s\\S]*?)</${k}>`)) || [])[1] || "";
  const title = get("title");
  if (title === "Sem texto") throw new Error("no debería traducirse");
  let content = get("content");
  content = en
    ? content.replace("Roteiro", "Itinerary").replace("Veja o", "See the").replace("passeio", "tour").replace("Dicas", "Tips").replace("Uma", "One").replace("Duas", "Two").replace("Final", "Wrap-up").replace("Fim.", "The end.").replace("Texto do tango.", "Tango text.").replace("Um", "One")
    : content.replace("Roteiro", "Itinerario").replace("Veja o", "Mirá el").replace("passeio", "paseo").replace("Dicas", "Consejos").replace("Uma", "Una").replace("Duas", "Dos").replace("Final", "Cierre").replace("Fim.", "Fin.").replace("Texto do tango.", "Texto del tango.").replace("Um", "Uno");
  if (en && title === "Dicas de tango") content = content.replace(/<h2>.*?<\/h2>/, "");
  const T = { "Roteiro em Buenos Aires": ["Itinerary in Buenos Aires", "Itinerario en Buenos Aires"], "Dicas de tango": ["Tango tips", "Consejos de tango"] }[title] || [title, title];
  return `<title>${en ? T[0] : T[1]}</title><excerpt>${en ? "English summary" : "Resumen en español"}</excerpt><seo_title>${en ? "Itinerary | Gasparotto" : "Itinerario | Gasparotto"}</seo_title><seo_description>${en ? "English description" : "Descripción en español"}</seo_description><image_alt>${en ? "English photo" : "Foto en español"}</image_alt><content>${content}</content>`;
};

// ---- planificación y --dry-run ----
let src = readSrc();
const a0 = parseArgs([]);
assert.equal(planJobs(src, a0).length, 4, "2 artículos con texto × 2 idiomas (sin el despublicado ni el vacío)");
assert.equal(planJobs(src, parseArgs(["--only", "dicas-tango", "--langs", "en"])).length, 1);
const dry = await run({ ...a0, dryRun: true }, { src, log: () => {} });
assert.equal(dry.done.length, 0);
console.log("✓ plan: solo artículos publicados y con texto; --only y --dry-run");

// ---- modo SQL ----
const dir = mkdtempSync(join(tmpdir(), "tb-"));
const logs = [];
const out = join(dir, "t.sql");
let res = await run({ ...a0, out }, { src, translate: fake, log: (x) => logs.push(x) });
assert.equal(res.done.length, 4);
assert.equal(res.failed.length, 0);
const tEn2 = res.done.find((t) => t.lang === "en" && t.slug === "tango-tips");
assert.ok(tEn2 && tEn2.status === "borrador" && tEn2.issues.length, "estructura rota → borrador con aviso");
const tEn1 = res.done.find((t) => t.lang === "en" && t.ref_id === 1);
assert.equal(tEn1.slug, "itinerary-in-buenos-aires");
assert.equal(tEn1.status, "revision", "por defecto queda en revisión, nunca publicada");
assert.ok(logs.some((l) => l.includes("⚠")), "el aviso de estructura se imprime");
env.DB._raw.exec(readFileSync(out, "utf8"));
const saved = env.DB._raw.prepare("SELECT lang, status, updated_by FROM translations WHERE kind='posts' ORDER BY ref_id, lang").all();
assert.equal(saved.length, 4);
assert.ok(saved.every((x) => x.updated_by === "translate-blog"));
// Re-ejecutar no repite ni pisa lo ya traducido
assert.equal(planJobs(readSrc(), a0).length, 0, "ya traducido: no hay nada pendiente");
assert.equal(planJobs(readSrc(), parseArgs(["--force"])).length, 4, "--force vuelve a traducir");
console.log("✓ script (SQL): traduce a es y en, deja todo en revisión, marca como borrador lo que cambió de estructura y no repite lo ya hecho");

// ---- nada sale al público hasta publicar ----
assert.equal((await ask("/en/blog/itinerary-in-buenos-aires/")).status, 404, "en revisión no se ve");
assert.equal((await ask("/es/blog/itinerario-en-buenos-aires/")).status, 404);
assert.ok(!(await (await ask("/blog/roteiro-buenos-aires/")).text()).includes("hreflang"), "sin publicar no hay hreflang");

// El administrador publica las dos del primer artículo desde la API del panel
for (const lang of ["es", "en"]) {
  const g = await apiCall("GET", `translations?kind=posts&ref=1&lang=${lang}`, null, cookie);
  assert.equal(g.status, 200);
  assert.equal(g.data.lang, lang);
  assert.equal(g.data.tr.status, "revision");
  const p = await apiCall("PUT", "translations", { kind: "posts", ref_id: 1, lang, slug: g.data.tr.slug, data: g.data.tr.data, status: "publicada" }, cookie);
  assert.equal(p.status, 200, JSON.stringify(p.data));
}

// ---- páginas ----
const en = await ask("/en/blog/itinerary-in-buenos-aires/");
assert.equal(en.status, 200);
const enH = await en.text();
assert.ok(enH.includes('<html lang="en">'), "idioma del documento");
assert.ok(enH.includes("See the") && enH.includes("Tips") && !enH.includes("Veja o"), "texto en inglés, sin portugués");
assert.ok(enH.includes("English summary"), "bajada en inglés");
assert.ok(enH.includes('rel="canonical" href="https://gasparottoviajes.com/en/blog/itinerary-in-buenos-aires/"'), "canonical inglesa");
assert.ok(enH.includes('hreflang="en-US" href="https://gasparottoviajes.com/en/blog/itinerary-in-buenos-aires/"'));
assert.ok(enH.includes('hreflang="es-AR" href="https://gasparottoviajes.com/es/blog/itinerario-en-buenos-aires/"'));
assert.ok(enH.includes('hreflang="pt-BR" href="https://gasparottoviajes.com/blog/roteiro-buenos-aires/"'));
assert.ok(enH.includes('hreflang="x-default" href="https://gasparottoviajes.com/blog/roteiro-buenos-aires/"'));
assert.ok(enH.includes('property="og:locale" content="en_US"'));
assert.ok(enH.includes("Travel tips"), "categoría en inglés");
assert.ok(enH.includes("min read") && enH.includes("In this article"), "textos de la plantilla en inglés");
assert.ok(enH.includes('"inLanguage":"en"'), "JSON-LD en inglés");
assert.ok(enH.includes('class="gvb-dato"'), "se conservan las clases del panel");
assert.ok(!enH.includes("Keep reading") && !enH.includes("Live what you just read"), "sin notas ni paquetes en portugués dentro de la página en inglés");
assert.ok(enH.includes("Packages") && enH.includes("Autonomous City"), "cabecera y pie en inglés");
const esH = await (await ask("/es/blog/itinerario-en-buenos-aires/")).text();
assert.ok(esH.includes("Mirá el") && esH.includes('lang="es"') && esH.includes('hreflang="en-US"'), "la versión española también anuncia la inglesa");
assert.ok(esH.includes("Consejos de viaje"), "categoría en español");
const ptH = await (await ask("/blog/roteiro-buenos-aires/")).text();
assert.ok(ptH.includes("Veja o") && ptH.includes('hreflang="en-US" href="https://gasparottoviajes.com/en/blog/itinerary-in-buenos-aires/"') && ptH.includes('hreflang="es-AR"'), "la portuguesa anuncia las dos");
assert.ok(ptH.includes("Dicas de viagem") || !ptH.includes("Travel tips"), "la portuguesa conserva su categoría");
assert.equal((await ask("/en/blog/roteiro-buenos-aires/")).status, 404, "slug portugués bajo /en/ no existe");
assert.equal((await ask("/en/blog/")).status, 404, "listado en inglés todavía no existe");
assert.equal((await ask("/en/")).status, 404);
assert.equal((await ask("/en/paquetes/tigre-dia/")).status, 404, "el inglés es solo del blog");
const nf = await (await ask("/en/blog/nada/")).text();
assert.ok(nf.includes("not available in English"));
// el segundo artículo sigue sin publicar (en revisión / borrador)
assert.equal((await ask("/en/blog/tango-tips/")).status, 404);
console.log("✓ /en/ y /es/: artículo traducido con canonical propia, hreflang a las tres versiones, categoría y plantilla en su idioma");

// ---- sitemap ----
const sm = await (await ask("/sitemap.xml")).text();
for (const loc of ["/blog/roteiro-buenos-aires/", "/es/blog/itinerario-en-buenos-aires/", "/en/blog/itinerary-in-buenos-aires/"]) assert.ok(sm.includes(`<loc>${SITE}${loc}</loc>`), "sitemap: " + loc);
assert.ok(sm.includes('hreflang="en-US" href="https://gasparottoviajes.com/en/blog/itinerary-in-buenos-aires/"/>'));
assert.ok(!sm.includes("/en/blog/tango-tips/"), "lo que no está publicado no entra");
console.log("✓ sitemap: las tres versiones con sus alternativas");

// ---- despublicar la base quita las traducciones ----
env.DB._raw.exec("UPDATE posts SET published=0 WHERE id=1");
assert.equal((await ask("/en/blog/itinerary-in-buenos-aires/")).status, 404);
env.DB._raw.exec("UPDATE posts SET published=1 WHERE id=1");

// ---- API del panel con lang ----
assert.equal((await apiCall("PUT", "translations", { kind: "packages", ref_id: 1, lang: "en", slug: "x", data: { title: "x" } }, cookie)).status, 400, "inglés no está disponible para paquetes");
assert.equal((await apiCall("PUT", "translations", { kind: "posts", ref_id: 1, lang: "fr", slug: "x", data: { title: "x" } }, cookie)).status, 400, "idioma inválido");
assert.equal((await apiCall("GET", "translations?kind=posts&ref=1&lang=fr", null, cookie)).status, 400);
const sum = await apiCall("GET", "translations", null, cookie);
assert.ok(sum.data.items.some((i) => i.lang === "en" && i.ref_id === 1) && sum.data.items.some((i) => i.lang === "es" && i.ref_id === 1), "el resumen trae todos los idiomas");
// el mismo slug puede repetirse entre idiomas pero no dentro de uno
assert.equal((await apiCall("PUT", "translations", { kind: "posts", ref_id: 2, lang: "en", slug: "itinerary-in-buenos-aires", data: { title: "x" } }, cookie)).status, 409);
assert.equal((await apiCall("PUT", "translations", { kind: "posts", ref_id: 2, lang: "es", slug: "itinerary-in-buenos-aires", data: { title: "x" }, status: "borrador" }, cookie)).status, 200, "otro idioma, mismo slug: permitido");
// sin lang sigue siendo español (compatibilidad)
const old = await apiCall("PUT", "translations", { kind: "posts", ref_id: 2, slug: "viejo-es", data: { title: "Viejo" }, status: "borrador" }, cookie);
assert.equal(old.status, 200); assert.equal(old.data.lang, "es");
assert.equal((await apiCall("GET", "translations?kind=posts&ref=2", null, cookie)).data.es.slug, "viejo-es");
// borrar solo el idioma pedido
assert.equal((await apiCall("DELETE", "translations?kind=posts&ref=1&lang=en", null, cookie)).status, 200);
assert.equal((await ask("/en/blog/itinerary-in-buenos-aires/")).status, 404);
assert.equal((await ask("/es/blog/itinerario-en-buenos-aires/")).status, 200, "el español sigue");
assert.ok(!(await (await ask("/blog/roteiro-buenos-aires/")).text()).includes("en-US"), "la portuguesa deja de anunciar la inglesa");
assert.equal((await apiCall("DELETE", "translations?kind=posts&ref=1&lang=en", null, cookie)).status, 404);
const hist = env.DB._raw.prepare("SELECT detail FROM activity WHERE entity='traducción'").all().map((x) => x.detail);
assert.ok(hist.some((d) => d.startsWith("en · ")), "el historial indica el idioma inglés");
assert.ok(hist.some((d) => !d.startsWith("en · ")), "y el español queda como siempre");
console.log("✓ API del panel: lang es|en (inglés solo blog), compatibilidad sin lang, slug único por idioma, borrado por idioma, historial");

// ---- modo API del script ----
env.DB._raw.exec("DELETE FROM translations");
const viaApi = async (url, init = {}) => {
  const u = new URL(url), path = u.pathname.replace(/^\/api\//, "") + u.search;
  const h = new Headers(init.headers); h.set("cf-connecting-ip", "10.77." + (ip++ % 250) + ".1");
  const r = await api({ request: new Request(url, { ...init, headers: h }), env, params: { path: path.split("?")[0].split("/") } });
  return r;
};
const put = await makeApiClient(SITE, "clave-general-123", viaApi);
res = await run({ ...parseArgs([]), status: "revision" }, { src: readSrc(), translate: fake, put, log: () => {} });
assert.equal(res.done.length, 4);
const viaApiRows = env.DB._raw.prepare("SELECT lang, status FROM translations WHERE kind='posts'").all();
assert.equal(viaApiRows.length, 4);
assert.ok(viaApiRows.every((x) => x.status === "revision" || x.status === "borrador"));
await assert.rejects(makeApiClient(SITE, "clave-mala", viaApi), /iniciar sesión/);
// errores de la traducción no frenan al resto
res = await run({ ...parseArgs(["--force", "--only", "roteiro-buenos-aires"]) }, { src: readSrc(), translate: async () => "basura", put, log: () => {} });
assert.equal(res.failed.length, 2); assert.equal(res.done.length, 0);
console.log("✓ script (API): carga por el panel con el historial, rechaza claves malas y un error no frena a los demás");
console.log("\nTodo OK");

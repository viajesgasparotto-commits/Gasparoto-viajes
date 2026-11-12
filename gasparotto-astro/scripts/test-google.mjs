// Prueba de la integración con Google Places: texto, fotos, errores visibles y "Probar conexión". Sin red (fetch simulado).
// Uso: npm run test:google
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { googleBlock, googlePhoto, placesData, placesStatus } from "../functions/lib/google.js";
import { onRequest } from "../functions/api/[[path]].js";

function d1() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)");
  const mk = (sql, args = []) => ({
    bind: (...a) => mk(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: (s) => mk(s), batch: async (l) => { for (const x of l) await x.run(); return []; }, _raw: db };
}
const PID = "ChIJX4G6FADLvJUR1cJ5MTNtey8";
const okBody = {
  rating: 4.8, userRatingCount: 132,
  reviews: [{ rating: 5, text: { text: "Excelente experiencia con el tango." }, authorAttribution: { displayName: "María G.", photoUri: "https://lh3.googleusercontent.com/a/x" }, publishTime: "2026-05-10T12:00:00Z", googleMapsUri: "https://www.google.com/maps/contrib/1/reviews" }],
  photos: Array.from({ length: 12 }, (_, i) => ({ name: `places/${PID}/photos/F${i}`, widthPx: 1600, heightPx: 1200, authorAttributions: [{ displayName: "Juan", uri: "https://maps.google.com/maps/contrib/9" }] })),
};
const refererErr = { error: { code: 403, message: "Requests from referer <empty> are blocked.", status: "PERMISSION_DENIED" } };
let mode = "ok", calls = [];
globalThis.fetch = async (url) => {
  url = String(url); calls.push(url);
  if (url.includes("/media") && url.includes("skipHttpRedirect=true")) return new Response(JSON.stringify({ photoUri: "https://lh3.googleusercontent.com/places/" + url.match(/photos\/(F\d+)/)[1] }), { status: 200 });
  if (url.includes("/media")) return new Response("img-api", { headers: { "content-type": "image/jpeg" } });
  if (url.startsWith("https://lh3.googleusercontent.com/places/")) return mode === "deadphoto" ? new Response("", { status: 403 }) : new Response("img-cdn", { headers: { "content-type": "image/jpeg" } });
  if (mode === "ok") return new Response(JSON.stringify(okBody), { status: 200 });
  return new Response(JSON.stringify(refererErr), { status: 403 });
};
const env = { DB: d1(), GOOGLE_PLACES_API_KEY: "KEY", GOOGLE_PLACE_ID: PID, SITE_LANG: "pt-BR", ADMIN_PASSWORD: "clave-general-123" };

// 1) Éxito: texto, foto del autor y foto del lugar
mode = "ok";
let html = await googleBlock(env, "reviews");
assert.ok(html.includes("Excelente experiencia con el tango."), "muestra el texto de la reseña");
assert.ok(html.includes('src="https://lh3.googleusercontent.com/a/x"'), "muestra la foto del autor");
assert.ok(html.includes('src="/google-foto/0"') && html.includes('src="/google-foto/9"') && !html.includes("/google-foto/10"), "muestra hasta 10 fotos del lugar");
assert.ok(html.includes('href="https://maps.google.com/maps/contrib/9"'), "el crédito de la foto enlaza al autor");
assert.ok(html.includes("4,8") && html.includes("132"), "calificación y cantidad salen de la API");
let st = await placesStatus(env);
assert.equal(st.connected, true); assert.equal(st.reviews, 1); assert.equal(st.photos, 10); assert.equal(st.rating, 4.8); assert.equal(st.count, 132);
console.log("✓ éxito: texto, calificación, foto del autor y 10 fotos del lugar con crédito; el estado queda 'conectada'");

// 1b) Fotos: el proxy usa la dirección pública guardada (sin consulta paga a Google por visita) y, si falla, pide con la clave
calls = [];
let ph = await googlePhoto(env, 3);
assert.equal(await ph.text(), "img-cdn");
assert.ok(!calls.some((u) => u.includes("places.googleapis.com")), "no consulta la API de Places en cada visita");
mode = "deadphoto"; calls = [];
ph = await googlePhoto(env, 3);
assert.equal(await ph.text(), "img-api", "si la dirección guardada venció, pide la foto con la clave");
mode = "ok";
assert.equal((await googlePhoto(env, 42)).status, 404);
console.log("✓ fotos: se sirven sin costo por visita y con respaldo si la dirección vence");

// 2) Error con clave restringida por referrer: no se rompe la página, y el estado explica el motivo
mode = "fail";
env.DB._raw.exec("UPDATE settings SET value = json_set(value, '$.tried', 0) WHERE key='google_places'");
const data = await placesData(env, true);
assert.ok(data && data.reviews, "con datos viejos guardados, se siguen mostrando");
st = await placesStatus(env);
assert.equal(st.connected, false, "el último intento falló");
assert.ok(st.error.includes("referer"), st.error);
assert.ok(st.hint.includes("restricción de sitio web"), st.hint);
html = await googleBlock(env, "reviews");
assert.ok(html.includes("Excelente experiencia con el tango."), "el bloque sigue mostrando los últimos datos buenos");
console.log("✓ error: el panel recibe el motivo y la pista; la web sigue mostrando los últimos datos buenos");

// 3) Sin datos buenos y con error: no hay bloque de reseñas (y no se rompe)
const env2 = { ...env, DB: d1() };
mode = "fail";
html = await googleBlock(env2, "reviews");
assert.equal(typeof html, "string");
st = await placesStatus(env2);
assert.equal(st.connected, false); assert.ok(st.error);
console.log("✓ sin datos previos y con error: no se rompe y el estado lo informa");

// 4) "Probar conexión" desde el panel: PUT {refresh:true} fuerza una consulta y devuelve el estado
const mkReq = (method, path, body, cookie) => onRequest({
  request: new Request("https://x.test/api/" + path, { method, headers: { "content-type": "application/json", "cf-connecting-ip": "10.3.0.1", ...(cookie ? { cookie } : {}) }, body: body && JSON.stringify(body) }),
  env: env2, params: { path: path.split("/") },
});
const login = await mkReq("POST", "login", { password: "clave-general-123" });
const cookie = (login.headers.get("set-cookie") || "").match(/gv_admin=[\w.]+/)[0];
mode = "ok";
const r = await mkReq("PUT", "google-reviews", { refresh: true }, cookie);
const j = await r.json();
assert.equal(j.places.connected, true, JSON.stringify(j));
assert.equal((await mkReq("PUT", "google-reviews", { refresh: true })).status, 401, "sin sesión no se puede probar");
console.log("✓ 'Probar conexión' fuerza la consulta y devuelve el estado; sin sesión, 401");

// 5) Ya no hay carga manual: el panel no puede guardar calificación ni comentarios, y lo viejo guardado no se muestra
const put = await mkReq("PUT", "google-reviews", { rating: "4.9", count: 50, quotes: [{ name: "Ana", stars: 5, text: "Inventado" }] }, cookie);
assert.equal(put.status, 400, "rechaza la carga manual");
const env3 = { ...env, DB: d1() };
env3.DB._raw.exec(`INSERT INTO settings (key, value) VALUES ('google_rating','4.9'),('google_count','80'),('google_quotes','[{"name":"Ana","stars":5,"text":"Comentario manual viejo"}]')`);
mode = "fail";
html = await googleBlock(env3, "reviews");
assert.ok(!html.includes("Comentario manual viejo") && !html.includes("4,9"), "los datos manuales viejos ya no se usan");
const g = await (await mkReq("GET", "google-reviews", null, cookie)).json();
assert.ok(g.places && g.quotes === undefined && g.rating === undefined, "el GET solo devuelve el estado de la API");
console.log("✓ sin carga manual: el panel no guarda datos a mano y la web no usa los viejos");

// Caché de una versión anterior (solo nota y cantidad, sin comentarios ni fotos, sin "v"): se vuelve a pedir a Google enseguida, no a las 24 h.
const env4 = { ...env, DB: d1() };
env4.DB._raw.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)");
env4.DB._raw.prepare("INSERT INTO settings (key, value) VALUES ('google_places', ?)").run(JSON.stringify({ fetched: Date.now() - 60e3, tried: Date.now() - 20 * 60e3, rating: 5, count: 253 }));
assert.equal((await placesStatus(env4)).old, true, "el panel avisa que los datos son viejos");
mode = "ok"; calls = [];
html = await googleBlock(env4, "reviews");
assert.ok(calls.some((u) => u.startsWith("https://places.googleapis.com/v1/places/")), "pide de nuevo a Google");
assert.ok(html.includes("Excelente experiencia con el tango.") && html.includes("/google-foto/0"), "ahora muestra comentarios y fotos");
assert.equal((await placesStatus(env4)).old, false);
console.log("✓ caché viejo sin comentarios ni fotos: se renueva solo en la próxima visita");
console.log("\nTodo OK");

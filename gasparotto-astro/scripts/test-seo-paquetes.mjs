// SEO de las fichas de paquetes y servicios: título y descripción (propios o armados), datos estructurados y HTML renderizado.
// Uso: npm run test:seo-paquetes   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { packageSeo } from "../functions/lib/seo.js";
import { normMeta } from "../functions/lib/ficha.js";
import { onRequest } from "../functions/_middleware.js";
import { ensureSchema } from "../functions/lib/schema.js";

// 1) packageSeo: textos propios siempre ganan; los armados quedan en rango y no están vacíos.
const base = { title: "Tigre en un día", excerpt: "", content: "" };
let s = packageSeo({ ...base, seo_title: "Título propio", seo_description: "Descripción propia." }, { kindLabel: "Paquete", catLabel: "Tangos", priceTxt: "R$ 445", lang: "es" });
assert.deepEqual(s, { title: "Título propio", desc: "Descripción propia." }, "lo escrito a mano no se toca");

s = packageSeo(base, { kindLabel: "Paquete", catLabel: "Tangos", priceTxt: "R$ 445", lang: "es" });
assert.equal(s.title, "Tigre en un día · Tangos", "agrega la categoría al título");
assert.ok(s.desc.length >= 50 && s.desc.length <= 155, "descripción armada en rango: " + s.desc.length);
assert.match(s.desc, /Paquete Tigre en un día desde R\$ 445\./);
assert.match(s.desc, /Consultá disponibilidad/);
console.log("✓ título con categoría y descripción armada (ES):", JSON.stringify(s.desc));

s = packageSeo(base, { kindLabel: "Serviço", catLabel: "Tangos", priceTxt: "R$ 445", lang: "pt-BR" });
assert.match(s.desc, /a partir de R\$ 445/); assert.match(s.desc, /Consulte disponibilidade/);
console.log("✓ descripción armada (PT):", JSON.stringify(s.desc));

const long = "Recorrido guiado por los barrios de tango de Buenos Aires, con traslados, entradas a una milonga y una cena típica incluida para disfrutar la noche porteña.";
s = packageSeo({ ...base, excerpt: long }, { kindLabel: "Paquete", catLabel: "Tangos", priceTxt: "R$ 445", lang: "es" });
assert.ok(s.desc.startsWith("Recorrido guiado"), "un extracto largo se usa tal cual (cortado)");
assert.ok(s.desc.length <= 155);
console.log("✓ un extracto largo se usa como descripción");

s = packageSeo({ title: "Título muy largo de un paquete con muchas palabras para la categoría" }, { catLabel: "Tangos", lang: "es" });
assert.equal(s.title, "Título muy largo de un paquete con muchas palabras para la categoría", "sin categoría si no entra en el largo");
console.log("✓ el título no se alarga más de lo razonable");

// 2) HTML real: la ficha renderizada trae título, meta description y JSON-LD coherentes.
globalThis.caches = { default: { match: async () => undefined, put: async () => {}, delete: async () => {} } };
const db = new DatabaseSync(":memory:");
const D1 = { prepare: (sql) => mk(sql), batch: async (l) => { for (const x of l) await x.run(); return []; } };
function mk(sql, args = []) {
  return { bind: (...a) => mk(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }) };
}
await ensureSchema(D1);
const ins = (slug, title, meta, extra = {}) => db.prepare("INSERT INTO packages (slug,title,category,price,excerpt,content,meta,published,seo_title,seo_description) VALUES (?,?,?,?,?,?,?,1,?,?)")
  .run(slug, title, "tangos", "R$ 445", extra.excerpt || "", extra.content || "", meta, extra.seo_title || "", extra.seo_description || "");
ins("tigre", "Tigre en un día", normMeta({ kind: "paquete", times: [["09:00"]] }));
ins("cena", "Cena show", normMeta({ kind: "servicio" }));
ins("propio", "Otro", normMeta({}), { seo_title: "Título a mano", seo_description: "Descripción a mano para Google." });
const shell = '<html lang="es"><head><title>x</title></head><body><main></main></body></html>';
const env = { DB: D1, SITE_URL: "https://x.test", ASSETS: { fetch: async () => new Response(shell, { headers: { "content-type": "text/html" } }) } };
async function page(slug) {
  const r = await onRequest({ request: new Request(`https://x.test/paquetes/${slug}/`), env, params: {} });
  assert.equal(r.status, 200, slug + " debe responder 200");
  return r.text();
}
const meta = (h, name) => (h.match(new RegExp(`<meta name="${name}" content="([^"]*)"`)) || [])[1];
const titleOf = (h) => (h.match(/<title>([^<]*)<\/title>/) || [])[1];

let h = await page("tigre");
assert.match(titleOf(h), /^Tigre en un día/);
assert.ok((meta(h, "description") || "").length >= 50, "la descripción nunca queda vacía");
assert.match(meta(h, "description"), /Paquete Tigre en un día desde R\$ 445/);
assert.match(h, /"@type":"Product"/, "un paquete sigue siendo Product");
console.log("✓ paquete: título", JSON.stringify(titleOf(h)), "· descripción armada");

h = await page("cena");
assert.match(h, /"@type":"Service"/, "un servicio se marca como Service");
assert.match(h, /"provider":\{"@id"/, "el servicio tiene proveedor");
assert.match(meta(h, "description"), /Servicio Cena show desde R\$ 445/);
console.log("✓ servicio: JSON-LD Service con proveedor y descripción propia del tipo");

h = await page("propio");
assert.equal(meta(h, "description"), "Descripción a mano para Google.", "lo escrito a mano se usa tal cual");
assert.match(titleOf(h), /^Título a mano/);
console.log("✓ textos escritos a mano en la ficha tienen prioridad");

// 3) Galería: alt por foto (o uno generado) y vista previa al compartir con las fotos del paquete.
ins("galeria", "Galería de prueba", normMeta({ gallery: ["/media/a.webp | Vista del Obelisco", "/media/b.webp", "/media/clip.mp4", "https://cdn.test/c.webp | Tango en la calle"] }));
ins("sinfoto", "Sin foto principal", normMeta({ gallery: ["/media/d.webp"] }));
ins("nada", "Sin nada", normMeta({}));
h = await page("galeria");
assert.match(h, /alt="Vista del Obelisco"/, "la foto con descripción usa esa descripción");
assert.match(h, /alt="Galería de prueba · foto 2 de 4"/, "la foto sin descripción recibe un alt generado");
assert.match(h, /alt="Tango en la calle"/);
const og = [...h.matchAll(/<meta property="og:image" content="([^"]*)"/g)].map((m) => m[1]);
assert.deepEqual(og, ["https://x.test/media/a.webp", "https://x.test/media/b.webp", "https://cdn.test/c.webp"], "vista previa con las fotos, sin el video y en orden");
assert.ok(!og.some((u) => u.includes("logo")), "no aparece el logo");
console.log("✓ galería: alt por foto y vista previa con varias fotos (sin videos)");

h = await page("sinfoto");
assert.deepEqual([...h.matchAll(/<meta property="og:image" content="([^"]*)"/g)].map((m) => m[1]), ["https://x.test/media/d.webp"], "sin foto principal, la vista previa usa la primera de la galería");
console.log("✓ sin foto principal, la vista previa usa la primera foto de la galería");

h = await page("nada");
assert.match(h, /og:image" content="[^"]*logo/, "sin fotos queda el logo como último recurso");
console.log("✓ sin fotos, queda el logo");

// 4) Foto principal + galería: la principal va primero, sin repetir, y el alt de la principal es el suyo.
ins("principal", "Con portada", normMeta({ gallery: ["/media/g1.webp", "/media/portada.webp | Otra vista"] }));
db.prepare("UPDATE packages SET image=?, image_alt=? WHERE slug='principal'").run("/media/portada.webp", "Vista de la portada del paquete");
h = await page("principal");
const og4 = [...h.matchAll(/<meta property="og:image" content="([^"]*)"/g)].map((m) => m[1]);
assert.deepEqual(og4, ["https://x.test/media/portada.webp", "https://x.test/media/g1.webp"], "la principal primero y sin duplicar la que también está en la galería");
assert.match(h, /<meta property="og:image:alt" content="Vista de la portada del paquete"/, "el alt de la vista previa es el de la foto principal");
console.log("✓ foto principal primero en la vista previa, sin duplicados, con su propio alt");

console.log("\nSEO de paquetes y servicios: todo OK");

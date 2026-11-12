// Traduce los artículos del blog (portugués de Brasil) al español rioplatense y al inglés con la API de Claude.
// Los artículos viven en la base D1 de producción, no en el repositorio: el script los lee de ahí (o de un JSON exportado),
// los traduce y deja el resultado como un .sql para aplicar, o los carga directo por la API del panel.
//
// Uso básico (pide ANTHROPIC_API_KEY):
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/translate-blog.mjs                      → genera translations-blog.sql (estado "revision")
//   wrangler d1 execute gasparotto-viajes-db --remote --file=translations-blog.sql    → lo aplica
// Cargar directo por la API del panel (valida, sanea y deja el historial; no tiene el límite de tamaño de una consulta D1):
//   ANTHROPIC_API_KEY=... ADMIN_PASSWORD=... node scripts/translate-blog.mjs --api https://tu-sitio.com
//
// Opciones:
//   --langs es,en        idiomas a generar (por defecto es,en)
//   --status revision    estado con el que se guardan: borrador | revision (por defecto) | publicada. Publicar sin revisar es decisión tuya.
//   --only a,b           solo esos artículos (slug en portugués)
//   --force              vuelve a traducir lo que ya tiene traducción (por defecto se saltea; nunca pisa una traducción editada a mano sin --force)
//   --all                incluye artículos sin publicar (por defecto solo los publicados)
//   --db NOMBRE          base D1 (por defecto gasparotto-viajes-db) · --local para usar la base local en vez de --remote
//   --from posts.json    en vez de leer D1, usa un JSON exportado: { "posts": [...], "translations": [...] }
//   --out archivo.sql    archivo de salida (por defecto translations-blog.sql)
//   --model nombre       modelo (por defecto $ANTHROPIC_MODEL o claude-sonnet-5-5)
//   --concurrency 3      traducciones en paralelo
//   --dry-run            lista lo que traduciría y sale (no llama a la API de Claude)
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { sanitizeHtml } from "../functions/lib/seo.js";
import { TRANS_FIELDS, cleanTranslation, SLUG_RE } from "../functions/lib/translations.js";

export const LANG_NAMES = {
  es: "español rioplatense (Argentina): voseo (vos, contanos, consultá, reservá), tono cercano y claro de una agencia de viajes de Buenos Aires",
  en: "natural American English for travelers planning a trip to Buenos Aires and Argentina (clear, warm, no jargon)",
};
const FIELDS = ["title", "excerpt", "seo_title", "seo_description", "image_alt", "content"];

export function systemPrompt(lang) {
  return `Sos traductor editorial de una agencia de viajes de Buenos Aires. Traducís artículos de blog escritos en portugués de Brasil (pt-BR) a ${LANG_NAMES[lang]}.

Reglas:
- Traducí el sentido y el tono, no palabra por palabra. El resultado tiene que leerse como escrito originalmente en ese idioma.
- El contenido es HTML. Conservá TODAS las etiquetas, atributos y clases tal cual (por ejemplo class="gvb-dato" y class="gvb-tip") y el mismo orden y cantidad de <h2>, <h3>, listas, enlaces e imágenes. Traducí solo el texto visible y los atributos alt y title.
- No cambies ninguna URL (href, src) ni agregues enlaces nuevos.
- No inventes datos ni agregues información: no sumes, no quites, no resumas. Números, precios, monedas (R$, US$, ARS, Pix), horarios, fechas y duraciones se mantienen; no conviertas monedas ni unidades.
- Nombres propios, lugares, teatros, tours y la marca (Gasparotto Viajes) no se traducen. Los términos locales (milonga, asado, alfajor, Puerto de Frutos, Recoleta…) se conservan; si el original los explica, explicalos igual en el idioma de destino.
- seo_title: hasta 60 caracteres. seo_description: entre 120 y 160 caracteres. Si el campo original está vacío, dejalo vacío.
- Respondé SOLO con estos bloques, sin texto antes ni después ni bloques de código:
<title>…</title>
<excerpt>…</excerpt>
<seo_title>…</seo_title>
<seo_description>…</seo_description>
<image_alt>…</image_alt>
<content>…</content>`;
}

export function userPrompt(post) {
  return FIELDS.map((k) => `<${k}>${String(post[k] ?? "")}</${k}>`).join("\n");
}

// Lee los bloques <campo>…</campo> de la respuesta. Devuelve null si falta alguno de los obligatorios.
export function parseReply(text) {
  const out = {};
  for (const k of FIELDS) {
    const m = String(text).match(new RegExp(`<${k}>([\\s\\S]*?)</${k}>`));
    out[k] = m ? m[1].trim() : "";
  }
  return out.title && out.content !== undefined && new RegExp("<content>").test(text) ? out : null;
}

export const slugify = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");

// Slug único por idioma: si ya lo usa otro artículo, agrega -2, -3…
export function uniqueSlug(base, taken) {
  let s = slugify(base) || "articulo", n = 2;
  const root = s;
  while (taken.has(s)) s = `${root.slice(0, 76)}-${n++}`;
  taken.add(s);
  return s;
}

const count = (h, re) => (String(h).match(re) || []).length;
const hrefs = (h) => [...String(h).matchAll(/\b(?:href|src)="([^"]*)"/g)].map((m) => m[1]).sort().join("|");
// Compara el HTML traducido con el original: mismas etiquetas, mismos enlaces e imágenes. Devuelve la lista de diferencias.
export function checkStructure(src, out) {
  const issues = [];
  for (const [name, re] of [["<h2>", /<h2[\s>]/g], ["<h3>", /<h3[\s>]/g], ["<ul>/<ol>", /<(?:ul|ol)[\s>]/g], ["<li>", /<li[\s>]/g], ["<a>", /<a[\s>]/g], ["<img>", /<img[\s>]/g], ["<p>", /<p[\s>]/g], ["<table>", /<table[\s>]/g]]) {
    const a = count(src, re), b = count(out, re);
    if (a !== b) issues.push(`${name}: ${a} en el original, ${b} en la traducción`);
  }
  if (hrefs(src) !== hrefs(out)) issues.push("los enlaces o imágenes (href/src) no coinciden con el original");
  if (String(src).trim() && !String(out).trim()) issues.push("el contenido traducido quedó vacío");
  return issues;
}

// Llama a la API de Claude. `fetchFn` se puede reemplazar en las pruebas.
export async function callClaude({ apiKey, model, system, user, fetchFn = fetch, maxTokens = 32000 }) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetchFn("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    if ((r.status === 429 || r.status >= 500) && attempt < 4) { await new Promise((ok) => setTimeout(ok, 2000 * attempt ** 2)); continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`API de Claude ${r.status}: ${j?.error?.message || "error"}`);
    if (j.stop_reason === "max_tokens") throw new Error("la respuesta se cortó por largo (artículo demasiado extenso): traducilo desde el panel");
    return (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  }
}

// Traduce un artículo a un idioma. `translate(system, user)` devuelve el texto de la respuesta (en las pruebas es un falso).
export async function translatePost(post, lang, { translate, taken, status = "revision" }) {
  const reply = parseReply(await translate(systemPrompt(lang), userPrompt(post)));
  if (!reply) throw new Error("la respuesta no tiene el formato esperado");
  const data = cleanTranslation("posts", reply);
  data.content = sanitizeHtml(data.content || "");
  const issues = checkStructure(post.content, data.content);
  const slug = uniqueSlug(data.title, taken);
  if (!SLUG_RE.test(slug)) throw new Error(`slug inválido: ${slug}`);
  // Con diferencias de estructura se deja como borrador para que alguien lo mire antes de enviarlo a revisión.
  return { ref_id: post.id, lang, slug, data, status: issues.length ? "borrador" : status, issues };
}

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
export function toSql(t) {
  return `INSERT INTO translations (kind, ref_id, lang, slug, data, status, updated_by, updated_at) VALUES ('posts', ${Number(t.ref_id)}, ${q(t.lang)}, ${q(t.slug)}, ${q(JSON.stringify(t.data))}, ${q(t.status)}, 'translate-blog', CURRENT_TIMESTAMP) ON CONFLICT(kind, ref_id, lang) DO UPDATE SET slug=excluded.slug, data=excluded.data, status=excluded.status, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP;`;
}
// D1 rechaza consultas de más de ~100 KB: las que no entran se cargan por la API (--api) o desde el panel.
export const D1_MAX_BYTES = 95000;

// Carga una traducción por la API del panel (login con la clave general). `fetchFn` se puede reemplazar en las pruebas.
export async function makeApiClient(base, password, fetchFn = fetch) {
  const origin = new URL(base).origin;
  const headers = { "content-type": "application/json", origin };
  const login = await fetchFn(origin + "/api/login", { method: "POST", headers, body: JSON.stringify({ password }) });
  const cookie = (login.headers.get("set-cookie") || "").match(/gv_admin=[^;]+/)?.[0];
  if (!login.ok || !cookie) throw new Error("no se pudo iniciar sesión en el panel (revisá ADMIN_PASSWORD y la dirección)");
  return async (t) => {
    const r = await fetchFn(origin + "/api/translations", { method: "PUT", headers: { ...headers, cookie }, body: JSON.stringify({ kind: "posts", ref_id: t.ref_id, lang: t.lang, slug: t.slug, data: t.data, status: t.status }) });
    if (!r.ok) throw new Error(`el panel rechazó la traducción (${r.status}): ${(await r.json().catch(() => ({}))).error || ""}`);
  };
}

// ---- Lectura de D1 ----
function d1(db, local, sql) {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", db, local ? "--local" : "--remote", "--json", "--command", sql], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  const j = JSON.parse(out.slice(out.indexOf("[")));
  return j[0]?.results || [];
}
export function readSource(a) {
  if (a.from) return JSON.parse(readFileSync(a.from, "utf8"));
  const posts = d1(a.db, a.local, `SELECT id, slug, title, excerpt, content, image_alt, seo_title, seo_description, published FROM posts${a.all ? "" : " WHERE published=1"} ORDER BY id`);
  const translations = d1(a.db, a.local, "SELECT ref_id, lang, slug, status FROM translations WHERE kind='posts'");
  return { posts, translations };
}

export function parseArgs(argv) {
  const a = { db: "gasparotto-viajes-db", langs: ["es", "en"], status: "revision", out: "translations-blog.sql", concurrency: 3, model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", only: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => argv[++i];
    if (k === "--langs") a.langs = v().split(",").map((x) => x.trim()).filter(Boolean);
    else if (k === "--status") a.status = v();
    else if (k === "--only") a.only = v().split(",").map((x) => x.trim());
    else if (k === "--db") a.db = v();
    else if (k === "--from") a.from = v();
    else if (k === "--out") a.out = v();
    else if (k === "--model") a.model = v();
    else if (k === "--api") a.api = v();
    else if (k === "--concurrency") a.concurrency = Math.max(1, Number(v()) || 1);
    else if (["--force", "--all", "--local", "--dry-run"].includes(k)) a[k.slice(2).replace("-r", "R")] = true;
    else throw new Error(`opción desconocida: ${k}`);
  }
  for (const l of a.langs) if (!LANG_NAMES[l]) throw new Error(`idioma no soportado: ${l} (disponibles: ${Object.keys(LANG_NAMES).join(", ")})`);
  if (!["borrador", "revision", "publicada"].includes(a.status)) throw new Error("--status debe ser borrador, revision o publicada");
  return a;
}

// Lista de trabajos pendientes: [{ post, lang }].
export function planJobs(src, a) {
  const have = new Set((src.translations || []).map((t) => `${t.ref_id}:${t.lang}`));
  const jobs = [];
  for (const post of src.posts) {
    if (a.only && !a.only.includes(post.slug)) continue;
    if (!String(post.content || "").trim()) continue;
    for (const lang of a.langs) if (a.force || !have.has(`${post.id}:${lang}`)) jobs.push({ post, lang });
  }
  return jobs;
}

export async function run(a, { translate, put, log = console.log, src } = {}) {
  src = src || readSource(a);
  const jobs = planJobs(src, a);
  log(`${src.posts.length} artículos · ${jobs.length} traducciones por hacer (${a.langs.join(", ")})${a.force ? " [--force]" : ""}`);
  if (a.dryRun) { for (const j of jobs) log(`  ${j.lang}  ${j.post.slug}`); return { done: [], failed: [], jobs }; }
  // Slugs ya usados por idioma (existentes + los nuevos), para no repetir ninguno.
  const taken = Object.fromEntries(a.langs.map((l) => [l, new Set((src.translations || []).filter((t) => t.lang === l && !(a.force && jobs.some((j) => j.lang === l && j.post.id === t.ref_id))).map((t) => t.slug))]));
  const done = [], failed = [], sql = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { post, lang } = jobs[next++], tag = `${lang}  ${post.slug}`;
      try {
        const t = await translatePost(post, lang, { translate, taken: taken[lang], status: a.status });
        if (put) await put(t); else sql.push(t);
        done.push(t);
        log(`✓ ${tag} → ${t.slug} [${t.status}]${t.issues.length ? "  ⚠ " + t.issues.join("; ") : ""}`);
      } catch (e) { failed.push({ post: post.slug, lang, error: e.message }); log(`✗ ${tag}: ${e.message}`); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(a.concurrency, jobs.length || 1) }, worker));
  let big = [];
  if (!put) {
    const stmts = sql.sort((x, y) => x.ref_id - y.ref_id || x.lang.localeCompare(y.lang)).map((t) => ({ t, s: toSql(t) }));
    big = stmts.filter((x) => Buffer.byteLength(x.s) > D1_MAX_BYTES).map((x) => x.t);
    writeFileSync(a.out, "-- Traducciones del blog generadas por scripts/translate-blog.mjs. Revisalas antes de publicar.\n" + stmts.filter((x) => !big.includes(x.t)).map((x) => x.s).join("\n") + "\n");
    log(`\nSQL: ${a.out} (${stmts.length - big.length} sentencias). Aplicalo con: npx wrangler d1 execute ${a.db} --remote --file=${a.out}`);
    if (big.length) log(`⚠ ${big.length} traducción(es) superan el tamaño que admite D1 y no están en el .sql: cargalas con --api o desde el panel (${big.map((t) => `${t.lang}:${t.ref_id}`).join(", ")}).`);
  }
  const warn = done.filter((t) => t.issues.length).length;
  log(`\nListas: ${done.length} · con diferencias de estructura (quedan como borrador): ${warn} · con error: ${failed.length}`);
  return { done, failed, jobs, big };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const a = parseArgs(process.argv.slice(2));
    if (!a.dryRun && !process.env.ANTHROPIC_API_KEY) throw new Error("falta ANTHROPIC_API_KEY");
    const translate = (system, user) => callClaude({ apiKey: process.env.ANTHROPIC_API_KEY, model: a.model, system, user });
    const put = a.api ? await makeApiClient(a.api, process.env.ADMIN_PASSWORD || "") : null;
    const r = await run(a, { translate, put });
    process.exit(r.failed.length ? 1 : 0);
  } catch (e) { console.error("Error:", e.message); process.exit(1); }
}

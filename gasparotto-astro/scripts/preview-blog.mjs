// Vista previa local del blog SIN Cloudflare: levanta el mismo motor (functions/_middleware.js) con una base SQLite en memoria
// que imita a D1, y datos de ejemplo. Uso: npm run css && npm run fx && node --no-warnings scripts/preview-blog.mjs  → http://localhost:8787/blog/
import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { onRequest } from "../functions/_middleware.js";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync("schema.sql", "utf8"));
const stmt = (q) => {
  const mk = (args) => ({
    all: async () => ({ results: sql.prepare(q).all(...args) }),
    first: async () => sql.prepare(q).get(...args) ?? null,
    run: async () => { sql.prepare(q).run(...args); return { success: true }; },
    bind: (...a) => mk(a),
    _run: () => sql.prepare(q).run(...args),
  });
  return mk([]);
};
const DB = { prepare: stmt, batch: async (list) => { for (const s of list) s._run(); return []; }, exec: async (q) => sql.exec(q) };

const P = (n, rest = {}) => ({ ...rest });
const lorem = (t) => `<p>${t}</p>`;
const body = `
<p>Buenos Aires no se entiende en un día, pero sí se puede empezar bien. Después de acompañar a miles de viajeros, estas son las ideas que más usamos para que la primera visita se sienta como la décima: sin apuros, sin trampas para turistas y con lugar para improvisar.</p>
<h2>Elegí bien el barrio donde dormir</h2>
<p>La ciudad se recorre a pie y en subte, pero dormir en el lugar correcto te ahorra horas de traslado. <strong>Recoleta</strong> y <strong>Palermo</strong> concentran restaurantes, parques y buena conexión; San Telmo es el corazón histórico, con calles empedradas y ferias de domingo.</p>
<div class="gvb-dato"><strong>Dato útil</strong><p>El subte funciona de 5:30 a 22:30 aproximadamente y se paga con tarjeta SUBE. Pedí la tarjeta en un kiosco o cargá saldo desde la app.</p></div>
<h2>Cuándo ir y qué esperar del clima</h2>
<p>Primavera (septiembre a noviembre) y otoño (marzo a mayo) son los mejores meses: temperaturas suaves, jacarandás en flor y menos humedad. El verano es intenso y el invierno, fresco pero muy agradable para caminar.</p>
<ul><li>Primavera: 17 a 25 °C, ideal para parques y terrazas.</li><li>Verano: 28 a 35 °C, conviene salir temprano.</li><li>Otoño: 15 a 23 °C, perfecto para city tours.</li><li>Invierno: 8 a 16 °C, ideal para teatros y milongas.</li></ul>
<blockquote><p>La mejor manera de conocer una ciudad es perderse en ella con un buen mapa y un mejor guía.</p></blockquote>
<h2>Una noche de tango sin caer en trampas</h2>
<p>Hay shows con cena, shows sin cena y milongas donde se baila de verdad. Si es tu primera vez, un espectáculo con orquesta en vivo en un teatro histórico suele ser la mejor puerta de entrada.</p>
<div class="gvb-tip"><strong>Tip de la agencia</strong><p>Reservá con anticipación en temporada alta y pedí traslado incluido: de noche, volver al hotel es parte de la experiencia.</p></div>
<h3>Qué ponerte</h3>
<p>Nada de etiqueta estricta, pero la gente sale arreglada. Zapatos cómodos si pensás bailar, y una campera liviana para la salida.</p>
<h2>Cómo organizar tus días</h2>
<ol><li>Día 1: centro histórico, Plaza de Mayo y Casa Rosada.</li><li>Día 2: Recoleta, Palermo y almuerzo en un parrillón.</li><li>Día 3: Delta del Tigre o escapada a Colonia.</li></ol>
<p>Con tres días alcanza para una buena primera impresión. Con una semana, la ciudad empieza a hablarte en voz baja.</p>`;
const posts = [
  ["que-hacer-en-buenos-aires-3-dias", "Qué hacer en Buenos Aires en 3 días: la guía de quienes lo viven todos los días", "Un recorrido sin apuros por barrios, sabores y noches porteñas, con consejos para evitar las trampas más comunes de la primera visita.", "/assets/hero-obelisco.webp", "tips-de-viaje", 1, "2026-10-20 10:00:00"],
  ["donde-ver-un-show-de-tango", "Dónde ver un show de tango en Buenos Aires (y cuál elegir según tu estilo)", "Con cena, sin cena, en teatro histórico o en milonga: cómo elegir la noche de tango perfecta.", "/assets/tango.webp", "noche-portena", 0, "2026-10-12 10:00:00"],
  ["delta-del-tigre-guia-completa", "Delta del Tigre: cómo llegar, qué hacer y cuándo ir", "Navegación, islas y almuerzo a orillas del río, a una hora del centro.", "/assets/delta.webp", "tips-de-viaje", 0, "2026-09-30 10:00:00"],
  ["city-tour-buenos-aires-vale-la-pena", "¿Vale la pena un city tour en Buenos Aires? Lo que nadie te cuenta", "Qué incluye, cuánto dura y para quién es mejor.", "/assets/city-tour.webp", "tips-de-viaje", 0, "2026-09-18 10:00:00"],
  ["mejores-parrillas-de-palermo", "Las mejores parrillas de Palermo para probar el asado de verdad", "Cortes, cocciones y lugares donde comen los porteños.", "/assets/equipo.webp", "noche-portena", 0, "2026-09-02 10:00:00"],
  ["consejos-primera-vez-argentina", "10 consejos para tu primer viaje a Argentina", "Moneda, propinas, horarios de cena y otras costumbres que conviene saber antes de aterrizar.", "/assets/hero-obelisco.webp", "tips-de-viaje", 0, "2026-08-21 10:00:00"],
];
const ins = sql.prepare("INSERT INTO posts (slug,title,excerpt,content,image,image_alt,category,published,featured,publish_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,?,?,?,?)");
for (const [slug, title, ex, img, cat, feat, d] of posts) ins.run(slug, title, ex, body, img, title, cat, feat, d.slice(0, 10), d, d);
sql.prepare("INSERT INTO categories (kind,slug,label,sort_order) VALUES (?,?,?,?)").run("posts","tips-de-viaje","Tips de viaje",0);
sql.prepare("INSERT INTO categories (kind,slug,label,sort_order) VALUES (?,?,?,?)").run("posts","noche-portena","Noche porteña",1);
const insP = sql.prepare("INSERT INTO packages (slug,title,category,price,excerpt,content,image,published,featured) VALUES (?,?,?,?,?,?,?,1,1)");
insP.run("show-de-tango-con-cena", "Show de tango con cena y traslado", "tangos", "ARS 85.000", "Cena de tres pasos y orquesta en vivo en un teatro histórico.", "<p>Una noche inolvidable.</p>", "/assets/tango.webp");
insP.run("city-tour-buenos-aires", "City tour clásico por Buenos Aires", "city-tour", "ARS 38.000", "Cuatro horas por los barrios emblemáticos con guía local.", "<p>Recorrido.</p>", "/assets/city-tour.webp");
insP.run("delta-del-tigre-navegacion", "Delta del Tigre: navegación y almuerzo", "delta", "ARS 62.000", "Un día entre islas, a una hora de la ciudad.", "<p>Delta.</p>", "/assets/delta.webp");

const env = { DB, ASSETS: { fetch: async () => new Response("", { status: 404 }) }, SITE_URL: process.env.SITE_URL || "https://gasparottoviajes.com", WHATSAPP_NUMBER: "541164199083", BRAND_NAME: "Gasparotto Viajes", SITE_LANG: "es", BRAND_LOGO: "/assets/logo.png", PRICE_CURRENCY: "ARS", BRAND_PRIMARY: "#0066a9", BRAND_ACCENT: "#7f1d35", BRAND_CTA: "#1a6b43" };
const MIME = { ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml" };
createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost:8787");
  const f = join("public", u.pathname);
  if (u.pathname.startsWith("/assets/") && existsSync(f)) { res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" }); return res.end(readFileSync(f)); }
  const r = await onRequest({ request: new Request(u.href, { headers: req.headers }), env, next: async () => new Response("next", { status: 404 }), waitUntil: () => {} });
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8787, () => console.log("Preview en http://localhost:8787/blog/"));

// Conector de Claude para el blog: servidor MCP (Model Context Protocol) por HTTP, sin estado y sin sesión.
// Se agrega en claude.ai › Personalizar › Conectores › Agregar conector personalizado, con la dirección que da el panel
// (Conectar Claude): https://<sitio>/mcp/<clave>, autenticación "Sin inicio de sesión". También acepta la clave en
// "Authorization: Bearer <clave>" o "x-api-key" (por si se usa desde Claude Code u otro cliente).
//
// Qué puede hacer Claude: ver categorías, notas y paquetes; crear y editar notas; subir imágenes desde una URL.
// No puede borrar nada, ni tocar paquetes, precios, reservas ni usuarios. Con una clave "solo borradores" todo queda
// en borrador y no puede modificar notas publicadas; con "puede publicar", Claude puede publicar si se lo pedís.
// Las notas se guardan con la misma lógica que el panel (manejarContenido): sanitizado, slug, SEO, redirecciones y autoría.
import { manejarContenido } from "./api/contenido.js";
import { IMG_TYPES, sniffImage } from "./api/medios.js";
import { lockedOut, noteFail } from "./api/guard.js";
import { ensureSchema } from "./schema.js";
import { logActivity } from "./activity.js";
import { purge } from "./edge.js";
import { stripTags } from "./seo.js";

const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const LIVE = "(publish_date='' OR publish_date<=date('now','-3 hours'))";

// ---------- Claves ----------
export async function sha256(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// gvk_ + 40 caracteres aleatorios (base64url). Se muestra una sola vez; en la base queda el hash.
export function newToken() {
  const b = crypto.getRandomValues(new Uint8Array(30));
  return "gvk_" + btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function tokenOf(request, url) {
  const fromPath = url.pathname.replace(/^\/mcp\/?/, "").split("/")[0];
  if (/^gvk_[\w-]{20,}$/.test(fromPath)) return fromPath;
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(gvk_[\w-]{20,})$/i);
  if (m) return m[1];
  const k = (request.headers.get("x-api-key") || "").trim();
  return /^gvk_[\w-]{20,}$/.test(k) ? k : "";
}

// ---------- Texto de ayuda que recibe Claude al conectarse ----------
function guide(env, key) {
  const pt = !/^es/i.test(String(env.SITE_LANG || "pt-BR"));
  return [
    `Conector del blog de ${env.BRAND_NAME || "la agencia"} (${String(env.SITE_URL || "").replace(/\/$/, "")}).`,
    pt ? "El público es brasileño: escribí las notas en portugués de Brasil, salvo que te pidan otro idioma." : "Escribí las notas en español rioplatense, salvo que te pidan otro idioma.",
    key.can_publish
      ? "Esta clave PUEDE publicar. Aun así, creá las notas como borrador y publicá solo si la persona lo pide explícitamente."
      : "Esta clave crea y edita SOLO borradores: no puede publicar ni modificar notas ya publicadas. Avisale a la persona que revise el borrador en el panel (Blog) y lo publique desde ahí.",
    "Antes de escribir: mirá las categorías (blog_listar_categorias) y las notas existentes (blog_listar_entradas) para no repetir temas; usá sitio_listar_paquetes para enlazar 2 o 3 paquetes o servicios relacionados con enlaces internos (/paquetes/<slug>/).",
    "Formato del contenido (HTML): párrafos <p>, secciones con <h2> (al menos 3) y <h3> si hace falta, listas <ul>/<ol>, <strong>, enlaces <a href>. No pongas <h1> (el título va aparte) ni estilos en línea.",
    'Cuadros del sitio: <div class="gvb-dato"><strong>Dato útil</strong><p>…</p></div> y <div class="gvb-tip"><strong>Dica da agência</strong><p>…</p></div>. Cita destacada: <blockquote><p>…</p></blockquote>.',
    "SEO: título de 30 a 60 caracteres con la palabra clave; descripción para Google (seo_description) de 70 a 160; resumen corto (excerpt) de una o dos frases; 600 palabras o más; datos concretos y verificables (precios y horarios de la agencia solo si salen de sitio_listar_paquetes).",
    "Imagen principal: si tenés una URL https de una imagen con permiso de uso, subila con blog_subir_imagen y usá la dirección /media/… que devuelve; si no, dejá la nota sin imagen y avisá que falta.",
    "Al terminar, pasale a la persona el enlace de edición del panel que devuelve la herramienta.",
  ].join("\n");
}

// ---------- Markdown mínimo → HTML (por si Claude manda Markdown en vez de HTML) ----------
const escH = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function inline(s) {
  return escH(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
}
export function mdToHtml(md) {
  const out = [], lines = String(md || "").replace(/\r/g, "").split("\n");
  let list = null, para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    let m;
    if ((m = l.match(/^(#{2,4})\s+(.*)$/))) { flush(); const n = Math.min(4, m[1].length); out.push(`<h${n}>${inline(m[2])}</h${n}>`); continue; }
    if ((m = l.match(/^#\s+(.*)$/))) { flush(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
    if ((m = l.match(/^>\s?(.*)$/))) { flush(); out.push(`<blockquote><p>${inline(m[1])}</p></blockquote>`); continue; }
    if ((m = l.match(/^[-*]\s+(.*)$/)) || (m = l.match(/^\d+[.)]\s+(.*)$/))) {
      const kind = /^\d/.test(l) ? "ol" : "ul";
      if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; }
      if (list !== kind) { if (list) out.push(`</${list}>`); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(m[1])}</li>`); continue;
    }
    if (list) { out.push(`</${list}>`); list = null; }
    para.push(l);
  }
  flush();
  return out.join("\n");
}
const looksHtml = (s) => /<(p|h2|h3|ul|ol|div|blockquote|strong|a)\b/i.test(String(s || ""));

// ---------- Herramientas ----------
const STR = (description, extra = {}) => ({ type: "string", description, ...extra });
const POST_FIELDS = {
  titulo: STR("Título de la nota (30 a 60 caracteres ideal)."),
  contenido: STR("Cuerpo de la nota en HTML (recomendado) o Markdown. Sin <h1>."),
  formato: { type: "string", enum: ["html", "markdown"], description: "Formato de 'contenido'. Por defecto se detecta solo." },
  resumen: STR("Resumen corto (excerpt): una o dos frases. Si falta, se arma solo desde el contenido."),
  categoria: STR("Categoría del blog: la clave o el nombre de blog_listar_categorias."),
  seo_titulo: STR("Título para Google (opcional; si falta se usa el título)."),
  seo_descripcion: STR("Descripción para Google, 70 a 160 caracteres."),
  imagen: STR("Imagen principal: dirección /media/… devuelta por blog_subir_imagen, o una URL https."),
  imagen_alt: STR("Texto alternativo de la imagen (describe lo que se ve)."),
  slug: STR("Dirección web (opcional; se genera desde el título)."),
  fecha_publicacion: STR("YYYY-MM-DD para programarla (opcional). Vacía = cuando se publique."),
  publicar: { type: "boolean", description: "true = publicar ya. Solo funciona si la clave puede publicar y la persona lo pidió. Por defecto, borrador." },
};
export const TOOLS = [
  { name: "blog_listar_categorias", title: "Categorías del blog", description: "Lista las categorías del blog (clave, nombre y cuántas notas tiene cada una).", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
  { name: "blog_listar_entradas", title: "Notas del blog", description: "Lista notas del blog (id, título, estado, categoría, fecha y dirección). Sirve para no repetir temas y para enlazar notas entre sí.", inputSchema: { type: "object", properties: { buscar: STR("Texto a buscar en el título o la dirección (opcional)."), estado: { type: "string", enum: ["todas", "publicadas", "borradores", "programadas"], description: "Por defecto, todas." }, limite: { type: "integer", minimum: 1, maximum: 100, description: "Máximo de resultados (por defecto 30)." } } }, annotations: { readOnlyHint: true } },
  { name: "blog_ver_entrada", title: "Ver una nota", description: "Devuelve una nota completa (incluido el HTML del contenido) por id o por dirección.", inputSchema: { type: "object", properties: { id: { type: "integer" }, slug: STR("Dirección de la nota.") } }, annotations: { readOnlyHint: true } },
  { name: "blog_crear_entrada", title: "Crear una nota", description: "Crea una nota del blog. Queda como BORRADOR salvo que la clave pueda publicar y 'publicar' sea true. Devuelve el id, la dirección y el enlace para editarla en el panel.", inputSchema: { type: "object", properties: POST_FIELDS, required: ["titulo", "contenido"] }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false } },
  { name: "blog_editar_entrada", title: "Editar una nota", description: "Cambia solo los campos que mandes de una nota existente. Con una clave 'solo borradores' únicamente se pueden editar borradores.", inputSchema: { type: "object", properties: { id: { type: "integer", description: "Id de la nota (de blog_listar_entradas)." }, ...POST_FIELDS }, required: ["id"] }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true } },
  { name: "blog_subir_imagen", title: "Subir una imagen", description: "Descarga una imagen desde una URL https (JPG, PNG, WEBP, GIF o AVIF, hasta 8 MB) y la guarda en el sitio. Devuelve la dirección /media/… para usar en 'imagen' o dentro del contenido. Usá solo imágenes con permiso de uso.", inputSchema: { type: "object", properties: { url: STR("URL https de la imagen.") }, required: ["url"] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
  { name: "sitio_listar_paquetes", title: "Paquetes y servicios", description: "Lista los paquetes y servicios publicados (título, categoría, precio desde y dirección) para enlazarlos desde las notas.", inputSchema: { type: "object", properties: { buscar: STR("Texto a buscar (opcional).") } }, annotations: { readOnlyHint: true } },
];

const ok = (data, text) => ({ content: [{ type: "text", text: text || JSON.stringify(data, null, 2) }], structuredContent: data });
const fail = (text) => ({ content: [{ type: "text", text }], isError: true });
const state = (p) => (!p.published ? "borrador" : p.publish_date && p.publish_date > new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10) ? "programada" : "publicada");

// Llama al mismo código que usa el panel para guardar una nota.
async function savePost(env, origin, user, method, id, body) {
  const url = new URL(`${origin}/api/posts${id ? "/" + id : ""}`);
  const request = new Request(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const ctx = {};
  const r = await manejarContenido({ ctx, request, env, url, res: "posts", id: id ? String(id) : undefined, method, user });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

function fieldsFrom(a, prev = {}) {
  const has = (k) => a[k] !== undefined && a[k] !== null;
  const d = {};
  if (has("titulo")) d.title = String(a.titulo).trim();
  if (has("contenido")) {
    const c = String(a.contenido);
    d.content = a.formato === "markdown" || (a.formato !== "html" && !looksHtml(c)) ? mdToHtml(c) : c;
  }
  if (has("resumen")) d.excerpt = String(a.resumen);
  if (has("categoria")) d.category = String(a.categoria);
  if (has("seo_titulo")) d.seo_title = String(a.seo_titulo);
  if (has("seo_descripcion")) d.seo_description = String(a.seo_descripcion);
  if (has("imagen")) d.image = String(a.imagen);
  if (has("imagen_alt")) d.image_alt = String(a.imagen_alt);
  if (has("slug")) d.slug = String(a.slug);
  if (has("fecha_publicacion")) d.publish_date = String(a.fecha_publicacion);
  return { ...prev, ...d };
}

async function callTool(name, a, { env, key, user, origin }) {
  const db = env.DB;
  const site = String(env.SITE_URL || origin).replace(/\/$/, "");
  const editLink = (id) => `${origin}/admin/#posts/${id}`;
  if (name === "blog_listar_categorias") {
    const rows = (await db.prepare("SELECT c.slug, c.label, c.description, (SELECT COUNT(*) FROM posts p WHERE p.category=c.slug) AS notas FROM categories c WHERE c.kind='posts' ORDER BY c.sort_order, c.id").all()).results;
    return ok({ categorias: rows.map((c) => ({ clave: c.slug, nombre: c.label, descripcion: c.description || "", notas: c.notas })) });
  }
  if (name === "blog_listar_entradas") {
    const lim = Math.min(100, Math.max(1, Number(a.limite) || 30)), q = String(a.buscar || "").trim().toLowerCase();
    const where = { publicadas: `published=1 AND ${LIVE}`, borradores: "published=0", programadas: `published=1 AND NOT ${LIVE}` }[a.estado] || "1=1";
    const rows = (await db.prepare(`SELECT id, slug, title, category, published, publish_date, created_at, updated_at FROM posts WHERE ${where} ORDER BY id DESC LIMIT 400`).all()).results
      .filter((p) => !q || (p.title + " " + p.slug).toLowerCase().includes(q)).slice(0, lim);
    return ok({ entradas: rows.map((p) => ({ id: p.id, titulo: p.title, estado: state(p), categoria: p.category, fecha: (p.publish_date || p.created_at || "").slice(0, 10), direccion: `${site}/blog/${p.slug}/` })) });
  }
  if (name === "blog_ver_entrada") {
    const p = a.id ? await db.prepare("SELECT * FROM posts WHERE id=?").bind(Number(a.id)).first() : a.slug ? await db.prepare("SELECT * FROM posts WHERE slug=?").bind(String(a.slug)).first() : null;
    if (!p) return fail("No encontré esa nota. Usá blog_listar_entradas para ver los ids.");
    return ok({ id: p.id, titulo: p.title, slug: p.slug, estado: state(p), categoria: p.category, resumen: p.excerpt, seo_titulo: p.seo_title, seo_descripcion: p.seo_description, imagen: p.image, imagen_alt: p.image_alt, fecha_publicacion: p.publish_date, contenido: p.content, direccion: `${site}/blog/${p.slug}/` });
  }
  if (name === "sitio_listar_paquetes") {
    const q = String(a.buscar || "").trim().toLowerCase();
    const rows = (await db.prepare("SELECT slug, title, category, price, excerpt FROM packages WHERE published=1 ORDER BY featured DESC, id DESC LIMIT 200").all()).results
      .filter((p) => !q || (p.title + " " + p.slug + " " + p.category).toLowerCase().includes(q)).slice(0, 60);
    return ok({ paquetes: rows.map((p) => ({ titulo: p.title, categoria: p.category, precio_desde: p.price || "", resumen: stripTags(p.excerpt || "").slice(0, 200), enlace_interno: `/paquetes/${p.slug}/` })) });
  }
  if (name === "blog_subir_imagen") {
    const u = String(a.url || "");
    if (!/^https:\/\//i.test(u)) return fail("La imagen tiene que ser una URL https.");
    if (!env.IMAGES) return fail("El almacenamiento de imágenes (R2) no está conectado. Usá directamente la URL https en 'imagen'.");
    let r;
    try { r = await fetch(u, { redirect: "follow", headers: { accept: "image/*" } }); } catch { return fail("No pude descargar la imagen."); }
    if (!r.ok) return fail(`La imagen respondió ${r.status}.`);
    const len = Number(r.headers.get("content-length") || 0);
    if (len > 8 * 1024 * 1024) return fail("La imagen pesa más de 8 MB.");
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 8 * 1024 * 1024) return fail("La imagen pesa más de 8 MB.");
    const type = sniffImage(buf);
    if (!type) return fail("El archivo no es una imagen JPG, PNG, WEBP, GIF o AVIF.");
    const k = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${IMG_TYPES[type]}`;
    await env.IMAGES.put(k, buf, { httpMetadata: { contentType: type } });
    return ok({ imagen: `/media/${k}` }, `Imagen guardada: /media/${k}`);
  }
  if (name === "blog_crear_entrada" || name === "blog_editar_entrada") {
    const create = name === "blog_crear_entrada";
    let prev = null;
    if (!create) {
      prev = await db.prepare("SELECT * FROM posts WHERE id=?").bind(Number(a.id)).first();
      if (!prev) return fail("No existe una nota con ese id.");
      if (prev.published && !key.can_publish) return fail("Esa nota está publicada y esta clave solo puede editar borradores. Pedile a la persona que la edite desde el panel o que use una clave que pueda publicar.");
    }
    if (a.publicar === true && !key.can_publish) return fail("Esta clave no puede publicar: guardá la nota como borrador (sin 'publicar') y avisale a la persona que la publique desde el panel.");
    const base = prev ? { slug: prev.slug, title: prev.title, excerpt: prev.excerpt, content: prev.content, image: prev.image, image_alt: prev.image_alt, category: prev.category, seo_title: prev.seo_title, seo_description: prev.seo_description, legacy_id: prev.legacy_id, published: prev.published, featured: prev.featured, publish_date: prev.publish_date, related_ids: prev.related_ids, video: prev.video } : { featured: 0, related_ids: "", legacy_id: "", video: "" };
    const d = fieldsFrom(a, base);
    if (create && !String(d.title || "").trim()) return fail("Falta el título.");
    if (create && !String(d.content || "").trim()) return fail("Falta el contenido.");
    d.published = a.publicar === true ? 1 : a.publicar === false || create ? 0 : prev.published;
    const r = await savePost(env, origin, user, create ? "POST" : "PUT", create ? null : prev.id, d);
    if (r.status >= 300) {
      if (/Categor/i.test(r.j.error || "")) {
        const cats = (await db.prepare("SELECT slug FROM categories WHERE kind='posts' ORDER BY sort_order").all()).results.map((c) => c.slug);
        return fail(`${r.j.error} Categorías disponibles: ${cats.join(", ")}.`);
      }
      return fail(r.j.error || "No se pudo guardar la nota.");
    }
    const id = r.j.id || prev?.id, p = await db.prepare("SELECT id, slug, title, published, publish_date FROM posts WHERE id=?").bind(id).first();
    await logActivity(db, { id: user.id, name: user.name }, create ? "creó" : "editó", "entrada", id, p.title, `vía Claude (${key.name})${p.published ? "" : " · borrador"}`).catch(() => {});
    await purge(origin, ["/blog/", `/blog/${p.slug}/`]).catch(() => {});
    const st = state(p);
    return ok({ id, titulo: p.title, estado: st, direccion: `${site}/blog/${p.slug}/`, editar_en_el_panel: editLink(id) },
      `${create ? "Nota creada" : "Nota actualizada"} (#${id}, ${st}): “${p.title}”.\n${st === "borrador" ? "Es un borrador: no se ve en el sitio hasta que se publique desde el panel → Blog." : `Dirección: ${site}/blog/${p.slug}/`}\nPanel: ${editLink(id)}`);
  }
  return fail("Herramienta desconocida: " + name);
}

// ---------- Protocolo (JSON-RPC sobre HTTP, respuesta JSON) ----------
const rpc = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcErr = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const out = (body, status = 200, extra = {}) => new Response(body == null ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });

export async function handleMcp(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { allow: "POST, OPTIONS" } });
  if (request.method !== "POST") return out({ error: "Este conector usa POST (MCP por HTTP)." }, 405, { allow: "POST, OPTIONS" });
  if (!env.DB) return out(rpcErr(null, -32603, "Base de datos no conectada"), 503);
  try { await ensureSchema(env.DB); } catch { return out(rpcErr(null, -32603, "Base de datos no disponible"), 503); }

  // Clave: se busca por su hash. Los intentos con claves malas frenan a la IP (20 cada 15 minutos).
  const ip = request.headers.get("cf-connecting-ip") || "x", lim = [[`mcp:${ip}`, 20]];
  if (await lockedOut(env.DB, lim)) return out(rpcErr(null, -32001, "Demasiados intentos. Probá en unos minutos."), 429);
  const token = tokenOf(request, url);
  const key = token ? await env.DB.prepare("SELECT * FROM api_keys WHERE hash=? AND revoked=0").bind(await sha256(token)).first() : null;
  if (!key) { await noteFail(env.DB, lim); return out(rpcErr(null, -32001, "Clave inválida o revocada. Generá una nueva en el panel → Conectar Claude."), 401); }
  // Firma: la persona que creó la clave (si sigue activa); si no, "Claude".
  const u = key.user_id ? await env.DB.prepare("SELECT id, name, role FROM users WHERE id=? AND active=1").bind(key.user_id).first() : null;
  const user = { id: u?.id || 0, name: u ? `${u.name} (vía Claude)` : `Claude (${key.name})`, role: "editor" };

  const msg = await request.json().catch(() => null);
  if (!msg) return out(rpcErr(null, -32700, "JSON inválido"), 400);
  const list = Array.isArray(msg) ? msg : [msg];
  const replies = [];
  let used = false;
  for (const m of list) {
    if (!m || m.jsonrpc !== "2.0" || typeof m.method !== "string") { if (m && "id" in m) replies.push(rpcErr(m.id, -32600, "Pedido inválido")); continue; }
    const isNote = !("id" in m);
    try {
      if (m.method === "initialize") {
        const want = m.params?.protocolVersion;
        replies.push(rpc(m.id, { protocolVersion: VERSIONS.includes(want) ? want : VERSIONS[1], capabilities: { tools: { listChanged: false } }, serverInfo: { name: "gasparotto-blog", title: `Blog · ${env.BRAND_NAME || "Agencia"}`, version: "1.0.0" }, instructions: guide(env, key) }));
      } else if (m.method === "ping") replies.push(rpc(m.id, {}));
      else if (m.method === "tools/list") replies.push(rpc(m.id, { tools: TOOLS }));
      else if (m.method === "tools/call") {
        const t = TOOLS.find((x) => x.name === m.params?.name);
        if (!t) replies.push(rpcErr(m.id, -32602, "Herramienta desconocida: " + m.params?.name));
        else { used = true; replies.push(rpc(m.id, await callTool(t.name, m.params?.arguments || {}, { env, key, user, origin: url.origin }))); }
      } else if (m.method.startsWith("notifications/")) { /* sin respuesta */ }
      else if (m.method === "resources/list") replies.push(rpc(m.id, { resources: [] }));
      else if (m.method === "prompts/list") replies.push(rpc(m.id, { prompts: [] }));
      else if (!isNote) replies.push(rpcErr(m.id, -32601, "Método no soportado: " + m.method));
    } catch (e) {
      console.error("mcp:", e);
      if (!isNote) replies.push(m.method === "tools/call" ? rpc(m.id, fail("Error interno: " + String(e?.message || e).slice(0, 200))) : rpcErr(m.id, -32603, "Error interno"));
    }
  }
  await env.DB.prepare(`UPDATE api_keys SET last_used=CURRENT_TIMESTAMP${used ? ", uses=uses+1" : ""} WHERE id=?`).bind(key.id).run().catch(() => {});
  if (!replies.length) return new Response(null, { status: 202 });
  return out(Array.isArray(msg) ? replies : replies[0]);
}

// Conector de Claude para el blog (MCP): claves desde el panel, protocolo, herramientas, permisos y revocación.
// Uso: npm run test:mcp   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { onRequest as api } from "../functions/api/[[path]].js";
import { onRequest as mcpFn } from "../functions/mcp/[[path]].js";
import { onRequest as site } from "../functions/_middleware.js";
import { manejarClaude } from "../functions/lib/api/claude.js";
import { mdToHtml } from "../functions/lib/mcp.js";

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
const stored = new Map();
const env = { DB: d1(), IMAGES: { put: async (k, v) => { stored.set(k, v); } }, ASSETS: { fetch: async () => new Response("", { status: 404 }) }, ADMIN_PASSWORD: "clave-general-123", SITE_URL: "https://gasparottoviajes.com", SITE_LANG: "pt-BR", BRAND_NAME: "Gasparotto Viajes" };
let ip = 0;
async function call(method, path, body, cookie) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.3." + (ip++ % 250) + ".1" };
  if (cookie) headers.cookie = cookie;
  const r = await api({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: path.split("?")[0].split("/") } });
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, data, cookie: ck ? "gv_admin=" + ck : "" };
}
let rid = 0;
async function mcp(url, method, params, opts = {}) {
  const body = method ? { jsonrpc: "2.0", ...(opts.note ? {} : { id: ++rid }), method, ...(params ? { params } : {}) } : opts.raw;
  const r = await mcpFn({ request: new Request(url, { method: opts.http || "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "cf-connecting-ip": opts.ip || "10.4.0.1", ...(opts.headers || {}) }, body: (opts.http || "POST") === "POST" ? JSON.stringify(body) : undefined }), env });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  return { status: r.status, j };
}
const tool = async (url, name, args = {}) => (await mcp(url, "tools/call", { name, arguments: args })).j.result;
const one = (sql, ...a) => env.DB.prepare(sql).bind(...a).first();

const admin = (await call("POST", "login", { password: "clave-general-123" })).cookie; assert.ok(admin);
await call("GET", "categories", null, admin);
await call("POST", "categories", { kind: "posts", label: "Dicas de viagem" }, admin);
await env.DB.prepare("INSERT INTO packages (slug,title,category,price,excerpt,published) VALUES ('city-tour','City Tour Clássico','city-tour','R$ 180','4h30 pela cidade',1)").run();

// 1) Panel: crear conexión (solo admin), la dirección se ve una vez y en la base queda el hash
let r = await call("POST", "claude-keys", { name: "Claude de Mario", can_publish: false }, admin);
assert.equal(r.status, 200, JSON.stringify(r.data));
const url = r.data.url, token = r.data.token;
assert.ok(/^https:\/\/x\.test\/mcp\/gvk_[\w-]{30,}$/.test(url), url);
const row = await one("SELECT * FROM api_keys WHERE id=?", r.data.id);
assert.ok(row.hash.length === 64 && !JSON.stringify(row).includes(token), "no se guarda la clave en texto");
const list = (await call("GET", "claude-keys", null, admin)).data.keys;
assert.ok(list.length === 1 && !JSON.stringify(list).includes(token), "el listado no devuelve la clave");
const editor = await manejarClaude({ ctx: {}, request: new Request("https://x.test/api/claude-keys"), env, url: new URL("https://x.test/api/claude-keys"), res: "claude-keys", method: "GET", user: { id: 5, role: "editor" } });
assert.equal(editor.status, 403, "un editor no puede crear conexiones");
assert.equal((await call("GET", "claude-keys")).status, 401, "sin sesión, nada");
console.log("✓ panel: solo administradores crean conexiones; la clave se muestra una vez y se guarda solo su hash");

// 2) Protocolo: initialize, notificación, tools/list, GET no permitido, clave inválida
r = await mcp(url, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "claude-ai", version: "1" } });
assert.equal(r.status, 200); assert.equal(r.j.result.protocolVersion, "2025-06-18");
assert.ok(r.j.result.capabilities.tools && r.j.result.instructions.includes("português do Brasil") === false && /portugués de Brasil/.test(r.j.result.instructions));
assert.ok(/SOLO borradores/.test(r.j.result.instructions), "explica el permiso de la clave");
r = await mcp(url, "initialize", { protocolVersion: "1999-01-01" }); assert.equal(r.j.result.protocolVersion, "2025-06-18", "versión desconocida → la soportada");
r = await mcp(url, "notifications/initialized", null, { note: true }); assert.equal(r.status, 202);
r = await mcp(url, "tools/list"); const names = r.j.result.tools.map((t) => t.name);
assert.deepEqual(names, ["blog_listar_categorias", "blog_listar_entradas", "blog_ver_entrada", "blog_crear_entrada", "blog_editar_entrada", "blog_subir_imagen", "sitio_listar_paquetes"]);
assert.ok(!names.some((n) => /borrar|eliminar|delete/.test(n)), "no hay herramientas para borrar");
r = await mcp(url, null, null, { http: "GET" }); assert.equal(r.status, 405);
r = await mcp("https://x.test/mcp/gvk_" + "x".repeat(40), "tools/list", null, { ip: "10.9.9.9" }); assert.equal(r.status, 401);
r = await mcp("https://x.test/mcp", "tools/list", null, { headers: { authorization: "Bearer " + token } }); assert.equal(r.status, 200, "también acepta la clave en Authorization");
r = await mcp(url, "metodo/raro"); assert.equal(r.j.error.code, -32601);
console.log("✓ protocolo MCP: initialize, notificaciones (202), tools/list, clave por dirección o encabezado, errores");

// 3) Lectura
let t = await tool(url, "blog_listar_categorias");
assert.ok(t.structuredContent.categorias.some((c) => c.clave === "dicas-de-viagem"));
t = await tool(url, "sitio_listar_paquetes", { buscar: "city" });
assert.deepEqual(t.structuredContent.paquetes.map((p) => p.enlace_interno), ["/paquetes/city-tour/"]);
console.log("✓ lectura: categorías y paquetes para enlazar");

// 4) Crear en borrador (Markdown → HTML), con autoría, historial y sin poder publicar
const md = "Buenos Aires em três dias.\n\n## Dia 1: centro histórico\n\nComece pela **Plaza de Mayo** e faça o [city tour](/paquetes/city-tour/).\n\n- Obelisco\n- Casa Rosada\n\n## Dia 2\n\nTexto.";
t = await tool(url, "blog_crear_entrada", { titulo: "Buenos Aires em 3 dias: roteiro completo", contenido: md, categoria: "Dicas de viagem", seo_descripcion: "Roteiro de 3 dias em Buenos Aires com dicas práticas, bairros e passeios." });
assert.ok(!t.isError, JSON.stringify(t)); assert.equal(t.structuredContent.estado, "borrador");
const id = t.structuredContent.id;
let p = await one("SELECT * FROM posts WHERE id=?", id);
assert.equal(p.published, 0); assert.equal(p.category, "dicas-de-viagem");
assert.ok(p.content.includes("<h2>Dia 1: centro histórico</h2>") && p.content.includes('<a href="/paquetes/city-tour/">city tour</a>') && p.content.includes("<li>Obelisco</li>"), p.content);
assert.ok(p.excerpt.length > 10, "el resumen se completa solo");
assert.ok(t.structuredContent.editar_en_el_panel.endsWith(`/admin/#posts/${id}`), "enlace directo al formulario");
const act = await one("SELECT * FROM activity ORDER BY id DESC LIMIT 1"); assert.ok(act.detail.includes("vía Claude"), act.detail);
t = await tool(url, "blog_crear_entrada", { titulo: "Outra nota qualquer", contenido: "<p>Oi</p>", publicar: true });
assert.ok(t.isError && /no puede publicar/.test(t.content[0].text));
t = await tool(url, "blog_crear_entrada", { titulo: "Nota mal", contenido: "<p>x</p>", categoria: "nao-existe" });
assert.ok(t.isError && /Categorías disponibles/.test(t.content[0].text), t.content[0].text);
console.log("✓ crear: queda en borrador, Markdown pasa a HTML, firma e historial; no publica ni inventa categorías");

// 5) Editar: solo los campos enviados; con clave de borradores no toca notas publicadas
t = await tool(url, "blog_editar_entrada", { id, resumen: "Roteiro de três dias." });
assert.ok(!t.isError, JSON.stringify(t));
p = await one("SELECT * FROM posts WHERE id=?", id);
assert.equal(p.excerpt, "Roteiro de três dias."); assert.ok(p.content.includes("Dia 1"), "el contenido no se pierde");
await env.DB.prepare("UPDATE posts SET published=1 WHERE id=?").bind(id).run();
t = await tool(url, "blog_editar_entrada", { id, titulo: "Cambiado" });
assert.ok(t.isError && /solo puede editar borradores/.test(t.content[0].text));
console.log("✓ editar: cambia solo lo pedido y respeta las notas publicadas");

// 6) Clave que puede publicar
const pub = (await call("POST", "claude-keys", { name: "Publicadora", can_publish: true }, admin)).data.url;
assert.ok(/PUEDE publicar/.test((await mcp(pub, "initialize", { protocolVersion: "2025-06-18" })).j.result.instructions));
t = await tool(pub, "blog_crear_entrada", { titulo: "Delta do Tigre: guia completo", contenido: "<h2>Como chegar</h2><p>De trem ou de lancha.</p>", publicar: true });
assert.equal(t.structuredContent.estado, "publicada");
t = await tool(pub, "blog_editar_entrada", { id, titulo: "Buenos Aires em 3 dias: o roteiro" });
assert.ok(!t.isError); assert.equal((await one("SELECT published FROM posts WHERE id=?", id)).published, 1, "editar no despublica");
const pg = await site({ request: new Request("https://x.test/blog/delta-do-tigre-guia-completo/"), env, next: async () => new Response("", { status: 404 }), waitUntil: () => {} });
assert.equal(pg.status, 200, "la nota publicada se ve en el sitio");
console.log("✓ clave que puede publicar: publica cuando se pide y editar no cambia el estado");

// 7) Imagen desde URL (se valida el contenido real) y lista de notas
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1]);
globalThis.fetch = async (u) => (String(u).includes("ok.png") ? new Response(PNG, { headers: { "content-type": "image/png" } }) : new Response("<html>", { headers: { "content-type": "text/html" } }));
t = await tool(url, "blog_subir_imagen", { url: "https://img.example/ok.png" });
assert.ok(/^\/media\/[\w-]+\.png$/.test(t.structuredContent.imagen)); assert.equal(stored.size, 1);
t = await tool(url, "blog_subir_imagen", { url: "https://img.example/pagina" }); assert.ok(t.isError);
t = await tool(url, "blog_subir_imagen", { url: "http://img.example/ok.png" }); assert.ok(t.isError, "solo https");
t = await tool(url, "blog_listar_entradas", { estado: "publicadas" });
assert.equal(t.structuredContent.entradas.length, 2);
console.log("✓ imágenes: solo https y solo imágenes reales; listado por estado");

// 8) Revocar corta el acceso en el acto; el sitio deja pasar /mcp a la función
await call("DELETE", "claude-keys/" + row.id, null, admin);
r = await mcp(url, "tools/list", null, { ip: "10.4.0.2" }); assert.equal(r.status, 401);
const passed = await site({ request: new Request("https://x.test/mcp/" + token, { method: "POST" }), env, next: async () => new Response("next"), waitUntil: () => {} });
assert.equal(await passed.text(), "next", "el middleware no intercepta /mcp");
assert.ok(mdToHtml("# Título\nlinha").startsWith("<h2>"), "un # de Markdown no genera un segundo H1");
console.log("✓ revocar: la dirección deja de funcionar al instante");

console.log("\nTodo OK");

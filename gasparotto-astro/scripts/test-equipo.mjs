// Prueba de Equipo: autoría, historial, rendimiento, actividades, favoritos y mapa de calor. SQLite real, sin red.
// Uso: npm run test:equipo   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";
import { periodKey, cleanLinks } from "../functions/lib/activity.js";
import { todayBA, addDays } from "../functions/lib/booking.js";

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
const env = { DB: d1(), ADMIN_PASSWORD: "clave-general-123" };
let ip = 0;
async function call(method, path, body, cookie, extraHeaders = {}) {
  const parts = path.split("?")[0].split("/");
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.1." + (ip++ % 250) + ".1", ...extraHeaders };
  if (cookie) headers.cookie = cookie;
  const r = await onRequest({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: parts } });
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  const text = await r.text();
  return { status: r.status, data: text ? JSON.parse(text) : null, cookie: ck ? "gv_admin=" + ck : "" };
}
const login = async (email, password) => (await call("POST", "login", { email, password })).cookie;

// Preparación: un administrador (clave general), dos usuarios
const owner = (await call("POST", "login", { password: "clave-general-123" })).cookie;
const mk = async (name, email, role) => (await call("POST", "users", { name, email, password: "clave-larga-123", role }, owner)).data.id;
const anaId = await mk("Ana", "ana@a.com", "editor"), luisId = await mk("Luis", "luis@a.com", "editor");
const ana = await login("ana@a.com", "clave-larga-123"), luis = await login("luis@a.com", "clave-larga-123");

// 1) autoría + historial
let r = await call("POST", "posts", { title: "Qué ver en Buenos Aires", content: "<p>texto</p>", published: 1 }, ana);
assert.equal(r.status, 200); const post1 = r.data.id;
r = await call("POST", "posts", { title: "Borrador de Luis", content: "<p>x</p>", published: 0 }, luis); const post2 = r.data.id;
r = await call("PUT", "posts/" + post2, { title: "Borrador de Luis", content: "<p>x</p>", published: 1 }, luis); assert.equal(r.status, 200);
r = await call("PUT", "posts/" + post1, { title: "Qué ver en Buenos Aires", content: "<p>texto 2</p>", published: 1 }, luis);
const row = (id) => env.DB._raw.prepare("SELECT created_by, updated_by FROM posts WHERE id=?").get(id);
assert.deepEqual({ ...row(post1) }, { created_by: anaId, updated_by: luisId });
assert.equal(row(post2).created_by, luisId);
console.log("✓ cada entrada guarda quién la creó y quién la editó por última vez");

r = await call("GET", "activity?days=30", null, owner);
const acts = r.data.rows.map((x) => `${x.user_name}|${x.action}|${x.entity}|${x.detail}`);
assert.ok(acts.includes("Ana|creó|entrada|publicado"));
assert.ok(acts.includes("Luis|creó|entrada|borrador"));
assert.ok(acts.includes("Luis|publicó|entrada|publicado"), "pasar de borrador a publicado queda como 'publicó'");
assert.ok(acts.includes("Luis|editó|entrada|"));
assert.ok(acts.includes("Ana|ingresó|sesión|"));
assert.ok(r.data.rows.every((x) => !JSON.stringify(x).includes("clave-larga")), "el historial no guarda claves");
console.log("✓ historial: crear, borrador, publicar, editar e ingresar quedan registrados");

r = await call("GET", "activity?days=30&user=" + anaId, null, owner);
assert.ok(r.data.rows.length >= 2 && r.data.rows.every((x) => x.user_id === anaId));
r = await call("GET", "activity", null, ana); assert.equal(r.status, 403);
console.log("✓ filtro por persona; el editor no ve el historial");

// 2) rendimiento
r = await call("GET", "team?days=30", null, owner);
const P = Object.fromEntries(r.data.people.map((p) => [p.name, p]));
assert.equal(P.Ana.posts_pub, 1); assert.equal(P.Luis.posts_pub, 1); assert.equal(P.Luis.posts_edit, 1);
assert.ok(P.Ana.total >= 1 && P.Ana.active_days === 1);
await call("POST", "heat-dummy", {}, owner); // ruta inexistente no debe romper nada
env.DB._raw.exec(`INSERT INTO page_views (path, variant, day, n) VALUES ('/blog/que-ver-en-buenos-aires/','',date('now'),40), ('/blog/borrador-de-luis/','',date('now'),10)`);
r = await call("GET", "team?days=30", null, owner);
assert.equal(r.data.authors[0].name, "Ana"); assert.equal(r.data.authors[0].views, 40);
assert.equal(r.data.top[0].title, "Qué ver en Buenos Aires"); assert.equal(r.data.top[0].author, "Ana");
r = await call("GET", "team", null, luis); assert.equal(r.status, 403);
console.log("✓ rendimiento: publicaciones, ediciones, visitas por autor y ranking de entradas");

// 3) actividades obligatorias
r = await call("POST", "tasks", { title: "Publicar una entrada", frequency: "weekly", assigned_to: 0 }, owner); assert.equal(r.status, 201); const t1 = r.data.id;
r = await call("POST", "tasks", { title: "Revisar precios", frequency: "monthly", assigned_to: anaId }, owner); const t2 = r.data.id;
r = await call("POST", "tasks", { title: "x", frequency: "nunca" }, owner); assert.equal(r.status, 400);
r = await call("POST", "tasks", { title: "x", frequency: "daily" }, ana); assert.equal(r.status, 403);
r = await call("GET", "tasks", null, ana);
assert.equal(r.data.mine.length, 2); assert.equal(r.data.tasks.length, 0, "el editor no ve el tablero del equipo");
r = await call("GET", "tasks", null, luis); assert.equal(r.data.mine.length, 1);
r = await call("POST", `tasks/${t2}/done`, { done: true }, luis); assert.equal(r.status, 404, "no se puede marcar la de otra persona");
r = await call("POST", `tasks/${t1}/done`, { done: true }, ana); assert.equal(r.status, 200);
r = await call("POST", `tasks/${t1}/done`, { done: true }, ana); assert.equal(r.status, 200); // idempotente
r = await call("POST", `tasks/${t1}/done`, { done: true }, owner); assert.equal(r.status, 400, "la clave general no identifica a nadie");
r = await call("GET", "tasks", null, owner);
const b1 = r.data.tasks.find((t) => t.id === t1);
assert.equal(b1.pending, 1); assert.equal(b1.status.find((s) => s.name === "Ana").done, true);
r = await call("GET", "team?days=30", null, owner);
assert.deepEqual(r.data.people.find((p) => p.name === "Ana").tasks, { done: 1, total: 2 });
r = await call("POST", `tasks/${t1}/done`, { done: false }, ana);
assert.equal((await call("GET", "tasks", null, ana)).data.mine.find((t) => t.id === t1).done, false);
assert.equal(periodKey("weekly", "2026-11-01"), "w2026-10-26"); assert.equal(periodKey("weekly", "2026-11-02"), "w2026-11-02"); assert.equal(periodKey("monthly", "2026-11-01"), "2026-11");
r = await call("DELETE", "tasks/" + t2, null, owner); assert.equal(r.status, 200);
console.log("✓ actividades: alta solo admin, cada persona marca las suyas, período semanal/mensual, cumplimiento en Rendimiento");

// 4) favoritos
env.DB._raw.exec(`INSERT INTO packages (slug,title,category,published) VALUES ('a','Tango','tangos',1),('b','Delta','tangos',1),('c','City tour','tangos',1),('d','Iguazú','tangos',1)`);
r = await call("GET", "favorites", null, ana); assert.equal(r.status, 200); assert.equal(r.data.packages.length, 4);
const ids = Object.fromEntries(r.data.packages.map((p) => [p.slug, p.id]));
r = await call("PUT", "favorites", { packages: [ids.c, ids.a], posts: [post1] }, ana); assert.equal(r.status, 200);
r = await call("GET", "favorites", null, ana);
assert.deepEqual(r.data.packages.filter((p) => p.featured).map((p) => p.slug), ["c", "a"]);
assert.equal(r.data.posts.find((p) => p.id === post1).featured, 1); assert.equal(r.data.posts.find((p) => p.id === post2).featured, 0);
r = await call("PUT", "favorites", { packages: [ids.d] }, ana);
assert.deepEqual((await call("GET", "favorites", null, ana)).data.packages.filter((p) => p.featured).map((p) => p.slug), ["d"]);
assert.equal((await call("GET", "favorites", null, ana)).data.posts.find((p) => p.id === post1).featured, 1, "si no se manda 'posts' no se tocan las entradas");
console.log("✓ favoritos: orden manual, reemplazo y entradas destacadas");

// 5) mapa de calor
const beacon = (b, h = {}) => call("POST", "track", b, null, { origin: "https://x.test", "user-agent": "Mozilla/5.0 iPhone", ...h });
for (let i = 0; i < 10; i++) assert.equal((await beacon({ p: "/", v: "m", d: i < 3 ? 2 : i < 6 ? 5 : 10, c: i < 4 ? ["hero › botón: Reservar", "nav › enlace: Blog"] : [] })).status, 204);
await beacon({ p: "/", v: "d", d: 10, c: ["hero › botón: Reservar"] });
await beacon({ p: "/", v: "d", d: 10 }, { "user-agent": "Googlebot/2.1" }); // bot: ignorado
await beacon({ p: "/admin/", v: "d", d: 3 }); await beacon({ p: "/api/x", v: "d", d: 3 }); await beacon({ p: "no-es-ruta", v: "d", d: 3 }); // rutas inválidas: ignoradas
await beacon({ p: "/", v: "d", d: 99 }); // profundidad inválida: no cuenta
await call("POST", "track", { p: "/", v: "d", d: 4 }, null, { origin: "https://otro.com" }); // otro origen: ignorado
r = await call("GET", "heat?days=30", null, ana);
assert.deepEqual(r.data.pages, [{ path: "/", visits: 11 }]);
r = await call("GET", "heat?days=30&path=/", null, ana);
assert.equal(r.data.visits, 11);
// 3 visitas llegaron hasta el 20%, 3 hasta el 50% y 5 hasta el final: llegaron a cada décima 11, 11, 8, 8, 8, 5, 5, 5, 5, 5
assert.deepEqual(r.data.reach, [11, 11, 8, 8, 8, 5, 5, 5, 5, 5]);
assert.equal(r.data.clicks[0].target, "hero › botón: Reservar"); assert.equal(r.data.clicks[0].n, 5);
assert.ok(r.data.mobile_share > 0.9 && r.data.mobile_share < 0.92);
r = await call("GET", "heat?days=30&path=/&dev=d", null, ana); assert.equal(r.data.visits, 1);
console.log("✓ mapa de calor: profundidad por tramo, clics, celular/escritorio; bots y datos inválidos ignorados");

// 8) links adjuntos en las actividades
assert.deepEqual(cleanLinks("Guía | https://ejemplo.com/guia\nwww.drive.com/x").links.map((l) => [l.label, l.url]), [["Guía", "https://ejemplo.com/guia"], ["drive.com", "https://www.drive.com/x"]]);
assert.equal(cleanLinks("javascript:alert(1)").bad, 1, "javascript: se rechaza"); assert.equal(cleanLinks("data:text/html,<b>").bad, 1);
assert.equal(cleanLinks(Array.from({ length: 10 }, (_, i) => ({ url: `https://a${i}.com` }))).links.length, 8, "máximo 8 links");
r = await call("POST", "tasks", { title: "Subir fotos del tour", frequency: "daily", assigned_to: anaId, links: [{ label: "Carpeta", url: "https://drive.google.com/abc" }, { url: "https://ejemplo.com/pauta" }] }, owner);
assert.equal(r.status, 201); const tL = r.data.id;
r = await call("POST", "tasks", { title: "Con link malo", frequency: "daily", links: "javascript:alert(1)" }, owner); assert.equal(r.status, 400);
r = await call("GET", "tasks", null, ana);
assert.deepEqual(r.data.mine.find((t) => t.id === tL).links, [{ label: "Carpeta", url: "https://drive.google.com/abc" }, { label: "ejemplo.com", url: "https://ejemplo.com/pauta" }]);
r = await call("GET", "tasks", null, luis); assert.ok(!r.data.mine.some((t) => t.id === tL), "Luis no ve la de Ana");
r = await call("PUT", "tasks/" + tL, { title: "Subir fotos del tour", frequency: "daily", assigned_to: anaId, active: 0 }, owner); // pausar sin mandar links: se conservan
assert.equal(r.status, 200);
r = await call("GET", "tasks", null, owner); assert.equal(r.data.tasks.find((t) => t.id === tL).links.length, 2, "pausar no borra los links");
r = await call("PUT", "tasks/" + tL, { title: "Subir fotos del tour", frequency: "daily", assigned_to: anaId, active: 1, links: "" }, owner);
r = await call("GET", "tasks", null, owner); assert.equal(r.data.tasks.find((t) => t.id === tL).links.length, 0, "links vacío = quitar");
await call("PUT", "tasks/" + tL, { title: "Subir fotos del tour", frequency: "daily", assigned_to: anaId, active: 1, links: "Pauta | https://ejemplo.com/pauta" }, owner);
console.log("✓ actividades: links adjuntos (varios, con etiqueta), solo http(s), máximo 8, se conservan al pausar");

// 9) reporte de cumplimiento: actividad diaria creada hace 5 días, hecha 2 de los 5 días ya cerrados
const today = todayBA(), raw = env.DB._raw;
raw.prepare("UPDATE tasks SET created_at=? WHERE id=?").run(addDays(today, -5) + " 10:00:00", tL);
for (const k of [-4, -2]) raw.prepare("INSERT INTO task_done (task_id, user_id, period) VALUES (?,?,?)").run(tL, anaId, addDays(today, k));
r = await call("GET", "tasks/report?days=30", null, ana); assert.equal(r.status, 403, "el editor no ve el reporte");
r = await call("GET", "tasks/report?days=30", null, owner); assert.equal(r.status, 200);
const rt = r.data.tasks.find((t) => t.id === tL);
assert.deepEqual([rt.done, rt.missed, rt.open, rt.rate], [2, 3, 1, 40]);
assert.equal(rt.people.length, 1); assert.equal(rt.people[0].name, "Ana");
assert.equal(r.data.missed.filter((m) => m.task_id === tL).length, 3);
assert.equal(r.data.people.find((p) => p.name === "Ana").missed >= 3, true);
r = await call("GET", "tasks/report?days=2", null, owner); // ventana corta: solo cuenta lo que cae dentro (ayer y hoy)
const rt2 = r.data.tasks.find((t) => t.id === tL); assert.deepEqual([rt2.done, rt2.missed, rt2.open], [0, 1, 1]);
console.log("✓ reporte: hechas / no hechas / en curso por actividad y por persona, con la ventana elegida");

// 10) avisos
r = await call("GET", "alerts", null, ana); assert.equal(r.status, 200);
assert.ok(r.data.alerts.some((a) => a.key === `p${tL}` && a.level === "warn" && /ayer/.test(a.text)), "avisa que ayer no la hizo");
assert.ok(r.data.alerts.some((a) => a.key === `t${tL}`), "avisa que hoy la tiene pendiente");
assert.ok(!r.data.alerts.some((a) => a.tab === "actrep"), "el editor no ve avisos del equipo");
r = await call("GET", "alerts", null, luis); assert.ok(!r.data.alerts.some((a) => a.key === `t${tL}`), "cada uno ve lo suyo");
r = await call("GET", "alerts", null, owner);
assert.ok(r.data.alerts.some((a) => a.key === "team-miss"), "el administrador ve lo que el equipo dejó sin cumplir");
assert.ok(r.data.counts.warn >= 1 && r.data.alerts[0].level !== "info" || r.data.counts.bad === 0);
await call("POST", "tasks", { title: "Vencida", frequency: "once", due_day: addDays(today, -1), assigned_to: luisId }, owner);
r = await call("GET", "alerts", null, luis); assert.ok(r.data.alerts.some((a) => a.level === "bad" && /vencida/i.test(a.text)));
assert.equal(r.data.alerts[0].level, "bad", "lo más grave va primero");
r = await call("GET", "alerts", null, owner); assert.ok(r.data.alerts.some((a) => a.tab === "actrep" && a.level === "bad"));
console.log("✓ avisos: pendientes, vencidas, período anterior sin cumplir; el editor ve lo suyo y el administrador también lo del equipo");

// 11) constancia al completar: nota y link opcionales; se ven en el reporte
r = await call("POST", `tasks/${tL}/done`, { done: true, note: "Subí 12 fotos", link: "https://drive.google.com/fotos" }, ana); assert.equal(r.status, 200);
r = await call("POST", `tasks/${tL}/done`, { done: true, link: "javascript:alert(1)" }, ana); assert.equal(r.status, 400, "link de constancia inválido");
r = await call("GET", "tasks", null, ana); const mine = r.data.mine.find((t) => t.id === tL);
assert.equal(mine.done, true); assert.equal(mine.note, "Subí 12 fotos"); assert.equal(mine.link, "https://drive.google.com/fotos");
r = await call("GET", "tasks/report?days=30", null, owner);
const ent = r.data.recent.find((x) => x.task_id === tL && x.note);
assert.deepEqual([ent.name, ent.note], ["Ana", "Subí 12 fotos"]);
await call("POST", `tasks/${tL}/done`, { done: true }, ana); // volver a marcar sin datos: actualiza la constancia, no duplica
r = await call("GET", "tasks/report?days=30", null, owner); assert.ok(!r.data.recent.some((x) => x.task_id === tL && x.note));
assert.equal(r.data.tasks.find((t) => t.id === tL).done, 3, "sigue contando una sola vez (2 anteriores + hoy)");
console.log("✓ constancia: nota y link al completar, link validado, visible en el reporte");

// 12) revisión del administrador y aviso de actividad nueva
await call("POST", `tasks/${tL}/done`, { done: true, note: "listo", link: "https://ejemplo.com/ok" }, ana);
r = await call("GET", "alerts", null, owner); assert.ok(r.data.alerts.some((a) => a.key === "unrev"), "el admin ve entregas sin revisar");
const per = (await call("GET", "tasks", null, ana)).data.mine.find((t) => t.id === tL);
const per0 = (await call("GET", "tasks/report?days=30", null, owner)).data.recent.find((x) => x.task_id === tL && x.note === "listo").period;
r = await call("PUT", `tasks/${tL}/review`, { user_id: anaId, period: per0, status: "redo" }, owner); assert.equal(r.status, 400, "corrección sin motivo");
r = await call("PUT", `tasks/${tL}/review`, { user_id: anaId, period: per0, status: "redo", review_note: "Faltan las fotos del Obelisco" }, ana); assert.equal(r.status, 403, "el editor no revisa");
r = await call("PUT", `tasks/${tL}/review`, { user_id: anaId, period: "no-existe", status: "ok" }, owner); assert.equal(r.status, 404);
r = await call("PUT", `tasks/${tL}/review`, { user_id: anaId, period: per0, status: "redo", review_note: "Faltan las fotos del Obelisco" }, owner); assert.equal(r.status, 200);
r = await call("GET", "tasks", null, ana); const m1 = r.data.mine.find((t) => t.id === tL); assert.deepEqual([m1.review, m1.review_note], ["redo", "Faltan las fotos del Obelisco"]);
r = await call("GET", "alerts", null, ana); assert.ok(r.data.alerts.some((a) => a.key === `rv${tL}` && /Obelisco/.test(a.text)), "Ana recibe el pedido de corrección");
r = await call("GET", "alerts", null, owner); assert.ok(!r.data.alerts.some((a) => a.key === "unrev"), "ya no hay nada sin revisar");
await call("POST", `tasks/${tL}/done`, { done: true, note: "agregué las fotos" }, ana); // entregar de nuevo limpia la revisión
r = await call("GET", "tasks", null, ana); assert.equal(r.data.mine.find((t) => t.id === tL).review, "");
r = await call("PUT", `tasks/${tL}/review`, { user_id: anaId, period: per0, status: "ok", review_note: "Perfecto" }, owner); assert.equal(r.status, 200);
r = await call("GET", "tasks", null, ana); assert.equal(r.data.mine.find((t) => t.id === tL).review, "ok");
r = await call("GET", "activity?days=1", null, owner); assert.ok(r.data.rows.some((x) => x.action === "revisó"), "la revisión queda en el historial");
const nuevaId = (await call("POST", "tasks", { title: "Armar el itinerario del mes", frequency: "monthly", assigned_to: luisId }, owner)).data.id;
r = await call("GET", "alerts", null, luis); assert.ok(r.data.alerts.some((a) => a.key === `t${nuevaId}` && a.level === "warn" && /Nueva actividad/.test(a.text)), "aviso de actividad nueva");
r = await call("GET", "alerts", null, ana); assert.ok(!r.data.alerts.some((a) => a.key === `t${nuevaId}`), "solo a quien se la asignaron");
raw.prepare("UPDATE tasks SET created_at=? WHERE id=?").run(addDays(today, -10) + " 10:00:00", nuevaId);
r = await call("GET", "alerts", null, luis); assert.ok(!r.data.alerts.some((a) => a.key === `t${nuevaId}` && /Nueva/.test(a.text)), "pasados 3 días deja de ser nueva");
console.log("✓ revisión (aprobar / pedir corrección con motivo), aviso a la persona, historial y aviso de actividad nueva");

console.log("\nTodo OK");

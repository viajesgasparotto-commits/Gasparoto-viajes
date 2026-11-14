// Subcategorías y opciones con precio (ej. tango: Solo show · Jantar show · Platea VIP), de punta a punta:
// panel (guardar, subcategorías, renombrar/borrar categoría), reserva con opción, ficha pública y listado filtrado.
// Uso: npm run test:opciones   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/[[path]].js";
import { onRequest as site } from "../functions/_middleware.js";
import { normMeta, optionsOf, cheapestOption, precio, qtyTable } from "../functions/lib/ficha.js";
import { kidsScope, kidsTiersFor, priceTotal, tiersFor } from "../functions/lib/booking.js";
import { pickFlash, flashTile } from "../functions/lib/flash.js";
import { addDays, todayBA } from "../functions/lib/booking.js";

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
const env = { DB: d1(), IMAGES: { put: async () => {} }, ASSETS: { fetch: async () => new Response("", { status: 404 }) }, ADMIN_PASSWORD: "clave-general-123", WHATSAPP_NUMBER: "5491155551234", SITE_LANG: "pt-BR", PRICE_CURRENCY: "BRL" };
let ip = 0;
async function call(method, path, body, cookie) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": "10.9." + (ip++ % 250) + ".1" };
  if (cookie) headers.cookie = cookie;
  const r = await onRequest({ request: new Request("https://x.test/api/" + path, { method, headers, body: body && JSON.stringify(body) }), env, params: { path: path.split("?")[0].split("/") } });
  const ck = (r.headers.get("set-cookie") || "").match(/gv_admin=([\w.]+)/)?.[1];
  const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, data, cookie: ck ? "gv_admin=" + ck : "" };
}
const page = async (path) => { const r = await site({ request: new Request("https://x.test" + path), env, next: async () => new Response("", { status: 404 }), waitUntil: () => {} }); return { status: r.status, html: await r.text() }; };
const one = (sql, ...a) => env.DB.prepare(sql).bind(...a).first();

// 0) Normalización: sin nombre o sin precio numérico se descarta; nombres repetidos, se queda el primero; la más barata manda.
const m0 = JSON.parse(normMeta({ options: [["Solo show", "R$ 200"], ["Jantar show", "R$ 1.350,50", "R$ 1.500", "Cena 3 pasos"], ["solo show", "R$ 9"], ["Sem preço", "consultar"], ["", "R$ 3"]] }));
assert.deepEqual(m0.options.map((o) => o[0]), ["Solo show", "Jantar show"]);
const o0 = optionsOf({ meta: JSON.stringify(m0) });
assert.equal(o0[1].cents, 135050); assert.equal(cheapestOption(o0).name, "Solo show");
console.log("✓ opciones: se normalizan (sin precio, vacías y repetidas afuera) y se calcula la más barata");

const admin = (await call("POST", "login", { password: "clave-general-123" })).cookie; assert.ok(admin);
await call("GET", "categories", null, admin); // crea el esquema
// Tangos (página fija) existe por las categorías sembradas; si no, se crea
let cats = (await call("GET", "categories", null, admin)).data;
let tango = cats.find((c) => c.kind === "packages" && /tango/.test(c.slug));
if (!tango) { await call("POST", "categories", { kind: "packages", label: "Tangos" }, admin); cats = (await call("GET", "categories", null, admin)).data; tango = cats.find((c) => c.slug === "tangos"); }
await call("POST", "categories", { kind: "packages", label: "Shows" }, admin);

// 1) Subcategorías: alta, duplicado, categoría inexistente
let r = await call("POST", "subcategories", { parent: tango.slug, label: "Com jantar" }, admin); assert.equal(r.status, 200, JSON.stringify(r.data));
const subCena = r.data.id;
r = await call("POST", "subcategories", { parent: tango.slug, label: "Só show" }, admin); assert.equal(r.status, 200);
r = await call("POST", "subcategories", { parent: tango.slug, label: "com JANTAR" }, admin); assert.equal(r.status, 409, "no repite nombres dentro de la categoría");
r = await call("POST", "subcategories", { parent: "no-existe", label: "X" }, admin); assert.equal(r.status, 400);
r = await call("POST", "subcategories", { parent: tango.slug, label: "Otra" }); assert.equal(r.status, 401, "sin sesión no se puede");
cats = (await call("GET", "categories", null, admin)).data;
assert.deepEqual(cats.find((c) => c.slug === tango.slug).subs.map((x) => x.slug), ["com-jantar", "so-show"]);
console.log("✓ subcategorías: alta, sin repetidos, solo dentro de una categoría existente y con sesión");

// 2) Guardar un servicio con opciones: el precio "a partir de" sale de la más barata; la subcategoría se valida contra la categoría
const meta = JSON.stringify({ kind: "servicio", times: [["20:00", ""]], options: [["Jantar show", "R$ 450", "R$ 520", "Jantar 3 pratos + vinho"], ["Só show", "R$ 250"], ["Platea VIP", "R$ 690", "", "Primeira fila, jantar e espumante"]] });
r = await call("POST", "packages", { title: "Tango Porteño", category: tango.slug, subcategory: "com-jantar", price: "R$ 1", price_old: "", meta, published: 1, content: "<p>Show.</p>" }, admin);
assert.equal(r.status, 200, JSON.stringify(r.data));
let p = await one("SELECT * FROM packages WHERE slug='tango-porteno'");
assert.equal(p.price, "R$ 250"); assert.equal(p.price_old, ""); assert.equal(p.subcategory, "com-jantar");
r = await call("PUT", "packages/" + p.id, { ...p, subcategory: "no-existe" }, admin); assert.equal(r.status, 200);
assert.equal((await one("SELECT subcategory s FROM packages WHERE id=?", p.id)).s, "", "subcategoría inexistente queda vacía");
r = await call("PUT", "packages/" + p.id, { ...p, category: "shows", subcategory: "com-jantar" }, admin);
assert.equal((await one("SELECT subcategory s FROM packages WHERE id=?", p.id)).s, "", "la subcategoría tiene que ser de la categoría elegida");
r = await call("PUT", "packages/" + p.id, { ...p, category: tango.slug, subcategory: "com-jantar", price: "R$ 999" }, admin);
p = await one("SELECT * FROM packages WHERE id=?", p.id);
assert.equal(p.price, "R$ 250", "con opciones, el precio a mano se ignora"); assert.equal(p.subcategory, "com-jantar");
console.log("✓ guardar: precio = opción más barata (no se carga dos veces) y subcategoría validada");

// 3) Renombrar la subcategoría arrastra los productos; renombrar la categoría arrastra las subcategorías
r = await call("PUT", "subcategories/" + subCena, { label: "Jantar show" }, admin); assert.equal(r.status, 200);
assert.equal((await one("SELECT subcategory s FROM packages WHERE id=?", p.id)).s, "jantar-show");
const shows = (await call("GET", "categories", null, admin)).data.find((c) => c.slug === "shows");
await call("POST", "subcategories", { parent: "shows", label: "Jantar show" }, admin);
await call("POST", "packages", { title: "Show en Shows", category: "shows", subcategory: "jantar-show", price: "R$ 100", meta: "{}", published: 1 }, admin);
r = await call("PUT", "categories/" + shows.id, { label: "Espetáculos", slug: "espetaculos" }, admin); assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal((await one("SELECT COUNT(*) n FROM subcategories WHERE parent='espetaculos'")).n, 1, "las subcategorías siguen a la categoría renombrada");
console.log("✓ renombrar: la subcategoría arrastra a sus productos y la categoría a sus subcategorías");

// 4) Borrar la categoría moviendo los productos: las subcategorías no se pierden (si ya existe una igual, se unen)
const esp = (await call("GET", "categories", null, admin)).data.find((c) => c.slug === "espetaculos");
r = await call("DELETE", "categories/" + esp.id + "?move_to=" + tango.slug, null, admin); assert.equal(r.status, 200, JSON.stringify(r.data));
const moved = await one("SELECT category c, subcategory s FROM packages WHERE slug='show-en-shows'");
assert.deepEqual([moved.c, moved.s], [tango.slug, "jantar-show"], "el producto conserva su subcategoría en la categoría nueva");
assert.equal((await one("SELECT COUNT(*) n FROM subcategories WHERE parent=? AND slug='jantar-show'", tango.slug)).n, 1, "se unieron, sin duplicar");
assert.equal((await one("SELECT COUNT(*) n FROM subcategories WHERE parent='espetaculos'")).n, 0);
console.log("✓ borrar categoría: productos y subcategorías pasan a la categoría elegida, sin duplicados");

// 5) Reserva con opción: el total usa el precio de la opción y la opción queda guardada
const day = addDays(todayBA(), 5);
await env.DB.prepare("UPDATE packages SET booking_enabled=1, min_pax=1, max_pax=8, daily_capacity=10, weekdays='0,1,2,3,4,5,6', min_advance_days=1, horizon_days=60 WHERE id=?").bind(p.id).run();
const book = (extra) => call("POST", "book", { slug: "tango-porteno", date: day, pax: 2, name: "Ana", phone: "+55 11 99999-0000", ...extra });
r = await book({}); assert.equal(r.status, 400); assert.equal(r.data.code, "option", "sin opción no reserva");
r = await book({ option: "9" }); assert.equal(r.data.code, "option");
r = await book({ option: "2" }); assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.total, 1380); assert.equal(r.data.option, "Platea VIP");
let b = await one("SELECT option_name, total FROM bookings WHERE id=?", r.data.id);
assert.deepEqual([b.option_name, b.total], ["Platea VIP", 138000]);
r = await call("POST", "book", { slug: "tango-porteno", date: day, pax: 1, name: "Bia", phone: "+55 21 98888-1111", option: "só show" }); // por nombre, sin importar mayúsculas
assert.equal(r.data.total, 250);
const lead = await one("SELECT message FROM leads ORDER BY id DESC LIMIT 1"); assert.ok(lead.message.includes("Só show"), lead.message);
const st = (await call("GET", "avail?slug=tango-porteno&month=" + day.slice(0, 7))).data; assert.equal(st.days[day], 7, "todas las opciones comparten el cupo");
const list = (await call("GET", "bookings", null, admin)).data.bookings; assert.ok(list.some((x) => x.option_name === "Platea VIP"), "el panel ve la opción");
console.log("✓ reserva: exige opción, cobra su precio, la guarda (panel y consulta) y comparte el cupo");

// 6) Ficha pública: selector con la más barata marcada, lista de precios y AggregateOffer
let h = (await page("/paquetes/tango-porteno/")).html;
assert.ok(h.includes('name="option" value="1" data-unit="25000"') && /value="1"[^>]*checked/.test(h), "queda marcada la más barata");
assert.ok(h.includes('data-unit="25000"'), "el formulario arranca con el precio de la más barata");
assert.ok(h.includes("Opções e preços") && h.includes("Platea VIP") && h.includes("Primeira fila, jantar e espumante"));
assert.ok(h.includes('"AggregateOffer"') && h.includes('"lowPrice":"250.00"') && h.includes('"highPrice":"690.00"'));
assert.ok(h.includes("?sub=jantar-show"), "la ruta de navegación lleva a la subcategoría");
console.log("✓ ficha: selector de opción, lista de precios, AggregateOffer y subcategoría en la ruta");

// 7) Listado de la categoría: fila de subcategorías y filtro ?sub= (las vacías no aparecen)
await call("POST", "packages", { title: "Tango sem jantar", category: tango.slug, subcategory: "so-show", price: "R$ 180", meta: "{}", published: 1 }, admin);
await call("POST", "subcategories", { parent: tango.slug, label: "Vazia" }, admin);
const lp = tango.listing || `/paquetes/categoria/${tango.slug}/`;
h = (await page(lp)).html;
assert.ok(h.includes("data-subcats") && h.includes(">Só show<") && h.includes(">Jantar show<") && !h.includes(">Vazia<"));
h = (await page(lp + "?sub=so-show")).html;
assert.ok(h.includes("Tango sem jantar") && !h.includes("Tango Porteño"), "?sub= filtra");
console.log("✓ listado: subcategorías como filtro, solo las que tienen algo publicado");

// 8) Quitar una subcategoría no borra productos
const soId = (await one("SELECT id FROM subcategories WHERE parent=? AND slug='so-show'", tango.slug)).id;
r = await call("DELETE", "subcategories/" + soId, null, admin); assert.equal(r.data.freed, 1);
assert.equal((await one("SELECT subcategory s FROM packages WHERE slug='tango-sem-jantar'")).s, "");
console.log("✓ quitar subcategoría: el producto queda en la categoría, sin subcategoría");

// 9) Categoría que ya no existe: nunca 404. Borrada → la redirección que dejó el panel (301); desconocida → todos los paquetes (302).
let rr = await site({ request: new Request("https://x.test/paquetes/categoria/espetaculos/"), env, next: async () => new Response("", { status: 404 }), waitUntil: () => {} });
assert.equal(rr.status, 301, "borrada → redirección del panel"); assert.ok(rr.headers.get("location").endsWith(tango.listing || `/paquetes/categoria/${tango.slug}/`), rr.headers.get("location"));
rr = await site({ request: new Request("https://x.test/paquetes/categoria/nunca-existio/"), env, next: async () => new Response("", { status: 404 }), waitUntil: () => {} });
assert.equal(rr.status, 302); assert.ok(rr.headers.get("location").endsWith("/paquetes/"));
console.log("✓ categoría borrada o inexistente: redirige, nunca da 404");

// 10) Categorías fijas de la portada: se crean solas, no se borran y no cambian de dirección (sí de nombre)
const fixed = (await call("GET", "categories", null, admin)).data.filter((c) => c.fixed);
assert.deepEqual(fixed.map((c) => c.slug).sort(), ["city-tour", "paseos", "show-de-tango"]);
const ct = fixed.find((c) => c.slug === "city-tour");
r = await call("DELETE", "categories/" + ct.id + "?move_to=" + tango.slug, null, admin); assert.equal(r.status, 409); assert.ok(/portada/.test(r.data.error));
r = await call("PUT", "categories/" + ct.id, { label: "City tours", slug: "otra-direccion" }, admin); assert.equal(r.status, 200);
const ct2 = await one("SELECT slug, label FROM categories WHERE id=?", ct.id); assert.deepEqual([ct2.slug, ct2.label], ["city-tour", "City tours"]);
console.log("✓ categorías fijas de la portada: se crean solas, no se borran ni cambian de dirección");

// 11) Políticas (menores, cancelación, otra): se normalizan, la opción tiene que existir y se muestran en la ficha
const m11 = JSON.parse(normMeta({ options: [["Só show", "R$ 250"], ["Platea VIP", "R$ 690"]], policies: [["menores", "Menores de 3 anos não pagam.\nMenores de 18 com adulto.", ""], ["menores", "Platea VIP: só maiores de 12.", "platea vip"], ["cancelacion", "Sem custo até 48 h antes.", "No existe"], ["otra", "Não é permitido animais.", "", "Mascotes"], ["inventado", "Texto", "", ""], ["pagos", "   ", ""]] }));
assert.equal(m11.policies.length, 5, "sin texto se descarta");
assert.deepEqual(m11.policies[1], ["menores", "Platea VIP: só maiores de 12.", "Platea VIP", ""], "la opción se iguala al nombre guardado");
assert.equal(m11.policies[2][2], "", "opción inexistente → vale para todo el producto");
assert.deepEqual(m11.policies[3], ["otra", "Não é permitido animais.", "", "Mascotes"]);
assert.equal(m11.policies[4][0], "otra", "tipo desconocido → otra");
const pv = await one("SELECT * FROM packages WHERE slug='tango-porteno'");
const meta11 = JSON.stringify({ ...JSON.parse(pv.meta), policies: m11.policies.slice(0, 4) });
r = await call("PUT", "packages/" + pv.id, { ...pv, meta: meta11 }, admin); assert.equal(r.status, 200);
assert.equal(JSON.parse((await one("SELECT meta FROM packages WHERE id=?", pv.id)).meta).policies.length, 4);
h = (await page("/paquetes/tango-porteno/")).html;
assert.ok(h.includes('id="politicas"') && h.includes(">Políticas<"), "sección de políticas");
assert.ok(h.includes("Menores de idade") && h.includes("Cancelamento") && h.includes("Mascotes"), "títulos por tipo en pt-BR y título propio");
assert.ok(h.includes("<p>Menores de 3 anos não pagam.</p><p>Menores de 18 com adulto.</p>"), "una línea = un párrafo");
assert.ok(h.includes("Só para: Platea VIP"), "política de una opción");
assert.ok(h.includes('class="gvo-pol"') && h.includes("Antes de reservar, confira as políticas"), "aviso en la opción y en el formulario");
assert.ok(h.indexOf('id="politicas"') > h.indexOf("Opções e preços"), "va después de las opciones");
r = await call("PUT", "packages/" + pv.id, { ...pv, meta: JSON.stringify({ ...JSON.parse(pv.meta), policies: [] }) }, admin);
h = (await page("/paquetes/tango-porteno/")).html;
assert.ok(!h.includes('id="politicas"') && !h.includes("confira as políticas"), "sin políticas no se muestra nada");
console.log("✓ políticas: menores, cancelación y otras; por opción o para todo; se muestran en la ficha");

// Precios escritos sin "$" (R 150) se guardan bien: R$ 150 (en el precio, las opciones y la boletería).
assert.equal(precio("R 150"), "R$ 150"); assert.equal(precio(" R$150"), "R$ 150"); assert.equal(precio("US$ 50"), "US$ 50"); assert.equal(precio("Consultar"), "Consultar");
const nm = JSON.parse(normMeta(JSON.stringify({ box: "R 600", options: [["Solo show", "R 210", "R 250", ""]] })));
assert.deepEqual([nm.box, nm.options[0][1], nm.options[0][2]], ["R$ 600", "R$ 210", "R$ 250"]);
console.log("✓ precios sin $ se normalizan a R$");

// Tarifa de niños solo para la opción de la política "Menores" (ej. Tango: descuento solo en Somente Show; con jantar pagan como adulto).
const tangoK = { accepts_children: 1, kids_policy: JSON.stringify({ tiers: [{ from: 0, to: 3, pct: 0 }, { from: 4, to: 12, pct: 50 }] }),
  meta: JSON.stringify({ options: [["Jantar e Show Platea", "R$ 475", "R$ 500", ""], ["Somente Show", "R$ 210", "R$ 250", ""]], policies: [["menores", "0 a 3 anos grátis", "Somente Show", ""]] }) };
assert.deepEqual(kidsScope(tangoK), ["somente show"]);
assert.equal(kidsTiersFor(tangoK, "Somente Show").length, 2); assert.equal(kidsTiersFor(tangoK, "Jantar e Show Platea").length, 0);
assert.equal(priceTotal(21000, 2, [2, 7], tiersFor(kidsTiersFor(tangoK, "Somente Show"), 21000)), 42000 + 0 + 10500);
assert.equal(priceTotal(47500, 2, [99, 99], tiersFor(kidsTiersFor(tangoK, "Jantar e Show Platea"), 47500)), 47500 * 4, "con jantar, niños = adulto");
const general = { ...tangoK, meta: JSON.stringify({ policies: [["menores", "x", "", ""], ["menores", "y", "Somente Show", ""]] }) };
assert.deepEqual(kidsScope(general), []); assert.equal(kidsTiersFor(general, "Jantar e Show Platea").length, 2, "con una política general, valen en todas");
console.log("✓ tarifa de niños solo en la opción de la política de menores");

// Oferta relâmpago de la portada: la activa que termina antes (con reloj); si no hay, el mayor descuento real (sin reloj); vencidas no cuentan.
const fNow = Date.parse("2026-11-14T21:50:00Z");
const fRows = [{ slug: "a", title: "A", price: "R$ 210", price_old: "R$ 250", image: "/a.webp", meta: "{}" },
  { slug: "b", title: "B", price: "R$ 440", price_old: "R$ 490", image: "/b.webp", meta: JSON.stringify({ flash: "2026-11-16T23:59" }) },
  { slug: "c", title: "C", price: "R$ 100", price_old: "", image: "/c.webp", meta: JSON.stringify({ flash: "2026-11-10T23:59" }) }];
let fl = pickFlash(fRows, fNow); assert.equal(fl.p.slug, "b"); assert.equal(new Date(fl.end).toISOString(), "2026-11-17T02:59:00.000Z", "hora de Buenos Aires");
assert.ok(flashTile(fl, { lang: "pt" }).includes("data-flash-end") && flashTile(fl, { lang: "pt" }).includes("-10%"));
fl = pickFlash(fRows.filter((r) => r.slug !== "b"), fNow); assert.equal(fl.p.slug, "a"); assert.equal(fl.end, 0); assert.ok(!flashTile(fl, { lang: "pt" }).includes("data-flash-end"), "sin fecha no hay reloj");
assert.equal(pickFlash([fRows[2]], fNow), null, "sin oferta ni descuento: queda el panel de siempre");
assert.equal(JSON.parse(normMeta(JSON.stringify({ flash: "2026-11-20T23:59" }))).flash, "2026-11-20T23:59"); assert.equal(JSON.parse(normMeta(JSON.stringify({ flash: "mañana" }))).flash, "");
console.log("✓ oferta relâmpago: reloj real hasta la hora del panel; si no, mayor descuento sin reloj");

// Precio por cantidad de personas (2x1 que el panel carga a mano): la reserva cobra el total de la tabla; cantidad sin precio → consultar.
r = await call("POST", "packages", { title: "Señor Tango 2x1", category: tango.slug, price: "R$ 400", price_old: "", published: 1, content: "<p>2x1</p>",
  meta: JSON.stringify({ qty: [[1, "R 400"], [2, "R$ 400"], [3, "R$ 800"], [4, "R$ 800"], [0, "x"], [5, "nada"]], unit_lbl: "por 2 pessoas" }) }, admin);
assert.equal(r.status, 200, JSON.stringify(r.data));
const s2x1 = await one("SELECT * FROM packages WHERE slug='senor-tango-2x1'");
assert.deepEqual(JSON.parse(s2x1.meta).qty, [[1, "R$ 400"], [2, "R$ 400"], [3, "R$ 800"], [4, "R$ 800"]], "se guardan solo filas válidas, con R$");
assert.equal(qtyTable(s2x1).get(3).cents, 80000);
await env.DB.prepare("UPDATE packages SET booking_enabled=1, min_pax=1, max_pax=8, daily_capacity=10, weekdays='0,1,2,3,4,5,6', min_advance_days=1, horizon_days=60 WHERE id=?").bind(s2x1.id).run();
const bk2 = (pax) => call("POST", "book", { slug: "senor-tango-2x1", date: day, pax, name: "Cliente " + pax, phone: "+55 31 9" + pax + "777-000" + pax });
r = await bk2(3); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal((await one("SELECT total FROM bookings WHERE package_id=? ORDER BY id DESC", s2x1.id)).total, 80000, "3 personas = R$ 800 de la tabla");
r = await bk2(2); assert.equal((await one("SELECT total FROM bookings WHERE package_id=? ORDER BY id DESC", s2x1.id)).total, 40000);
r = await bk2(5); assert.equal(r.status, 400); assert.ok(/consultanos/.test(r.data.error));
const pg2 = await (await site({ request: new Request("https://x.test/paquetes/senor-tango-2x1/"), env, next: async () => new Response("", { status: 404 }), waitUntil: () => {} })).text();
assert.ok(pg2.includes('data-qty-table="') && pg2.includes("por 2 pessoas"), "la ficha lleva la tabla y el texto del precio");
console.log("✓ precio por cantidad (2x1): cobra la tabla del panel, no multiplica; cantidad sin precio pide consultar");

console.log("\nTodo OK");

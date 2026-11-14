// Contenido del sitio: paquetes y servicios, entradas del blog, categorías, favoritos de la portada y precios.

import { cleanLinks } from "../activity.js";
import { checkKidsPolicy } from "../booking.js";
import { KINDS, catPath, listCategories, resolveCategory } from "../categories.js";
import { SITE } from "../site.js";

// Categorías fijas de la portada: no se borran ni cambian de dirección (sí de nombre).
const isFixed = (c) => c.kind === "packages" && (SITE.fixedCategories || []).some((f) => f.slug === c.slug);
import { cheapestOption, normMeta, optionsOf, parseMeta, precio } from "../ficha.js";
import { offerOnSave } from "../ofertas.js";
import { bundleItems, bundleQuote, loadParts, refreshBundlesWith } from "../bundle.js";
import { applyTokens, esc, findPriceWidgets, slugify } from "../html.js";
import { clip, sanitizeHtml, stripTags } from "../seo.js";
import { json } from "./http.js";

const TABLES = {
  posts: ["slug", "title", "excerpt", "content", "image", "image_alt", "category", "seo_title", "seo_description", "legacy_id", "published", "featured", "publish_date", "related_ids", "video"],
  packages: ["slug", "title", "category", "price_old", "price", "excerpt", "content", "details", "meta", "image", "image_alt", "seo_title", "seo_description", "published", "featured", "accepts_children", "kids_policy", "video", "subcategory"],
};
const MAX = { title: 200, slug: 80, excerpt: 600, content: 200000, image: 500, video: 500, image_alt: 200, seo_title: 120, seo_description: 320, category: 60, subcategory: 60, price_old: 40, price: 40, legacy_id: 20, meta: 30000 };
const URL_PREFIX = { posts: "/blog/", packages: "/paquetes/" };
// Listado liviano: todas las columnas menos el contenido (puede pesar cientos de KB por nota). La ficha completa se pide por id.
const LIST_COLS = {};
async function listColumns(db, table) {
  if (!LIST_COLS[table]) LIST_COLS[table] = (await db.prepare(`PRAGMA table_info(${table})`).all()).results.map((c) => c.name).filter((n) => n !== "content").join(", ");
  return LIST_COLS[table];
}

// /api/categories, /api/favorites, CRUD de /api/posts y /api/packages, y /api/prices.
export async function manejarContenido({ ctx, request, env, url, res, id, method, user }) {
  // Categorías (Paquetes y Blog)
  if (res === "categories") {
    const rid = id && /^\d+$/.test(id) ? Number(id) : null;
    const clean = (v, n) => stripTags(String(v || "")).slice(0, n).trim();
    const REF = { posts: "posts", packages: "packages" };
    if (method === "GET") {
      const rows = (await env.DB.prepare(
        "SELECT c.*, CASE c.kind WHEN 'posts' THEN (SELECT COUNT(*) FROM posts p WHERE p.category=c.slug) ELSE (SELECT COUNT(*) FROM packages k WHERE k.category=c.slug) END AS n FROM categories c ORDER BY c.kind, c.sort_order, c.id").all()).results;
      // Cada categoría de paquetes trae sus subcategorías (con cuántos productos tiene cada una).
      const subs = (await env.DB.prepare("SELECT s.*, (SELECT COUNT(*) FROM packages k WHERE k.category=s.parent AND k.subcategory=s.slug) AS n FROM subcategories s ORDER BY s.parent, s.sort_order, s.id").all()).results;
      for (const c of rows) { c.subs = c.kind === "packages" ? subs.filter((x) => x.parent === c.slug) : []; c.fixed = isFixed(c) ? 1 : 0; }
      return json(rows);
    }
    if (method === "POST") {
      const d = await request.json().catch(() => ({}));
      const kind = KINDS.includes(d.kind) ? d.kind : null, label = clean(d.label, 60);
      if (!kind) return json({ error: "Falta el tipo de categoría" }, 400);
      if (!label) return json({ error: "Escribí el nombre de la categoría" }, 400);
      const slug = slugify(label);
      if (!slug) return json({ error: "El nombre debe tener letras o números" }, 400);
      const rows = await listCategories(env.DB, kind);
      if (rows.some((c) => c.slug === slug || c.label.toLowerCase() === label.toLowerCase())) return json({ error: "Ya existe una categoría con ese nombre" }, 409);
      const order = rows.reduce((m, c) => Math.max(m, c.sort_order), -1) + 1;
      const r = await env.DB.prepare("INSERT INTO categories (kind, slug, label, description, sort_order) VALUES (?,?,?,?,?)").bind(kind, slug, label, clean(d.description, 300), order).run();
      // Si antes había una dirección vieja con este nombre, deja de redirigir
      await env.DB.prepare("DELETE FROM redirects WHERE from_path=?").bind(catPath(kind, { slug })).run();
      return json({ ok: true, id: r.meta?.last_row_id, slug });
    }
    const cur = rid && (await env.DB.prepare("SELECT * FROM categories WHERE id=?").bind(rid).first());
    if (!cur) return json({ error: "No existe" }, 404);
    const rows = await listCategories(env.DB, cur.kind);
    if (method === "PUT") {
      const d = await request.json().catch(() => ({}));
      if (d.move === "up" || d.move === "down") {
        const i = rows.findIndex((c) => c.id === cur.id), j = d.move === "up" ? i - 1 : i + 1;
        if (j < 0 || j >= rows.length) return json({ ok: true });
        [rows[i], rows[j]] = [rows[j], rows[i]];
        await env.DB.batch(rows.map((c, n) => env.DB.prepare("UPDATE categories SET sort_order=? WHERE id=?").bind(n, c.id)));
        return json({ ok: true });
      }
      const label = clean(d.label, 60);
      if (!label) return json({ error: "Escribí el nombre de la categoría" }, 400);
      let slug = cur.slug;
      // La dirección solo se puede cambiar en categorías sin página fija del sitio.
      if (!cur.listing && !isFixed(cur) && d.slug != null && slugify(d.slug) && slugify(d.slug) !== cur.slug) slug = slugify(d.slug);
      if (rows.some((c) => c.id !== cur.id && (c.slug === slug || c.label.toLowerCase() === label.toLowerCase()))) return json({ error: "Ya existe otra categoría con ese nombre o dirección" }, 409);
      const st = [env.DB.prepare("UPDATE categories SET label=?, description=?, slug=? WHERE id=?").bind(label, clean(d.description, 300), slug, cur.id)];
      if (slug !== cur.slug) {
        const oldP = catPath(cur.kind, cur), newP = catPath(cur.kind, { slug });
        if (cur.kind === "packages") st.push(env.DB.prepare("UPDATE subcategories SET parent=? WHERE parent=?").bind(slug, cur.slug));
        st.push(
          env.DB.prepare(`UPDATE ${REF[cur.kind]} SET category=?, updated_at=CURRENT_TIMESTAMP WHERE category=?`).bind(slug, cur.slug),
          env.DB.prepare("DELETE FROM redirects WHERE from_path=?").bind(newP),
          env.DB.prepare("UPDATE redirects SET to_path=? WHERE to_path=?").bind(newP, oldP),
          env.DB.prepare("INSERT OR REPLACE INTO redirects (from_path, to_path) VALUES (?, ?)").bind(oldP, newP),
        );
      }
      await env.DB.batch(st);
      return json({ ok: true, slug });
    }
    if (method === "DELETE") {
      if (cur.listing) return json({ error: "Esta categoría está ligada a una página fija del sitio (" + cur.listing + ") y no se puede borrar desde el panel. Sí podés renombrarla." }, 409);
      if (isFixed(cur)) return json({ error: "Esta categoría está enlazada desde la portada y no se puede borrar. Sí podés cambiarle el nombre." }, 409);
      if (rows.length < 2) return json({ error: "Tiene que quedar al menos una categoría." }, 409);
      const n = (await env.DB.prepare(`SELECT COUNT(*) n FROM ${REF[cur.kind]} WHERE category=?`).bind(cur.slug).first()).n;
      const target = n ? rows.find((c) => c.slug === url.searchParams.get("move_to") && c.id !== cur.id) : null;
      if (n && !target) return json({ error: `Esta categoría tiene ${n} elemento${n > 1 ? "s" : ""}. Elegí a qué categoría moverlos.`, count: n }, 409);
      const st = [];
      if (n) st.push(env.DB.prepare(`UPDATE ${REF[cur.kind]} SET category=?, updated_at=CURRENT_TIMESTAMP WHERE category=?`).bind(target.slug, cur.slug));
      if (cur.kind === "packages") {
        // Las subcategorías no se pierden: pasan a la categoría destino (si allá ya hay una con el mismo nombre, se unen).
        const dest = target || rows.find((c) => c.id !== cur.id);
        st.push(
          env.DB.prepare("UPDATE OR IGNORE subcategories SET parent=? WHERE parent=?").bind(dest.slug, cur.slug),
          env.DB.prepare("DELETE FROM subcategories WHERE parent=?").bind(cur.slug),
        );
      }
      const oldP = catPath(cur.kind, cur), to = catPath(cur.kind, target || rows.find((c) => c.id !== cur.id));
      st.push(
        env.DB.prepare("DELETE FROM categories WHERE id=?").bind(cur.id),
        env.DB.prepare("UPDATE redirects SET to_path=? WHERE to_path=?").bind(to, oldP),
        env.DB.prepare("INSERT OR REPLACE INTO redirects (from_path, to_path) VALUES (?, ?)").bind(oldP, to),
      );
      await env.DB.batch(st);
      return json({ ok: true, moved: n });
    }
  }

  // Favoritos de la portada: paquetes/servicios (con orden) y entradas de blog destacadas
  if (res === "favorites") {
    if (method === "GET") {
      const packages = (await env.DB.prepare(
        `SELECT p.id, p.slug, p.title, p.category, p.image, p.featured, p.home_order, p.meta,
          (SELECT COUNT(*) FROM leads l WHERE l.package_title = p.title AND l.created_at >= date('now', '-60 days')) AS demand
         FROM packages p WHERE p.published=1 ORDER BY p.featured DESC, (p.home_order = 0), p.home_order, demand DESC, p.created_at DESC, p.id DESC`).all()).results;
      const posts = (await env.DB.prepare("SELECT id, slug, title, category, image, featured FROM posts WHERE published=1 ORDER BY featured DESC, COALESCE(NULLIF(publish_date,''),created_at) DESC LIMIT 80").all()).results;
      return json({ packages, posts, home_slots: 3 });
    }
    if (method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const ids = (a) => [...new Set((Array.isArray(a) ? a : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 100);
      const st = [];
      if (Array.isArray(b.packages)) {
        st.push(env.DB.prepare("UPDATE packages SET featured=0, home_order=0"));
        ids(b.packages).forEach((pid, i) => st.push(env.DB.prepare("UPDATE packages SET featured=1, home_order=? WHERE id=?").bind(i + 1, pid)));
      }
      if (Array.isArray(b.posts)) {
        st.push(env.DB.prepare("UPDATE posts SET featured=0"));
        ids(b.posts).forEach((pid) => st.push(env.DB.prepare("UPDATE posts SET featured=1 WHERE id=?").bind(pid)));
      }
      if (!st.length) return json({ error: "Nada para guardar" }, 400);
      await env.DB.batch(st);
      ctx.act = { title: "Favoritos de la portada", detail: [Array.isArray(b.packages) && `${ids(b.packages).length} paquetes/servicios`, Array.isArray(b.posts) && `${ids(b.posts).length} entradas`].filter(Boolean).join(", ") };
      return json({ ok: true });
    }
    return json({ error: "Método no permitido" }, 405);
  }

  // Subcategorías de paquetes y servicios: /api/subcategories (POST {parent, label}), /api/subcategories/:id (PUT {label} | {move}, DELETE).
  // Borrar una subcategoría no borra productos: quedan en su categoría, sin subcategoría.
  if (res === "subcategories") {
    const rid = id && /^\d+$/.test(id) ? Number(id) : null;
    const clean = (v, n) => stripTags(String(v || "")).slice(0, n).trim();
    if (method === "GET") return json((await env.DB.prepare("SELECT * FROM subcategories ORDER BY parent, sort_order, id").all()).results);
    if (method === "POST") {
      const d = await request.json().catch(() => ({}));
      const parent = (await listCategories(env.DB, "packages")).find((c) => c.slug === String(d.parent || ""));
      if (!parent) return json({ error: "Elegí la categoría a la que pertenece." }, 400);
      const label = clean(d.label, 60), slug = slugify(label);
      if (!label || !slug) return json({ error: "Escribí el nombre de la subcategoría" }, 400);
      const sibs = (await env.DB.prepare("SELECT * FROM subcategories WHERE parent=? ORDER BY sort_order, id").bind(parent.slug).all()).results;
      if (sibs.some((x) => x.slug === slug)) return json({ error: `“${parent.label}” ya tiene una subcategoría con ese nombre` }, 409);
      if (sibs.length >= 20) return json({ error: "Máximo 20 subcategorías por categoría" }, 409);
      const order = sibs.reduce((m, x) => Math.max(m, x.sort_order), -1) + 1;
      const r = await env.DB.prepare("INSERT INTO subcategories (parent, slug, label, sort_order) VALUES (?,?,?,?)").bind(parent.slug, slug, label, order).run();
      return json({ ok: true, id: r.meta?.last_row_id, slug, parent: parent.slug });
    }
    const cur = rid && (await env.DB.prepare("SELECT * FROM subcategories WHERE id=?").bind(rid).first());
    if (!cur) return json({ error: "No existe" }, 404);
    const sibs = (await env.DB.prepare("SELECT * FROM subcategories WHERE parent=? ORDER BY sort_order, id").bind(cur.parent).all()).results;
    if (method === "PUT") {
      const d = await request.json().catch(() => ({}));
      if (d.move === "up" || d.move === "down") {
        const i = sibs.findIndex((x) => x.id === cur.id), j = d.move === "up" ? i - 1 : i + 1;
        if (j < 0 || j >= sibs.length) return json({ ok: true });
        [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
        await env.DB.batch(sibs.map((x, n) => env.DB.prepare("UPDATE subcategories SET sort_order=? WHERE id=?").bind(n, x.id)));
        return json({ ok: true });
      }
      const label = clean(d.label, 60), slug = slugify(label);
      if (!label || !slug) return json({ error: "Escribí el nombre de la subcategoría" }, 400);
      if (sibs.some((x) => x.id !== cur.id && x.slug === slug)) return json({ error: "Ya hay otra subcategoría con ese nombre en esta categoría" }, 409);
      await env.DB.batch([
        env.DB.prepare("UPDATE subcategories SET label=?, slug=? WHERE id=?").bind(label, slug, cur.id),
        env.DB.prepare("UPDATE packages SET subcategory=?, updated_at=CURRENT_TIMESTAMP WHERE category=? AND subcategory=?").bind(slug, cur.parent, cur.slug),
      ]);
      return json({ ok: true, slug });
    }
    if (method === "DELETE") {
      const r = await env.DB.prepare("UPDATE packages SET subcategory='', updated_at=CURRENT_TIMESTAMP WHERE category=? AND subcategory=?").bind(cur.parent, cur.slug).run();
      await env.DB.prepare("DELETE FROM subcategories WHERE id=?").bind(cur.id).run();
      ctx.act = { title: cur.label };
      return json({ ok: true, freed: r.meta?.changes || 0 });
    }
    return json({ error: "Método no permitido" }, 405);
  }

  // CRUD genérico: posts y packages
  if (Object.hasOwn(TABLES, res)) {
    const cols = TABLES[res];
    const rid = id && /^\d+$/.test(id) ? Number(id) : null;
    if (method === "GET" && rid) {
      const full = await env.DB.prepare(`SELECT * FROM ${res} WHERE id=?`).bind(rid).first();
      return full ? json(full) : json({ error: "No existe" }, 404);
    }
    if (method === "GET") return json((await env.DB.prepare(`SELECT ${await listColumns(env.DB, res)} FROM ${res} ORDER BY created_at DESC, id DESC`).all()).results);
    if (method === "DELETE" && rid) {
      const o = await env.DB.prepare(`SELECT title FROM ${res} WHERE id=?`).bind(rid).first();
      await env.DB.prepare(`DELETE FROM ${res} WHERE id=?`).bind(rid).run();
      ctx.act = { title: o?.title || "" };
      return json({ ok: true });
    }
    if (method === "POST" || (method === "PUT" && rid)) {
      const d = await request.json().catch(() => null);
      if (!d) return json({ error: "JSON inválido" }, 400);
      d.title = String(d.title || "").trim();
      d.slug = slugify(d.slug || d.title);
      if (!d.title || !d.slug) return json({ error: "Falta el título" }, 400);
      const cats = await listCategories(env.DB, res);
      const cat = resolveCategory(cats, d.category) || (res === "posts" && !String(d.category || "").trim() ? cats.find((c) => c.slug === "blog") || cats[0] : null);
      if (!cat) return json({ error: "Categoría inválida. Elegí una de la lista." }, 400);
      d.category = cat.slug;
      d.published = d.published === 0 || d.published === false || d.published === "0" ? 0 : 1;
      d.featured = d.featured === 1 || d.featured === true || d.featured === "1" ? 1 : 0;
      if (res === "posts") {
        d.publish_date = /^\d{4}-\d{2}-\d{2}$/.test(d.publish_date || "") ? d.publish_date : "";
        d.related_ids = String(d.related_ids || "").split(",").map((x) => x.trim()).filter((x) => /^\d+$/.test(x) && x !== String(rid)).slice(0, 3).join(",");
      }
      // Blog: autor, revisor editorial y fuentes (si el panel no los manda, no se tocan; una entrada nueva queda a nombre de quien la crea).
      let people = null;
      if (res === "posts") {
        const known = async (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 && (await env.DB.prepare("SELECT id FROM users WHERE id=?").bind(n).first()) ? n : 0; };
        people = {};
        if (d.author_id !== undefined) people.author_id = await known(d.author_id);
        else if (method === "POST" && user.id) people.author_id = user.id;
        if (d.reviewer_id !== undefined) people.reviewer_id = await known(d.reviewer_id);
        if (people.reviewer_id && people.author_id !== undefined && people.reviewer_id === people.author_id) return json({ error: "El revisor editorial tiene que ser otra persona que el autor." }, 400);
        if (d.sources !== undefined) {
          const l = cleanLinks(d.sources);
          if (l.bad) return json({ error: "Alguna fuente no es un enlace válido. Usá una dirección http(s) por línea (Nombre | https://…), hasta 8." }, 400);
          people.sources = l.links.length ? JSON.stringify(l.links) : "";
        }
      }
      if (res === "packages") {
        d.meta = normMeta(d.meta);
        // Oferta con vencimiento: foto de los precios de antes (o, si la oferta terminó, se reponen). Ver ofertas.js.
        {
          const oldRow = method === "PUT" ? await env.DB.prepare("SELECT price, price_old, meta FROM packages WHERE id=?").bind(rid).first() : null;
          const om = parseMeta(d.meta);
          offerOnSave(d, om, oldRow);
          d.meta = JSON.stringify(om);
        }
        // Opciones con precio: el precio "a partir de" del producto es el de la opción más barata (no se carga dos veces).
        const best = cheapestOption(optionsOf({ meta: d.meta }));
        if (best) { d.price = best.price; d.price_old = best.old; }
        // Paquete con precio automático: suma de sus servicios − descuento. Si a algún servicio le falta precio (o hay monedas distintas), queda el precio a mano.
        const mm = parseMeta(d.meta);
        if (!best && mm.kind === "paquete" && mm.auto === 1 && (mm.parts || []).length) {
          const q = bundleQuote({ meta: d.meta }, bundleItems({ meta: d.meta }, await loadParts(env.DB, { meta: d.meta })));
          if (q.ok) { d.price = q.price; d.price_old = q.price_old; }
        }
        if (d.price != null) d.price = precio(d.price);
        if (d.price_old != null) d.price_old = precio(d.price_old);
        // Subcategoría: tiene que existir dentro de la categoría elegida; si no (o si cambió la categoría), queda vacía.
        const sub = slugify(d.subcategory || "");
        d.subcategory = sub && (await env.DB.prepare("SELECT 1 AS x FROM subcategories WHERE parent=? AND slug=?").bind(d.category, sub).first()) ? sub : "";
      }
      if (res === "packages") d.accepts_children = d.accepts_children === 1 || d.accepts_children === true || d.accepts_children === "1" ? 1 : 0;
      if (res === "packages") {
        // Precio de niños por edad: se guarda normalizado (tramos ordenados, sin superposición). Si no acepta niños, se vacía.
        const kp = d.accepts_children ? checkKidsPolicy(d.kids_policy) : { tiers: [] };
        if (kp.error) return json({ error: kp.error }, 400);
        d.kids_policy = kp.tiers.length ? JSON.stringify({ tiers: kp.tiers }) : "";
      }
      if (res === "packages") d.details = String(d.details || "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 30).join("\n");
      for (const c of cols) if (typeof d[c] === "string" && d[c].length > (MAX[c] || 1000)) return json({ error: `El campo "${c}" es demasiado largo` }, 400);
      if (method === "PUT" && d.content === undefined) d.content = (await env.DB.prepare(`SELECT content FROM ${res} WHERE id=?`).bind(rid).first())?.content || "";
      d.content = sanitizeHtml(d.content || "");
      for (const c of ["excerpt", "seo_title", "seo_description", "image_alt"]) if (d[c]) d[c] = stripTags(d[c]);
      // Blog: lo que quede vacío se completa solo (resumen desde el contenido, texto alternativo desde el título).
      if (res === "posts") {
        if (!String(d.excerpt || "").trim()) d.excerpt = clip(stripTags(d.content), 155);
        if (d.image && !String(d.image_alt || "").trim()) d.image_alt = stripTags(d.title).slice(0, 200);
      }
      if (d.legacy_id) d.legacy_id = String(d.legacy_id).replace(/\D/g, "");
      d.video = String(d.video || "").trim();
      if (d.video && !/^(https:\/\/|\/media\/)/i.test(d.video)) return json({ error: "El video debe ser un archivo subido desde el panel o una URL https directa a un MP4/WebM." }, 400);
      d.image = String(d.image || "").trim();
      if (d.image && !/^(https:\/\/|\/media\/|\/assets\/)/i.test(d.image)) return json({ error: "La imagen debe ser una URL https o una imagen subida desde el panel." }, 400);
      const vals = cols.map((c) => (d[c] == null ? "" : typeof d[c] === "number" ? d[c] : String(d[c])));
      let newId = rid, wasPub = null;
      try {
        if (method === "POST") newId = (await env.DB.prepare(`INSERT INTO ${res} (${cols}) VALUES (${cols.map(() => "?")})`).bind(...vals).run()).meta?.last_row_id;
        else {
          const old = await env.DB.prepare(`SELECT slug, published FROM ${res} WHERE id=?`).bind(rid).first();
          if (!old) return json({ error: "No existe" }, 404);
          wasPub = old.published;
          await env.DB.prepare(`UPDATE ${res} SET ${cols.map((c) => c + "=?")}, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...vals, rid).run();
          // Si cambió el slug, la URL vieja redirige (301) a la nueva: no se pierde el posicionamiento ni los enlaces.
          if (old.slug !== d.slug) {
            const oldPath = URL_PREFIX[res] + old.slug + "/", newPath = URL_PREFIX[res] + d.slug + "/";
            await env.DB.batch([
              env.DB.prepare("DELETE FROM redirects WHERE from_path=?").bind(newPath),
              env.DB.prepare("UPDATE redirects SET to_path=? WHERE to_path=?").bind(newPath, oldPath),
              env.DB.prepare("INSERT OR REPLACE INTO redirects (from_path, to_path) VALUES (?, ?)").bind(oldPath, newPath),
            ]);
          }
        }
      } catch (e) {
        if (/UNIQUE/i.test(e.message)) return json({ error: "Ya existe una entrada con ese slug. Cambiá el título o el slug." }, 409);
        return json({ error: "Error de base de datos: " + e.message }, 500);
      }
      if (people && Object.keys(people).length)
        await env.DB.prepare(`UPDATE posts SET ${Object.keys(people).map((c) => c + "=?")} WHERE id=?`).bind(...Object.values(people), newId).run().catch(() => {});
      // Autoría: quién creó y quién tocó por última vez (alimenta Rendimiento y el historial).
      // Blog: además se guardan los minutos de lectura (exactos) para que el listado no tenga que traer el texto.
      const rm = res === "posts" ? Math.max(1, Math.ceil(stripTags(d.content).split(" ").filter(Boolean).length / 200)) : null;
      await env.DB.prepare((method === "POST" ? `UPDATE ${res} SET created_by=?, updated_by=?` : `UPDATE ${res} SET updated_by=?`) + (rm ? ", read_mins=?" : "") + " WHERE id=?")
        .bind(...(method === "POST" ? [user.id, user.id] : [user.id]), ...(rm ? [rm] : []), newId).run().catch(() => {});
      ctx.act = method === "POST" ? { detail: d.published ? "publicado" : "borrador" }
        : wasPub === 0 && d.published === 1 ? { action: "publicó", detail: "publicado" } : { detail: d.published ? "" : "borrador" };
      // Un servicio cambió (precio, opciones o dirección): los paquetes con precio automático que lo incluyen se recalculan solos.
      let bundles = 0;
      if (res === "packages" && parseMeta(d.meta).kind !== "paquete") bundles = await refreshBundlesWith(env.DB, d.slug).catch(() => 0);
      return json({ ok: true, id: newId, slug: d.slug, url: URL_PREFIX[res] + d.slug + "/", ...(bundles ? { bundles } : {}) });
    }
  }

  // Precios de páginas existentes
  if (res === "prices") {
    const getRaw = async (page) => {
      if (!/^\/[\w\-\/]*$/.test(page)) return null;
      const r = await env.ASSETS.fetch(new URL(page.endsWith("/") ? page : page + "/", url));
      return r.ok ? r.text() : null;
    };
    if (method === "GET") {
      const page = url.searchParams.get("page") || "/";
      const raw = await getRaw(page);
      if (raw == null) return json({ error: "Página no encontrada" }, 404);
      const ov = (await env.DB.prepare("SELECT widget_id FROM price_overrides WHERE page=?").bind(page).all()).results.map((r) => r.widget_id);
      return json(findPriceWidgets(raw).map((w) => ({ id: w.id, tokens: w.tokens, edited: ov.includes(w.id), preview: stripTags(w.inner).slice(0, 140) })));
    }
    if (method === "DELETE") {
      const page = url.searchParams.get("page") || "", widget = url.searchParams.get("widget_id") || "";
      await env.DB.prepare("DELETE FROM price_overrides WHERE page=? AND widget_id=?").bind(page, widget).run();
      return json({ ok: true });
    }
    if (method === "PUT") {
      const { page, widget_id, values } = await request.json().catch(() => ({}));
      const raw = await getRaw(page || "");
      const w = raw && findPriceWidgets(raw).find((x) => x.id === widget_id);
      if (!w || !Array.isArray(values)) return json({ error: "Widget no encontrado" }, 404);
      const html = applyTokens(w.inner, values.map((v) => esc(String(v).trim())));
      if (html === w.inner) await env.DB.prepare("DELETE FROM price_overrides WHERE page=? AND widget_id=?").bind(page, widget_id).run();
      else await env.DB.prepare("INSERT OR REPLACE INTO price_overrides (page, widget_id, html) VALUES (?,?,?)").bind(page, widget_id, html).run();
      return json({ ok: true });
    }
  }
  return null;
}

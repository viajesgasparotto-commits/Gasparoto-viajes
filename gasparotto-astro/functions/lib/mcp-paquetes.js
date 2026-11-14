// Conector de Claude: paquetes y servicios (se suma a las herramientas del blog de mcp.js, con la misma clave).
// Claude puede ver categorías y productos, y crear o editar paquetes y servicios. Se guardan con el mismo código que el panel
// (manejarContenido): precios normalizados (R$), opciones, políticas, SEO, redirecciones y registro de actividad.
// Permisos: lo nuevo queda SIEMPRE como borrador (no se ve en el sitio) salvo que la clave pueda publicar y la persona lo pida.
// Con una clave "solo borradores" no se pueden tocar productos publicados (precios, textos ni nada). No borra nada, y la
// disponibilidad (calendario, cupos, días, Pix) se sigue configurando en el panel → Disponibilidad.
import { manejarContenido } from "./api/contenido.js";
import { parseMeta, POLICY_TYPES } from "./ficha.js";
import { logActivity } from "./activity.js";
import { purge } from "./edge.js";
import { stripTags } from "./seo.js";

const STR = (description, extra = {}) => ({ type: "string", description, ...extra });
const LIST = (description, items = { type: "string" }) => ({ type: "array", items, description });
const OBJ = (properties, required = []) => ({ type: "object", properties, ...(required.length ? { required } : {}) });

const PKG_FIELDS = {
  titulo: STR("Nombre del producto como lo ve el cliente, con tildes (ej. \"City Tour Clássico\")."),
  tipo: { type: "string", enum: ["servicio", "paquete"], description: "servicio = se vende solo (un paseo, un show, un traslado). paquete = combina varios servicios del sitio (ver servicios_incluidos)." },
  categoria: STR("Categoría: la clave o el nombre de paquetes_listar_categorias."),
  subcategoria: STR("Subcategoría dentro de la categoría (opcional; tiene que existir)."),
  resumen: STR("Una o dos frases que venden el producto (se ve en las tarjetas y lo usa la IA de WhatsApp). Sin cifras de relleno."),
  contenido: STR("Descripción completa en HTML (<p>, <h2>, <ul>…) o Markdown. Sin <h1>."),
  formato: { type: "string", enum: ["html", "markdown"], description: "Formato de 'contenido'. Por defecto se detecta solo." },
  precio: STR("Precio por persona, con moneda: \"R$ 150\". Si hay opciones, no hace falta: se toma el de la opción más barata."),
  precio_anterior: STR("Precio anterior tachado (promoción), ej. \"R$ 200\". Opcional."),
  opciones: LIST("Opciones con precio del mismo producto (ej. Solo show / Cena y show). Comparten fecha y cupo; solo cambia el precio.",
    OBJ({ nombre: STR("Nombre de la opción."), precio: STR("Precio por persona, ej. \"R$ 475\"."), precio_anterior: STR("Opcional."), detalle: STR("Qué incluye esta opción, corto (opcional).") }, ["nombre", "precio"])),
  mejor_precio: { type: "boolean", description: "true = sello \"Mejor precio del mercado\" en la ficha y en el listado. Solo si es verdad." },
  precio_boleteria: STR("Cuánto cuesta lo mismo comprado directo en el lugar, ej. \"R$ 600\" (opcional; muestra el ahorro)."),
  incluye: LIST("Qué incluye, una cosa por línea (ej. \"Traslado ida y vuelta\", \"Cena de 3 pasos\")."),
  no_incluye: LIST("Qué NO incluye, una cosa por línea."),
  datos: LIST("Datos rápidos de la ficha (etiqueta y valor), ej. Duración / 4h30, Salida / Hotel en el centro, Idioma / Portugués.",
    OBJ({ etiqueta: STR("Ej. Duración."), valor: STR("Ej. 4h30.") }, ["etiqueta", "valor"])),
  paradas: LIST("Recorrido o paradas, en orden (opcional)."),
  horarios: LIST("Horarios de salida \"HH:MM\" (opcional), con una nota corta si hace falta.", OBJ({ hora: STR("HH:MM, ej. 09:00."), nota: STR("Opcional, ej. \"solo sábados\".") }, ["hora"])),
  preguntas: LIST("Preguntas frecuentes.", OBJ({ pregunta: STR(""), respuesta: STR("") }, ["pregunta", "respuesta"])),
  politicas: LIST(`Políticas: tipo (${POLICY_TYPES.join(", ")}) y texto. 'opcion' = nombre de la opción a la que aplica (vacío = a todas).`,
    OBJ({ tipo: { type: "string", enum: POLICY_TYPES }, texto: STR(""), opcion: STR("Opcional."), titulo: STR("Solo para tipo 'otra'.") }, ["tipo", "texto"])),
  servicios_incluidos: LIST("Solo para tipo 'paquete': los servicios que combina, en orden de itinerario. 'servicio' = slug de paquetes_listar.",
    OBJ({ servicio: STR("Slug del servicio (de paquetes_listar)."), dia: { type: "integer", minimum: 1, maximum: 14, description: "Día del paquete (1 = primer día)." }, hora: STR("HH:MM opcional."), opcion: STR("Opción del servicio (opcional).") }, ["servicio"])),
  precio_automatico: { type: "boolean", description: "Solo paquetes: true = el precio es la suma de sus servicios menos 'descuento'." },
  descuento: { type: "integer", minimum: 0, maximum: 90, description: "Solo paquetes con precio automático: % de descuento sobre la suma." },
  acepta_ninos: { type: "boolean", description: "true = la reserva pide adultos y niños por separado." },
  imagen: STR("Imagen principal: dirección /media/… de blog_subir_imagen, o URL https."),
  imagen_alt: STR("Texto alternativo de la imagen (qué se ve)."),
  galeria: LIST("Más fotos (hasta 12): direcciones /media/… o URLs https."),
  video: STR("URL https directa a un MP4/WebM (opcional)."),
  seo_titulo: STR("Título para Google, 30 a 60 caracteres (opcional)."),
  seo_descripcion: STR("Descripción para Google, 70 a 160 caracteres."),
  slug: STR("Dirección web (opcional; se genera desde el título). Cambiarla en uno publicado deja una redirección."),
  destacado: { type: "boolean", description: "true = aparece primero en los listados." },
  publicar: { type: "boolean", description: "true = publicar ya. Solo si la clave puede publicar y la persona lo pidió. Por defecto, borrador." },
};

export const PKG_TOOLS = [
  { name: "paquetes_listar_categorias", title: "Categorías de paquetes", description: "Lista las categorías y subcategorías de paquetes y servicios (clave, nombre y cuántos productos tiene cada una).", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
  { name: "paquetes_listar", title: "Paquetes y servicios (todos)", description: "Lista todos los paquetes y servicios, también los borradores: id, título, tipo, estado, categoría, precio y dirección. Sirve para no duplicar productos y para armar paquetes con servicios existentes.", inputSchema: { type: "object", properties: { buscar: STR("Texto a buscar (opcional)."), estado: { type: "string", enum: ["todos", "publicados", "borradores"], description: "Por defecto, todos." }, tipo: { type: "string", enum: ["todos", "servicio", "paquete"] } } }, annotations: { readOnlyHint: true } },
  { name: "paquete_ver", title: "Ver un paquete o servicio", description: "Devuelve un paquete o servicio completo (textos, precios, opciones, qué incluye, horarios, políticas…) por id o por dirección. Usalo antes de editar o como modelo para crear uno parecido.", inputSchema: { type: "object", properties: { id: { type: "integer" }, slug: STR("Dirección del producto.") } }, annotations: { readOnlyHint: true } },
  { name: "paquete_crear", title: "Crear un paquete o servicio", description: "Crea un paquete o servicio. Queda como BORRADOR (no se ve en el sitio) salvo que la clave pueda publicar y 'publicar' sea true. La disponibilidad (calendario, cupos, Pix) se configura después en el panel. Devuelve el id y el enlace para revisarlo en el panel.", inputSchema: { type: "object", properties: PKG_FIELDS, required: ["titulo", "categoria"] }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false } },
  { name: "paquete_editar", title: "Editar un paquete o servicio", description: "Cambia solo los campos que mandes (las listas que mandes reemplazan a las anteriores). Con una clave 'solo borradores' únicamente se pueden editar borradores: un producto publicado se cambia desde el panel.", inputSchema: { type: "object", properties: { id: { type: "integer", description: "Id (de paquetes_listar)." }, ...PKG_FIELDS }, required: ["id"] }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true } },
];

export const PKG_GUIDE = [
  "Paquetes y servicios: antes de crear, mirá paquetes_listar (para no duplicar) y paquete_ver de uno parecido como modelo; las categorías salen de paquetes_listar_categorias.",
  "Un servicio se vende solo (paseo, show, traslado); un paquete combina servicios que ya existen en el sitio (servicios_incluidos, con su día). Si falta un servicio, creá primero el servicio.",
  "Precios: siempre con moneda (\"R$ 150\") y por persona. Si el producto tiene variantes de precio (solo show / con cena), cargalas como 'opciones'. Marcá mejor_precio o precio_boleteria solo si la persona te lo confirma.",
  "Textos para vender: título claro con tildes, resumen de una o dos frases con el beneficio principal (lo usa también la IA de WhatsApp), 'incluye' en ítems cortos, y datos rápidos (Duración, Salida, Idioma). No inventes precios, horarios, duración ni lo que incluye: si no lo sabés, preguntale a la persona o dejalo vacío.",
  "Todo lo nuevo queda en borrador. Al terminar pasale el enlace del panel y recordale: revisar, configurar la disponibilidad (calendario, cupos, Pix) en Disponibilidad y publicar.",
].join("\n");

const looksHtml = (s) => /<(p|h2|h3|ul|ol|div|blockquote|strong|a)\b/i.test(String(s || ""));
const has = (a, k) => a[k] !== undefined && a[k] !== null;
const arr = (v) => (Array.isArray(v) ? v : []);
const ok = (data, text) => ({ content: [{ type: "text", text: text || JSON.stringify(data, null, 2) }], structuredContent: data });
const fail = (text) => ({ content: [{ type: "text", text }], isError: true });

// Argumentos de Claude → columnas y meta del panel. Solo cambia lo que viene; el resto queda como estaba.
function toRow(a, prev, mdToHtml) {
  const d = { ...prev }, m = parseMeta(prev.meta || "{}") || {};
  if (has(a, "titulo")) d.title = String(a.titulo).trim();
  if (has(a, "categoria")) d.category = String(a.categoria);
  if (has(a, "subcategoria")) d.subcategory = String(a.subcategoria);
  if (has(a, "resumen")) d.excerpt = String(a.resumen);
  if (has(a, "contenido")) { const c = String(a.contenido); d.content = a.formato === "markdown" || (a.formato !== "html" && !looksHtml(c)) ? mdToHtml(c) : c; }
  if (has(a, "precio")) d.price = String(a.precio);
  if (has(a, "precio_anterior")) d.price_old = String(a.precio_anterior);
  if (has(a, "incluye")) d.details = arr(a.incluye).map(String).join("\n");
  if (has(a, "imagen")) d.image = String(a.imagen);
  if (has(a, "imagen_alt")) d.image_alt = String(a.imagen_alt);
  if (has(a, "video")) d.video = String(a.video);
  if (has(a, "seo_titulo")) d.seo_title = String(a.seo_titulo);
  if (has(a, "seo_descripcion")) d.seo_description = String(a.seo_descripcion);
  if (has(a, "slug")) d.slug = String(a.slug);
  if (has(a, "destacado")) d.featured = a.destacado ? 1 : 0;
  if (has(a, "acepta_ninos")) d.accepts_children = a.acepta_ninos ? 1 : 0;
  if (has(a, "tipo")) m.kind = a.tipo;
  if (has(a, "opciones")) m.options = arr(a.opciones).map((o) => [o?.nombre, o?.precio, o?.precio_anterior || "", o?.detalle || ""]);
  if (has(a, "mejor_precio")) m.best = a.mejor_precio ? 1 : 0;
  if (has(a, "precio_boleteria")) m.box = String(a.precio_boleteria);
  if (has(a, "no_incluye")) m.exc = arr(a.no_incluye).map(String);
  if (has(a, "datos")) m.facts = arr(a.datos).map((x) => [x?.etiqueta, x?.valor]);
  if (has(a, "paradas")) m.stops = arr(a.paradas).map(String);
  if (has(a, "horarios")) m.times = arr(a.horarios).map((x) => (typeof x === "string" ? [x, ""] : [x?.hora, x?.nota || ""]));
  if (has(a, "preguntas")) m.faq = arr(a.preguntas).map((x) => [x?.pregunta, x?.respuesta]);
  if (has(a, "politicas")) m.policies = arr(a.politicas).map((x) => [x?.tipo, x?.texto, x?.opcion || "", x?.titulo || ""]);
  if (has(a, "galeria")) m.gallery = arr(a.galeria).map(String);
  if (has(a, "servicios_incluidos")) {
    const s = arr(a.servicios_incluidos).filter((x) => x?.servicio);
    m.parts = s.map((x) => String(x.servicio));
    m.plan = s.map((x) => [String(x.servicio), x.dia || 1, x.hora || "", x.opcion || ""]);
  }
  if (has(a, "precio_automatico")) m.auto = a.precio_automatico ? 1 : 0;
  if (has(a, "descuento")) m.disc = a.descuento;
  d.meta = JSON.stringify(m);
  return d;
}

const state = (p) => (p.published ? "publicado" : "borrador");
const view = (p, site) => {
  const m = parseMeta(p.meta) || {};
  return {
    id: p.id, titulo: p.title, slug: p.slug, tipo: m.kind || "servicio", estado: state(p), categoria: p.category, subcategoria: p.subcategory || "",
    resumen: p.excerpt || "", precio: p.price || "", precio_anterior: p.price_old || "",
    opciones: arr(m.options).map((o) => ({ nombre: o[0], precio: o[1], precio_anterior: o[2] || "", detalle: o[3] || "" })),
    mejor_precio: !!m.best, precio_boleteria: m.box || "",
    incluye: String(p.details || "").split("\n").filter(Boolean), no_incluye: arr(m.exc),
    datos: arr(m.facts).map((f) => ({ etiqueta: f[0], valor: f[1] })), paradas: arr(m.stops),
    horarios: arr(m.times).map((t) => ({ hora: t[0], nota: t[1] || "" })),
    preguntas: arr(m.faq).map((f) => ({ pregunta: f[0], respuesta: f[1] })),
    politicas: arr(m.policies).map((x) => ({ tipo: x[0], texto: x[1], opcion: x[2] || "", titulo: x[3] || "" })),
    servicios_incluidos: arr(m.plan).map((x) => ({ servicio: x[0], dia: x[1], hora: x[2] || "", opcion: x[3] || "" })),
    precio_automatico: !!m.auto, descuento: m.disc || 0, acepta_ninos: !!p.accepts_children,
    imagen: p.image || "", imagen_alt: p.image_alt || "", galeria: arr(m.gallery), video: p.video || "",
    seo_titulo: p.seo_title || "", seo_descripcion: p.seo_description || "", destacado: !!p.featured,
    reserva_online: p.booking_enabled ? "activa" : "sin configurar (panel → Disponibilidad)",
    contenido: p.content || "", direccion: `${site}/paquetes/${p.slug}/`,
  };
};

export async function callPkgTool(name, a, { env, key, user, origin, mdToHtml }) {
  const db = env.DB;
  const site = String(env.SITE_URL || origin).replace(/\/$/, "");
  const editLink = (id) => `${origin}/admin/#packages/${id}`;
  if (name === "paquetes_listar_categorias") {
    const cats = (await db.prepare("SELECT c.slug, c.label, c.description, (SELECT COUNT(*) FROM packages p WHERE p.category=c.slug) AS n FROM categories c WHERE c.kind='packages' ORDER BY c.sort_order, c.id").all()).results;
    const subs = (await db.prepare("SELECT parent, slug, label FROM subcategories ORDER BY sort_order, id").all().catch(() => ({ results: [] }))).results || [];
    return ok({ categorias: cats.map((c) => ({ clave: c.slug, nombre: c.label, descripcion: c.description || "", productos: c.n, subcategorias: subs.filter((s) => s.parent === c.slug).map((s) => ({ clave: s.slug, nombre: s.label })) })) });
  }
  if (name === "paquetes_listar") {
    const q = String(a.buscar || "").trim().toLowerCase();
    const where = { publicados: "published=1", borradores: "published=0" }[a.estado] || "1=1";
    const rows = (await db.prepare(`SELECT id, slug, title, category, price, published, meta FROM packages WHERE ${where} ORDER BY id DESC LIMIT 300`).all()).results
      .map((p) => ({ ...p, kind: parseMeta(p.meta)?.kind || "servicio" }))
      .filter((p) => (!a.tipo || a.tipo === "todos" || p.kind === a.tipo) && (!q || (p.title + " " + p.slug + " " + p.category).toLowerCase().includes(q))).slice(0, 100);
    return ok({ productos: rows.map((p) => ({ id: p.id, titulo: p.title, slug: p.slug, tipo: p.kind, estado: state(p), categoria: p.category, precio: p.price || "", direccion: `${site}/paquetes/${p.slug}/` })) });
  }
  if (name === "paquete_ver") {
    const p = a.id ? await db.prepare("SELECT * FROM packages WHERE id=?").bind(Number(a.id)).first() : a.slug ? await db.prepare("SELECT * FROM packages WHERE slug=?").bind(String(a.slug)).first() : null;
    if (!p) return fail("No encontré ese producto. Usá paquetes_listar para ver los ids.");
    return ok(view(p, site));
  }
  if (name === "paquete_crear" || name === "paquete_editar") {
    const create = name === "paquete_crear";
    let prev = null;
    if (!create) {
      prev = await db.prepare("SELECT * FROM packages WHERE id=?").bind(Number(a.id)).first();
      if (!prev) return fail("No existe un producto con ese id.");
      if (prev.published && !key.can_publish) return fail("Ese producto está publicado y esta clave solo puede editar borradores. Pedile a la persona que lo cambie desde el panel (o que use una clave que pueda publicar).");
    }
    if (a.publicar === true && !key.can_publish) return fail("Esta clave no puede publicar: guardalo como borrador (sin 'publicar') y avisale a la persona que lo publique desde el panel.");
    if (create && !String(a.titulo || "").trim()) return fail("Falta el título.");
    const base = prev
      ? Object.fromEntries(["slug", "title", "category", "price_old", "price", "excerpt", "content", "details", "meta", "image", "image_alt", "seo_title", "seo_description", "published", "featured", "accepts_children", "kids_policy", "video", "subcategory"].map((k) => [k, prev[k]]))
      : { featured: 0, accepts_children: 0, kids_policy: "", video: "", meta: "{}", details: "", content: "" };
    const d = toRow(a, base, mdToHtml);
    if (!create && has(a, "acepta_ninos") && !a.acepta_ninos) d.kids_policy = "";
    d.published = a.publicar === true ? 1 : create || a.publicar === false ? 0 : prev.published;
    const url = new URL(`${origin}/api/packages${create ? "" : "/" + prev.id}`), method = create ? "POST" : "PUT";
    const request = new Request(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(d) });
    const r = await manejarContenido({ ctx: {}, request, env, url, res: "packages", id: create ? undefined : String(prev.id), method, user });
    const j = await r.json().catch(() => ({}));
    if (r.status >= 300) {
      if (/Categor/i.test(j.error || "")) {
        const cats = (await db.prepare("SELECT slug FROM categories WHERE kind='packages' ORDER BY sort_order").all()).results.map((c) => c.slug);
        return fail(`${j.error} Categorías disponibles: ${cats.join(", ")}.`);
      }
      return fail(j.error || "No se pudo guardar el producto.");
    }
    const id = j.id || prev?.id, p = await db.prepare("SELECT * FROM packages WHERE id=?").bind(id).first();
    await logActivity(db, { id: user.id, name: user.name }, create ? "creó" : "editó", "paquete", id, p.title, `vía Claude (${key.name})${p.published ? "" : " · borrador"}`).catch(() => {});
    await purge(origin, ["/", "/paquetes/", `/paquetes/${p.slug}/`]).catch(() => {});
    const v = view(p, site), avisos = [];
    if (!p.price) avisos.push("No tiene precio: cargá 'precio' u 'opciones'.");
    if (!p.image) avisos.push("No tiene imagen principal.");
    if (!stripTags(p.excerpt || "").trim()) avisos.push("No tiene resumen.");
    if (v.tipo === "paquete" && !v.servicios_incluidos.length) avisos.push("Es un paquete sin servicios incluidos.");
    if (!p.booking_enabled && v.tipo !== "paquete") avisos.push("La reserva online se activa en el panel → Disponibilidad (calendario, cupos y Pix).");
    return ok({ id, titulo: p.title, tipo: v.tipo, estado: state(p), precio: p.price, direccion: v.direccion, editar_en_el_panel: editLink(id), avisos },
      `${create ? "Producto creado" : "Producto actualizado"} (#${id}, ${state(p)}): “${p.title}” · ${p.price || "sin precio"}.\n${p.published ? `Dirección: ${v.direccion}` : "Es un borrador: no se ve en el sitio hasta que se publique desde el panel → Paquetes."}\nPanel: ${editLink(id)}${avisos.length ? "\nPendiente: " + avisos.join(" ") : ""}`);
  }
  return null;
}

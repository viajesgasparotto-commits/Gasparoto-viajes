import { BUILTIN_PACKAGES, SEED_POSTS } from "./categories.js";
import { SITE } from "./site.js";
import { slugify } from "./html.js";

// Esquema embebido: el panel crea y migra las tablas la primera vez que se usa (idempotente).
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
    excerpt TEXT DEFAULT '', content TEXT DEFAULT '', image TEXT DEFAULT '', category TEXT DEFAULT 'Blog',
    published INTEGER DEFAULT 1, featured INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'tangos', price_old TEXT DEFAULT '', price TEXT DEFAULT '',
    excerpt TEXT DEFAULT '', content TEXT DEFAULT '', image TEXT DEFAULT '',
    published INTEGER DEFAULT 1, featured INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS price_overrides (
    page TEXT NOT NULL, widget_id TEXT NOT NULL, html TEXT NOT NULL, PRIMARY KEY (page, widget_id))`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, slug TEXT NOT NULL, label TEXT NOT NULL,
    description TEXT DEFAULT '', listing TEXT DEFAULT '', sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (kind, slug))`,
  // Subcategorías de paquetes y servicios (ej.: Tangos › Con cena, Solo show). parent = slug de la categoría madre.
  // Viven en su propia tabla para que no se mezclen con las categorías (menú, páginas, borrado). packages.subcategory = slug.
  `CREATE TABLE IF NOT EXISTS subcategories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, parent TEXT NOT NULL, slug TEXT NOT NULL, label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (parent, slug))`,
  // Conexiones de Claude (conector MCP del blog, functions/lib/mcp.js). Se guarda solo el hash SHA-256 de la clave; prefix sirve para reconocerla.
  // can_publish = 0 → todo lo que crea o edita queda en borrador. user_id = quien la creó (firma las notas). revoked = 1 la desactiva.
  `CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, prefix TEXT NOT NULL, hash TEXT UNIQUE NOT NULL,
    can_publish INTEGER NOT NULL DEFAULT 0, user_id INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_used TEXT DEFAULT '', uses INTEGER NOT NULL DEFAULT 0, revoked INTEGER NOT NULL DEFAULT 0)`,
  // Redirecciones 301 automáticas cuando se cambia el slug de una entrada ya publicada.
  `CREATE TABLE IF NOT EXISTS redirects (
    from_path TEXT PRIMARY KEY, to_path TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  // Consultas de clientes (formulario de la ficha de paquete y botones de WhatsApp): el "tablero de ventas" del panel.
  `CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT DEFAULT '', phone TEXT DEFAULT '', travel_date TEXT DEFAULT '',
    pax INTEGER DEFAULT 0, message TEXT DEFAULT '', package_title TEXT DEFAULT '', package_slug TEXT DEFAULT '',
    page TEXT DEFAULT '', source TEXT DEFAULT 'form', status TEXT DEFAULT 'nuevo', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  // Vistas por día y variante (A/B de la portada). Se cuentan en segundo plano; bots excluidos.
  `CREATE TABLE IF NOT EXISTS page_views (
    path TEXT NOT NULL, variant TEXT NOT NULL DEFAULT '', day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (path, variant, day))`,
  // Reservas por fecha (functions/lib/booking.js). availability = excepciones por día de un paquete (closed=1 cierra; closed=0 abre
  // aunque el día de semana esté apagado; capacity NULL = cupo base). bookings = reservas (fase 2: se crean en pendiente con retención de cupo;
  // status: pendiente | pagada | cancelada | vencida. total en centavos. payment_ref/pix_code/pix_qr/paid_at = cobro Pix (lib/pix.js). token = clave que el cliente usa para liberar su propia retención).
  `CREATE TABLE IF NOT EXISTS availability (
    package_id INTEGER NOT NULL, day TEXT NOT NULL, closed INTEGER NOT NULL DEFAULT 0, capacity INTEGER,
    PRIMARY KEY (package_id, day))`,
  // Cierre de un solo horario de un día (no cancela las reservas que ya tiene). closed = 1 lo cierra; borrar la fila lo vuelve a abrir.
  `CREATE TABLE IF NOT EXISTS availability_slots (
    package_id INTEGER NOT NULL, day TEXT NOT NULL, time TEXT NOT NULL, closed INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (package_id, day, time))`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, package_id INTEGER NOT NULL, day TEXT NOT NULL, pax INTEGER NOT NULL,
    name TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', total INTEGER DEFAULT 0, currency TEXT DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'pendiente', hold_until TEXT DEFAULT '', payment_ref TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    message TEXT DEFAULT '', token TEXT DEFAULT '', updated_at TEXT DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS bookings_pkg_day ON bookings (package_id, day)`,
  `CREATE INDEX IF NOT EXISTS bookings_status ON bookings (status, hold_until)`,
  // Usuarios del panel (functions/lib/users.js). role: admin (todo, incluye usuarios) | editor (todo menos usuarios). pass_hash = PBKDF2.
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, name TEXT DEFAULT '', role TEXT NOT NULL DEFAULT 'editor',
    pass_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, last_login TEXT DEFAULT '')`,
  // Historial de movimientos (functions/lib/activity.js): qué hizo cada usuario. user_id 0 = clave general.
  `CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT DEFAULT CURRENT_TIMESTAMP, user_id INTEGER NOT NULL DEFAULT 0, user_name TEXT DEFAULT '',
    action TEXT NOT NULL, entity TEXT DEFAULT '', ref_id INTEGER DEFAULT 0, title TEXT DEFAULT '', detail TEXT DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS activity_user_at ON activity (user_id, at)`,
  `CREATE INDEX IF NOT EXISTS activity_at ON activity (at)`,
  // Actividades obligatorias. assigned_to 0 = todo el equipo (cada persona la completa por su cuenta). frequency: once | daily | weekly | monthly.
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, detail TEXT DEFAULT '', assigned_to INTEGER NOT NULL DEFAULT 0,
    frequency TEXT NOT NULL DEFAULT 'weekly', due_day TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_by INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS task_done (
    task_id INTEGER NOT NULL, user_id INTEGER NOT NULL, period TEXT NOT NULL, done_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (task_id, user_id, period))`,
  // Seguridad: clave de firma de las sesiones (aleatoria, generada sola; no se deriva de ninguna contraseña) y registro de intentos de ingreso fallidos.
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS translations (
    kind TEXT NOT NULL, ref_id INTEGER NOT NULL, lang TEXT NOT NULL, slug TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}', updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (kind, ref_id, lang))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS translations_slug ON translations (kind, lang, slug)`,
  `CREATE TABLE IF NOT EXISTS login_fails (k TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS login_fails_k ON login_fails (k, at)`,
  // Mapa de calor (POST /api/track): hasta dónde baja cada visita (bucket 0..10 = décimas de la página) y en qué hace clic. dev: m (celular) | d (escritorio).
  `CREATE TABLE IF NOT EXISTS page_depth (
    path TEXT NOT NULL, dev TEXT NOT NULL DEFAULT 'd', bucket INTEGER NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (path, dev, bucket, day))`,
  // Asistente IA (functions/lib/asistente.js): una conversación por canal y contacto (whatsapp + número). paused = 1 → la IA no contesta
  // (atiende una persona); handoff = 1 → la IA pidió ayuda y falta que alguien la mire. role: user (cliente) | assistant (IA) | agent (persona del equipo).
  `CREATE TABLE IF NOT EXISTS ia_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, contact TEXT NOT NULL, name TEXT DEFAULT '',
    paused INTEGER NOT NULL DEFAULT 0, handoff INTEGER NOT NULL DEFAULT 0, handoff_reason TEXT DEFAULT '', msgs INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (channel, contact))`,
  `CREATE TABLE IF NOT EXISTS ia_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL,
    ext_id TEXT DEFAULT '', at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS ia_messages_chat ON ia_messages (chat_id, id)`,
  `CREATE INDEX IF NOT EXISTS ia_messages_ext ON ia_messages (ext_id) WHERE ext_id <> ''`,
  `CREATE INDEX IF NOT EXISTS ia_chats_updated ON ia_chats (updated_at)`,
  // Foto de cada paquete en JPG para WhatsApp (WhatsApp no acepta WEBP): la genera el panel en segundo plano. src = imagen de la que salió.
  `CREATE TABLE IF NOT EXISTS wa_fotos (slug TEXT PRIMARY KEY, src TEXT NOT NULL, jpg TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  // "Nuestros clientes" (página /clientes/ y franja de la portada): fotos de clientes subidas desde el panel. published = 0 → oculta.
  `CREATE TABLE IF NOT EXISTS client_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, image TEXT NOT NULL, caption TEXT DEFAULT '', published INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS page_clicks (
    path TEXT NOT NULL, dev TEXT NOT NULL DEFAULT 'd', target TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (path, dev, target, day))`,
];

// Columnas agregadas después de la primera versión (SQLite no tiene ADD COLUMN IF NOT EXISTS).
const MIGRATIONS = {
  posts: { author_id: "INTEGER DEFAULT 0", reviewer_id: "INTEGER DEFAULT 0", sources: "TEXT DEFAULT ''", read_mins: "INTEGER DEFAULT 0", created_by: "INTEGER DEFAULT 0", updated_by: "INTEGER DEFAULT 0", image_alt: "TEXT DEFAULT ''", seo_title: "TEXT DEFAULT ''", seo_description: "TEXT DEFAULT ''", legacy_id: "TEXT DEFAULT ''", updated_at: "TEXT DEFAULT ''", featured: "INTEGER DEFAULT 0", publish_date: "TEXT DEFAULT ''", related_ids: "TEXT DEFAULT ''", video: "TEXT DEFAULT ''" },
  packages: { created_by: "INTEGER DEFAULT 0", updated_by: "INTEGER DEFAULT 0", home_order: "INTEGER DEFAULT 0", image_alt: "TEXT DEFAULT ''", seo_title: "TEXT DEFAULT ''", seo_description: "TEXT DEFAULT ''", updated_at: "TEXT DEFAULT ''", featured: "INTEGER DEFAULT 0", details: "TEXT DEFAULT ''", meta: "TEXT DEFAULT ''", video: "TEXT DEFAULT ''",
    // Reserva por fecha (el panel las edita en Disponibilidad, no en el formulario del paquete)
    booking_enabled: "INTEGER DEFAULT 0", min_pax: "INTEGER DEFAULT 1", max_pax: "INTEGER DEFAULT 10", daily_capacity: "INTEGER DEFAULT 20",
    weekdays: "TEXT DEFAULT '0,1,2,3,4,5,6'", min_advance_days: "INTEGER DEFAULT 1", horizon_days: "INTEGER DEFAULT 180",
    // Cómo cierra la reserva el cliente: whatsapp (confirma por WhatsApp) | pix (paga online con Pix). Por defecto whatsapp: Pix solo si se elige.
    pay_mode: "TEXT DEFAULT 'whatsapp'",
    // Si el paquete/servicio acepta niños: la ficha pide adultos y niños por separado (0 = solo \"personas\", como siempre)
    accepts_children: "INTEGER DEFAULT 0",
    // Reservar por horario (1 = el cliente elige fecha + hora entre meta.times y el cupo vale por horario; 0 = por día, como siempre)
    time_booking: "INTEGER DEFAULT 0",
    // Precio de niños por edad (JSON de tramos, ver kidsPolicy en booking.js). Vacío = los niños pagan el precio completo.
    kids_policy: "TEXT DEFAULT ''",
    // Subcategoría (slug dentro de la categoría; vacío = sin subcategoría)
    subcategory: "TEXT DEFAULT ''" },
  // Autoría: perfil público de cada persona del equipo (profile_public = 1 → página /autor/<slug>/).
  users: { slug: "TEXT DEFAULT ''", headline: "TEXT DEFAULT ''", bio: "TEXT DEFAULT ''", experience: "TEXT DEFAULT ''", avatar: "TEXT DEFAULT ''", links: "TEXT DEFAULT ''", profile_public: "INTEGER DEFAULT 0" },
  // Traducciones: estado editorial (borrador | revision | publicada). Las existentes quedan publicadas, como hasta ahora.
  translations: { status: "TEXT DEFAULT 'publicada'", updated_by: "TEXT DEFAULT ''" },
  // Actividades: links adjuntos (JSON [{label,url}], hasta 8, solo http/https)
  tasks: { links: "TEXT DEFAULT ''" },
  // Asistente IA: el cliente dice que pagó y falta que el equipo verifique el ingreso (no pausa la IA).
  ia_chats: { pay_check: "INTEGER NOT NULL DEFAULT 0", pay_since: "TEXT DEFAULT ''", origin: "TEXT DEFAULT ''", followup_at: "TEXT DEFAULT ''", followups: "INTEGER NOT NULL DEFAULT 0", datos: "TEXT DEFAULT ''" },
  // Evidencia al completar una actividad: nota y link opcionales
  task_done: { note: "TEXT DEFAULT ''", link: "TEXT DEFAULT ''",
    // Revisión del administrador: review = ok | redo | '' (sin revisar)
    review: "TEXT DEFAULT ''", review_note: "TEXT DEFAULT ''", reviewed_by: "INTEGER DEFAULT 0", reviewed_at: "TEXT DEFAULT ''" },
  // Fase 2: datos de contacto y clave de la reserva (bases creadas con la fase 1 no los tienen)
  // Fase 3 (cobro con Pix): código copia-e-cola, imagen del QR (base64) y momento del pago. payment_ref ya existía (id del pago en Mercado Pago).
  // option_name: opción elegida (ej. "Platea VIP") cuando el producto tiene opciones con precio (meta.options).
  bookings: { option_name: "TEXT DEFAULT ''", time: "TEXT DEFAULT ''", adults: "INTEGER DEFAULT 0", children: "INTEGER DEFAULT 0", child_ages: "TEXT DEFAULT ''", message: "TEXT DEFAULT ''", token: "TEXT DEFAULT ''", updated_at: "TEXT DEFAULT ''", pix_code: "TEXT DEFAULT ''", pix_qr: "TEXT DEFAULT ''", paid_at: "TEXT DEFAULT ''", parent_id: "INTEGER DEFAULT 0" },
};

let done = false;
export async function ensureSchema(db) {
  if (done) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  for (const [table, cols] of Object.entries(MIGRATIONS)) {
    const have = new Set((await db.prepare(`PRAGMA table_info(${table})`).all()).results.map((c) => c.name));
    for (const [name, def] of Object.entries(cols))
      if (!have.has(name)) {
        try { await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`).run(); }
        catch (e) { if (!/duplicate column/i.test(String(e?.message))) throw e; } // otra instancia ya la creó
      }
  }
  // Índices del listado del blog: el orden (fecha de publicación, id) sale del índice y D1 lee solo las filas de la página.
  // Van después de las migraciones porque usan publish_date, que se agrega con ALTER en bases viejas.
  await db.batch([
    db.prepare("CREATE INDEX IF NOT EXISTS posts_order ON posts (published, COALESCE(NULLIF(publish_date,''),created_at) DESC, id DESC)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_slug ON users (slug) WHERE slug <> ''"),
    db.prepare("CREATE INDEX IF NOT EXISTS posts_author ON posts (author_id, published)"),
    db.prepare("CREATE INDEX IF NOT EXISTS posts_cat_order ON posts (published, category, COALESCE(NULLIF(publish_date,''),created_at) DESC, id DESC)"),
  ]);
  await seedCategories(db);
  // Categorías fijas de la portada (site.js): si faltan, se crean al final de la lista (las existentes no se tocan).
  for (const [i, c] of (SITE.fixedCategories || []).entries())
    await db.prepare("INSERT OR IGNORE INTO categories (kind, slug, label, sort_order) VALUES ('packages', ?, ?, ?)").bind(c.slug, c.label, 900 + i).run();
  done = true;
}

// Una sola vez (tabla vacía): crea las categorías a partir de lo que ya existe y pasa posts.category de
// etiqueta ("Dicas de viagem") a clave ("dicas-de-viagem"), para que renombrar una categoría no rompa nada.
async function seedCategories(db) {
  if ((await db.prepare("SELECT COUNT(*) n FROM categories").first()).n > 0) return;
  const st = [];
  const add = (kind, slug, label, listing, n) =>
    st.push(db.prepare("INSERT OR IGNORE INTO categories (kind, slug, label, listing, sort_order) VALUES (?,?,?,?,?)").bind(kind, slug, label, listing, n));
  BUILTIN_PACKAGES.forEach((c, i) => add("packages", c.slug, c.label, c.listing, i));
  const have = new Set(BUILTIN_PACKAGES.map((c) => c.slug));
  let n = 0;
  for (const r of (await db.prepare("SELECT DISTINCT category FROM packages").all()).results) {
    const s = slugify(r.category || "");
    if (s && !have.has(s)) { have.add(s); add("packages", s, r.category, "", 10 + n++); }
  }
  const seen = new Set();
  SEED_POSTS.forEach((l, i) => { seen.add(slugify(l)); add("posts", slugify(l), l, "", i); });
  n = 0;
  for (const r of (await db.prepare("SELECT DISTINCT category FROM posts").all()).results) {
    const v = String(r.category || "").trim(), s = slugify(v) || "blog";
    if (!seen.has(s)) { seen.add(s); add("posts", s, v || "Blog", "", 100 + n++); }
    if (v !== s) st.push(db.prepare("UPDATE posts SET category=? WHERE category=?").bind(s, r.category));
  }
  await db.batch(st);
}

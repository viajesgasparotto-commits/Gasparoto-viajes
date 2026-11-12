-- Esquema completo para una base nueva (npm run d1:schema).
-- Si ya tenés datos, no hace falta correrlo: el panel migra solo al primer ingreso.
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  image TEXT DEFAULT '',
  image_alt TEXT DEFAULT '',
  category TEXT DEFAULT 'Blog',
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  legacy_id TEXT DEFAULT '',
  published INTEGER DEFAULT 1,
  featured INTEGER DEFAULT 0,
  publish_date TEXT DEFAULT '',
  related_ids TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'tangos',
  price_old TEXT DEFAULT '',
  price TEXT DEFAULT '',
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  details TEXT DEFAULT '',
  meta TEXT DEFAULT '',
  image TEXT DEFAULT '',
  image_alt TEXT DEFAULT '',
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  published INTEGER DEFAULT 1,
  featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS price_overrides (
  page TEXT NOT NULL,
  widget_id TEXT NOT NULL,
  html TEXT NOT NULL,
  PRIMARY KEY (page, widget_id)
);
CREATE TABLE IF NOT EXISTS redirects (
  from_path TEXT PRIMARY KEY,
  to_path TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
-- Categorías administrables desde el panel (Paquetes y Blog). El panel las siembra solo la primera vez;
-- "listing" = página fija del sitio asociada (vacío = página dinámica /paquetes/categoria/<slug>/ o /blog/categoria/<slug>/).
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  listing TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kind, slug)
);

-- Consultas de clientes (formulario de la ficha de paquete y clics en WhatsApp). status: nuevo | contactado | vendido | perdido
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  travel_date TEXT DEFAULT '',
  pax INTEGER DEFAULT 0,
  message TEXT DEFAULT '',
  package_title TEXT DEFAULT '',
  package_slug TEXT DEFAULT '',
  page TEXT DEFAULT '',
  source TEXT DEFAULT 'form',
  status TEXT DEFAULT 'nuevo',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Reservas por fecha (functions/lib/booking.js). El panel (Disponibilidad) edita las reglas; el esquema también se migra solo.
ALTER TABLE packages ADD COLUMN booking_enabled INTEGER DEFAULT 0;
ALTER TABLE packages ADD COLUMN min_pax INTEGER DEFAULT 1;
ALTER TABLE packages ADD COLUMN max_pax INTEGER DEFAULT 10;
ALTER TABLE packages ADD COLUMN daily_capacity INTEGER DEFAULT 20;
ALTER TABLE packages ADD COLUMN weekdays TEXT DEFAULT '0,1,2,3,4,5,6';
ALTER TABLE packages ADD COLUMN min_advance_days INTEGER DEFAULT 1;
ALTER TABLE packages ADD COLUMN horizon_days INTEGER DEFAULT 180;
ALTER TABLE packages ADD COLUMN pay_mode TEXT DEFAULT 'whatsapp';
ALTER TABLE packages ADD COLUMN accepts_children INTEGER DEFAULT 0;
ALTER TABLE packages ADD COLUMN kids_policy TEXT DEFAULT '';
-- Reserva por horario: el cliente elige fecha + hora (horarios de meta.times); el cupo vale por horario. bookings.time = "HH:MM" ("" = reserva por día, como siempre).
ALTER TABLE packages ADD COLUMN time_booking INTEGER DEFAULT 0;
CREATE TABLE IF NOT EXISTS availability (
  package_id INTEGER NOT NULL, day TEXT NOT NULL, closed INTEGER NOT NULL DEFAULT 0, capacity INTEGER,
  PRIMARY KEY (package_id, day)
);
-- Cierre de un solo horario de un día (no cancela reservas): closed = 1 cierra ese horario ese día.
CREATE TABLE IF NOT EXISTS availability_slots (
  package_id INTEGER NOT NULL, day TEXT NOT NULL, time TEXT NOT NULL, closed INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (package_id, day, time)
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, package_id INTEGER NOT NULL, day TEXT NOT NULL, pax INTEGER NOT NULL,
  name TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', total INTEGER DEFAULT 0, currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pendiente', hold_until TEXT DEFAULT '', payment_ref TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  message TEXT DEFAULT '', token TEXT DEFAULT '', updated_at TEXT DEFAULT '',
  pix_code TEXT DEFAULT '', pix_qr TEXT DEFAULT '', paid_at TEXT DEFAULT '',
  adults INTEGER DEFAULT 0, children INTEGER DEFAULT 0, child_ages TEXT DEFAULT '', time TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS bookings_pkg_day ON bookings (package_id, day);
CREATE INDEX IF NOT EXISTS bookings_status ON bookings (status, hold_until);
-- Fase 2: status = pendiente | pagada | cancelada | vencida · total en centavos · hold_until = fin de la retención de cupo (UTC, formato SQLite).
-- Si ya tenías la tabla de la fase 1, el panel agrega message/token/updated_at solo al primer ingreso.

-- Usuarios del panel: role = admin | editor. La clave general (ADMIN_PASSWORD) sigue funcionando como administrador de respaldo.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, name TEXT DEFAULT '', role TEXT NOT NULL DEFAULT 'editor',
  pass_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, last_login TEXT DEFAULT ''
);

-- Equipo: autoría, historial, actividades obligatorias, favoritos de la portada y mapa de calor.
ALTER TABLE posts ADD COLUMN created_by INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN updated_by INTEGER DEFAULT 0;
ALTER TABLE packages ADD COLUMN created_by INTEGER DEFAULT 0;
ALTER TABLE packages ADD COLUMN updated_by INTEGER DEFAULT 0;
ALTER TABLE packages ADD COLUMN home_order INTEGER DEFAULT 0;
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT DEFAULT CURRENT_TIMESTAMP, user_id INTEGER NOT NULL DEFAULT 0, user_name TEXT DEFAULT '',
  action TEXT NOT NULL, entity TEXT DEFAULT '', ref_id INTEGER DEFAULT 0, title TEXT DEFAULT '', detail TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS activity_user_at ON activity (user_id, at);
CREATE INDEX IF NOT EXISTS activity_at ON activity (at);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, detail TEXT DEFAULT '', assigned_to INTEGER NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'weekly', due_day TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_by INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS task_done (
  task_id INTEGER NOT NULL, user_id INTEGER NOT NULL, period TEXT NOT NULL, done_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (task_id, user_id, period)
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS login_fails (k TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS login_fails_k ON login_fails (k, at);
ALTER TABLE tasks ADD COLUMN links TEXT DEFAULT '';
ALTER TABLE task_done ADD COLUMN note TEXT DEFAULT '';
ALTER TABLE task_done ADD COLUMN link TEXT DEFAULT '';
ALTER TABLE task_done ADD COLUMN review TEXT DEFAULT '';
ALTER TABLE task_done ADD COLUMN review_note TEXT DEFAULT '';
ALTER TABLE task_done ADD COLUMN reviewed_by INTEGER DEFAULT 0;
ALTER TABLE task_done ADD COLUMN reviewed_at TEXT DEFAULT '';
CREATE TABLE IF NOT EXISTS page_depth (
  path TEXT NOT NULL, dev TEXT NOT NULL DEFAULT 'd', bucket INTEGER NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (path, dev, bucket, day)
);
CREATE TABLE IF NOT EXISTS page_clicks (
  path TEXT NOT NULL, dev TEXT NOT NULL DEFAULT 'd', target TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (path, dev, target, day)
);


-- v8: subcategorías de paquetes/servicios y opciones con precio (la opción elegida queda en la reserva).
CREATE TABLE IF NOT EXISTS subcategories (
  id INTEGER PRIMARY KEY AUTOINCREMENT, parent TEXT NOT NULL, slug TEXT NOT NULL, label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (parent, slug));
ALTER TABLE packages ADD COLUMN subcategory TEXT DEFAULT '';
ALTER TABLE bookings ADD COLUMN option_name TEXT DEFAULT '';

-- v11: conexiones de Claude (conector MCP del blog). Solo se guarda el hash de la clave.
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, prefix TEXT NOT NULL, hash TEXT UNIQUE NOT NULL,
  can_publish INTEGER NOT NULL DEFAULT 0, user_id INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_used TEXT DEFAULT '', uses INTEGER NOT NULL DEFAULT 0, revoked INTEGER NOT NULL DEFAULT 0);

-- v17: paquetes que combinan servicios. La reserva del paquete (parent_id = 0) lleva el total; cada servicio reservable del itinerario
-- tiene su propia fila (parent_id = id de la reserva del paquete, total 0) que ocupa el cupo de ese servicio en su día y horario.
ALTER TABLE bookings ADD COLUMN parent_id INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS bookings_parent ON bookings (parent_id);

-- v19: asistente IA (WhatsApp). Conversaciones y mensajes (ver functions/lib/asistente.js). El panel también las crea solo.
CREATE TABLE IF NOT EXISTS ia_chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, contact TEXT NOT NULL, name TEXT DEFAULT '',
  paused INTEGER NOT NULL DEFAULT 0, handoff INTEGER NOT NULL DEFAULT 0, handoff_reason TEXT DEFAULT '', msgs INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (channel, contact));
CREATE TABLE IF NOT EXISTS ia_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL,
  ext_id TEXT DEFAULT '', at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS ia_messages_chat ON ia_messages (chat_id, id);
CREATE INDEX IF NOT EXISTS ia_messages_ext ON ia_messages (ext_id) WHERE ext_id <> '';
CREATE INDEX IF NOT EXISTS ia_chats_updated ON ia_chats (updated_at);
-- v21: el cliente avisa que pagó → el equipo verifica el ingreso (la IA sigue atendiendo).
ALTER TABLE ia_chats ADD COLUMN pay_check INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ia_chats ADD COLUMN pay_since TEXT DEFAULT '';

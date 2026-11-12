// Reservas: disponibilidad, alta y pago (público) y su gestión en el panel.

import { voucherPage } from "../voucher.js";
import { BOOKING_STATUS, addDays, bookingConfig, createBooking, expireHolds, holdMinutes, isDay, isMonth, monthState, parseWeekdays, setBookingStatus, moveBooking, todayBA } from "../booking.js";
import { timesOf, normTime, normTimes, parseMeta } from "../ficha.js";
import { bookingItin, bundleItems, bundleMonth, bundleStart, createBundleBooking, isBundle, loadParts } from "../bundle.js";
import { canPayPix, cancelPix, createPix, syncPayment, verifyWebhook } from "../pix.js";
import { ensureSchema } from "../schema.js";
import { leadLimited, lockedOut, noteFail } from "./guard.js";
import { cleanTxt, json, sameOrigin } from "./http.js";

// ---------- Disponibilidad (público): días reservables de un paquete en un mes ----------
async function publicAvail(url, env) {
  if (!env.DB) return json({ enabled: false });
  try { await ensureSchema(env.DB); } catch { return json({ enabled: false }); }
  const slug = cleanTxt(url.searchParams.get("slug"), 80);
  const p = slug && (await env.DB.prepare("SELECT * FROM packages WHERE slug=? AND published=1").bind(slug).first());
  if (!p || Number(p.booking_enabled) !== 1) return json({ enabled: false });
  const q = url.searchParams.get("month");
  let month = isMonth(q) ? q : todayBA().slice(0, 7);
  // Paquete que combina servicios: el calendario cruza las reglas del paquete con el cupo de cada servicio en su día.
  // Con ?start=YYYY-MM-DD devuelve el itinerario de esa fecha: qué día (y horario) puede ir cada servicio y cuántos lugares quedan.
  const bundle = isBundle(p), items = bundle ? bundleItems(p, await loadParts(env.DB, p)) : [];
  if (bundle && isDay(url.searchParams.get("start") || "")) return json({ enabled: true, ...(await bundleStart(env.DB, p, items, url.searchParams.get("start"))) });
  const st = bundle ? await bundleMonth(env.DB, p, items, month) : await monthState(env.DB, p, month);
  const days = {};
  const slots = {}; // por horario: { "YYYY-MM-DD": [{ t: "09:00", left: 4 }] }; los horarios ya pasados no se listan
  // Los horarios llenos van con left 0 (el formulario muestra "Sin lugar"); se omiten los ya pasados y los cerrados a mano.
  // Un horario al que le quedan menos lugares que el mínimo por reserva ("full") también va con 0: nadie puede reservarlo, y con left 1 el cliente lo veía habilitado.
  for (const d of st.days) if (d.st === "open") { days[d.day] = d.left; if (st.cfg.byTime) slots[d.day] = d.slots.filter((x) => x.st !== "past" && x.st !== "closed").map((x) => ({ t: x.t, left: x.st === "full" ? 0 : x.left })); }
  return json({ enabled: true, min_pax: st.cfg.min_pax, max_pax: st.cfg.max_pax, today: st.today, month, from_month: st.today.slice(0, 7), to_month: st.lastOk.slice(0, 7), days, by_time: bundle ? false : st.cfg.byTime, times: !bundle && st.cfg.byTime ? st.cfg.times : [], slots: bundle ? {} : slots, bundle });
}


// ---------- Reserva (público, fase 2): crea una reserva pendiente y retiene el cupo unos minutos ----------
// La respuesta trae id + token: con el token el cliente puede liberar su propia retención (POST /api/book/cancel).
async function publicBook(request, env) {
  if (!env.DB) return json({ error: "sin base", code: "down" }, 503);
  const ip = request.headers.get("cf-connecting-ip") || "x";
  if (leadLimited(ip + "|book", 6)) return json({ error: "Demasiados intentos. Probá en unos minutos.", code: "rate" }, 429);
  const b = await request.json().catch(() => ({}));
  if (b.website) return json({ ok: true }); // honeypot
  try { await ensureSchema(env.DB); } catch { return json({ error: "base no disponible", code: "down" }, 503); }
  // Tope por IP guardado en la base (vale para todas las instancias del servidor): 10 reservas por IP cada 15 minutos.
  const bk = [[`book:${ip}`, 10]];
  if (await lockedOut(env.DB, bk)) return json({ error: "Demasiados intentos. Probá en unos minutos.", code: "rate" }, 429);
  await noteFail(env.DB, bk);
  const slug = cleanTxt(b.slug, 80);
  const p = slug && (await env.DB.prepare("SELECT * FROM packages WHERE slug=? AND published=1").bind(slug).first());
  if (!p) return json({ error: "No existe el paquete.", code: "off" }, 404);
  const pax = Number(b.pax);
  const args = { day: String(b.date || ""), time: cleanTxt(b.time, 10), pax: Number.isInteger(pax) ? pax : 0, adults: Number(b.adults), children: Number(b.children), ages: Array.isArray(b.ages) ? b.ages.slice(0, 20) : [], name: cleanTxt(b.name, 80), phone: cleanTxt(b.phone, 40), message: cleanTxt(b.message, 300), option: cleanTxt(b.option, 60) };
  // Paquete que combina servicios: además de la reserva del paquete, cada servicio reservable ocupa su cupo en su día (plan = elección del cliente).
  const r = isBundle(p)
    ? await createBundleBooking(env.DB, env, p, { ...args, plan: Array.isArray(b.plan) ? b.plan.slice(0, 12).map((x) => ({ slug: cleanTxt(x && x.slug, 120), day: cleanTxt(x && x.day, 10), time: cleanTxt(x && x.time, 10) })) : [] })
    : await createBooking(env.DB, env, p, args);
  if (!r.ok) return json({ error: r.error, code: r.code, left: r.left, item: r.item, day: r.day, time: r.time }, r.status || 400);
  const itinTxt = (r.itin || []).map((x) => `${x.day.slice(8, 10)}/${x.day.slice(5, 7)}${x.time ? " " + x.time : ""} ${x.title}${x.option ? " (" + x.option + ")" : ""}`).join(" · ");
  // También queda como consulta (formulario) para que Medición y Consultas sigan contando las ventas en curso.
  try {
    await env.DB.prepare("INSERT INTO leads (name, phone, travel_date, pax, message, package_title, package_slug, page, source) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(cleanTxt(b.name, 80), cleanTxt(b.phone, 40), String(b.date), pax, `Reserva #${r.id} (pendiente)${r.option ? ` · ${r.option}` : ""}${r.time ? ` · ${r.time} h` : ""}${itinTxt ? ` · Itinerario: ${itinTxt}` : ""}${r.children ? ` · ${r.adults} adultos + ${r.children} niños${r.ages && r.ages.length ? ` (${r.ages.join(", ")} años)` : ""}` : ""}`, p.title, p.slug, cleanTxt(b.page, 200), "form").run();
  } catch {}
  return json({ ok: true, id: r.id, token: r.token, total: r.total / 100, currency: r.currency, hold_minutes: r.hold_minutes, expires_in: r.expires_in, pay: bookingConfig(p).pay === "pix" && canPayPix(env, { currency: r.currency, total: r.total }) ? "pix" : "", package: p.title, option: r.option || "", date: String(b.date), time: r.time || "", pax, itin: r.itin || [] });
}

// El cliente libera su retención (se arrepintió o se equivocó de fecha): solo con el token que recibió al reservar y solo si sigue pendiente.
async function publicBookCancel(request, env) {
  if (!env.DB) return json({ error: "sin base" }, 503);
  const ip = request.headers.get("cf-connecting-ip") || "x";
  if (leadLimited(ip + "|bookc", 20)) return json({ error: "Demasiados intentos. Probá en unos minutos." }, 429);
  const b = await request.json().catch(() => ({}));
  const id = Number(b.id), token = String(b.token || "");
  if (!Number.isInteger(id) || id < 1 || token.length < 16) return json({ error: "Datos inválidos" }, 400);
  try { await ensureSchema(env.DB); } catch { return json({ error: "base no disponible" }, 503); }
  const cur = await env.DB.prepare("SELECT payment_ref FROM bookings WHERE id=? AND token=? AND status='pendiente'").bind(id, token).first();
  const r = await env.DB.prepare("UPDATE bookings SET status='cancelada', hold_until='', updated_at=CURRENT_TIMESTAMP WHERE id=? AND token=? AND status='pendiente'").bind(id, token).run();
  if (r.meta && r.meta.changes) await env.DB.prepare("UPDATE bookings SET status='cancelada', hold_until='', updated_at=CURRENT_TIMESTAMP WHERE parent_id=? AND status='pendiente'").bind(id).run();
  if (r.meta && r.meta.changes && cur && cur.payment_ref) await cancelPix(env, cur.payment_ref); // que no pueda pagar un código de una reserva ya liberada
  return json({ ok: true, released: !!(r.meta && r.meta.changes) });
}

// ---------- Fase 3: cobro con Pix ----------
// Fila de la reserva del cliente (id + token) con los segundos de retención que le quedan.
const ownBooking = (env, id, token) => env.DB.prepare(
  `SELECT b.*, MAX(0, CAST(ROUND((julianday(b.hold_until) - julianday('now')) * 86400) AS INTEGER)) AS hold_left FROM bookings b WHERE b.id=? AND b.token=?`).bind(id, token).first();

// POST /api/book/pay {id, token}: crea el cobro Pix de una reserva pendiente vigente y devuelve el código (copia e cola) y el QR. Es idempotente.
async function publicBookPay(request, env) {
  if (!env.DB) return json({ error: "sin base", code: "down" }, 503);
  const ip = request.headers.get("cf-connecting-ip") || "x";
  if (leadLimited(ip + "|pay", 10)) return json({ error: "Demasiados intentos. Probá en unos minutos.", code: "rate" }, 429);
  const b = await request.json().catch(() => ({}));
  const id = Number(b.id), token = String(b.token || "");
  if (!Number.isInteger(id) || id < 1 || token.length < 16) return json({ error: "Datos inválidos", code: "data" }, 400);
  try { await ensureSchema(env.DB); } catch { return json({ error: "base no disponible", code: "down" }, 503); }
  const row = await ownBooking(env, id, token);
  if (!row || !row.id) return json({ error: "No existe la reserva.", code: "gone" }, 404);
  if (row.status === "pagada") return json({ ok: true, paid: true });
  if (row.status !== "pendiente" || row.hold_left <= 0) return json({ error: "La reserva ya no está vigente.", code: "expired" }, 409);
  if (!canPayPix(env, row)) return json({ error: "El pago online no está disponible para esta reserva.", code: "off" }, 409);
  const p = await env.DB.prepare("SELECT title, pay_mode FROM packages WHERE id=?").bind(row.package_id).first();
  if (!p || bookingConfig(p).pay !== "pix") return json({ error: "Este paquete se confirma por WhatsApp.", code: "off" }, 409);
  const r = await createPix(env.DB, env, row, p);
  if (!r.ok) return json({ error: r.error, code: "mp" }, r.status || 502);
  return json({ ok: true, code: r.code, qr: r.qr_base64, expires_in: r.expires_in || 0, total: row.total / 100, currency: row.currency });
}


// ---------- Voucher de reserva pagada ----------
const htmlRes = (h) => new Response(h, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
async function withPkgTitle(env, row) {
  const p = await env.DB.prepare("SELECT title FROM packages WHERE id=?").bind(row.package_id).first();
  return { ...row, package_title: p?.title || "", itin: await bookingItin(env.DB, row).catch(() => []) };
}
// Cliente: GET /api/book/voucher?id=&token= (solo reservas pagadas)
async function publicVoucher(url, env) {
  if (!env.DB) return json({ error: "sin base" }, 503);
  const id = Number(url.searchParams.get("id")), token = String(url.searchParams.get("token") || "");
  if (leadLimited("vch|" + id, 60)) return json({ error: "Demasiadas consultas." }, 429);
  if (!Number.isInteger(id) || id < 1 || token.length < 16) return json({ error: "Datos inválidos" }, 400);
  try { await ensureSchema(env.DB); } catch { return json({ error: "base no disponible" }, 503); }
  const row = await ownBooking(env, id, token);
  if (!row || !row.id) return json({ error: "No existe la reserva." }, 404);
  if (row.status !== "pagada") return json({ error: "El voucher está disponible cuando la reserva está pagada." }, 409);
  return htmlRes(voucherPage(env, await withPkgTitle(env, row)));
}
// Panel: GET /api/bookings?voucher=ID (HTML) y ?link=ID (URL privada para enviar por WhatsApp)
async function adminVoucher(url, env, kind) {
  const id = Number(url.searchParams.get(kind));
  if (!Number.isInteger(id) || id < 1) return json({ error: "Reserva inválida" }, 400);
  const row = await env.DB.prepare("SELECT * FROM bookings WHERE id=?").bind(id).first();
  if (!row) return json({ error: "No existe la reserva." }, 404);
  if (row.status !== "pagada") return json({ error: "Solo se genera el voucher de reservas pagadas." }, 409);
  const full = await withPkgTitle(env, row);
  if (kind === "voucher") return htmlRes(voucherPage(env, full));
  return json({ url: `${url.origin}/api/book/voucher?id=${id}&token=${encodeURIComponent(row.token)}`, phone: row.phone || "", name: row.name || "", pkg: full.package_title + (row.option_name ? " · " + row.option_name : ""), day: row.day, time: row.time || "", pax: row.pax, itin: full.itin });
}

// GET /api/book/status?id=&token=: estado de la reserva del cliente. Si hay un cobro Pix en curso, lo consulta a Mercado Pago (por si el webhook se demora).
async function publicBookStatus(url, request, env) {
  if (!env.DB) return json({ error: "sin base" }, 503);
  const id = Number(url.searchParams.get("id")), token = String(url.searchParams.get("token") || "");
  // Freno por reserva y no por IP: la ficha consulta cada 5 s (~120 en la ventana de 10 min) y varias personas pueden compartir IP (hotel, oficina).
  if (leadLimited("bst|" + id, 200)) return json({ error: "Demasiadas consultas." }, 429);
  if (!Number.isInteger(id) || id < 1 || token.length < 16) return json({ error: "Datos inválidos" }, 400);
  try { await ensureSchema(env.DB); } catch { return json({ error: "base no disponible" }, 503); }
  let row = await ownBooking(env, id, token);
  if (!row || !row.id) return json({ error: "No existe la reserva." }, 404);
  if (row.status === "pendiente" && row.payment_ref) {
    const s = await syncPayment(env.DB, env, row.payment_ref);
    if (s.paid) row = await ownBooking(env, id, token);
  }
  const status = row.status === "pendiente" && row.hold_left <= 0 ? "vencida" : row.status;
  return json({ status, paid: status === "pagada", left: status === "pendiente" ? row.hold_left : 0 });
}

// POST /api/pay/webhook: aviso de Mercado Pago. Se responde 200 rápido siempre que la firma sea válida (si no, reintenta durante días).
async function payWebhook(request, url, env) {
  if (!env.DB) return json({ ok: false }, 503);
  const body = await request.json().catch(() => ({}));
  const dataId = String(url.searchParams.get("data.id") || (body.data && body.data.id) || "");
  const type = String(body.type || url.searchParams.get("type") || url.searchParams.get("topic") || "");
  if (!(await verifyWebhook(env, request, dataId))) return json({ error: "firma inválida" }, 401);
  if (type !== "payment" || !dataId) return json({ ok: true, ignored: true });
  try { await ensureSchema(env.DB); await syncPayment(env.DB, env, dataId); } catch { return json({ ok: false }, 500); }
  return json({ ok: true });
}

// Rutas públicas de reservas: /api/avail, /api/book[/cancel|/pay|/status] y /api/pay/webhook.
export async function manejarReservasPublicas({ request, env, url, res, id, method }) {
  if (res === "avail" && method === "GET") return publicAvail(url, env);
  if (res === "book" && method === "POST") {
    const origin = request.headers.get("origin");
    if (origin && sameOrigin(origin, url) === false) return json({ error: "Origen no permitido", code: "origin" }, 403);
    return id === "cancel" ? publicBookCancel(request, env) : id === "pay" ? publicBookPay(request, env) : publicBook(request, env);
  }
  if (res === "book" && id === "status" && method === "GET") return publicBookStatus(url, request, env);
  if (res === "book" && id === "voucher" && method === "GET") return publicVoucher(url, env);
  if (res === "pay" && id === "webhook" && method === "POST") return payWebhook(request, url, env); // lo llama Mercado Pago: sin origen ni sesión; se valida por firma + consulta a su API
  return null;
}

// Panel: /api/bookings (listado y estados), /api/slots (cupos por día) y /api/booking-config (reglas del paquete).
export async function manejarReservas({ request, env, url, res, id, method }) {
  // Reservas (fase 2): listado con estados, y cambio de estado (pagada / cancelada / reactivar) desde el panel
  if (res === "bookings") {
    const rid = id && /^\d+$/.test(id) ? Number(id) : null;
    if (method === "GET") {
      if (url.searchParams.get("voucher")) return adminVoucher(url, env, "voucher");
      if (url.searchParams.get("link")) return adminVoucher(url, env, "link");
      await expireHolds(env.DB);
      const stats = (await env.DB.prepare("SELECT status, COUNT(*) n FROM bookings WHERE COALESCE(parent_id, 0)=0 GROUP BY status").all()).results;
      // Para el aviso del menú: pendientes + "sin confirmar" (vencidas con salida de hoy en adelante, que nadie atendió).
      if (url.searchParams.get("count")) {
        const unc = (await env.DB.prepare("SELECT COUNT(*) n FROM bookings WHERE status='vencida' AND day>=? AND COALESCE(parent_id, 0)=0").bind(todayBA()).first())?.n || 0;
        return json({ pending: (stats.find((x) => x.status === "pendiente")?.n || 0) + unc, unconfirmed: unc });
      }
      const rows = (await env.DB.prepare(
        `SELECT b.id, b.package_id, b.day, b.time, b.option_name, b.pax, b.name, b.phone, b.message, b.total, b.currency, b.status, b.adults, b.children, b.child_ages, b.created_at, b.updated_at, b.paid_at, (b.payment_ref <> '') AS pix,
                CASE WHEN b.status='pendiente' THEN MAX(0, CAST(ROUND((julianday(b.hold_until) - julianday('now')) * 86400) AS INTEGER)) END AS hold_left,
                COALESCE(k.title, '(paquete borrado)') AS package_title, k.slug AS package_slug
         FROM bookings b LEFT JOIN packages k ON k.id = b.package_id WHERE COALESCE(b.parent_id, 0)=0 ORDER BY b.id DESC LIMIT 500`).all()).results;
      // Reservas de paquetes que combinan servicios: el itinerario (las filas de cada servicio) va dentro de la reserva del paquete.
      const ids = rows.map((r) => r.id);
      if (ids.length) {
        const kids = (await env.DB.prepare(`SELECT b.parent_id, b.day, b.time, b.option_name, COALESCE(k.title, '(servicio borrado)') AS title FROM bookings b LEFT JOIN packages k ON k.id=b.package_id WHERE b.parent_id IN (SELECT id FROM bookings WHERE COALESCE(parent_id, 0)=0 ORDER BY id DESC LIMIT 500) ORDER BY b.day, b.time, b.id`).all()).results;
        const by = new Map();
        for (const k of kids) { if (!by.has(k.parent_id)) by.set(k.parent_id, []); by.get(k.parent_id).push({ title: k.title, option: k.option_name || "", day: k.day, time: k.time || "" }); }
        for (const r of rows) if (by.has(r.id)) r.itin = by.get(r.id);
        // Con los servicios que no se reservan por fecha (traslados, etc.): están en el plan del paquete, no tienen fila propia.
        for (const r of rows) if (r.itin) r.itin = await bookingItin(env.DB, r).catch(() => r.itin);
      }
      return json({ bookings: rows, stats, hold_minutes: holdMinutes(env) });
    }
    if (method === "PUT" && rid) {
      const b = await request.json().catch(() => ({}));
      // Corregir el titular (el nombre que sale en el voucher). No cambia el estado ni el cupo.
      if (b.status === undefined && b.name !== undefined) {
        const name = cleanTxt(b.name, 80);
        if (!name) return json({ error: "El titular no puede quedar vacío." }, 400);
        const r = await env.DB.prepare("UPDATE bookings SET name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(name, rid).run();
        return r.meta?.changes ? json({ ok: true, name }) : json({ error: "No existe la reserva." }, 404);
      }
      // Cambiar la fecha u horario (el voucher se actualiza solo porque sale de la reserva).
      if (b.status === undefined && (b.day !== undefined || b.time !== undefined)) {
        const r = await moveBooking(env.DB, env, rid, { day: b.day !== undefined ? String(b.day) : undefined, time: b.time !== undefined ? String(b.time) : undefined });
        return r.ok ? json({ ok: true, day: r.day, time: r.time }) : json({ error: r.error, code: r.code }, r.status || 400);
      }
      if (!BOOKING_STATUS.includes(b.status) || b.status === "vencida") return json({ error: "Estado inválido" }, 400);
      const r = await setBookingStatus(env.DB, env, rid, b.status);
      return r.ok ? json({ ok: true }) : json({ error: r.error }, r.status || 400);
    }
    if (method === "DELETE" && rid) {
      // Una reserva pagada no se borra desde el panel (es un registro de venta): primero hay que cancelarla.
      const r = await env.DB.prepare("DELETE FROM bookings WHERE id=? AND status<>'pagada'").bind(rid).run();
      if (r.meta?.changes) await env.DB.prepare("DELETE FROM bookings WHERE parent_id=?").bind(rid).run(); // los servicios de un paquete se van con él
      return r.meta?.changes ? json({ ok: true }) : json({ error: "No se puede borrar: no existe o está pagada (cancelala primero)." }, 409);
    }
    return json({ error: "Método no permitido" }, 405);
  }

  // Disponibilidad y cupos por paquete (calendario del panel)
  if (res === "slots") {
    const pid = Number(url.searchParams.get("package_id") || (await request.clone().json().catch(() => ({}))).package_id);
    const p = pid && (await env.DB.prepare("SELECT * FROM packages WHERE id=?").bind(pid).first());
    if (!p) return json({ error: "No existe el paquete" }, 404);
    if (method === "GET") {
      const q = url.searchParams.get("month"), month = isMonth(q) ? q : todayBA().slice(0, 7);
      const st = await monthState(env.DB, p, month);
      const c = st.cfg;
      // Reservas que hoy ocupan cupo (pagadas y pendientes con retención vigente), para el detalle por día del panel.
      const res = (await env.DB.prepare("SELECT id, day, time, pax, adults, children, child_ages, name, phone, status, COALESCE(parent_id, 0) AS parent_id, (SELECT k.title FROM bookings pb JOIN packages k ON k.id=pb.package_id WHERE pb.id=bookings.parent_id) AS via FROM bookings WHERE package_id=? AND day BETWEEN ? AND ? AND (status='pagada' OR (status='pendiente' AND hold_until > datetime('now'))) ORDER BY day, id").bind(p.id, `${month}-01`, `${month}-31`).all()).results;
      return json({ month, today: st.today, res, config: { enabled: c.enabled, min_pax: c.min_pax, max_pax: c.max_pax, capacity: c.capacity, weekdays: c.weekdays, advance: c.advance, horizon: c.horizon, pay: c.pay, time_flag: c.timeFlag, by_time: c.byTime, times: c.times, time_rows: timesOf(p) }, days: st.days });
    }
    if (method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const today = todayBA(), last = addDays(today, 900);
      const dates = [...new Set((Array.isArray(b.dates) ? b.dates : []).map(String).filter((d) => isDay(d) && d >= today && d <= last))].slice(0, 62);
      if (!dates.length) return json({ error: "Elegí al menos un día (no vale el pasado)." }, 400);
      // Cerrar o abrir un solo horario de esos días (tabla availability_slots). No toca las reservas que ya tiene.
      if (b.action === "close_time" || b.action === "open_time") {
        const t = normTime(b.time);
        if (!timesOf(p).some((r) => r[0] === t)) return json({ error: "Ese horario no está en la ficha del paquete." }, 400);
        const stmts = b.action === "close_time"
          ? dates.map((d) => env.DB.prepare("INSERT INTO availability_slots (package_id, day, time, closed) VALUES (?,?,?,1) ON CONFLICT(package_id, day, time) DO UPDATE SET closed=1").bind(p.id, d, t))
          : dates.map((d) => env.DB.prepare("DELETE FROM availability_slots WHERE package_id=? AND day=? AND time=?").bind(p.id, d, t));
        await env.DB.batch(stmts);
        return json({ ok: true, n: dates.length });
      }
      const cap = Math.round(Number(b.capacity));
      let sql, extra = [];
      if (b.action === "close") sql = "INSERT INTO availability (package_id, day, closed, capacity) VALUES (?,?,1,NULL) ON CONFLICT(package_id, day) DO UPDATE SET closed=1, capacity=NULL";
      else if (b.action === "open") sql = "INSERT INTO availability (package_id, day, closed, capacity) VALUES (?,?,0,NULL) ON CONFLICT(package_id, day) DO UPDATE SET closed=0";
      else if (b.action === "capacity") {
        if (!Number.isFinite(cap) || cap < 0 || cap > 9999) return json({ error: "El cupo debe estar entre 0 y 9999." }, 400);
        sql = "INSERT INTO availability (package_id, day, closed, capacity) VALUES (?,?,0,?) ON CONFLICT(package_id, day) DO UPDATE SET closed=0, capacity=excluded.capacity";
        extra = [cap];
      } else if (b.action === "clear") sql = "DELETE FROM availability WHERE package_id=? AND day=?";
      else return json({ error: "Acción inválida" }, 400);
      await env.DB.batch(dates.map((d) => env.DB.prepare(sql).bind(p.id, d, ...extra)));
      return json({ ok: true, n: dates.length });
    }
    return json({ error: "Método no permitido" }, 405);
  }

  // Reglas de reserva de un paquete (activar, personas por reserva, cupo diario, días de la semana, anticipación)
  if (res === "booking-config" && method === "PUT" && id && /^\d+$/.test(id)) {
    const b = await request.json().catch(() => ({}));
    const wd = parseWeekdays(Array.isArray(b.weekdays) ? b.weekdays.join(",") : b.weekdays);
    if (Number(b.booking_enabled) === 1 && !wd.length) return json({ error: "Marcá al menos un día de la semana." }, 400);
    const c = bookingConfig({ ...b, weekdays: wd.join(",") });
    if (Number(b.min_pax) > Number(b.max_pax)) return json({ error: "El mínimo de personas no puede superar al máximo." }, 400);
    // Horarios de salida (editor visual de Disponibilidad). Si el panel los manda, reemplazan meta.times; el resto de la ficha no se toca.
    // Si no manda "times" (panel viejo u otra pantalla), los horarios actuales se conservan.
    const pid = Number(id);
    const row = await env.DB.prepare("SELECT meta FROM packages WHERE id=?").bind(pid).first();
    if (!row) return json({ error: "No existe el paquete" }, 404);
    const sentTimes = Array.isArray(b.times);
    const times = sentTimes ? normTimes(b.times) : timesOf(row);
    if (sentTimes && b.times.length && !times.length) return json({ error: "Ningún horario es válido. Usá el formato 09:00 (de 00:00 a 23:59)." }, 400);
    // Reservar por horario: solo si el producto tiene horarios cargados (los que llegan ahora o los que ya tenía). Si el panel no manda el campo, se conserva el valor actual.
    const tb = b.time_booking === undefined ? null : Number(b.time_booking) === 1 ? 1 : 0;
    if (tb === 1 && !times.length) return json({ error: "Para reservar por horario primero cargá los horarios de salida (sección “Horarios de salida”)." }, 400);
    // Si se apaga el modo por horario y los horarios se borran a la vez, no dejamos un "time_booking" prendido sin horarios: el motor lo ignora, pero el panel lo mostraría tildado.
    const tbSave = sentTimes && !times.length && tb === null ? 0 : tb;
    const stmts = [env.DB.prepare("UPDATE packages SET booking_enabled=?, min_pax=?, max_pax=?, daily_capacity=?, weekdays=?, min_advance_days=?, horizon_days=?, pay_mode=?, time_booking=COALESCE(?, time_booking) WHERE id=?")
      .bind(c.enabled ? 1 : 0, c.min_pax, c.max_pax, c.capacity, c.weekdays.join(","), c.advance, c.horizon, c.enabled ? c.pay : "whatsapp", tbSave, pid)];
    if (sentTimes) stmts.push(env.DB.prepare("UPDATE packages SET meta=? WHERE id=?").bind(JSON.stringify({ ...parseMeta(row.meta), times }), pid));
    // Reservas futuras que quedaron en un horario que ya no existe: siguen valiendo, pero conviene avisar para moverlas desde Reservas.
    let orphans = 0;
    if (sentTimes) {
      const keep = times.map((t) => t[0]);
      orphans = Number((await env.DB.prepare(`SELECT COUNT(*) n FROM bookings WHERE package_id=? AND day>=? AND time<>'' ${keep.length ? `AND time NOT IN (${keep.map(() => "?").join(",")})` : ""} AND (status='pagada' OR (status='pendiente' AND hold_until > datetime('now')))`).bind(pid, todayBA(), ...keep).first())?.n) || 0;
    }
    await env.DB.batch(stmts); // el paquete existe (se leyó arriba), así que el UPDATE siempre aplica
    return json({ ok: true, times: times.length, orphans });
  }
  return null;
}

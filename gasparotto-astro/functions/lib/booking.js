// Reservas por fecha: reglas de disponibilidad por paquete + excepciones por día (tabla availability).
// Regla base (columnas de packages): días de la semana abiertos, cupo diario en personas, mínimo/máximo de personas por reserva,
// anticipación mínima y horizonte de venta. Excepción por día: cerrado, abierto a la fuerza (aunque el día de semana esté apagado) o con cupo propio.
// Ocupación: reservas pagadas + reservas pendientes con retención vigente (bookings; las crea createBooking, fase 2).
import { parsePrice, priceCurrency } from "./seo.js";
import { normTime, optionsOf, timesOf } from "./ficha.js";
const num = (v, d, lo, hi) => { const n = Math.round(Number(v)); return Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : d)); };
const pad = (n) => String(n).padStart(2, "0");

export const WEEKDAYS_ALL = [0, 1, 2, 3, 4, 5, 6]; // 0 = domingo (igual que Date.getUTCDay)
export const isMonth = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s || "");
export const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
// "Hoy" en horario de Buenos Aires / Brasilia (UTC-3), igual que el resto del sitio.
export const todayBA = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
// Hora actual "HH:MM" en Buenos Aires / Brasilia (UTC-3): para no vender un horario de hoy que ya salió.
export const nowTimeBA = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(11, 16);
export const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export function parseWeekdays(v) {
  const l = [...new Set(String(v ?? "").split(",").map((x) => x.trim()).filter((x) => /^[0-6]$/.test(x)).map(Number))].sort();
  return l;
}

// ---------- Política de niños por edad ----------
// packages.kids_policy = JSON {"tiers":[{"from":0,"to":5,"pct":0},{"from":6,"to":11,"pct":50}]}: de X a Y años el niño paga pct % del precio adulto
// (0 = gratis). Quien no entra en ningún tramo (por ejemplo 12 en adelante) paga como adulto. Sin tramos = todos pagan el precio completo (como antes).
export const KID_MAX_AGE = 17;
export function kidsPolicy(p = {}) {
  let raw = p.kids_policy;
  if (typeof raw === "string") { try { raw = JSON.parse(raw || "{}"); } catch { raw = {}; } }
  const list = Array.isArray(raw && raw.tiers) ? raw.tiers : [];
  const tiers = list.map((t) => ({ from: num(t.from, 0, 0, KID_MAX_AGE), to: num(t.to, 0, 0, KID_MAX_AGE), pct: num(t.pct, 100, 0, 100) }))
    .filter((t) => t.from <= t.to).sort((a, b) => a.from - b.from).slice(0, 4);
  return { tiers };
}
// Valida los tramos que manda el panel: devuelve { tiers } o { error }.
export function checkKidsPolicy(raw) {
  let r = raw; if (typeof r === "string") { try { r = JSON.parse(r || "{}"); } catch { return { error: "La política de niños no es válida." }; } }
  const list = Array.isArray(r && r.tiers) ? r.tiers : [];
  if (list.length > 4) return { error: "Máximo 4 tramos de edad." };
  const tiers = [];
  for (const t of list) {
    const from = Number(t.from), to = Number(t.to), pct = Number(t.pct);
    if (![from, to, pct].every(Number.isFinite) || !Number.isInteger(from) || !Number.isInteger(to)) return { error: "Completá las edades y el porcentaje de cada tramo." };
    if (from < 0 || to > KID_MAX_AGE || from > to) return { error: `El tramo ${from}–${to} años no es válido (de 0 a ${KID_MAX_AGE}, y "desde" no puede superar a "hasta").` };
    if (pct < 0 || pct > 100) return { error: "El porcentaje va de 0 a 100." };
    tiers.push({ from, to, pct: Math.round(pct) });
  }
  tiers.sort((a, b) => a.from - b.from);
  for (let i = 1; i < tiers.length; i++) if (tiers[i].from <= tiers[i - 1].to) return { error: `Los tramos ${tiers[i - 1].from}–${tiers[i - 1].to} y ${tiers[i].from}–${tiers[i].to} años se superponen.` };
  return { tiers };
}
// Porcentaje del precio adulto que paga un niño de esa edad (100 = completo).
export const kidPct = (tiers, age) => { const t = tiers.find((x) => age >= x.from && age <= x.to); return t ? t.pct : 100; };
// Total en centavos: adultos × precio + cada niño según su tramo. unitCents = precio por persona en centavos.
export function priceTotal(unitCents, adults, ages, tiers) {
  return unitCents * adults + ages.reduce((a, age) => a + Math.round(unitCents * kidPct(tiers, age) / 100), 0);
}

// Configuración normalizada de un paquete (acepta la fila de packages o el cuerpo del panel).
export function bookingConfig(p = {}) {
  const min = num(p.min_pax, 1, 1, 99);
  const cfg = {
    enabled: Number(p.booking_enabled) === 1,
    min_pax: min,
    max_pax: num(p.max_pax, 10, min, 99),
    capacity: num(p.daily_capacity, 20, 1, 9999),
    weekdays: p.weekdays == null || p.weekdays === "" ? WEEKDAYS_ALL : parseWeekdays(p.weekdays),
    advance: num(p.min_advance_days, 1, 0, 365),
    horizon: num(p.horizon_days, 180, 1, 730),
    pay: p.pay_mode === "pix" ? "pix" : "whatsapp", // cómo cierra la reserva: confirmando por WhatsApp o pagando online con Pix
    // Reserva por horario: times = horarios de la ficha (meta.times); byTime solo si está prendido Y hay horarios (si no, se reserva por día como siempre).
    timeFlag: Number(p.time_booking) === 1,
    times: timesOf(p).map((r) => r[0]),
  };
  cfg.byTime = cfg.timeFlag && cfg.times.length > 0;
  return cfg;
}

// Estado de cada día de un mes (YYYY-MM). st: open | full | closed | off (día de semana apagado) | late (dentro de la anticipación mínima)
// | beyond (más allá del horizonte) | past.
// Con reserva por horario (cfg.byTime) cada día trae además slots: [{ t, booked, left, st }] (st: open | full | past); el cupo (cap) vale POR horario,
// y left del día = el mayor cupo libre entre sus horarios abiertos. Las reservas viejas sin hora (time = '') cuentan contra todos los horarios del día.
export async function monthState(db, p, month) {
  const cfg = bookingConfig(p), today = todayBA();
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = `${month}-01`, to = `${month}-${pad(last)}`;
  // Las consultas no dependen entre sí: se piden en paralelo (antes eran 3 o 4 viajes a D1 en serie por cada mes que abre el cliente).
  // Con reserva por horario una sola consulta (día + horario) alcanza: el total de cada día sale de sumar sus horarios.
  const HOLD = "(status='pagada' OR (status='pendiente' AND hold_until > datetime('now')))";
  const [exR, usedR, closedR] = await Promise.all([
    db.prepare("SELECT day, closed, capacity FROM availability WHERE package_id=? AND day BETWEEN ? AND ?").bind(p.id, from, to).all(),
    cfg.byTime
      ? db.prepare(`SELECT day, time, SUM(pax) n FROM bookings WHERE package_id=? AND day BETWEEN ? AND ? AND ${HOLD} GROUP BY day, time`).bind(p.id, from, to).all()
      : db.prepare(`SELECT day, SUM(pax) n FROM bookings WHERE package_id=? AND day BETWEEN ? AND ? AND ${HOLD} GROUP BY day`).bind(p.id, from, to).all(),
    // Horarios cerrados a mano (availability_slots): el día suma solo los horarios abiertos.
    cfg.byTime ? db.prepare("SELECT day, time FROM availability_slots WHERE package_id=? AND day BETWEEN ? AND ? AND closed=1").bind(p.id, from, to).all() : Promise.resolve({ results: [] }),
  ]);
  const ex = new Map(exR.results.map((r) => [r.day, r]));
  const used = new Map(), usedT = new Map(), closedT = new Set();
  for (const r of usedR.results) {
    used.set(r.day, (used.get(r.day) || 0) + r.n);
    if (cfg.byTime) usedT.set(`${r.day}|${r.time || ""}`, r.n);
  }
  for (const r of closedR.results) closedT.add(`${r.day}|${r.time}`);
  const nowT = nowTimeBA();
  const firstOk = addDays(today, cfg.advance), lastOk = addDays(today, cfg.horizon);
  const days = [];
  for (let d = 1; d <= last; d++) {
    const day = `${month}-${pad(d)}`, e = ex.get(day), wd = new Date(day + "T00:00:00Z").getUTCDay();
    const cap = e && e.capacity != null ? e.capacity : cfg.capacity, booked = used.get(day) || 0;
    let left = Math.max(0, cap - booked), slots = [];
    if (cfg.byTime) {
      const legacy = usedT.get(`${day}|`) || 0;
      slots = cfg.times.map((t) => {
        const b = (usedT.get(`${day}|${t}`) || 0) + legacy, l = Math.max(0, cap - b);
        return { t, booked: b, left: l, st: day === today && t <= nowT ? "past" : closedT.has(`${day}|${t}`) ? "closed" : l < cfg.min_pax ? "full" : "open" };
      });
      left = Math.max(0, ...slots.filter((x) => x.st !== "past" && x.st !== "closed").map((x) => x.left));
    }
    let st = "open";
    if (day < today) st = "past";
    else if (e && e.closed) st = "closed";
    else if (!e && !cfg.weekdays.includes(wd)) st = "off";
    else if (day < firstOk) st = "late";
    else if (day > lastOk) st = "beyond";
    else if (left < cfg.min_pax) st = "full";
    days.push({ day, st, cap, booked, left, slots, ex: e ? (e.closed ? "closed" : "open") : "", custom: !!(e && e.capacity != null) });
  }
  return { cfg, today, firstOk, lastOk, days };
}

// ---------- Fase 2: reserva pendiente con retención de cupo ----------
// Estados (bookings.status): pendiente (cupo retenido hasta hold_until) · pagada · cancelada · vencida (la retención terminó sin pagar).
// Solo "pagada" y "pendiente con retención vigente" descuentan cupo. hold_until se guarda con datetime('now', ...) de SQLite
// (UTC, "YYYY-MM-DD HH:MM:SS"), el mismo formato contra el que monthState compara.
export const BOOKING_STATUS = ["pendiente", "pagada", "cancelada", "vencida"];
// Minutos de retención: BOOKING_HOLD_MINUTES (wrangler vars), siempre entre 15 y 30. Por defecto 20.
export function holdMinutes(env) {
  const raw = String((env && env.BOOKING_HOLD_MINUTES) ?? "").trim();
  const n = raw === "" ? NaN : Math.round(Number(raw));
  return Number.isFinite(n) ? Math.min(30, Math.max(15, n)) : 20;
}

// Las pendientes con retención vencida pasan a "vencida" (así el panel las muestra bien). Es solo orden: el cupo ya se libera solo
// porque monthState/createBooking cuentan únicamente las retenciones vigentes.
export async function expireHolds(db) {
  await db.prepare("UPDATE bookings SET status='vencida', updated_at=CURRENT_TIMESTAMP WHERE status='pendiente' AND hold_until <= datetime('now')").run();
}

// Condición SQL de "esta reserva ocupa cupo" (alias b). La usan createBooking y setBookingStatus; es la misma regla que monthState.
export const OCCUPIED = "(b.status='pagada' OR (b.status='pendiente' AND b.hold_until > datetime('now')))";

// Crea la reserva pendiente. Devuelve { ok:true, id, token, ... } o { code, error, status } (code: off | data | pax | unavailable | full | limit).
// La revisión de cupo y el INSERT son UNA sola sentencia SQL: dos clientes a la vez no pueden pasarse del cupo (la segunda no inserta nada).
// time: "HH:MM" del horario elegido (obligatorio solo si el producto se reserva por horario; si no, se ignora).
export async function createBooking(db, env, p, { day, time, pax, adults, children, ages, name, phone, message, option, kidTab = null }) {
  const cfg = bookingConfig(p);
  if (!cfg.enabled) return { code: "off", error: "Este paquete no se reserva por fecha.", status: 409 };
  if (!isDay(day) || !name || String(phone).replace(/\D/g, "").length < 6) return { code: "data", error: "Faltan datos de la reserva.", status: 400 };
  if (!Number.isInteger(pax) || pax < cfg.min_pax || pax > cfg.max_pax) return { code: "pax", error: `Indicá entre ${cfg.min_pax} y ${cfg.max_pax} personas.`, status: 400 };
  time = cfg.byTime ? normTime(time) : "";
  if (cfg.byTime && !cfg.times.includes(time)) return { code: "time", error: "Elegí un horario de salida.", status: 400 };
  // Adultos y niños: si el paquete acepta niños, el total (pax) tiene que ser adultos + niños y hace falta al menos 1 adulto.
  // Si no los acepta, todos cuentan como adultos. El cupo y el precio siguen contando personas (pax).
  if (Number(p.accepts_children) === 1) {
    const a = Number.isInteger(adults) ? adults : pax, c = Number.isInteger(children) ? children : 0;
    if (a < 1 || c < 0 || a + c !== pax) return { code: "pax", error: "Indicá al menos 1 adulto y que adultos + niños sumen el total.", status: 400 };
    adults = a; children = c;
  } else { adults = pax; children = 0; }
  // Edades de los niños: si el paquete tiene tramos de precio por edad, hacen falta (una por niño) para calcular el total.
  // kidTab (paquetes que combinan servicios): % por edad de 0 a 17 calculado con la política de cada servicio; reemplaza a los tramos propios.
  const tab = Array.isArray(kidTab) && kidTab.length === KID_MAX_AGE + 1 ? kidTab : null;
  const tiers = tab ? tab.map((pct, a) => ({ from: a, to: a, pct })) : kidsPolicy(p).tiers;
  ages = Array.isArray(ages) ? ages.map(Number) : [];
  if (children > 0 && tiers.length) {
    if (ages.length !== children || ages.some((x) => !Number.isInteger(x) || x < 0 || x > KID_MAX_AGE)) return { code: "pax", error: "Indicá la edad de cada niño.", status: 400 };
  } else ages = [];
  // Opciones con precio (meta.options): si el producto las tiene, hay que elegir una (por índice o por nombre) y su precio es el que se cobra.
  // Todas comparten fecha, horario y cupo. Sin opciones, se usa el precio del producto como siempre.
  const opts = optionsOf(p);
  let opt = null;
  if (opts.length) {
    const want = String(option ?? "").trim();
    opt = /^\d+$/.test(want) ? opts[Number(want)] : opts.find((o) => o.name.toLowerCase() === want.toLowerCase());
    if (!opt) return { code: "option", error: "Elegí una opción.", status: 400 };
    if (!opt.cents) return { code: "option", error: "Esa opción no tiene un precio para reservar en línea.", status: 400 };
  }
  await expireHolds(db);
  const st = await monthState(db, p, day.slice(0, 7));
  const d = st.days.find((x) => x.day === day);
  if (!d || d.st !== "open") return { code: "unavailable", error: "Esa fecha no está disponible.", status: 409 };
  const slot = cfg.byTime ? d.slots.find((x) => x.t === time) : null;
  if (cfg.byTime && (!slot || slot.st === "past" || slot.st === "closed")) return { code: "unavailable", error: "Ese horario no está disponible.", status: 409 };
  const free = slot ? slot.left : d.left;
  if (pax > free) return { code: "full", error: "Ya no quedan lugares para esa cantidad de personas.", left: free, status: 409 };
  // Freno a quien acapara cupo sin pagar: máximo 3 retenciones vigentes por teléfono.
  // Se compara por dígitos: "+55 11 9999-0000" y "5511999990000" son el mismo teléfono (si no, el tope se saltea cambiando el formato).
  const PH = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'+',''),'(',''),')',''),'.','')";
  const held = (await db.prepare(`SELECT COUNT(*) n FROM bookings WHERE ${PH}=? AND status='pendiente' AND hold_until > datetime('now') AND COALESCE(parent_id, 0)=0`).bind(String(phone).replace(/\D/g, "")).first()).n;
  if (held >= 3) return { code: "limit", error: "Ya tenés reservas pendientes. Completalas o cancelalas antes de hacer otra.", status: 429 };

  const unit = opt ? opt.cents / 100 : Number(parsePrice(p.price)), unitC = Math.round(unit * 100);
  // centavos: adultos a precio completo + niños según su tramo de edad (sin tramos, todos pagan completo)
  const total = Number.isFinite(unit) ? priceTotal(unitC, adults, tiers.length ? ages : Array(children).fill(99), tiers) : 0;
  const currency = priceCurrency(env, opt ? opt.price : p.price), mins = holdMinutes(env);
  const token = crypto.randomUUID().replace(/-/g, "");
  const tf = cfg.byTime ? " AND (b.time=? OR b.time='')" : ""; // por horario: cuenta ese horario + las reservas viejas del día sin hora
  const r = await db.prepare(
    `INSERT INTO bookings (package_id, day, time, pax, adults, children, child_ages, name, phone, message, total, currency, status, hold_until, token, option_name)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', datetime('now', ?), ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM availability WHERE package_id=? AND day=? AND closed=1)
       AND ? <= COALESCE((SELECT capacity FROM availability WHERE package_id=? AND day=?), ?)
               - COALESCE((SELECT SUM(b.pax) FROM bookings b WHERE b.package_id=? AND b.day=? AND ${OCCUPIED}${tf}), 0)`
  ).bind(p.id, day, time, pax, adults, children, ages.join(","), name, phone, message || "", total, currency, `+${mins} minutes`, token, opt ? opt.name : "",
    p.id, day, pax, p.id, day, cfg.capacity, p.id, day, ...(cfg.byTime ? [time] : [])).run();
  if (!r.meta || r.meta.changes !== 1) return { code: "full", error: "Ya no quedan lugares para esa cantidad de personas.", status: 409 };
  const id = r.meta.last_row_id;
  const left = (await db.prepare("SELECT CAST(ROUND((julianday(hold_until) - julianday('now')) * 86400) AS INTEGER) s FROM bookings WHERE id=?").bind(id).first())?.s;
  return { ok: true, id, token, time, option: opt ? opt.name : "", total, currency, adults, children, ages, hold_minutes: mins, expires_in: Math.max(0, Number(left) || mins * 60) };
}

// Cambio de estado desde el panel: pagada | cancelada | pendiente (reactivar / renovar la retención).
// pagada y pendiente vuelven a comprobar el cupo del día (sin contar la propia reserva): una vencida puede haber perdido su lugar.
// Cambia la fecha u horario de una reserva activa (lo hace el panel). Valida lo mismo que una reserva nueva: día y horario abiertos,
// horario de la ficha y cupo libre. El cupo se verifica dentro del mismo UPDATE (sin sobreventa). El voucher sale de la fila, así que se actualiza solo.
async function moveOne(db, env, id, { day, time } = {}) {
  const cur = await db.prepare("SELECT * FROM bookings WHERE id=?").bind(id).first();
  if (!cur) return { error: "No existe la reserva.", status: 404 };
  if (cur.status !== "pagada" && cur.status !== "pendiente") return { error: "Solo se puede cambiar una reserva pagada o pendiente.", status: 409 };
  const p = await db.prepare("SELECT * FROM packages WHERE id=?").bind(cur.package_id).first();
  if (!p) return { error: "No existe el paquete.", status: 404 };
  const cfg = bookingConfig(p);
  const nd = String(day || cur.day);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nd)) return { error: "La fecha no es válida.", status: 400 };
  if (nd < todayBA()) return { error: "No se puede pasar una reserva a una fecha pasada.", status: 400 };
  let nt = "";
  if (cfg.byTime) {
    nt = normTime(time !== undefined ? time : cur.time);
    if (!cfg.times.includes(nt)) return { error: "Ese horario no está en la ficha del paquete.", code: "time", status: 400 };
  }
  if (cfg.byTime && nd === todayBA() && nt <= nowTimeBA()) return { error: `El horario ${nt} de hoy ya salió. Elegí otro horario u otro día.`, code: "time", status: 400 };
  const closedDay = await db.prepare("SELECT 1 AS x FROM availability WHERE package_id=? AND day=? AND closed=1").bind(p.id, nd).first();
  if (closedDay) return { error: `El ${nd} está cerrado. Abrilo en Disponibilidad antes de cambiar la reserva.`, status: 409 };
  if (cfg.byTime) {
    const closedSlot = await db.prepare("SELECT 1 AS x FROM availability_slots WHERE package_id=? AND day=? AND time=? AND closed=1").bind(p.id, nd, nt).first();
    if (closedSlot) return { error: `El horario ${nt} del ${nd} está cerrado. Abrilo en Disponibilidad antes de cambiar la reserva.`, status: 409 };
  }
  const tf = cfg.byTime ? " AND (b.time=? OR b.time='')" : "";
  const r = await db.prepare(
    `UPDATE bookings SET day=?, time=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND ? <= COALESCE((SELECT capacity FROM availability WHERE package_id=? AND day=?), ?)
                       - COALESCE((SELECT SUM(b.pax) FROM bookings b WHERE b.package_id=? AND b.day=? AND b.id<>? AND ${OCCUPIED}${tf}), 0)`
  ).bind(nd, nt, id, cur.pax, cur.package_id, nd, cfg.capacity, cur.package_id, nd, id, ...(cfg.byTime ? [nt] : [])).run();
  if (!r.meta || r.meta.changes !== 1)
    return { error: `Ese ${nd}${nt ? " a las " + nt : ""} no tiene lugar para ${cur.pax} personas. Subí el cupo en Disponibilidad o elegí otro día u horario.`, status: 409 };
  return { ok: true, day: nd, time: nt };
}

async function setOne(db, env, id, status) {
  const cur = await db.prepare("SELECT id, pax, day, time FROM bookings WHERE id=?").bind(id).first();
  if (!cur) return { error: "No existe la reserva.", status: 404 };
  if (status === "cancelada") {
    await db.prepare("UPDATE bookings SET status='cancelada', hold_until='', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    return { ok: true };
  }
  if (status !== "pagada" && status !== "pendiente") return { error: "Estado inválido.", status: 400 };
  const hold = status === "pendiente" ? "datetime('now', ?)" : "''";
  const tf = cur.time ? " AND (b.time=bookings.time OR b.time='')" : ""; // reserva con horario: el cupo es el de ese horario
  const r = await db.prepare(
    `UPDATE bookings SET status=?, hold_until=${hold}, updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND pax <= COALESCE((SELECT a.capacity FROM availability a WHERE a.package_id=bookings.package_id AND a.day=bookings.day),
                                    (SELECT k.daily_capacity FROM packages k WHERE k.id=bookings.package_id), 0)
       - COALESCE((SELECT SUM(b.pax) FROM bookings b WHERE b.package_id=bookings.package_id AND b.day=bookings.day AND b.id<>bookings.id AND ${OCCUPIED}${tf}), 0)`
  ).bind(...(status === "pendiente" ? [status, `+${holdMinutes(env)} minutes`, id] : [status, id])).run();
  if (!r.meta || r.meta.changes !== 1)
    return { error: `El ${cur.day}${cur.time ? " a las " + cur.time : ""} ya no tiene lugar para ${cur.pax} personas. Subí el cupo de ese día en Disponibilidad o cancelá otra reserva.`, status: 409 };
  return { ok: true };
}

// ---------- Reservas de paquetes que combinan servicios ----------
// La reserva del paquete (parent_id = 0) tiene "hijas" (una por servicio reservable del itinerario, parent_id = id del paquete) que ocupan el cupo
// de cada servicio. Todo lo que se hace sobre la del paquete (estado, cambio de fecha, cancelar) se aplica a las hijas; si una hija no tiene lugar,
// se deshace lo que ya se había cambiado y se avisa qué servicio falló.
const kidsOf = async (db, id) => (await db.prepare("SELECT b.id, b.day, b.time, b.status, b.hold_until, b.package_id, COALESCE(k.title, '') AS title FROM bookings b LEFT JOIN packages k ON k.id=b.package_id WHERE b.parent_id=? ORDER BY b.day, b.time, b.id").bind(id).all()).results;
const restore = (db, rows) => db.batch(rows.map((r) => db.prepare("UPDATE bookings SET status=?, hold_until=?, day=?, time=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(r.status, r.hold_until || "", r.day, r.time || "", r.id)));
const dayGap = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);

export async function setBookingStatus(db, env, id, status) {
  const kids = await kidsOf(db, id);
  if (!kids.length) return setOne(db, env, id, status);
  const self = await db.prepare("SELECT id, day, time, status, hold_until FROM bookings WHERE id=?").bind(id).first();
  const r = await setOne(db, env, id, status);
  if (!r.ok) return r;
  if (status === "cancelada") {
    await db.prepare("UPDATE bookings SET status='cancelada', hold_until='', updated_at=CURRENT_TIMESTAMP WHERE parent_id=?").bind(id).run();
    return r;
  }
  // Las hijas copian la retención del paquete (así vencen juntas) o pasan a pagada; cada una comprueba el cupo de su servicio.
  for (const k of kids) {
    const x = await setOne(db, env, k.id, status);
    if (!x.ok) {
      await restore(db, [self, ...kids]);
      return { error: `${k.title || "Un servicio del paquete"}: ${x.error}`, status: x.status || 409 };
    }
  }
  if (status === "pendiente") await db.prepare("UPDATE bookings SET hold_until=(SELECT hold_until FROM bookings WHERE id=?) WHERE parent_id=?").bind(id, id).run();
  return r;
}

// Mover una reserva de paquete: los servicios se corren los mismos días que la fecha de inicio (el horario de cada uno no cambia).
export async function moveBooking(db, env, id, opts = {}) {
  const kids = await kidsOf(db, id);
  if (!kids.length) return moveOne(db, env, id, opts);
  const self = await db.prepare("SELECT id, day, time, status, hold_until FROM bookings WHERE id=?").bind(id).first();
  const r = await moveOne(db, env, id, { day: opts.day });
  if (!r.ok) return r;
  const gap = dayGap(self.day, r.day);
  if (gap) for (const k of kids) {
    const x = await moveOne(db, env, k.id, { day: addDays(k.day, gap), time: k.time });
    if (!x.ok) {
      await restore(db, [self, ...kids]);
      return { error: `${k.title || "Un servicio del paquete"}: ${x.error}`, code: x.code, status: x.status || 409 };
    }
  }
  return { ...r, moved: kids.length };
}

// Paquetes que combinan servicios (meta.kind = "paquete" + meta.parts): itinerario, precio automático y reserva que descuenta el cupo de cada servicio.
//
// Itinerario (meta.plan, ver normMeta): cada servicio va un día del paquete (Día 1, Día 2…) y, si el servicio se reserva por horario, a una hora.
//   pmode "fijo"  → la agencia fija los días; el cliente elige solo la fecha de inicio (Día 1).
//   pmode "libre" → el día del panel es una sugerencia: el cliente puede mover cada servicio a otro día dentro de los días del paquete.
// Precio (meta.auto + meta.disc): precio del paquete = suma de los servicios (la opción elegida en el itinerario o la más barata) menos el descuento %.
// Reserva: la del paquete (lleva el total) + una fila por servicio reservable (parent_id, total 0) que ocupa el cupo de ese servicio en su día y horario.
import { cheapestOption, optionsOf, parseMeta, planOf, policiesOf, POLICY_TYPES } from "./ficha.js";
import { KID_MAX_AGE, OCCUPIED, addDays, bookingConfig, createBooking, isDay, kidPct, kidsPolicy, monthState } from "./booking.js";
import { parsePrice } from "./seo.js";

export const isBundle = (p) => parseMeta(p && p.meta).kind === "paquete" && planOf(p).length > 0;
// Prefijo de moneda tal como lo escribe la agencia ("R$", "US$", "$").
export const curOf = (s) => (String(s || "").match(/^[^\d]*/) || [""])[0].trim();
export function fmtMoney(prefix, cents) {
  const n = Number(cents) / 100;
  const s = Number.isInteger(n) ? n.toLocaleString("es-AR") : n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (prefix ? prefix + " " : "") + s;
}

// Servicios del paquete (publicados o no: un servicio puede existir solo para armar paquetes).
export async function loadParts(db, p) {
  const slugs = planOf(p).map((r) => r.slug).slice(0, 12);
  if (!slugs.length) return [];
  return (await db.prepare(`SELECT * FROM packages WHERE slug IN (${slugs.map(() => "?").join(",")})`).bind(...slugs).all()).results;
}

// Precio por persona de un servicio: la opción elegida en el itinerario, si existe; si no, la más barata; si no tiene opciones, su precio.
function partUnit(svc, want) {
  const opts = optionsOf(svc);
  const o = want ? opts.find((x) => x.name.toLowerCase() === String(want).toLowerCase()) : null;
  if (o && o.cents) return { cents: o.cents, txt: o.price, option: o.name };
  const b = opts.length ? cheapestOption(opts) : null;
  if (b && b.cents) return { cents: b.cents, txt: b.price, option: b.name };
  const n = Number(parsePrice(svc.price));
  return n > 0 ? { cents: Math.round(n * 100), txt: String(svc.price), option: "" } : null;
}

// Renglones del itinerario con todo lo que hace falta para mostrarlo, cobrarlo y reservarlo.
export function bundleItems(p, svcs) {
  const by = new Map(svcs.map((s) => [s.slug, s]));
  return planOf(p).map((r) => {
    const s = by.get(r.slug);
    if (!s) return null;
    const u = partUnit(s, r.option), cfg = bookingConfig(s);
    return {
      slug: r.slug, id: s.id, title: s.title, day: r.day, option: u ? u.option : "",
      // El horario fijo solo vale si el servicio se reserva por horario y la hora existe en su ficha; si no, la elige el cliente.
      time: cfg.byTime && cfg.times.includes(r.time) ? r.time : "", planTime: r.time,
      unit: u ? u.cents : 0, txt: u ? u.txt : "", cur: u ? curOf(u.txt) : "",
      byTime: cfg.byTime, times: cfg.times, reservable: cfg.enabled, svc: s, cfg,
    };
  }).filter(Boolean);
}
export const spanOf = (items) => Math.max(1, ...items.map((i) => i.day));
// Días que tiene el cliente para repartir los servicios ("libre"): la ventana del panel o, si no hay, hasta el último día del itinerario.
export const winOf = (p, items) => Math.max(spanOf(items), Math.min(14, Number(parseMeta(p.meta).win) || 0));

// ---------- Niños en paquetes ----------
// Cada servicio tiene su propia política de niños (ej. City Tour: desde 6 años paga completo; Tango: de 4 a 11 paga 50%). En el paquete, un niño paga
// la parte de cada servicio que le corresponde por su edad: % del precio adulto del paquete = Σ (precio del servicio × % del servicio) ÷ Σ precios.
// Así funciona con precio automático, descuento o precio a mano. Devuelve una tabla de 0 a 17 años con el % (con decimales) o null si no aplica.
export function bundleKidTable(items) {
  const priced = items.filter((i) => i.unit > 0);
  if (!priced.length || priced.length !== items.length) return null;
  const pols = priced.map((i) => (Number(i.svc.accepts_children) === 1 ? kidsPolicy(i.svc).tiers : []));
  if (!pols.some((t) => t.length)) return null;
  const sum = priced.reduce((a, i) => a + i.unit, 0);
  return Array.from({ length: KID_MAX_AGE + 1 }, (_, age) =>
    Math.round((priced.reduce((a, i, k) => a + i.unit * kidPct(pols[k], age), 0) / sum) * 1e4) / 1e4);
}
// Texto de la política de niños de cada servicio (para la ficha del paquete): "0 a 2 años: gratis · 3 a 5 años: 50% · desde 6 años: precio de adulto".
export function kidsText(tiers, lang = "pt") {
  const es = /^es/i.test(lang);
  const yrs = (a, b) => (a === b ? `${a} ${es ? (a === 1 ? "año" : "años") : a === 1 ? "ano" : "anos"}` : `${a} a ${b} ${es ? "años" : "anos"}`);
  const out = tiers.map((t) => `${yrs(t.from, t.to)}: ${t.pct === 0 ? (es ? "gratis" : "grátis") : t.pct === 100 ? (es ? "precio de adulto" : "tarifa de adulto") : `${es ? "pagan" : "pagam"} ${t.pct}%`}`);
  const last = tiers.length ? tiers[tiers.length - 1].to : -1;
  if (last < KID_MAX_AGE) out.push(es ? `desde ${last + 1} años: precio de adulto` : `a partir de ${last + 1} anos: tarifa de adulto`);
  return out.join(" · ");
}
// Políticas del paquete armadas solas con las de sus servicios: por cada tipo (menores, cancelación…) que el paquete no tenga escrito a mano,
// junta la de cada servicio ("City Tour: …"). Menores sale de la tabla de edades del servicio si no escribió un texto.
export function bundlePolicies(p, items, L = {}) {
  const own = policiesOf(p, L), T = L.policyTypes || {}, lang = L.lang || "pt";
  const have = new Set(own.filter((x) => !x.option).map((x) => x.type));
  const extra = [];
  for (const type of POLICY_TYPES) {
    if (type === "otra" || have.has(type)) continue;
    const lines = [];
    for (const it of items) {
      const sp = policiesOf(it.svc, L).filter((x) => x.type === type && !x.option);
      if (sp.length) { lines.push(`**${it.title}:** ${sp.map((x) => x.text.replace(/\s*\n+\s*/g, " ")).join(" ")}`); continue; }
      if (type === "menores" && Number(it.svc.accepts_children) === 1) {
        const t = kidsPolicy(it.svc).tiers;
        if (t.length) lines.push(`**${it.title}:** ${kidsText(t, lang)}`);
      }
    }
    if (lines.length) extra.push({ type, title: T[type] || "", text: lines.join("\n"), option: "", auto: true });
  }
  return [...own, ...extra];
}

// Precio automático: suma de los servicios − descuento. ok = todos tienen precio numérico y en la misma moneda.
export function bundleQuote(p, items) {
  const m = parseMeta(p.meta), disc = Math.min(90, Math.max(0, Math.round(Number(m.disc) || 0)));
  const missing = items.filter((i) => !i.unit).map((i) => i.title);
  const curs = [...new Set(items.filter((i) => i.unit).map((i) => i.cur))];
  const sum = items.reduce((a, i) => a + i.unit, 0);
  // Si todos los precios son enteros, el del paquete también (R$ 585 y no R$ 584,99).
  const raw = (sum * (100 - disc)) / 100, unit = sum % 100 === 0 ? Math.round(raw / 100) * 100 : Math.round(raw);
  const cur = curs[0] || "";
  return {
    ok: items.length > 0 && !missing.length && curs.length === 1, missing, mixed: curs.length > 1, sum, disc, unit, cur,
    lines: items.map((i) => ({ title: i.title, option: i.option, unit: i.unit, txt: i.unit ? fmtMoney(i.cur, i.unit) : "" })),
    price: fmtMoney(cur, unit), price_old: disc > 0 ? fmtMoney(cur, sum) : "",
  };
}

// ---------- Disponibilidad ----------
// Estado de un servicio en un día (monthState cacheado por servicio y mes durante una misma consulta).
function stateCache(db) {
  const c = new Map();
  return async (svc, day) => {
    const k = svc.id + "|" + day.slice(0, 7);
    if (!c.has(k)) c.set(k, monthState(db, svc, day.slice(0, 7)));
    return (await c.get(k)).days.find((d) => d.day === day) || null;
  };
}
// Lugares libres de un servicio ese día (y horario, si se reserva por horario). Servicio no reservable = sin límite (null).
function leftOf(d, item, time) {
  if (!item.reservable) return { left: null, slots: [] };
  if (!d || d.st !== "open") return { left: 0, slots: [] };
  if (!item.byTime) return { left: d.left, slots: [] };
  const slots = d.slots.filter((x) => x.st !== "past" && x.st !== "closed").map((x) => ({ t: x.t, left: x.st === "full" ? 0 : x.left }));
  if (time) { const s = slots.find((x) => x.t === time); return { left: s ? s.left : 0, slots }; }
  return { left: Math.max(0, ...slots.map((x) => x.left)), slots };
}
const minLeft = (a, b) => (a == null ? b : b == null ? a : Math.min(a, b));

// Para una fecha de inicio: qué días (y horarios) puede ir cada servicio y cuántos lugares quedan.
// fijo → un solo día por servicio; libre → todos los días del paquete. Devuelve también el máximo de personas que entra con la mejor elección.
export async function bundleStart(db, p, items, start, at = stateCache(db)) {
  const libre = parseMeta(p.meta).pmode === "libre", span = libre ? winOf(p, items) : spanOf(items);
  let max = null;
  const out = [];
  for (const it of items) {
    const days = libre ? Array.from({ length: span }, (_, i) => addDays(start, i)) : [addDays(start, it.day - 1)];
    const opts = [];
    for (const day of days) {
      const l = leftOf(it.reservable ? await at(it.svc, day) : null, it, it.time);
      opts.push({ day, left: l.left, slots: it.byTime && !it.time ? l.slots : [] });
    }
    const best = opts.reduce((a, o) => (o.left == null ? a : Math.max(a, o.left)), it.reservable ? 0 : -1);
    if (it.reservable) max = minLeft(max, best);
    out.push({ slug: it.slug, title: it.title, option: it.option, n: it.day, def: addDays(start, it.day - 1), time: it.time, pick_time: it.byTime && !it.time, reservable: it.reservable, unit: it.unit, txt: it.txt, days: opts });
  }
  return { start, span, mode: libre ? "libre" : "fijo", items: out, max };
}

// Calendario del paquete para un mes: días abiertos según las reglas del propio paquete (Disponibilidad) Y con lugar en todos sus servicios.
export async function bundleMonth(db, p, items, month) {
  const st = await monthState(db, p, month), at = stateCache(db);
  for (const d of st.days) {
    if (d.st !== "open") continue;
    const s = await bundleStart(db, p, items, d.day, at);
    const left = minLeft(d.left, s.max);
    if (left < st.cfg.min_pax) { d.st = "full"; d.left = left; } else d.left = left;
  }
  return st;
}

// ---------- Reserva ----------
// body: lo mismo que una reserva común + plan: [{ slug, day, time }] (día y horario elegidos por el cliente; en modo fijo solo cuenta el horario
// de los servicios cuyo horario no fijó la agencia). Devuelve lo mismo que createBooking + itin.
export async function createBundleBooking(db, env, p, body) {
  const items = bundleItems(p, await loadParts(db, p));
  const start = String(body.day || "");
  if (!isDay(start)) return { code: "data", error: "Faltan datos de la reserva.", status: 400 };
  const libre = parseMeta(p.meta).pmode === "libre", span = libre ? winOf(p, items) : spanOf(items);
  const want = new Map((Array.isArray(body.plan) ? body.plan : []).slice(0, 12).map((x) => [String(x && x.slug), x || {}]));
  const at = stateCache(db), chosen = [];
  for (const it of items) {
    const w = want.get(it.slug) || {};
    let day = addDays(start, it.day - 1);
    if (libre && isDay(String(w.day || ""))) {
      const off = Math.round((Date.parse(w.day + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 864e5);
      if (off < 0 || off >= span) return { code: "itin", error: `${it.title}: elegí un día entre el ${start} y el ${addDays(start, span - 1)}.`, item: it.title, status: 400 };
      day = w.day;
    }
    let time = it.time;
    if (it.byTime && !time) {
      time = String(w.time || "");
      if (!it.times.includes(time)) return { code: "itin_time", error: `${it.title}: elegí un horario.`, item: it.title, status: 400 };
    }
    chosen.push({ it, day, time });
  }
  // Primero se revisa todo (para avisar qué servicio no tiene lugar sin crear nada); después se inserta con la misma regla de cupo de siempre.
  for (const c of chosen) {
    if (!c.it.reservable) continue;
    const l = leftOf(await at(c.it.svc, c.day), c.it, c.time);
    const pax = Number(body.pax) || 0;
    if (l.left < Math.max(1, pax, c.it.cfg.min_pax)) return { code: "item_full", error: `${c.it.title}: no hay lugar el ${c.day}${c.time ? " a las " + c.time : ""}.`, item: c.it.title, day: c.day, time: c.time, left: l.left, status: 409 };
  }
  // Niños: si el paquete no se reserva por opción propia, cada niño paga según la política de cada servicio.
  const kidTab = optionsOf(p).length ? null : bundleKidTable(items);
  const kidsOk = Number(p.accepts_children) === 1 || items.some((i) => Number(i.svc.accepts_children) === 1);
  const r = await createBooking(db, env, kidsOk ? { ...p, accepts_children: 1 } : p, { ...body, day: start, time: "", kidTab });
  if (!r.ok) return r;
  const head = await db.prepare("SELECT * FROM bookings WHERE id=?").bind(r.id).first();
  const made = [];
  for (const c of chosen) {
    if (!c.it.reservable) continue;
    const s = c.it.svc, cap = c.it.cfg.capacity, tf = c.it.cfg.byTime ? " AND (b.time=? OR b.time='')" : "";
    const x = await db.prepare(
      `INSERT INTO bookings (package_id, day, time, pax, adults, children, child_ages, name, phone, message, total, currency, status, hold_until, token, option_name, parent_id)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, ?, 'pendiente', ?, ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM availability WHERE package_id=? AND day=? AND closed=1)
         AND ? <= COALESCE((SELECT capacity FROM availability WHERE package_id=? AND day=?), ?)
                 - COALESCE((SELECT SUM(b.pax) FROM bookings b WHERE b.package_id=? AND b.day=? AND ${OCCUPIED}${tf}), 0)`
    ).bind(s.id, c.day, c.time, head.pax, head.adults, head.children, head.child_ages, head.name, head.phone, head.currency, head.hold_until, head.token, c.it.option, head.id,
      s.id, c.day, head.pax, s.id, c.day, cap, s.id, c.day, ...(c.it.cfg.byTime ? [c.time] : [])).run();
    if (!x.meta || x.meta.changes !== 1) {
      // Alguien se llevó el último lugar entre la revisión y la inserción: se deshace todo.
      await db.batch([db.prepare("DELETE FROM bookings WHERE parent_id=?").bind(head.id), db.prepare("DELETE FROM bookings WHERE id=?").bind(head.id)]);
      return { code: "item_full", error: `${c.it.title}: ya no hay lugar el ${c.day}${c.time ? " a las " + c.time : ""}.`, item: c.it.title, day: c.day, time: c.time, left: 0, status: 409 };
    }
    made.push(c);
  }
  const itin = chosen.map((c) => ({ title: c.it.title, option: c.it.option, day: c.day, time: c.time }));
  return { ...r, itin: itin.sort((a, b) => (a.day + a.time < b.day + b.time ? -1 : a.day + a.time > b.day + b.time ? 1 : 0)) };
}

// Itinerario de una reserva ya hecha (para el panel, el voucher y la consulta): las filas hijas + los servicios no reservables del plan.
export async function bookingItin(db, row) {
  if (!row || !row.id) return [];
  const kids = (await db.prepare("SELECT b.day, b.time, b.option_name, COALESCE(k.title, '(servicio borrado)') AS title FROM bookings b LEFT JOIN packages k ON k.id=b.package_id WHERE b.parent_id=? ORDER BY b.day, b.time, b.id").bind(row.id).all()).results;
  const p = await db.prepare("SELECT * FROM packages WHERE id=?").bind(row.package_id).first();
  if (!p || !isBundle(p)) return kids.map((k) => ({ title: k.title, option: k.option_name || "", day: k.day, time: k.time || "" }));
  // Servicios sin reserva por fecha: no tienen fila propia; se ubican en su día del plan (relativo al inicio de la reserva).
  const items = bundleItems(p, await loadParts(db, p));
  const out = kids.map((k) => ({ title: k.title, option: k.option_name || "", day: k.day, time: k.time || "" }));
  for (const it of items) if (!it.reservable) out.push({ title: it.title, option: it.option, day: addDays(row.day, it.day - 1), time: it.planTime || "" });
  return out.sort((a, b) => (a.day + a.time < b.day + b.time ? -1 : a.day + a.time > b.day + b.time ? 1 : 0));
}

// Paquetes con precio automático que incluyen este servicio: se recalculan cuando el servicio cambia (precio u opciones).
export async function refreshBundlesWith(db, slug) {
  const rows = (await db.prepare("SELECT * FROM packages WHERE meta LIKE ?").bind(`%"${slug}"%`).all()).results;
  let n = 0;
  for (const b of rows) {
    const m = parseMeta(b.meta);
    if (m.kind !== "paquete" || m.auto !== 1 || !(m.parts || []).includes(slug) || optionsOf(b).length) continue;
    const q = bundleQuote(b, bundleItems(b, await loadParts(db, b)));
    if (!q.ok || (q.price === b.price && q.price_old === (b.price_old || ""))) continue;
    await db.prepare("UPDATE packages SET price=?, price_old=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(q.price, q.price_old, b.id).run();
    n++;
  }
  return n;
}

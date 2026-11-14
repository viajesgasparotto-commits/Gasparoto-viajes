// Herramientas de Gaspi (la IA de WhatsApp): consultar disponibilidad en tiempo real y crear reservas desde el chat.
// Funcionan con cualquier proveedor (Gemini o Claude): la IA escribe una marca y el sistema la resuelve.
//   [[DISPONIBILIDAD slug | desde AAAA-MM-DD]]  → días y horarios con lugar de los próximos 14 días (lee el mismo calendario que la web).
//   [[RESERVAR producto: slug | fecha: AAAA-MM-DD | hora: HH:MM | opcion: … | adultos: N | ninos: N | edades: 5,8 | nombre: …]]
//      → crea la reserva pendiente (retiene el cupo, igual que la web) y, si el producto cobra con Pix, genera el código copia e cola.
// asistente.js › pensar() corre las marcas, le devuelve los resultados a la IA y ella le escribe al cliente.
import { addDays, bookingConfig, createBooking, isDay, kidsPolicy, kidsTiersFor, monthState, priceTotal, tiersFor, todayBA } from "./booking.js";
import { optionsOf, normTime, qtyTable } from "./ficha.js";
import { isBundle } from "./bundle.js";
import { canPayPix, createPix } from "./pix.js";
import { siteUrl } from "./seo.js";

export const DISP_RE = /\[\[\s*DISPONIBILIDAD\b([^\]]*)\]\]/gi;
export const RES_RE = /\[\[\s*RESERVAR\b([^\]]*)\]\]/gi;
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const sinTildes = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// Producto por slug (o por título, por si la IA escribe el nombre).
async function producto(db, ref) {
  const r = String(ref || "").trim().replace(/^.*\/paquetes\//, "").replace(/\/+$/, "");
  if (!r) return null;
  const bySlug = await db.prepare("SELECT * FROM packages WHERE slug=? AND published=1").bind(r.toLowerCase()).first().catch(() => null);
  if (bySlug) return bySlug;
  const all = (await db.prepare("SELECT * FROM packages WHERE published=1").all().catch(() => ({ results: [] }))).results || [];
  const t = sinTildes(r);
  return all.find((p) => sinTildes(p.title) === t) || all.find((p) => sinTildes(p.title).includes(t)) || null;
}
const dinero = (cents, cur) => `${String(cur).toUpperCase() === "BRL" ? "R$" : cur} ${(Number(cents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const link = (env, p) => `${(siteUrl(env) || "").replace(/\/$/, "")}/paquetes/${p.slug}/`;

// "a | b: c" → { _: "a", b: "c" }
function args(body) {
  const o = {};
  String(body || "").split("|").forEach((part, i) => {
    const m = part.match(/^\s*([a-záéíóúñ_ ]{2,20})\s*:\s*(.*?)\s*$/i);
    if (m) o[sinTildes(m[1]).replace(/\s+/g, "_")] = m[2];
    else if (i === 0 && part.trim()) o._ = part.trim();
    else if (part.trim() && /^\d{4}-\d{2}-\d{2}$/.test(part.trim().replace(/^desde\s+/i, ""))) o.desde = part.trim().replace(/^desde\s+/i, "");
  });
  return o;
}

// Disponibilidad real de los próximos 14 días desde "desde" (o hoy).
export async function disponibilidad(env, body) {
  const a = args(body), db = env.DB;
  const p = await producto(db, a._ || a.producto || a.slug);
  if (!p) return `DISPONIBILIDAD: no encontré "${a._ || a.producto || ""}" en el catálogo. Usá el slug del enlace (/paquetes/<slug>/).`;
  const cfg = bookingConfig(p);
  if (!cfg.enabled) return `DISPONIBILIDAD ${p.title}: no tiene calendario online; se coordina con el equipo (tomá fecha y personas y marcá la charla para una persona).`;
  if (isBundle(p)) return `DISPONIBILIDAD ${p.title}: es un paquete que combina servicios; el cliente elige las fechas y paga en el enlace ${link(env, p)}`;
  const hoy = todayBA();
  let desde = String(a.desde || a.fecha || "").trim();
  if (!isDay(desde) || desde < hoy) desde = hoy;
  const hasta = addDays(desde, 13);
  const meses = [...new Set([desde.slice(0, 7), hasta.slice(0, 7)])];
  const dias = [];
  for (const m of meses) dias.push(...(await monthState(db, p, m)).days);
  const lineas = [], cerrados = [];
  for (const d of dias) {
    if (d.day < desde || d.day > hasta) continue;
    const wd = DIAS[new Date(d.day + "T00:00:00Z").getUTCDay()];
    if (d.st !== "open") { if (d.st === "full" || d.st === "closed") cerrados.push(`${d.day} (${wd}) ${d.st === "full" ? "sin lugar" : "cerrado"}`); continue; }
    if (cfg.byTime) {
      const s = d.slots.filter((x) => x.st === "open").map((x) => `${x.t} quedan ${x.left}`);
      if (s.length) lineas.push(`${d.day} (${wd}): ${s.join(", ")}`);
    } else lineas.push(`${d.day} (${wd}): quedan ${d.left}`);
  }
  const opts = optionsOf(p).map((o) => `${o.name} ${o.price}`).join("; ");
  return `DISPONIBILIDAD EN TIEMPO REAL de ${p.title} [slug: ${p.slug}] del ${desde} al ${hasta} · ${cfg.min_pax} a ${cfg.max_pax} personas por reserva${opts ? ` · opciones: ${opts}` : ""}${cfg.byTime ? ` · horarios: ${cfg.times.join(", ")}` : ""}
${lineas.length ? lineas.join("\n") : "(sin días con lugar en ese rango: ofrecé consultar otras fechas)"}${cerrados.length ? `\nSin lugar / cerrados: ${cerrados.join(" · ")}` : ""}`;
}

// Confirmación en dos pasos (la controla el sistema, no la IA): la primera marca RESERVAR solo guarda una PROPUESTA con el total
// calculado acá; recién cuando el cliente responde que sí y la IA repite la misma marca, se crea la reserva.
export const AFIRMA = /\b(sim|s[ií]|si|confirmo|confirmado|confirmada|pode|podes|podés|pod[eé] reservar|dale|ok|okay|okey|yes|yep|claro|isso|perfeito|perfecto|fechado|bora|vamos|reserva|reservar|reservá|reserve|de acuerdo|combinado|certo|beleza|👍)\b|👍/i;
const NIEGA = /\b(n[aã]o|no|nope|todav[ií]a no|ainda n[aã]o|espera|aguarda|mejor no|melhor n[aã]o|cancel)/i;
async function propuesta(db, chatId) {
  if (!chatId) return null;
  try { const o = JSON.parse((await db.prepare("SELECT datos FROM ia_chats WHERE id=?").bind(chatId).first())?.datos || "{}"); return o && o._propuesta || null; } catch { return null; }
}
async function guardarPropuesta(db, chatId, val) {
  if (!chatId) return;
  try {
    const row = await db.prepare("SELECT datos FROM ia_chats WHERE id=?").bind(chatId).first();
    let o = {}; try { o = JSON.parse(row?.datos || "{}") || {}; } catch { o = {}; }
    if (val) o._propuesta = val; else delete o._propuesta;
    await db.prepare("UPDATE ia_chats SET datos=? WHERE id=?").bind(JSON.stringify(o).slice(0, 2000), chatId).run();
  } catch {}
}

// Crea la reserva desde el chat. ctx.contact = teléfono de WhatsApp del cliente (sin él, es una prueba del panel y no se guarda nada).
export async function reservar(env, body, ctx = {}) {
  const a = args(body), db = env.DB;
  const p = await producto(db, a.producto || a.slug || a.servicio || a._);
  if (!p) return { texto: `RESERVA NO CREADA: no encontré el servicio "${a.producto || a._ || ""}".` };
  if (!bookingConfig(p).enabled) return { texto: `RESERVA NO CREADA: ${p.title} no se reserva online; tomá los datos y marcá la charla para una persona.` };
  if (isBundle(p)) return { texto: `RESERVA NO CREADA: ${p.title} combina varios servicios y se reserva en el enlace ${link(env, p)}` };
  const adultos = parseInt(a.adultos ?? a.personas, 10) || 0, ninos = parseInt(a.ninos ?? a.criancas ?? 0, 10) || 0;
  const edades = String(a.edades || "").split(/[,\s;]+/).map((x) => parseInt(x, 10)).filter((x) => Number.isInteger(x));
  const nombre = String(a.nombre || ctx.nombre || "").trim().slice(0, 80);
  if (!nombre) return { texto: "RESERVA NO CREADA: falta el nombre y apellido del titular. Pedíselo al cliente." };
  const datos = { day: String(a.fecha || "").trim(), time: normTime(a.hora || a.horario || ""), pax: adultos + ninos, adults: adultos, children: ninos, ages: edades, name: nombre, option: String(a.opcion || "").trim(), message: "Reserva por WhatsApp (Gaspi)" };
  // Total real (lo mismo que cobra la web) y verificación de lugar, para el resumen de la propuesta.
  const cfg = bookingConfig(p), opts = optionsOf(p);
  const opt = opts.length ? opts.find((o) => o.name.toLowerCase() === datos.option.toLowerCase()) || (/^\d+$/.test(datos.option) ? opts[Number(datos.option)] : null) : null;
  if (opts.length && !opt) return { texto: `RESERVA NO CREADA: falta elegir la opción. Opciones de ${p.title}: ${opts.map((o) => `${o.name} (${o.price})`).join("; ")}.` };
  if (opt) datos.option = opt.name;
  if (cfg.byTime && !cfg.times.includes(datos.time)) return { texto: `RESERVA NO CREADA: falta el horario. Horarios de ${p.title}: ${cfg.times.join(", ")}.` };
  if (!isDay(datos.day)) return { texto: "RESERVA NO CREADA: falta la fecha (AAAA-MM-DD)." };
  if (datos.pax < cfg.min_pax || datos.pax > cfg.max_pax) return { texto: `RESERVA NO CREADA: se reserva para ${cfg.min_pax} a ${cfg.max_pax} personas.` };
  const unitC = opt ? opt.cents : Math.round((Number(String(p.price).replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")) || 0) * 100);
  const tiers = kidsTiersFor(p, opt ? opt.name : "");
  let totalC = priceTotal(unitC, adultos, ninos && tiers.length ? edades : Array(ninos).fill(99), tiersFor(tiers, unitC));
  const qt = qtyTable(p);
  if (qt) { const row = qt.get(datos.pax); if (!row) return { texto: `RESERVA NO CREADA: ${p.title} tiene precio por cantidad y no hay precio para ${datos.pax} personas. Cantidades con precio: ${[...qt.keys()].join(", ")}.` }; totalC = row.cents; }
  const cur = String((opt ? opt.price : p.price) || "").match(/^[^\d]*/)[0].trim() || "R$";
  const resumen = `${p.title}${datos.option ? ` (${datos.option})` : ""} · ${datos.day} (${DIAS[new Date(datos.day + "T00:00:00Z").getUTCDay()]})${datos.time ? " " + datos.time : ""} · ${adultos} adulto(s)${ninos ? ` y ${ninos} niño(s)${edades.length ? ` de ${edades.join(", ")} años` : ""}` : ""} · titular ${nombre} · total ${cur} ${(totalC / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
  const clave = [p.slug, datos.day, datos.time, datos.option, adultos, ninos, edades.join(","), sinTildes(nombre)].join("|");
  const prop = ctx.contact ? await propuesta(db, ctx.chatId) : (ctx.previo && /\d/.test(ctx.previo) && /\?/.test(ctx.previo) ? { k: clave, at: 1 } : null);
  const confirma = prop && prop.k === clave && (prop.at || 0) < (ctx.inicio || Date.now()) && (prop.at === 1 || Date.now() - (prop.at || 0) < 30 * 60e3) && AFIRMA.test(ctx.ultimo || "") && !NIEGA.test(ctx.ultimo || "")
    // y el resumen con el total le llegó de verdad al cliente (si el proceso se cortó antes de enviarlo, se vuelve a proponer)
    && String(ctx.previo || "").replace(/[.\s\u00a0]/g, "").includes(String(Math.round(totalC / 100)));
  if (!confirma) {
    // Primer paso: se verifica el lugar y se guarda la propuesta. No se reserva nada.
    const st = await monthState(db, p, datos.day.slice(0, 7));
    const d = st.days.find((x) => x.day === datos.day), slot = d && cfg.byTime ? d.slots.find((x) => x.t === datos.time) : null;
    const libre = !d || d.st !== "open" ? 0 : slot ? (slot.st === "open" ? slot.left : 0) : d.left;
    if (libre < datos.pax) return { texto: `RESERVA NO CREADA: ${p.title} no tiene lugar para ${datos.pax} personas el ${datos.day}${datos.time ? " a las " + datos.time : ""}. Consultá la disponibilidad y ofrecé otra fecha u horario.` };
    if (ctx.contact) await guardarPropuesta(db, ctx.chatId, { k: clave, at: Date.now() });
    return { texto: `PROPUESTA (TODAVÍA NO ESTÁ RESERVADA): ${resumen}. Hay lugar. Mandale al cliente este resumen en 2 o 3 frases y preguntale si confirma la reserva. NO digas que está reservada. Cuando el cliente responda que sí, escribí exactamente la misma marca RESERVAR y ahí se crea.` };
  }
  if (!ctx.contact) {
    // Prueba desde el panel: se comporta igual que una reserva creada, pero no se guarda nada.
    return { id: "prueba", pix: "", texto: `RESERVA CREADA #PRUEBA: ${resumen} · estado pendiente de pago. Se generó el código Pix (copia e cola); el sistema se lo manda al cliente en un mensaje aparte, justo después del tuyo. (Es una prueba del panel: no se guardó nada.)` };
  }
  const phone = "+" + String(ctx.contact).replace(/\D/g, "");
  // Si el mismo cliente ya tiene esta reserva pendiente de hace un rato (un reintento después de un corte, o la IA repite la marca),
  // se usa esa en vez de crear otra: nunca dos reservas iguales por el mismo "confirmo".
  const PH = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'+',''),'(',''),')',''),'.','')";
  const prev = await db.prepare(`SELECT id, token, total, currency, time, option_name, adults, children, hold_until FROM bookings WHERE ${PH}=? AND package_id=? AND day=? AND pax=? AND COALESCE(time,'')=? AND LOWER(COALESCE(option_name,''))=LOWER(?) AND status='pendiente' AND hold_until > datetime('now') AND created_at > datetime('now','-30 minutes') ORDER BY id DESC LIMIT 1`)
    .bind(phone.replace(/\D/g, ""), p.id, datos.day, datos.pax, bookingConfig(p).byTime ? datos.time : "", optionsOf(p).length ? (optionsOf(p).find((o) => o.name.toLowerCase() === datos.option.toLowerCase())?.name || datos.option) : "").first().catch(() => null);
  const r = prev
    ? { ok: true, id: prev.id, token: prev.token, total: prev.total, currency: prev.currency, time: prev.time, option: prev.option_name, adults: prev.adults, children: prev.children, hold_minutes: 30, repetida: true }
    : await createBooking(db, env, p, { ...datos, phone });
  await guardarPropuesta(db, ctx.chatId, null);
  if (!r.ok) return { texto: `RESERVA NO CREADA (${p.title}, ${datos.day}${datos.time ? " " + datos.time : ""}, ${datos.pax} personas): ${r.error}${r.left != null ? ` Quedan ${r.left} lugares.` : ""}` };
  if (!r.repetida) try {
    await db.prepare("INSERT INTO leads (name, phone, travel_date, pax, message, package_title, package_slug, page, source) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(nombre, phone, datos.day, datos.pax, `Reserva #${r.id} (pendiente) por WhatsApp${r.option ? ` · ${r.option}` : ""}${r.time ? ` · ${r.time} h` : ""}`, p.title, p.slug, "whatsapp", "ia").run();
  } catch {}
  const total = dinero(r.total, r.currency);
  let pix = "", pagoTxt;
  const row = await db.prepare("SELECT * FROM bookings WHERE id=?").bind(r.id).first();
  if (bookingConfig(p).pay === "pix" && row && canPayPix(env, row)) {
    const x = await createPix(db, env, row, p).catch(() => ({}));
    if (x && x.ok && x.code) { pix = x.code; pagoTxt = `Se generó el código Pix (copia e cola) por ${total}; el sistema se lo manda al cliente en un mensaje aparte, justo después del tuyo. Vale ${Math.round((x.expires_in || 2100) / 60)} minutos y el lugar queda retenido mientras tanto. Al pagar, la reserva se confirma sola.`; }
    else pagoTxt = `No se pudo generar el código Pix ahora: mandale el enlace ${link(env, p)} para pagar o marcá la charla para una persona.`;
  } else pagoTxt = `Este servicio no cobra con Pix online: el equipo le confirma el pago por acá. El lugar queda retenido ${r.hold_minutes} minutos. Terminá tu mensaje con la marca para una persona.`;
  return {
    pix, id: r.id,
    texto: `RESERVA CREADA #${r.id}: ${p.title}${r.option ? ` (${r.option})` : ""} · ${datos.day} (${DIAS[new Date(datos.day + "T00:00:00Z").getUTCDay()]})${r.time ? " " + r.time : ""} · ${r.adults} adultos${r.children ? ` y ${r.children} niños` : ""} · titular ${nombre} · total ${total} · estado pendiente de pago. ${pagoTxt}`,
  };
}

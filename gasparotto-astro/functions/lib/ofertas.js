// Ofertas con vencimiento: cuando en el panel se carga "Oferta relámpago … hasta" (meta.flash), se guarda una foto de los precios
// que tenía el producto ANTES (meta.snap). Durante la oferta se cobra lo que se cargó; cuando vence (o si se borra la fecha),
// el producto vuelve solo a esos precios: precio, precio anterior, opciones, tabla por cantidad y texto del precio.
import { parseMeta } from "./ficha.js";
import { flashMs } from "./flash.js";

// Lo que se guarda y se repone.
export const snapOf = (row) => {
  const m = parseMeta(row && row.meta);
  return { price: String((row && row.price) || ""), price_old: String((row && row.price_old) || ""), options: Array.isArray(m.options) ? m.options : [], qty: Array.isArray(m.qty) ? m.qty : [], unit_lbl: String(m.unit_lbl || "") };
};
export const cleanSnap = (s) => (s && typeof s === "object" && !Array.isArray(s)
  ? { price: String(s.price || "").slice(0, 40), price_old: String(s.price_old || "").slice(0, 40), options: Array.isArray(s.options) ? s.options.slice(0, 12) : [], qty: Array.isArray(s.qty) ? s.qty.slice(0, 120) : [], unit_lbl: String(s.unit_lbl || "").slice(0, 40) }
  : null);

// Repone la foto en una fila (d = columnas, m = meta ya parseada). Termina la oferta: sin fecha ni foto.
export function applySnap(d, m, snap) {
  d.price = snap.price; d.price_old = snap.price_old;
  m.options = snap.options; m.qty = snap.qty; m.unit_lbl = snap.unit_lbl;
  m.flash = ""; delete m.snap;
}

// Al guardar desde el panel (o el conector): decide la foto según la oferta de antes y la de ahora. Devuelve true si repuso precios.
export function offerOnSave(d, m, old, now = Date.now()) {
  const om = old ? parseMeta(old.meta) : {}, wasLive = flashMs(om.flash) > now, isLive = flashMs(m.flash) > now, prev = cleanSnap(om.snap);
  if (isLive) { m.snap = wasLive && prev ? prev : old ? snapOf(old) : null; if (!m.snap) delete m.snap; return false; }
  // La oferta terminó (venció, borraron la fecha o pusieron una pasada) y la foto sigue ahí: vuelven los precios de antes.
  if (prev) { applySnap(d, m, prev); return true; }
  delete m.snap; m.flash = ""; // sin oferta vigente: no queda una fecha vieja
  return false;
}

// Ofertas vencidas: repone los precios en la base. Devuelve las direcciones que cambiaron (para limpiar la caché).
export async function restoreExpired(db, now = Date.now()) {
  if (!db) return [];
  const rows = (await db.prepare(`SELECT id, slug, price, price_old, meta FROM packages WHERE meta LIKE '%"snap":{%'`).all().catch(() => ({ results: [] }))).results || [];
  const done = [];
  for (const r of rows) {
    const m = parseMeta(r.meta), snap = cleanSnap(m.snap);
    if (!snap || flashMs(m.flash) > now) continue;
    const d = { price: r.price, price_old: r.price_old };
    applySnap(d, m, snap);
    await db.prepare("UPDATE packages SET price=?, price_old=?, meta=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(d.price, d.price_old, JSON.stringify(m), r.id).run();
    done.push(`/paquetes/${r.slug}/`);
  }
  return done;
}

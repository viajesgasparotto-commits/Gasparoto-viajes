// Fase 3 del ecommerce: cobro de reservas con Pix (Mercado Pago). Sin SDK: solo fetch contra la API REST.
// Flujo: la reserva pendiente (fase 2) → POST /api/book/pay crea el cobro Pix y devuelve QR + "copia e cola" →
// el cliente paga en su banco → Mercado Pago avisa a /api/pay/webhook (y la ficha consulta /api/book/status cada pocos segundos) →
// la reserva pasa a "pagada". El webhook NUNCA confía en lo que recibe: vuelve a pedir el pago a Mercado Pago con el token del servidor
// y compara referencia, estado y monto contra la reserva.
// Configuración (secrets de Cloudflare, no van en wrangler.jsonc): MP_ACCESS_TOKEN (obligatorio para activar Pix) y MP_WEBHOOK_SECRET (firma del webhook).
import { setBookingStatus } from "./booking.js";

const MP = "https://api.mercadopago.com";
const enc = new TextEncoder();
export const PIX_MINUTES = 35; // vigencia del código Pix y retención de cupo mientras se paga (Mercado Pago pide al menos 30 min)

export const pixEnabled = (env) => !!String((env && env.MP_ACCESS_TOKEN) || "").trim();
// Pix solo cobra en reales y necesita un monto: si el paquete está en otra moneda o sin precio numérico, la reserva se confirma por WhatsApp como en la fase 2.
export const canPayPix = (env, b) => pixEnabled(env) && String(b.currency || "").toUpperCase() === "BRL" && Number(b.total) >= 100;

const auth = (env) => ({ authorization: `Bearer ${String(env.MP_ACCESS_TOKEN).trim()}`, "content-type": "application/json" });
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
const safeEq = (a, b) => a.length === b.length && [...a].reduce((x, c, i) => x | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;
const iso = (ms) => new Date(ms).toISOString().replace("Z", "-00:00"); // Mercado Pago exige desfase explícito

// Firma del webhook: cabecera x-signature "ts=...,v1=..." y x-request-id. Plantilla firmada: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
export async function verifyWebhook(env, request, dataId) {
  const secret = String(env.MP_WEBHOOK_SECRET || "").trim();
  if (!secret) return true; // sin secreto configurado no se exige firma; igual se revalida cada pago contra la API
  const parts = Object.fromEntries(String(request.headers.get("x-signature") || "").split(",").map((s) => s.trim().split("=")).filter((x) => x.length === 2));
  if (!parts.ts || !parts.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? String(dataId).toLowerCase() : String(dataId);
  const manifest = `id:${id};request-id:${request.headers.get("x-request-id") || ""};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return safeEq(hex(await crypto.subtle.sign("HMAC", key, enc.encode(manifest))), String(parts.v1));
}

const host = (env) => { try { return new URL(env.SITE_URL).hostname.replace(/^www\./, ""); } catch { return "reservas.invalid"; } };

// Crea (o devuelve, si ya existe) el cobro Pix de una reserva pendiente. b = fila de bookings, p = fila de packages.
// Devuelve { ok, code, qr, qr_base64, expires_in } o { error, status }.
export async function createPix(db, env, b, p) {
  if (b.payment_ref && b.pix_code) return { ok: true, code: b.pix_code, qr_base64: b.pix_qr || "", ref: b.payment_ref, expires_in: Math.max(0, Number(b.hold_left) || 0) };
  const expiry = Date.now() + PIX_MINUTES * 60e3;
  const body = {
    transaction_amount: Math.round(Number(b.total)) / 100,
    description: `${p.title} · ${b.day}${b.time ? " " + b.time : ""} · ${b.pax} p.`.slice(0, 120),
    payment_method_id: "pix",
    external_reference: String(b.id),
    date_of_expiration: iso(expiry),
    notification_url: `${String(env.SITE_URL || "").replace(/\/+$/, "")}/api/pay/webhook`,
    payer: { email: `reserva-${b.id}@${host(env)}`, first_name: String(b.name || "").split(/\s+/)[0] || "Cliente" },
  };
  let r, j;
  try {
    r = await fetch(`${MP}/v1/payments`, { method: "POST", headers: { ...auth(env), "X-Idempotency-Key": `gv-booking-${b.id}-${b.token.slice(0, 8)}` }, body: JSON.stringify(body) });
    j = await r.json().catch(() => ({}));
  } catch { return { error: "No pudimos conectar con el medio de pago.", status: 502 }; }
  const tx = j && j.point_of_interaction && j.point_of_interaction.transaction_data;
  if (!r.ok || !j.id || !tx || !tx.qr_code) return { error: "No pudimos generar el código Pix.", status: 502, detail: j && (j.message || j.error) };
  // El cupo se retiene mientras el código esté vigente (pisa la retención corta de la fase 2, una sola vez por reserva).
  await db.prepare("UPDATE bookings SET payment_ref=?, pix_code=?, pix_qr=?, hold_until=datetime('now', ?), updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pendiente'")
    .bind(String(j.id), tx.qr_code, tx.qr_code_base64 || "", `+${PIX_MINUTES} minutes`, b.id).run();
  return { ok: true, code: tx.qr_code, qr_base64: tx.qr_code_base64 || "", ref: String(j.id), expires_in: PIX_MINUTES * 60 };
}

// Cancela el cobro en Mercado Pago (cliente liberó la reserva): evita que pague un código que ya no sirve. Mejor esfuerzo.
export async function cancelPix(env, ref) {
  if (!pixEnabled(env) || !ref) return;
  try { await fetch(`${MP}/v1/payments/${encodeURIComponent(ref)}`, { method: "PUT", headers: auth(env), body: JSON.stringify({ status: "cancelled" }) }); } catch {}
}

// Consulta un pago y, si está aprobado y coincide con la reserva, la deja "pagada". Lo usan el webhook y la consulta de estado.
// Devuelve { paid:boolean, status?:string, id? }.
export async function syncPayment(db, env, paymentId) {
  if (!pixEnabled(env) || !/^\d{3,20}$/.test(String(paymentId))) return { paid: false };
  let pay;
  try {
    const r = await fetch(`${MP}/v1/payments/${paymentId}`, { headers: auth(env) });
    if (!r.ok) return { paid: false };
    pay = await r.json();
  } catch { return { paid: false }; }
  const bid = Number(pay.external_reference);
  if (!Number.isInteger(bid) || bid < 1) return { paid: false };
  const b = await db.prepare("SELECT id, status, total, payment_ref FROM bookings WHERE id=?").bind(bid).first();
  if (!b || String(b.payment_ref) !== String(pay.id)) return { paid: false }; // el pago no es el que creó este servidor para esa reserva
  if (pay.status !== "approved") return { paid: false, status: pay.status, id: bid };
  if (Math.round(Number(pay.transaction_amount) * 100) !== Number(b.total) || String(pay.currency_id || "BRL") !== "BRL") return { paid: false, status: "amount_mismatch", id: bid };
  if (b.status === "pagada") return { paid: true, id: bid };
  // Pasa a pagada comprobando el cupo; si el día se llenó mientras tanto (pago tardío) igual se registra: el dinero ya entró.
  const r = await setBookingStatus(db, env, bid, "pagada");
  if (!r.ok) await db.prepare("UPDATE bookings SET status='pagada', hold_until='', message=TRIM(COALESCE(message,'') || ' [Pago Pix recibido sin cupo: revisar o reembolsar]'), updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(bid).run();
  await db.prepare("UPDATE bookings SET paid_at=CURRENT_TIMESTAMP WHERE id=? AND (paid_at IS NULL OR paid_at='')").bind(bid).run();
  // Paquete que combina servicios: si no hubo cupo para alguno, la plata ya entró igual; los servicios quedan pagados para que el equipo lo resuelva.
  if (!r.ok) await db.prepare("UPDATE bookings SET status='pagada', hold_until='', updated_at=CURRENT_TIMESTAMP WHERE parent_id=?").bind(bid).run();
  return { paid: true, id: bid };
}

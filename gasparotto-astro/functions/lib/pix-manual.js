// Pix manual (mientras no haya pasarela de pago): clave Pix y titular que carga el administrador en el panel → IA.
// Cuando la IA crea una reserva por WhatsApp y no hay Pix automático (Mercado Pago), le manda al cliente esta clave y el total,
// le pide el comprobante, y el equipo confirma el pago (el comprobante entra por el circuito de siempre: botones + "pago a verificar").
export const KEY_PIX_MANUAL = "ia_pix_manual";

export async function pixManual(db) {
  const row = db ? await db.prepare("SELECT value FROM settings WHERE key=?").bind(KEY_PIX_MANUAL).first().catch(() => null) : null;
  let v = null; try { v = JSON.parse((row && row.value) || "null"); } catch { v = null; }
  const chave = String((v && v.chave) || "").trim(), nombre = String((v && v.nombre) || "").trim();
  return chave ? { chave, nombre } : null;
}

// Validación suave de la clave: e-mail, teléfono (+55…), CPF/CNPJ o clave aleatoria (UUID). Devuelve la clave limpia o "".
export function cleanChave(s) {
  const k = String(s || "").trim().slice(0, 80);
  if (!k) return "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k)) return k.toLowerCase();
  if (/^\+?\d[\d\s().-]{7,}$/.test(k)) return k.replace(/[\s().-]/g, "");
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return k.toLowerCase();
  return "";
}

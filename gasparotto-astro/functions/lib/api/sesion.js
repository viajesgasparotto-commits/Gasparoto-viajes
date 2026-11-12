// Sesión del panel: cookie firmada con vencimiento. Ver el comentario de cada pieza.

import { ensureSchema } from "../schema.js";

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export async function sign(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
export const safeEq = (a, b) => a.length === b.length && [...a].reduce((x, c, i) => x | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

// Sesión firmada con vencimiento (14 días): "exp.uid.firma". uid 0 = clave general (ADMIN_PASSWORD); uid > 0 = usuario de la tabla users.
// La firma usa una clave de sesión propia (SESSION_SECRET, o una aleatoria guardada en la base), NUNCA la contraseña: si no, quien tenga una
// cookie válida (por ejemplo un editor con la suya) podría probar contraseñas fuera de línea contra la firma hasta dar con la clave general.
// La firma incluye una huella de la contraseña (del usuario, o de la clave general): si la cambian, las sesiones viejas dejan de valer.
export const SESSION_SECS = 60 * 60 * 24 * 14;
let _sk = null;
export async function sessionKey(env, PW) {
  const fixed = String(env.SESSION_SECRET || "").trim();
  if (fixed.length >= 16) return fixed;
  if (!env.DB) return PW;
  if (_sk && _sk.db === env.DB) return _sk.v;
  try {
    await ensureSchema(env.DB);
    const get = () => env.DB.prepare("SELECT value FROM settings WHERE key='session_secret'").first();
    let r = await get();
    if (!r) { await env.DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('session_secret', ?)").bind(hex(crypto.getRandomValues(new Uint8Array(32)))).run(); r = await get(); }
    _sk = { db: env.DB, v: r.value };
    return r.value;
  } catch { return PW; }
}
export const generalFp = async (PW) => (await sign(PW, "gv-general-fp")).slice(0, 16);
export async function makeSession(key, uid = 0, fp = "") {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECS;
  return `${exp}.${uid}.${await sign(key, `gv-session.${exp}.${uid}.${fp}`)}`;
}
// Devuelve { uid } o null. getFp(uid) devuelve la huella del usuario activo, o null si no existe o está desactivado.
export async function readSession(key, cookie, getFp, gFp) {
  const parts = cookie.split(".");
  if (!/^\d+$/.test(parts[0] || "") || Number(parts[0]) < Date.now() / 1000) return null;
  if (parts.length !== 3 || !/^\d+$/.test(parts[1])) return null;
  const uid = Number(parts[1]);
  const fp = uid ? await getFp(uid) : gFp;
  if (fp === null) return null;
  return safeEq(parts[2], await sign(key, `gv-session.${parts[0]}.${uid}.${fp}`)) ? { uid } : null;
}

// Frenos de abuso: intentos de ingreso (en memoria y en la base) y cupos por IP para los pedidos públicos.



// Freno básico a fuerza bruta (por isolate; Cloudflare Access es la defensa real)
const WIN = 600000; // ventana de 10 min para los frenos de intentos y de consultas
export const attempts = new Map();
const leadHits = new Map();
let sweptAt = 0;
// Quita las IPs sin actividad reciente: sin esto, cada IP nueva deja una clave para siempre dentro del isolate.
function sweep() {
  const now = Date.now();
  if (now - sweptAt < WIN) return;
  sweptAt = now;
  for (const m of [attempts, leadHits]) for (const [k, v] of m) { const a = v.filter((t) => now - t < WIN); if (a.length) m.set(k, a); else m.delete(k); }
}
// Freno persistente (en la base, compartido entre todas las instancias del servidor): las IP y las cuentas con muchos intentos fallidos quedan bloqueadas un rato.
const FAIL_WIN = 15 * 60 * 1000;
export const FAIL_MAX_IP = 20, FAIL_MAX_ACCOUNT = 8;
export async function lockedOut(db, keys) {
  try {
    for (const [k, max] of keys) {
      const n = (await db.prepare("SELECT COUNT(*) n FROM login_fails WHERE k=? AND at > ?").bind(k, Date.now() - FAIL_WIN).first())?.n || 0;
      if (n >= max) return true;
    }
  } catch { /* si la base falla, queda el freno en memoria */ }
  return false;
}
export async function noteFail(db, keys) {
  try {
    await db.batch(keys.map(([k]) => db.prepare("INSERT INTO login_fails (k, at) VALUES (?, ?)").bind(k, Date.now())));
    if (Math.random() < 0.05) await db.prepare("DELETE FROM login_fails WHERE at < ?").bind(Date.now() - 24 * 3600e3).run();
  } catch { /* best-effort */ }
}
export const clearFails = (db, keys) => db.batch(keys.filter(([k]) => !k.startsWith("ip:")).map(([k]) => db.prepare("DELETE FROM login_fails WHERE k=?").bind(k))).catch(() => {});
export const tooMany = (ip) => { sweep(); const a = (attempts.get(ip) || []).filter((t) => Date.now() - t < WIN); attempts.set(ip, a); return a.length >= 8; };

// Consultas y reservas públicas: cupo por IP y tipo, dentro de la misma ventana.
export const leadLimited = (key, max) => { sweep(); const a = (leadHits.get(key) || []).filter((t) => Date.now() - t < WIN); a.push(Date.now()); leadHits.set(key, a); return a.length > max; };

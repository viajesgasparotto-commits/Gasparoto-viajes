// Usuarios del panel: contraseñas con PBKDF2-SHA256 (WebCrypto, sin dependencias).
// Cloudflare Workers limita PBKDF2 a 100000 iteraciones como máximo.
const enc = new TextEncoder();
const ITER = 100000;
// fotos = solo sube fotos de clientes (sección "Nuestros clientes"); no ve nada más del panel.
export const ROLES = ["admin", "editor", "fotos"];
export const MIN_PASSWORD = 8;

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (h) => new Uint8Array((h.match(/../g) || []).map((x) => parseInt(x, 16)));

async function derive(password, salt, iter) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return toHex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, key, 256));
}

const eq = (a, b) => a.length === b.length && [...a].reduce((x, c, i) => x | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

// Formato guardado: pbkdf2$<iteraciones>$<sal hex>$<hash hex>
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${toHex(salt)}$${await derive(password, salt, ITER)}`;
}

export async function verifyPassword(password, stored) {
  const [alg, iter, salt, hash] = String(stored || "").split("$");
  if (alg !== "pbkdf2" || !/^\d+$/.test(iter || "") || !salt || !hash) return false;
  return eq(await derive(password, fromHex(salt), Math.min(Number(iter), ITER)), hash);
}

// Cuando el email no existe se hace el mismo trabajo de hash: así no se puede averiguar qué emails están registrados midiendo tiempos.
export async function fakeVerify(password) {
  await derive(password, new Uint8Array(16), ITER);
  return false;
}

// Huella corta del hash guardado: va dentro de la firma de la sesión, así cambiar la contraseña cierra las sesiones abiertas.
export const passFingerprint = (stored) => String(stored || "").slice(-16);

export const validEmail = (e) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e) && e.length <= 254;

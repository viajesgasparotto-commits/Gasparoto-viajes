// Autenticación del panel: ingreso, lectura de la sesión, logout y /me.

import { logActivity } from "../activity.js";
import { brandColors } from "../brand.js";
import { pixEnabled } from "../pix.js";
import { ensureSchema } from "../schema.js";
import { BRAND, LOGO, siteUrl } from "../seo.js";
import { fakeVerify, passFingerprint, verifyPassword } from "../users.js";
import { FAIL_MAX_ACCOUNT, FAIL_MAX_IP, attempts, clearFails, lockedOut, noteFail, tooMany } from "./guard.js";
import { json } from "./http.js";
import { SESSION_SECS, generalFp, makeSession, readSession, safeEq, sign } from "./sesion.js";

// POST /api/login: con email = usuario de la tabla users; sin email = clave general (ADMIN_PASSWORD).
export async function manejarLogin({ request, env, res, method, PW, SK, secure }) {
  if (res === "login" && method === "POST") {
    const ip = request.headers.get("cf-connecting-ip") || "x";
    if (tooMany(ip)) return json({ error: "Demasiados intentos. Probá en 10 minutos." }, 429);
    const body = await request.json().catch(() => ({}));
    const password = String(body.password ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fkeys = [[`ip:${ip}`, FAIL_MAX_IP], [email ? `em:${email.slice(0, 120)}` : "gen", FAIL_MAX_ACCOUNT]];
    const deny = async (msg, u) => {
      attempts.get(ip).push(Date.now());
      if (env.DB) {
        await noteFail(env.DB, fkeys);
        if (u && (await lockedOut(env.DB, [fkeys[1]]))) await logActivity(env.DB, { id: u.id, name: u.name }, "bloqueado", "sesión", u.id, "", "demasiados intentos fallidos");
      }
      return json({ error: msg }, 401);
    };
    if (env.DB) { try { await ensureSchema(env.DB); } catch { /* sigue el flujo normal */ } if (await lockedOut(env.DB, fkeys)) return json({ error: "Demasiados intentos. Probá en 15 minutos." }, 429); }
    // Con email: usuario de la tabla users. Sin email: clave general (ADMIN_PASSWORD), como antes.
    if (email) {
      if (!env.DB) return json({ error: "D1 no está conectada (binding DB)" }, 500);
      try { await ensureSchema(env.DB); } catch (e) { console.error("ensureSchema:", e); return json({ error: "No se pudo preparar la base de datos. Revisá los registros de Cloudflare." }, 500); }
      const u = await env.DB.prepare("SELECT id, name, pass_hash FROM users WHERE email=? AND active=1").bind(email).first();
      const ok = u ? await verifyPassword(password, u.pass_hash) : await fakeVerify(password);
      if (!ok) return deny("Email o clave incorrectos", u);
      attempts.delete(ip); await clearFails(env.DB, fkeys);
      await env.DB.prepare("UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE id=?").bind(u.id).run();
      await logActivity(env.DB, { id: u.id, name: u.name }, "ingresó", "sesión", u.id, "");
      return json({ ok: true }, 200, { "set-cookie": `gv_admin=${await makeSession(SK, u.id, passFingerprint(u.pass_hash))}; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=${SESSION_SECS}` });
    }
    const ok = safeEq(await sign(PW, "pw" + password), await sign(PW, "pw" + PW));
    if (!ok) return deny("Clave incorrecta");
    attempts.delete(ip); if (env.DB) await clearFails(env.DB, fkeys);
    return json({ ok: true }, 200, { "set-cookie": `gv_admin=${await makeSession(SK, 0, await generalFp(PW))}; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=${SESSION_SECS}` });
  }
  return null;
}

// Lee la cookie y devuelve { user } o { respuesta } (401). También deja ctx.actor para el historial.
export async function resolverSesion({ ctx, request, env, PW, SK }) {
  const cookie = (request.headers.get("cookie") || "").match(/gv_admin=([\w.]+)/)?.[1] || "";
  let row = null; // fila del usuario de la sesión (null = clave general)
  const sess = await readSession(SK, cookie, async (uid) => {
    if (!env.DB) return null;
    try { await ensureSchema(env.DB); } catch { return null; }
    row = await env.DB.prepare("SELECT id, email, name, role, pass_hash FROM users WHERE id=? AND active=1").bind(uid).first();
    return row ? passFingerprint(row.pass_hash) : null;
  }, await generalFp(PW));
  if (!sess) return { respuesta: json({ error: "No autorizado" }, 401) };
  const user = row ? { id: row.id, email: row.email, name: row.name, role: row.role } : { id: 0, email: "", name: "Clave general", role: "admin" };
  ctx.actor = user; // lo usa onRequest para registrar el movimiento en el historial
  return { user };
}

// GET /api/me y POST /api/logout (ya con sesión válida).
export async function manejarSesion({ res, env, user, PW, secure }) {
  if (res === "logout") return json({ ok: true }, 200, { "set-cookie": `gv_admin=; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=0` });
  if (res === "me") return json({ ok: true, user, brand: BRAND, logo: LOGO, colors: brandColors(env), db: !!env.DB, r2: !!env.IMAGES, whatsapp: !!env.WHATSAPP_NUMBER, pix: pixEnabled(env), site: siteUrl(env),
    security: user.role === "admin" ? [PW.length < 12 && "La clave general (ADMIN_PASSWORD) es corta: usá una de 12 caracteres o más, larga y aleatoria.", pixEnabled(env) && !String(env.MP_WEBHOOK_SECRET || "").trim() && "Falta MP_WEBHOOK_SECRET: los avisos de pago de Mercado Pago no se verifican por firma."].filter(Boolean) : [] });
  return null;
}

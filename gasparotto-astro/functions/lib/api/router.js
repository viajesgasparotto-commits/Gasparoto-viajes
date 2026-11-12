// Enrutador de /api: rutas públicas → origen (anti-CSRF) → sesión → módulos del panel.
// Cada módulo de este directorio es dueño de sus rutas y devuelve null si el pedido no es suyo.
// Para sumar una sección: crear su módulo `manejarXxx(c)` y agregarlo a PANEL (y a LOG_ENT en functions/api/[[path]].js si debe quedar en el historial).
import { brandColors } from "../brand.js";
import { ensureSchema } from "../schema.js";
import { BRAND, LOGO, initBrand } from "../seo.js";
import { manejarLogin, manejarSesion, resolverSesion } from "./auth.js";
import { manejarConsultas, manejarConsultasPublicas } from "./consultas.js";
import { manejarContenido } from "./contenido.js";
import { manejarEquipo } from "./equipo.js";
import { manejarGoogle } from "./google.js";
import { manejarClaude } from "./claude.js";
import { manejarIA } from "./ia.js";
import { manejarWhatsappPublico } from "./whatsapp.js";
import { manejarTraducciones } from "./traducciones.js";
import { manejarAutores } from "./autores.js";
import { manejarEstadisticas, manejarEstadisticasPublicas } from "./estadisticas.js";
import { json, sameOrigin } from "./http.js";
import { manejarMedios } from "./medios.js";
import { manejarReservas, manejarReservasPublicas } from "./reservas.js";
import { sessionKey } from "./sesion.js";
import { manejarUsuarios } from "./usuarios.js";

// Rutas que no piden sesión (cada una valida origen y cupos por su cuenta).
const PUBLICAS = [manejarConsultasPublicas, manejarEstadisticasPublicas, manejarReservasPublicas, manejarWhatsappPublico];
// Rutas del panel: ya con sesión válida y base de datos lista. El orden no importa (cada una responde solo a sus /api/<recurso>).
const PANEL = [manejarUsuarios, manejarEstadisticas, manejarConsultas, manejarReservas, manejarContenido, manejarEquipo, manejarMedios, manejarGoogle, manejarTraducciones, manejarAutores, manejarClaude, manejarIA];

export async function handle(ctx) {
  const { request, env, params } = ctx;
  const url = new URL(request.url);
  const [res, id] = params.path || [];
  const method = request.method;
  const c = { ctx, request, env, url, res, id, method, params };
  // Marca para la pantalla de login del panel (dato público, sin información sensible)
  if (res === "brand" && method === "GET") { initBrand(env, url.origin); return json({ brand: BRAND, logo: LOGO, colors: brandColors(env) }); }
  for (const publica of PUBLICAS) {
    const r = await publica(c);
    if (r) return r;
  }
  if (!env.ADMIN_PASSWORD) return json({ error: "Falta el secret ADMIN_PASSWORD" }, 500);
  // Un secret guardado con salto de línea o espacios al final nunca coincidía con lo tipeado: se normaliza.
  const PW = String(env.ADMIN_PASSWORD).trim();
  const secure = url.protocol === "https:" ? " Secure;" : "";

  // Anti-CSRF: en métodos que modifican, el Origin debe ser este mismo sitio
  if (method !== "GET" && method !== "HEAD") {
    const origin = request.headers.get("origin"), site = request.headers.get("sec-fetch-site");
    if (origin && sameOrigin(origin, url) === false) return json({ error: "Origen no permitido" }, 403);
    if (site && site !== "same-origin" && site !== "none") return json({ error: "Origen no permitido" }, 403); // el navegador avisa que el pedido viene de otro sitio
  }
  const SK = await sessionKey(env, PW);

  const login = await manejarLogin({ ...c, PW, SK, secure });
  if (login) return login;
  const sesion = await resolverSesion({ ...c, PW, SK });
  if (sesion.respuesta) return sesion.respuesta;
  const { user } = sesion;
  const propia = await manejarSesion({ ...c, user, PW, secure });
  if (propia) return propia;
  if (!env.DB) return json({ error: "D1 no está conectada (binding DB)" }, 500);
  try { await ensureSchema(env.DB); } catch (e) { console.error("ensureSchema:", e); return json({ error: "No se pudo preparar la base de datos. Revisá los registros de Cloudflare." }, 500); }

  for (const modulo of PANEL) {
    const r = await modulo({ ...c, user });
    if (r) return r;
  }
  return json({ error: "Not found" }, 404);
}

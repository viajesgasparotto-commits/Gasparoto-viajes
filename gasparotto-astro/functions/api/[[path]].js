// Entrada de /api/*: registra en el historial cada cambio hecho desde el panel y delega el resto al enrutador.
// La lógica vive por secciones en functions/lib/api/ (usuarios, reservas, contenido, estadísticas, equipo, consultas, medios).
import { handle } from "../lib/api/router.js";
import { logActivity } from "../lib/activity.js";
import { purge } from "../lib/edge.js";

// ---------- Historial: cada cambio hecho desde el panel queda registrado con quién lo hizo ----------
const LOG_ENT = { posts: "entrada", packages: "paquete", categories: "categoría", subcategories: "subcategoría", prices: "precio", leads: "consulta", bookings: "reserva", slots: "disponibilidad", "booking-config": "disponibilidad", users: "usuario", tasks: "actividad", favorites: "favoritos", "claude-keys": "conexión de Claude", clientes: "foto de cliente" };
const PURGE = new Set(["posts", "packages", "categories", "subcategories", "prices", "favorites", "booking-config", "clientes"]);
export async function onRequest(ctx) {
  const m = ctx.request.method, [res0, id0] = ctx.params.path || [];
  const loggable = !!LOG_ENT[res0] && m !== "GET" && m !== "HEAD";
  let body = null;
  if (loggable) body = await ctx.request.clone().json().catch(() => null);
  const r = await handle(ctx);
  // Al guardar contenido se limpian las lecturas guardadas y las páginas afectadas (en los demás datacenters vence sola en 60 s).
  if (PURGE.has(res0) && m !== "GET" && m !== "HEAD" && r.status < 300) {
    const j = await r.clone().json().catch(() => ({}));
    await purge(new URL(ctx.request.url).origin, ["/blog/", "/paquetes/", "/servicios/", ...(res0 === "clientes" ? ["/"] : []), ...(typeof j?.url === "string" ? [j.url] : [])]);
  }
  if (loggable && ctx.actor && ctx.env.DB && r.status < 300) {
    const a = ctx.act || {};
    let ref = a.ref ?? (Number(id0) || 0);
    if (!ref && m === "POST") ref = (await r.clone().json().catch(() => ({}))).id || 0;
    let detail = "";
    if (body?.status && (res0 === "leads" || res0 === "bookings")) detail = "estado: " + body.status;
    else if (res0 === "slots" || res0 === "booking-config") detail = String(body?.action || "reglas de reserva");
    await logActivity(ctx.env.DB, ctx.actor, a.action || (m === "POST" ? "creó" : m === "DELETE" ? "borró" : "editó"), LOG_ENT[res0], ref,
      a.title ?? String(body?.title ?? body?.label ?? body?.name ?? body?.page ?? "").slice(0, 160), a.detail ?? detail);
  }
  return r;
}

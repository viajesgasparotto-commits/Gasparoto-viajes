// Estadísticas: medición pública de visitas y los reportes del panel.

import { ensureSchema } from "../schema.js";
import { leadLimited } from "./guard.js";
import { clampDays, cleanTxt, json, sameOrigin } from "./http.js";

// POST /api/track (público): un envío por visita.
export async function manejarEstadisticasPublicas({ request, env, url, res, method }) {
  if (res === "track" && method === "POST") {
    const origin = request.headers.get("origin");
    if (origin && sameOrigin(origin, url) === false) return new Response(null, { status: 204 });
    return trackBeacon(request, env);
  }
  return null;
}

// /api/stats (vistas, WhatsApp, A/B) y /api/heat (mapa de calor), solo lectura.
export async function manejarEstadisticas({ env, url, res, method }) {
  // Medición: vistas y clics de WhatsApp por paquete y entrada, y resultado del A/B de la portada
  if (res === "stats" && method === "GET") {
    const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days"), 10) || 30));
    const d = `-${days} days`;
    // Una consulta por tipo de dato (no subconsultas por cada paquete): mismos números, menos viajes a D1.
    const pubPk = (await env.DB.prepare("SELECT p.slug, p.title, p.featured FROM packages p WHERE p.published = 1").all()).results;
    const pubPosts = (await env.DB.prepare("SELECT p.slug, p.title FROM posts p WHERE p.published = 1").all()).results;
    const toMap = (rows) => Object.fromEntries(rows.map((r) => [r.k, r.n]));
    const views = toMap((await env.DB.prepare("SELECT path k, COALESCE(SUM(n),0) n FROM page_views WHERE day >= date('now', ?) GROUP BY path").bind(d).all()).results);
    const leadsBy = async (source, col) => toMap((await env.DB.prepare(`SELECT ${col} k, COUNT(*) n FROM leads WHERE source = ? AND created_at >= date('now', ?) GROUP BY ${col}`).bind(source, d).all()).results);
    const waByTitle = await leadsBy("whatsapp", "package_title"), formByTitle = await leadsBy("form", "package_title"), waByPage = await leadsBy("whatsapp", "page");
    const pk = pubPk.map((p) => ({ slug: p.slug, title: p.title, featured: p.featured, views: views[`/paquetes/${p.slug}/`] || 0, wa: waByTitle[p.title] || 0, form: formByTitle[p.title] || 0 }));
    const posts = pubPosts.map((p) => ({ slug: p.slug, title: p.title, views: views[`/blog/${p.slug}/`] || 0, wa: waByPage[`/blog/${p.slug}/`] || 0 }));
    const abViews = (await env.DB.prepare("SELECT variant, COALESCE(SUM(n),0) n FROM page_views WHERE path = '/' AND day >= date('now', ?) GROUP BY variant").bind(d).all()).results;
    const abClicks = (await env.DB.prepare("SELECT package_title t, COUNT(*) n FROM leads WHERE source = 'whatsapp' AND package_title IN ('hero-a','hero-b') AND created_at >= date('now', ?) GROUP BY package_title").bind(d).all()).results;
    const ab = ["a", "b"].map((v) => ({
      variant: v,
      views: abViews.find((x) => x.variant === v)?.n || 0,
      clicks: abClicks.find((x) => x.t === "hero-" + v)?.n || 0,
    }));
    // Botón flotante: cada toque queda como clic de WhatsApp con origen "flotante" y la página donde se tocó
    const floClicks = (await env.DB.prepare("SELECT COUNT(*) n FROM leads WHERE source = 'whatsapp' AND package_title = 'flotante' AND created_at >= date('now', ?)").bind(d).first())?.n || 0;
    const floPages = (await env.DB.prepare("SELECT page, COUNT(*) n FROM leads WHERE source = 'whatsapp' AND package_title = 'flotante' AND created_at >= date('now', ?) GROUP BY page ORDER BY n DESC LIMIT 8").bind(d).all()).results;
    const waAll = (await env.DB.prepare("SELECT COUNT(*) n FROM leads WHERE source = 'whatsapp' AND created_at >= date('now', ?)").bind(d).first())?.n || 0;
    const formAll = (await env.DB.prepare("SELECT COUNT(*) n FROM leads WHERE source = 'form' AND created_at >= date('now', ?)").bind(d).first())?.n || 0;
    return json({ days, packages: pk, posts, ab, floating: { clicks: floClicks, pages: floPages }, totals: { whatsappClicks: waAll, formRequests: formAll } });
  }

  // Mapa de calor: hasta dónde baja la gente en cada página y en qué hace clic
  if (res === "heat" && method === "GET") {
    const days = clampDays(url.searchParams.get("days")), d = `-${days} days`, dev = url.searchParams.get("dev");
    const dv = dev === "m" || dev === "d" ? " AND dev = ?" : "", db = dv ? [dev] : [], path = url.searchParams.get("path") || "";
    const pages = (await env.DB.prepare(`SELECT path, SUM(n) visits FROM page_depth WHERE day >= date('now', ?)${dv} GROUP BY path ORDER BY visits DESC LIMIT 60`).bind(d, ...db).all()).results;
    if (!path) return json({ days, pages });
    const depth = (await env.DB.prepare(`SELECT bucket, SUM(n) n FROM page_depth WHERE path = ? AND day >= date('now', ?)${dv} GROUP BY bucket`).bind(path, d, ...db).all()).results;
    const visits = depth.reduce((a, r) => a + r.n, 0);
    const reach = Array.from({ length: 10 }, (_, k) => depth.filter((r) => r.bucket >= k + 1).reduce((a, r) => a + r.n, 0)); // visitas que llegaron al 10%, 20% ... 100%
    const clicks = (await env.DB.prepare(`SELECT target, SUM(n) n FROM page_clicks WHERE path = ? AND day >= date('now', ?)${dv} GROUP BY target ORDER BY n DESC LIMIT 25`).bind(path, d, ...db).all()).results;
    const mob = (await env.DB.prepare("SELECT COALESCE(SUM(n),0) n FROM page_depth WHERE path = ? AND day >= date('now', ?) AND dev = 'm'").bind(path, d).first())?.n || 0;
    const all = (await env.DB.prepare("SELECT COALESCE(SUM(n),0) n FROM page_depth WHERE path = ? AND day >= date('now', ?)").bind(path, d).first())?.n || 0;
    return json({ days, pages, path, visits, reach, clicks, mobile_share: all ? mob / all : 0 });
  }
  return null;
}

// ---------- Mapa de calor: un envío por visita (hasta dónde bajó y en qué hizo clic). Público, sin datos personales. ----------
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|monitor|uptime/i;
async function trackBeacon(request, env) {
  const ok = () => new Response(null, { status: 204 });
  if (!env.DB || BOT_RE.test(request.headers.get("user-agent") || "")) return ok();
  if (leadLimited((request.headers.get("cf-connecting-ip") || "x") + "|trk", 80)) return ok();
  const b = await request.json().catch(() => null);
  const path = String(b?.p || "");
  if (!b || !/^\/[\w\-\/]{0,118}$/.test(path) || /^\/(admin|api)(\/|$)/.test(path)) return ok();
  const dev = b.v === "m" ? "m" : "d", depth = Math.round(Number(b.d));
  const st = [];
  if (depth >= 0 && depth <= 10) st.push(env.DB.prepare("INSERT INTO page_depth (path, dev, bucket, day, n) VALUES (?,?,?,date('now'),1) ON CONFLICT(path, dev, bucket, day) DO UPDATE SET n = n + 1").bind(path, dev, depth));
  for (const c of (Array.isArray(b.c) ? b.c : []).slice(0, 8)) {
    const t = cleanTxt(c, 80);
    if (t) st.push(env.DB.prepare("INSERT INTO page_clicks (path, dev, target, day, n) VALUES (?,?,?,date('now'),1) ON CONFLICT(path, dev, target, day) DO UPDATE SET n = n + 1").bind(path, dev, t));
  }
  if (!st.length) return ok();
  try {
    await ensureSchema(env.DB);
    await env.DB.batch(st);
    if (Math.random() < 0.01) await env.DB.batch([env.DB.prepare("DELETE FROM page_depth WHERE day < date('now','-400 days')"), env.DB.prepare("DELETE FROM page_clicks WHERE day < date('now','-400 days')")]);
  } catch { /* la medición es best-effort */ }
  return ok();
}

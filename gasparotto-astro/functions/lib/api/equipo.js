// Equipo: rendimiento, historial, avisos y actividades obligatorias.

import { FREQS, cleanLinks, parseLinks, periodEnd, prevPeriod, taskBoard, taskReport } from "../activity.js";
import { addDays, todayBA } from "../booking.js";
import { clampDays, cleanTxt, json } from "./http.js";

// Equipo: /api/team (rendimiento), /api/activity (historial), /api/alerts (avisos) y /api/tasks (actividades obligatorias).
export async function manejarEquipo({ ctx, request, env, url, res, id, method, params, user }) {
  const adminOnly = () => (user.role !== "admin" ? json({ error: "No tenés permiso" }, 403) : null);

  // Rendimiento: productividad por persona y desempeño de los artículos por autor
  if (res === "team" && method === "GET") {
    const deny = adminOnly(); if (deny) return deny;
    const days = clampDays(url.searchParams.get("days")), d = `-${days} days`;
    const us = (await env.DB.prepare("SELECT id, name, email, role, active, last_login FROM users ORDER BY name").all()).results;
    const acts = (await env.DB.prepare(
      `SELECT user_id, COUNT(*) total,
        SUM(CASE WHEN entity='entrada' AND detail='publicado' THEN 1 ELSE 0 END) posts_pub,
        SUM(CASE WHEN entity='entrada' AND action='editó' THEN 1 ELSE 0 END) posts_edit,
        SUM(CASE WHEN entity='paquete' AND detail='publicado' THEN 1 ELSE 0 END) pk_pub,
        SUM(CASE WHEN entity='paquete' AND action='editó' THEN 1 ELSE 0 END) pk_edit,
        COUNT(DISTINCT substr(at,1,10)) active_days, MAX(at) last_at
       FROM activity WHERE at >= date('now', ?) AND action <> 'ingresó' GROUP BY user_id`).bind(d).all()).results;
    const board = await taskBoard(env.DB, todayBA());
    const taskOf = (uid) => { let done = 0, total = 0; for (const t of board) if (t.active) for (const st of t.status) if (st.user_id === uid) { total++; if (st.done) done++; } return { done, total }; };
    const people = us.map((u) => ({ ...u, ...(acts.find((a) => a.user_id === u.id) || { total: 0, posts_pub: 0, posts_edit: 0, pk_pub: 0, pk_edit: 0, active_days: 0, last_at: "" }), tasks: taskOf(u.id) }));
    const own = acts.find((a) => a.user_id === 0);
    if (own) people.push({ id: 0, name: "Clave general", email: "", role: "admin", active: 1, last_login: "", ...own, tasks: { done: 0, total: 0 } });
    const names = Object.fromEntries(people.map((u) => [u.id, u.name || u.email]));
    const posts = (await env.DB.prepare(
      `SELECT p.id, p.slug, p.title, p.created_by, p.created_at, COALESCE(v.n,0) views, COALESCE(w.n,0) wa FROM posts p
       LEFT JOIN (SELECT path, SUM(n) n FROM page_views WHERE day >= date('now', ?) GROUP BY path) v ON v.path = '/blog/' || p.slug || '/'
       LEFT JOIN (SELECT page, COUNT(*) n FROM leads WHERE source='whatsapp' AND created_at >= date('now', ?) GROUP BY page) w ON w.page = '/blog/' || p.slug || '/'
       WHERE p.published=1`).bind(d, d).all()).results;
    const by = new Map();
    for (const p of posts) {
      const a = by.get(p.created_by) || { id: p.created_by, name: names[p.created_by] || (p.created_by ? "Usuario eliminado" : "Sin autor asignado"), posts: 0, views: 0, wa: 0, best: null };
      a.posts++; a.views += p.views; a.wa += p.wa;
      if (!a.best || p.views > a.best.views) a.best = { title: p.title, views: p.views };
      by.set(p.created_by, a);
    }
    const authors = [...by.values()].map((a) => ({ ...a, avg: a.posts ? Math.round(a.views / a.posts) : 0 })).sort((a, b) => b.views - a.views);
    const top = posts.sort((a, b) => b.views - a.views || b.wa - a.wa).slice(0, 10).map((p) => ({ id: p.id, title: p.title, slug: p.slug, views: p.views, wa: p.wa, author: names[p.created_by] || (p.created_by ? "Usuario eliminado" : "Sin autor asignado") }));
    return json({ days, people, authors, top });
  }

  // Historial de movimientos
  if (res === "activity" && method === "GET") {
    const deny = adminOnly(); if (deny) return deny;
    const days = clampDays(url.searchParams.get("days")), limit = Math.min(300, Math.max(10, parseInt(url.searchParams.get("limit"), 10) || 100));
    const q = ["at >= date('now', ?)"], b = [`-${days} days`];
    const uid = url.searchParams.get("user"), before = url.searchParams.get("before");
    if (uid && /^\d+$/.test(uid)) { q.push("user_id = ?"); b.push(Number(uid)); }
    if (before && /^\d+$/.test(before)) { q.push("id < ?"); b.push(Number(before)); }
    const rows = (await env.DB.prepare(`SELECT id, at, user_id, user_name, action, entity, ref_id, title, detail FROM activity WHERE ${q.join(" AND ")} ORDER BY id DESC LIMIT ?`).bind(...b, limit).all()).results;
    return json({ rows, more: rows.length === limit });
  }

  // Avisos del panel: lo que falta hacer o revisar. Cada persona ve lo suyo; el administrador, además, lo del equipo.
  if (res === "alerts" && method === "GET") {
    const today = todayBA(), isAdm = user.role === "admin", out = [];
    const add = (level, key, text, tab, n = 1) => out.push({ key, level, text, tab, n });
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Argentina/Buenos_Aires", hour: "numeric", hourCycle: "h23" }).format(new Date()));
    const dow = (new Date(today + "T00:00:00Z").getUTCDay() + 6) % 7; // 0 = lunes
    const daysTo = (d) => Math.round((Date.parse(d + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 864e5);
    const plural = (n, a, b) => (n === 1 ? a : b);
    const label = { daily: "ayer", weekly: "la semana pasada", monthly: "el mes pasado" };
    const board = await taskBoard(env.DB, today);
    const doneAll = new Set((await env.DB.prepare("SELECT task_id, user_id, period FROM task_done").all()).results.map((r) => `${r.task_id}|${r.user_id}|${r.period}`));
    const createdBy = (t, end) => String(t.created_at || "").slice(0, 10) <= end; // la actividad ya existía cuando terminó ese período
    for (const t of board) {
      if (!t.active) continue;
      const mineSt = user.id ? t.status.find((x) => x.user_id === user.id) : null;
      if (mineSt && !mineSt.done) {
        const left = t.due_day ? daysTo(t.due_day) : null;
        if (t.frequency === "once" && t.overdue) add("bad", `t${t.id}`, `Actividad vencida: “${t.title}” (venció el ${t.due_day}).`, "tasks");
        else if (t.frequency === "once" && left !== null && left <= 2) add("warn", `t${t.id}`, `“${t.title}” vence ${left <= 0 ? "hoy" : left === 1 ? "mañana" : "en 2 días"}.`, "tasks");
        else if ((t.frequency === "daily" && hour >= 18) || (t.frequency === "weekly" && dow >= 4) || (t.frequency === "monthly" && daysTo(periodEnd("monthly", today)) <= 5))
          add("warn", `t${t.id}`, `Todavía no hiciste “${t.title}” y el período está por terminar.`, "tasks");
        else if (Date.now() - Date.parse(String(t.created_at || "").replace(" ", "T") + "Z") < 3 * 864e5) add("warn", `t${t.id}`, `Nueva actividad para vos: “${t.title}”.`, "tasks");
        else add("info", `t${t.id}`, `Pendiente: “${t.title}”.`, "tasks");
      }
      const pv = prevPeriod(t.frequency, today);
      if (mineSt && pv && createdBy(t, pv.end) && !doneAll.has(`${t.id}|${user.id}|${pv.key}`))
        add("warn", `p${t.id}`, `No hiciste “${t.title}” ${label[t.frequency]}.`, "tasks");
    }
    if (user.id) for (const r of (await env.DB.prepare("SELECT d.task_id, d.review_note, t.title FROM task_done d JOIN tasks t ON t.id=d.task_id WHERE d.user_id=? AND d.review='redo' AND t.active=1").bind(user.id).all()).results)
      add("warn", `rv${r.task_id}`, `Te pidieron corregir “${r.title}”: ${r.review_note}`, "tasks");
    if (isAdm) {
      const unrev = (await env.DB.prepare("SELECT COUNT(*) n FROM task_done d JOIN tasks t ON t.id=d.task_id WHERE d.review='' AND (d.note<>'' OR d.link<>'') AND d.done_at >= datetime('now','-14 days') AND t.active=1").first())?.n || 0;
      if (unrev) add("info", "unrev", `${unrev} ${plural(unrev, "entrega con constancia sin revisar", "entregas con constancia sin revisar")}.`, "actrep", unrev);
      for (const t of board) {
        if (!t.active) continue;
        if (t.frequency === "once" && t.overdue && t.pending) add("bad", `ta${t.id}`, `“${t.title}” está vencida y ${t.pending} ${plural(t.pending, "persona no la completó", "personas no la completaron")}.`, "actrep");
      }
      let miss = 0;
      for (const t of board) {
        const pv = t.active && prevPeriod(t.frequency, today);
        if (pv && createdBy(t, pv.end)) for (const st of t.status) if (!doneAll.has(`${t.id}|${st.user_id}|${pv.key}`)) miss++;
      }
      if (miss) add("warn", "team-miss", `${miss} ${plural(miss, "actividad del período anterior quedó", "actividades del período anterior quedaron")} sin cumplir en el equipo.`, "actrep", miss);
    }
    // Reservas y consultas
    const pend = (await env.DB.prepare("SELECT COUNT(*) n, SUM(CASE WHEN day <= ? THEN 1 ELSE 0 END) soon FROM bookings WHERE status='pendiente' AND hold_until > datetime('now') AND COALESCE(parent_id, 0)=0").bind(addDays(today, 2)).first()) || {};
    if (pend.soon) add("bad", "bk-soon", `${pend.soon} ${plural(pend.soon, "reserva pendiente sale", "reservas pendientes salen")} en los próximos 2 días y sigue sin confirmar.`, "bookings", pend.soon);
    else if (pend.n) add("warn", "bk", `${pend.n} ${plural(pend.n, "reserva por confirmar", "reservas por confirmar")}.`, "bookings", pend.n);
    const ld = (await env.DB.prepare("SELECT COUNT(*) n, SUM(CASE WHEN created_at < datetime('now','-1 day') THEN 1 ELSE 0 END) old FROM leads WHERE status='nuevo'").first()) || {};
    if (ld.old) add("warn", "ld-old", `${ld.old} ${plural(ld.old, "consulta lleva", "consultas llevan")} más de 24 horas sin contactar.`, "leads", ld.old);
    else if (ld.n) add("info", "ld", `${ld.n} ${plural(ld.n, "consulta nueva", "consultas nuevas")}.`, "leads", ld.n);
    // Cosas que faltan en el contenido publicado
    const noPrice = (await env.DB.prepare("SELECT COUNT(*) n FROM packages WHERE published=1 AND TRIM(COALESCE(price,''))=''").first())?.n || 0;
    if (noPrice) add("warn", "no-price", `${noPrice} ${plural(noPrice, "producto publicado sin precio", "productos publicados sin precio")}.`, "prices", noPrice);
    const noImg = ((await env.DB.prepare("SELECT COUNT(*) n FROM packages WHERE published=1 AND TRIM(COALESCE(image,''))=''").first())?.n || 0) + ((await env.DB.prepare("SELECT COUNT(*) n FROM posts WHERE published=1 AND TRIM(COALESCE(image,''))=''").first())?.n || 0);
    if (noImg) add("info", "no-img", `${noImg} ${plural(noImg, "publicación sin imagen", "publicaciones sin imagen")}.`, "seo", noImg);
    const rank = { bad: 0, warn: 1, info: 2 };
    out.sort((a, b) => rank[a.level] - rank[b.level]);
    return json({ alerts: out, counts: { bad: out.filter((a) => a.level === "bad").length, warn: out.filter((a) => a.level === "warn").length, info: out.filter((a) => a.level === "info").length } });
  }

  // Actividades obligatorias: el administrador las define; cada persona marca las suyas
  if (res === "tasks") {
    const rid = id && /^\d+$/.test(id) ? Number(id) : null, today = todayBA();
    if (method === "GET" && !id) {
      const board = await taskBoard(env.DB, today);
      const mine = user.id ? board.filter((t) => t.active && t.status.some((s) => s.user_id === user.id)).map((t) => ({ id: t.id, title: t.title, detail: t.detail, links: parseLinks(t.links), frequency: t.frequency, due_day: t.due_day, overdue: t.overdue, done: t.status.find((s) => s.user_id === user.id).done, done_at: t.status.find((s) => s.user_id === user.id).done_at, note: t.status.find((s) => s.user_id === user.id).note, link: t.status.find((s) => s.user_id === user.id).link, review: t.status.find((s) => s.user_id === user.id).review, review_note: t.status.find((s) => s.user_id === user.id).review_note })) : [];
      const team = (await env.DB.prepare("SELECT id, name, email FROM users WHERE active=1 ORDER BY name").all()).results;
      return json({ admin: user.role === "admin", me: user.id, mine, tasks: user.role === "admin" ? board.map((t) => ({ ...t, links: parseLinks(t.links) })) : [], team: user.role === "admin" ? team : [] });
    }
    if (method === "GET" && id === "report") {
      const deny = adminOnly(); if (deny) return deny;
      return json(await taskReport(env.DB, today, clampDays(url.searchParams.get("days"))));
    }
    if (method === "POST" && rid && params.path[2] === "done") {
      if (!user.id) return json({ error: "Entrá con tu usuario para marcar actividades (la clave general no identifica a nadie)." }, 400);
      const t = (await taskBoard(env.DB, today)).find((x) => x.id === rid);
      if (!t || !t.active || !t.status.some((s) => s.user_id === user.id)) return json({ error: "Esa actividad no está asignada a vos" }, 404);
      const b = await request.json().catch(() => ({}));
      if (b.done === false) await env.DB.prepare("DELETE FROM task_done WHERE task_id=? AND user_id=? AND period=?").bind(rid, user.id, t.period).run();
      else {
        const note = cleanTxt(b.note, 300), lk = cleanLinks(b.link);
        if (lk.bad || lk.links.length > 1) return json({ error: "El link de la evidencia no es válido (usá una dirección http o https)." }, 400);
        // Volver a marcar actualiza la evidencia sin cambiar cuándo se completó
        await env.DB.prepare("INSERT INTO task_done (task_id, user_id, period, note, link) VALUES (?,?,?,?,?) ON CONFLICT (task_id, user_id, period) DO UPDATE SET note=excluded.note, link=excluded.link, review='', review_note=''").bind(rid, user.id, t.period, note, lk.links[0]?.url || "").run();
      }
      ctx.act = { action: b.done === false ? "desmarcó" : "completó", title: t.title, ref: rid };
      return json({ ok: true });
    }
    const deny = adminOnly(); if (deny) return deny;
    if (method === "PUT" && rid && params.path[2] === "review") {
      const b = await request.json().catch(() => ({})), status = String(b.status ?? ""), note = cleanTxt(b.review_note ?? b.note, 300), uid = Number(b.user_id), period = String(b.period || "").slice(0, 20);
      if (!["ok", "redo", ""].includes(status)) return json({ error: "Resultado inválido" }, 400);
      if (status === "redo" && !note) return json({ error: "Explicale qué hay que corregir" }, 400);
      const o = await env.DB.prepare("SELECT title FROM tasks WHERE id=?").bind(rid).first();
      const r = await env.DB.prepare("UPDATE task_done SET review=?, review_note=?, reviewed_by=?, reviewed_at=datetime('now') WHERE task_id=? AND user_id=? AND period=?").bind(status, status ? note : "", user.id, rid, uid, period).run();
      if (!r.meta?.changes) return json({ error: "Esa entrega no existe" }, 404);
      ctx.act = { action: "revisó", title: o?.title || "", ref: rid, detail: status === "ok" ? "aprobada" : status === "redo" ? "pidió corrección" : "quitó la revisión" };
      return json({ ok: true });
    }
    if (method === "DELETE" && rid) {
      const o = await env.DB.prepare("SELECT title FROM tasks WHERE id=?").bind(rid).first();
      await env.DB.batch([env.DB.prepare("DELETE FROM task_done WHERE task_id=?").bind(rid), env.DB.prepare("DELETE FROM tasks WHERE id=?").bind(rid)]);
      ctx.act = { title: o?.title || "" };
      return json({ ok: true });
    }
    if (method === "POST" || (method === "PUT" && rid)) {
      const b = await request.json().catch(() => ({}));
      const title = cleanTxt(b.title, 120), detail = cleanTxt(b.detail, 400), freq = FREQS.includes(b.frequency) ? b.frequency : null;
      const assigned = Number(b.assigned_to) || 0, due = /^\d{4}-\d{2}-\d{2}$/.test(b.due_day || "") && freq === "once" ? b.due_day : "";
      const lk = cleanLinks(b.links); if (lk.bad) return json({ error: `Hay ${lk.bad} link${lk.bad > 1 ? "s" : ""} que no se pueden guardar: usá direcciones http(s) válidas (máximo 8).` }, 400);
      const links = lk.links.length ? JSON.stringify(lk.links) : "", keepLinks = b.links === undefined; // sin "links" en el pedido (p. ej. Pausar) se conservan los que ya tiene
      if (!title) return json({ error: "Falta el título de la actividad" }, 400);
      if (!freq) return json({ error: "Frecuencia inválida" }, 400);
      if (assigned && !(await env.DB.prepare("SELECT id FROM users WHERE id=? AND active=1").bind(assigned).first())) return json({ error: "Ese usuario no existe o está desactivado" }, 400);
      if (method === "POST") {
        const r = await env.DB.prepare("INSERT INTO tasks (title, detail, links, assigned_to, frequency, due_day, created_by) VALUES (?,?,?,?,?,?,?)").bind(title, detail, links, assigned, freq, due, user.id).run();
        return json({ ok: true, id: r.meta?.last_row_id }, 201);
      }
      const act = b.active === false || b.active === 0 || b.active === "0" ? 0 : 1;
      const r = await env.DB.prepare("UPDATE tasks SET title=?, detail=?, links=COALESCE(?, links), assigned_to=?, frequency=?, due_day=?, active=? WHERE id=?").bind(title, detail, keepLinks ? null : links, assigned, freq, due, act, rid).run();
      return r.meta?.changes ? json({ ok: true }) : json({ error: "No existe la actividad" }, 404);
    }
    return json({ error: "Método no permitido" }, 405);
  }
  return null;
}

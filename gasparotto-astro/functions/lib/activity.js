// Historial de movimientos, períodos de las actividades obligatorias y limpieza de datos viejos.
// Nada de esto puede romper una operación del panel: si falla, se ignora.
export const FREQS = ["once", "daily", "weekly", "monthly"];

export async function logActivity(db, actor, action, entity, refId, title, detail = "") {
  try {
    await db.prepare("INSERT INTO activity (user_id, user_name, action, entity, ref_id, title, detail) VALUES (?,?,?,?,?,?,?)")
      .bind(Number(actor?.id) || 0, String(actor?.name || "").slice(0, 80), action, entity, Number(refId) || 0, String(title || "").slice(0, 160), String(detail || "").slice(0, 200)).run();
    if (Math.random() < 0.02) await db.prepare("DELETE FROM activity WHERE at < datetime('now', '-400 days')").run();
  } catch { /* best-effort */ }
}

// Clave del período en curso: una actividad "semanal" se completa una vez por semana (lunes a domingo), etc. today = YYYY-MM-DD.
export function periodKey(freq, today) {
  if (freq === "daily") return today;
  if (freq === "monthly") return today.slice(0, 7);
  if (freq === "weekly") {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return "w" + d.toISOString().slice(0, 10);
  }
  return "once";
}

// Tablero de actividades: cada tarea con el estado de cada persona asignada en el período actual.
export async function taskBoard(db, today) {
  const tasks = (await db.prepare("SELECT * FROM tasks ORDER BY active DESC, id DESC").all()).results;
  const users = (await db.prepare("SELECT id, name, email FROM users WHERE active=1 ORDER BY name").all()).results;
  const keys = [...new Set(FREQS.map((f) => periodKey(f, today)))];
  const done = (await db.prepare(`SELECT task_id, user_id, period, done_at, note, link, review, review_note FROM task_done WHERE period IN (${keys.map(() => "?").join(",")})`).bind(...keys).all()).results;
  return tasks.map((t) => {
    const period = periodKey(t.frequency, today);
    const who = t.assigned_to ? users.filter((u) => u.id === t.assigned_to) : users;
    const status = who.map((u) => {
      const d = done.find((x) => x.task_id === t.id && x.user_id === u.id && x.period === period);
      return { user_id: u.id, name: u.name || u.email, done: !!d, done_at: d?.done_at || "", note: d?.note || "", link: d?.link || "", review: d?.review || "", review_note: d?.review_note || "" };
    });
    return { ...t, period, overdue: t.frequency === "once" && !!t.due_day && t.due_day < today, status, pending: status.filter((s) => !s.done).length };
  });
}

// ---------- Links adjuntos de las actividades ----------
export const MAX_LINKS = 8;

// Acepta una lista [{label, url}] o un texto con una línea por link ("Etiqueta | https://..." o solo la URL).
// Solo http/https: nunca javascript:, data: ni similares. Devuelve { links, bad } (bad = líneas descartadas).
export function cleanLinks(input) {
  const raw = Array.isArray(input) ? input : String(input ?? "").split(/\r?\n/).map((l) => {
    const i = l.lastIndexOf("|");
    return i > -1 ? { label: l.slice(0, i), url: l.slice(i + 1) } : { label: "", url: l };
  });
  const links = []; let bad = 0;
  for (const x of raw) {
    const url0 = String(x?.url ?? "").trim(), label = String(x?.label ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
    if (!url0 && !label) continue;
    let u; try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(url0) ? url0 : "https://" + url0); } catch { bad++; continue; }
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || u.href.length > 500) { bad++; continue; }
    if (links.length >= MAX_LINKS) { bad++; continue; }
    links.push({ label: label || u.hostname.replace(/^www\./, ""), url: u.href });
  }
  return { links, bad };
}
export function parseLinks(raw) {
  try { const a = JSON.parse(raw || "[]"); return Array.isArray(a) ? cleanLinks(a).links : []; } catch { return []; }
}

// ---------- Fechas y períodos ----------
const dayAdd = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

// Último día del período al que pertenece "day" (el período termina ese día, inclusive).
export function periodEnd(freq, day) {
  if (freq === "daily") return day;
  if (freq === "weekly") return dayAdd(day, 6 - ((new Date(day + "T00:00:00Z").getUTCDay() + 6) % 7));
  if (freq === "monthly") { const d = new Date(day + "T00:00:00Z"); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10); }
  return "";
}

// Período anterior al de "today" (para avisar "la semana pasada no lo hiciste"). Las de una sola vez no tienen.
export function prevPeriod(freq, today) {
  if (freq === "daily") { const d = dayAdd(today, -1); return { key: periodKey(freq, d), end: d }; }
  if (freq === "weekly") { const d = dayAdd(today, -7); return { key: periodKey(freq, d), end: periodEnd(freq, d) }; }
  if (freq === "monthly") { const d = dayAdd(today.slice(0, 7) + "-01", -1); return { key: periodKey(freq, d), end: d }; }
  return null;
}

// Reporte de cumplimiento de las actividades en los últimos "days" días.
// Por cada actividad activa y cada persona asignada se cuentan los períodos que ya terminaron (hechos / no hechos) y el que sigue abierto.
// Una actividad solo cuenta desde el día en que se creó. Las pausadas no entran.
export async function taskReport(db, today, days) {
  const from = dayAdd(today, -(days - 1));
  const tasks = (await db.prepare("SELECT * FROM tasks WHERE active=1 ORDER BY id").all()).results;
  const users = (await db.prepare("SELECT id, name, email FROM users WHERE active=1 ORDER BY name").all()).results;
  const doneRows = (await db.prepare("SELECT task_id, user_id, period, done_at, note, link, review, review_note FROM task_done").all()).results;
  const done = new Map(doneRows.map((r) => [`${r.task_id}|${r.user_id}|${r.period}`, r.done_at]));
  const byUser = new Map(users.map((u) => [u.id, { user_id: u.id, name: u.name || u.email, done: 0, missed: 0, open: 0 }]));
  const missedList = [];
  const out = tasks.map((t) => {
    const created = String(t.created_at || "").slice(0, 10) || from;
    const start = created > from ? created : from;
    // períodos [{key, end}] dentro de la ventana
    const periods = [];
    if (t.frequency === "once") periods.push({ key: "once", end: t.due_day || "" });
    else for (let d = start; d <= today; d = dayAdd(d, 1)) { const key = periodKey(t.frequency, d); if (!periods.some((p) => p.key === key)) periods.push({ key, end: periodEnd(t.frequency, d) }); }
    const who = t.assigned_to ? users.filter((u) => u.id === t.assigned_to) : users;
    const sum = { done: 0, missed: 0, open: 0 };
    const people = who.map((u) => {
      const s = { user_id: u.id, name: u.name || u.email, done: 0, missed: 0, open: 0 };
      for (const p of periods) {
        const at = done.get(`${t.id}|${u.id}|${p.key}`);
        if (at) { s.done++; continue; }
        if (p.end && p.end < today) { s.missed++; missedList.push({ task_id: t.id, title: t.title, user_id: u.id, name: s.name, period: p.key, end: p.end }); }
        else s.open++;
      }
      for (const k of ["done", "missed", "open"]) { sum[k] += s[k]; byUser.get(u.id)[k] += s[k]; }
      return { ...s, rate: s.done + s.missed ? Math.round((s.done / (s.done + s.missed)) * 100) : null };
    });
    return { id: t.id, title: t.title, frequency: t.frequency, due_day: t.due_day, assigned_to: t.assigned_to, links: parseLinks(t.links), ...sum, rate: sum.done + sum.missed ? Math.round((sum.done / (sum.done + sum.missed)) * 100) : null, people };
  });
  const people = [...byUser.values()].map((p) => ({ ...p, rate: p.done + p.missed ? Math.round((p.done / (p.done + p.missed)) * 100) : null }));
  const tot = people.reduce((a, p) => ({ done: a.done + p.done, missed: a.missed + p.missed, open: a.open + p.open }), { done: 0, missed: 0, open: 0 });
  missedList.sort((a, b) => b.end.localeCompare(a.end));
  const names = new Map(users.map((u) => [u.id, u.name || u.email])), titles = new Map(tasks.map((t) => [t.id, t.title]));
  const recent = doneRows.filter((r) => titles.has(r.task_id) && String(r.done_at).slice(0, 10) >= from)
    .sort((a, b) => String(b.done_at).localeCompare(String(a.done_at))).slice(0, 40)
    .map((r) => ({ task_id: r.task_id, user_id: r.user_id, period: r.period, title: titles.get(r.task_id), name: names.get(r.user_id) || "Usuario eliminado", done_at: r.done_at, note: r.note || "", link: r.link || "", review: r.review || "", review_note: r.review_note || "" }));
  return { days, from, to: today, totals: { ...tot, rate: tot.done + tot.missed ? Math.round((tot.done / (tot.done + tot.missed)) * 100) : null }, people, tasks: out, missed: missedList.slice(0, 60), recent };
}

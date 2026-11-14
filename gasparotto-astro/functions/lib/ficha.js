// Ficha de paquete y comparador: lee packages.meta (JSON) y devuelve HTML (Tailwind). Sin dependencias.
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const arr = (v, n = 40) => (Array.isArray(v) ? v : []).slice(0, n);
const txt = (s, n = 300) => String(s == null ? "" : s).replace(/<[^>]*>/g, "").trim().slice(0, n);

// Horario libre → "HH:MM". Acepta 9:30 · 09.30 · 9h30 · 9:30 h · 9 h. Devuelve "" si no es un horario válido.
export function normTime(v) {
  const s = String(v == null ? "" : v).trim().toLowerCase();
  const m = s.match(/^(\d{1,2})\s*[:.h]\s*(\d{2})\s*(?:h|hs|hrs)?$/) || s.match(/^(\d{1,2})()\s*(?:h|hs|hrs)$/);
  if (!m) return "";
  const h = Number(m[1]), mi = m[2] ? Number(m[2]) : 0;
  return h > 23 || mi > 59 ? "" : String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0");
}

// Horarios de salida: [["09:00", "nota opcional"], ...] ordenados, sin repetir (se queda el primero) y solo horas válidas. Máximo 24.
// Lo usan normMeta (ficha) y el panel de Disponibilidad (PUT /api/booking-config), así los dos guardan exactamente lo mismo.
export function normTimes(raw) {
  return [...new Map(arr(raw, 24).map((r) => [normTime(Array.isArray(r) ? r[0] : r), txt(Array.isArray(r) ? r[1] : "", 80)]).filter((r) => r[0]).reverse()).entries()].reverse().sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

// Guardado: normaliza lo que manda el panel (nunca confiar en el JSON recibido).
export function normMeta(raw) {
  let m = {};
  try { m = typeof raw === "string" ? JSON.parse(raw || "{}") : raw || {}; } catch { m = {}; }
  const out = {
    facts: arr(m.facts, 12).map((r) => [txt(r?.[0], 40), txt(r?.[1], 160)]).filter((r) => r[0] && r[1]),
    exc: arr(m.exc, 20).map((x) => txt(x, 160)).filter(Boolean),
    stops: arr(m.stops, 30).map((x) => txt(x, 100)).filter(Boolean),
    // Horarios de salida: [["09:00", "nota opcional"], ...] ordenados, sin repetir y solo horas válidas.
    times: normTimes(m.times),
    faq: arr(m.faq, 12).map((r) => [txt(r?.[0], 200), txt(r?.[1], 800)]).filter((r) => r[0] && r[1]),
    table: arr(m.table, 14).map((r) => arr(r, 8).map((c) => txt(c, 80))).filter((r) => r.length > 1),
    gallery: arr(m.gallery, 12).map((x) => txt(x, 500)).filter((x) => /^(\/media\/|\/assets\/|https:\/\/)/.test(x)),
    // Paquete = combina varios servicios (cada uno es otro producto del panel, con su propia página y precio). Servicio = se vende solo.
    kind: m.kind === "paquete" || m.kind === "servicio" ? m.kind : "",
    parts: [...new Set(arr(m.parts, 12).map((x) => txt(x, 120)).filter((x) => /^[a-z0-9][a-z0-9-]*$/.test(x)))],
    // Itinerario del paquete (solo con parts): [slug, día (1..14), horario "HH:MM" o "", opción del servicio o ""]. Un renglón por servicio, en el orden del panel.
    // pmode: "fijo" = la agencia fija el día de cada servicio y el cliente solo elige cuándo empieza; "libre" = el cliente puede mover cada servicio
    // a otro día dentro de los días del paquete. auto = precio = suma de los servicios (menos disc %, de 0 a 90).
    plan: [], pmode: m.pmode === "libre" ? "libre" : "fijo",
    // win (solo "libre"): cuántos días tiene el cliente para repartir los servicios desde la fecha de inicio (1..60). 0 = 30 días.
    win: Math.min(60, Math.max(0, Math.round(Number(m.win) || 0))),
    auto: m.auto === 1 || m.auto === true || m.auto === "1" ? 1 : 0,
    disc: Math.min(90, Math.max(0, Math.round(Number(m.disc) || 0))),
    // Opciones con precio del mismo producto (ej. tango: Solo show · Jantar show · Platea VIP): [nombre, precio, precio anterior, detalle].
    // Comparten fecha, horario y cupo; solo cambia el precio. Se descartan las que no tienen nombre o precio, y los nombres repetidos.
    options: arr(m.options, 12).map((r) => [txt(r?.[0], 60), txt(r?.[1], 40), txt(r?.[2], 40), txt(r?.[3], 140)])
      .filter((r, i, all) => r[0] && r[1] && /\d/.test(r[1]) && all.findIndex((x) => x[0].toLowerCase() === r[0].toLowerCase()) === i),
  };
  // Itinerario: un renglón por servicio del paquete (los que no vienen en plan quedan en el día 1). Los servicios se ordenan como el itinerario.
  const pl = arr(m.plan, 12).filter((r) => Array.isArray(r) && out.parts.includes(r[0]));
  const order = [...new Set([...pl.map((r) => r[0]), ...out.parts])];
  out.parts = order;
  out.plan = order.map((slug) => {
    const r = pl.find((x) => x[0] === slug) || [];
    return [slug, Math.min(14, Math.max(1, Math.round(Number(r[1]) || 1))), normTime(r[2]), txt(r[3], 60)];
  });
  // Políticas (menores, cancelación, documentación, pagos u otra): [tipo, texto, opción a la que aplica ("" = a todas), título propio (solo "otra")].
  // La opción tiene que existir entre las opciones guardadas; si no, la política pasa a valer para todo el producto.
  const optNames = new Map(out.options.map((o) => [o[0].toLowerCase(), o[0]]));
  out.policies = arr(m.policies, 10).map((r) => {
    const t = POLICY_TYPES.includes(r?.[0]) ? r[0] : "otra";
    return [t, txt(r?.[1], 800), optNames.get(txt(r?.[2], 60).toLowerCase()) || "", t === "otra" ? txt(r?.[3], 60) : ""];
  }).filter((r) => r[1]);
  return JSON.stringify(out);
}
export const POLICY_TYPES = ["menores", "cancelacion", "documentacion", "pagos", "otra"];
// Políticas listas para mostrar: [{ type, title, text, option }]. title = el propio (tipo "otra") o el nombre del tipo en el idioma del sitio.
export function policiesOf(p, L = {}) {
  const T = L.policyTypes || {};
  return (Array.isArray(parseMeta(p.meta).policies) ? parseMeta(p.meta).policies : []).filter((r) => Array.isArray(r) && r[1]).slice(0, 10).map((r) => {
    const type = POLICY_TYPES.includes(r[0]) ? r[0] : "otra";
    return { type, title: (type === "otra" && r[3]) || T[type] || "", text: String(r[1]), option: String(r[2] || "") };
  });
}
// Itinerario listo para usar: [{ slug, day, time, option }] en el orden del panel. Paquetes viejos (sin plan): todos en el día 1.
export function planOf(p) {
  const m = parseMeta(p.meta), parts = Array.isArray(m.parts) ? m.parts : [], pl = Array.isArray(m.plan) ? m.plan : [];
  return parts.map((slug) => {
    const r = pl.find((x) => Array.isArray(x) && x[0] === slug) || [];
    return { slug, day: Math.min(14, Math.max(1, Math.round(Number(r[1]) || 1))), time: normTime(r[2]), option: String(r[3] || "") };
  });
}
export const kindOf = (p) => parseMeta(p.meta).kind || "";
export const partsOf = (p) => (Array.isArray(parseMeta(p.meta).parts) ? parseMeta(p.meta).parts : []);
// Galería: una foto por línea, "dirección" o "dirección | descripción de la foto" (la descripción va en el alt).
export const isVideoUrl = (u) => /\.(mp4|webm|mov)(\?|$)/i.test(u);
export function galleryOf(p) {
  return (Array.isArray(parseMeta(p.meta).gallery) ? parseMeta(p.meta).gallery : []).slice(0, 12).map((x) => {
    const [src, ...rest] = String(x).split(" | ");
    return { src: src.trim(), alt: rest.join(" | ").trim() };
  }).filter((g) => /^(\/media\/|\/assets\/|https:\/\/)/.test(g.src));
}
// Opciones con precio: [{ i, name, price, old, note, cents }] en el orden del panel. cents = precio por persona en centavos (0 si no es numérico).
// La reserva guarda el nombre; el índice solo identifica la opción dentro del formulario.
export function optionsOf(p, parse = (s) => { const m = String(s || "").match(/\d[\d.,]*/); if (!m) return null; let n = m[0]; if (/,\d{1,2}$/.test(n)) n = n.replace(/\./g, "").replace(",", "."); else if (!/^\d+\.\d{1,2}$/.test(n)) n = n.replace(/[.,]/g, ""); return Number.isFinite(Number(n)) ? Number(n) : null; }) {
  const o = parseMeta(p.meta).options;
  return (Array.isArray(o) ? o : []).filter((r) => Array.isArray(r) && r[0] && r[1]).slice(0, 12).map((r, i) => {
    const n = parse(r[1]);
    return { i, name: String(r[0]), price: String(r[1]), old: String(r[2] || ""), note: String(r[3] || ""), cents: Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0 };
  });
}
// La opción más barata con precio numérico (la que se muestra como "a partir de"); si ninguna es numérica, la primera.
export function cheapestOption(opts) {
  const num = opts.filter((o) => o.cents > 0);
  return num.length ? num.reduce((a, b) => (b.cents < a.cents ? b : a)) : opts[0] || null;
}
export const timesOf = (p) => (parseMeta(p.meta).times || []).filter((r) => Array.isArray(r) && /^\d{2}:\d{2}$/.test(r[0]));
export function parseMeta(s) { try { return JSON.parse(s || "{}") || {}; } catch { return {}; } }

// Horas aproximadas para filtrar (0 = desconocido, 24 = día completo).
export function hoursOf(p) {
  const f = (parseMeta(p.meta).facts || []).find((r) => /duraci/i.test(r[0]));
  const v = f ? f[1].toLowerCase() : "";
  const n = v.match(/(\d+(?:[.,]\d+)?)\s*h/);
  return n ? parseFloat(n[1].replace(",", ".")) : /d[ií]a/.test(v) ? 24 : 0;
}

// Resumen para tarjetas: duración y horario.
export function cardFacts(p) {
  const f = parseMeta(p.meta).facts || [];
  const pick = ["duraci", "horario", "inicio"].map((k) => f.find((r) => r[0].toLowerCase().includes(k))).filter(Boolean).slice(0, 2);
  return pick.length ? `<ul class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-mute">${pick.map((r) => `<li><span class="text-mute/80">${esc(r[0])}</span> <span class="font-semibold text-ink">${esc(r[1])}</span></li>`).join("")}</ul>` : "";
}

const faqLd = (faq) => faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } : null;

const H2 = "m-0 mb-6 font-display text-h3 font-semibold text-ink";
const SCROLLER = "overflow-x-auto rounded-lg border border-ink/15 focus-visible:outline-3 focus-visible:outline-primary";

// Bloques de la ficha. incl = líneas de "Qué incluye" (columna details).
export function fichaHtml(p, incl, L, polsIn = null) {
  const m = parseMeta(p.meta), facts = arr(m.facts), exc = arr(m.exc), stops = arr(m.stops), faq = arr(m.faq), table = arr(m.table), gal = galleryOf(p);

  // Datos rápidos: ficha técnica con una línea sobre cada dato
  const top = facts.length
    ? `<dl data-fx="hero" class="m-0 mt-10 grid grid-cols-2 gap-x-8 sm:grid-cols-3">${facts.map(([a, b]) => `<div class="border-t border-ink/20 pb-5 pt-4"><dt class="m-0 text-sm text-mute">${esc(a)}</dt><dd class="m-0 mt-1 font-display text-lg font-semibold leading-snug text-ink">${esc(b)}</dd></div>`).join("")}</dl>`
    : "";

  // Horarios de salida: una casilla por horario (con su nota, si la tiene), justo debajo de los datos clave
  const times = timesOf(p);
  const hor = times.length
    ? `<section data-fx="up" class="mt-10"><h2 class="m-0 mb-4 font-display text-h3 font-semibold text-ink">${esc(L.times || "Horarios de salida")}</h2><ul class="m-0 flex list-none flex-wrap gap-3 p-0">${times.map(([t, n]) => `<li class="rounded-lg border border-ink/20 px-4 py-3"><time datetime="${t}" class="block font-display text-lg font-semibold leading-tight text-ink">${t}</time>${n ? `<span class="mt-1 block text-sm text-mute">${esc(n)}</span>` : ""}</li>`).join("")}</ul></section>`
    : "";

  // Qué incluye / No incluye: dos columnas con una línea gruesa arriba; si falta una, la otra ocupa todo el ancho
  const li = (x, ok) => `<li class="flex gap-3 leading-snug text-ink"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0 ${ok ? "text-cta" : "text-mute"}"><path d="${ok ? "M5 12.5l4.5 4.5L19 7.5" : "M6 6l12 12M18 6L6 18"}"/></svg><span>${esc(x)}</span></li>`;
  const col = (title, items, ok) => `<div class="border-t-2 ${ok ? "border-primary" : "border-ink/25"} pt-6"><h2 class="m-0 mb-5 font-display text-h3 font-semibold text-ink">${esc(title)}</h2><ul class="m-0 grid list-none gap-3.5 p-0">${items.map((x) => li(x, ok)).join("")}</ul></div>`;
  const cols = [incl.length && col(L.includes, incl, true), exc.length && col(L.noIncludes, exc, false)].filter(Boolean);
  const inc = cols.length ? `<section data-fx="up" class="mt-16 grid gap-x-12 gap-y-10 ${cols.length > 1 ? "md:grid-cols-2" : ""}">${cols.join("")}</section>` : "";

  // Paradas: ruta punteada con una parada numerada por punto (es una secuencia real)
  const st = stops.length
    ? `<section data-fx="up" class="mt-16"><h2 class="${H2}">${esc(L.stops)}</h2><ol class="m-0 list-none p-0">${stops.map((x, i) => `<li class="relative ml-4 border-l-2 border-dotted border-primary/50 pb-8 pl-9 last:border-transparent last:pb-0"><span class="absolute -left-[1.0625rem] top-0 grid size-8 place-items-center rounded-full border-2 border-primary bg-white text-sm font-bold text-primary">${i + 1}</span><span class="block pt-1 font-semibold leading-snug text-ink">${esc(x)}</span></li>`).join("")}</ol></section>`
    : "";

  // Tabla de opciones
  const tb = table.length > 1
    ? `<section data-fx="up" class="mt-16"><h2 class="${H2}">${esc(L.options)}</h2><div class="${SCROLLER}" tabindex="0" role="region" aria-label="${esc(L.optionsAria)}"><table class="w-full min-w-[32rem] border-collapse text-left text-[0.95rem]"><thead><tr>${table[0].map((h) => `<th scope="col" class="bg-night px-4 py-3 text-left text-sm font-semibold text-white">${esc(h)}</th>`).join("")}</tr></thead><tbody>${table.slice(1).map((r) => `<tr class="border-t border-ink/10">${r.map((c, i) => i ? `<td class="px-4 py-3 text-ink">${esc(c)}</td>` : `<th scope="row" class="px-4 py-3 text-left font-semibold text-ink">${esc(c)}</th>`).join("")}</tr>`).join("")}</tbody></table></div></section>`
    : "";

  // Galería: mosaico (la primera foto destacada) + visor a pantalla completa (public/assets/gallery.js).
  // Sin JavaScript cada miniatura es un enlace a la foto. Se muestran hasta 5; el resto queda en el visor con un "+N".
  const MAXV = 5, vis = Math.min(gal.length, MAXV), extra = gal.length - MAXV;
  const isVideo = (u) => /\.(mp4|webm|mov)(\?|$)/i.test(u);
  const tile = (g, i) => {
    const u = g.src, last = i === MAXV - 1 && extra > 0, hid = i >= MAXV;
    const inner = isVideo(u)
      ? `<video muted playsinline preload="metadata" tabindex="-1" aria-hidden="true" src="${esc(u)}#t=0.1"></video><span class="gvg-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>`
      : `<img src="${esc(u)}" alt="${esc(g.alt || `${p.title} · foto ${i + 1} de ${gal.length}`)}" loading="${i < 2 ? "eager" : "lazy"}" decoding="async">`;
    const ic = hid || isVideo(u) ? "" : `<span class="gvg-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></span>`;
    const more = last ? `<span class="gvg-more" aria-hidden="true">+${extra}<small>${esc(L.gallery)}</small></span>` : "";
    return `<a href="${esc(u)}" data-gvi${isVideo(u) ? " data-video" : ""}${hid ? " hidden" : ""} class="gvg-t" aria-label="${esc(p.title)} · ${i + 1}/${gal.length}${last ? ` (+${extra})` : ""}">${inner}${ic}${more}</a>`;
  };
  const ga = gal.length
    ? `<section data-fx="up" class="mt-16"><h2 class="${H2}">${esc(L.gallery)}</h2><div class="gvg gvg-n${vis}" data-gvg data-title="${esc(p.title)}">${gal.map(tile).join("")}</div><link rel="stylesheet" href="/assets/gallery.css?v=1"><script src="/assets/gallery.js?v=1" defer></script></section>`
    : "";

  // Preguntas frecuentes
  const fq = faq.length
    ? `<section data-fx="up" class="mt-16"><h2 class="${H2}">${esc(L.faq)}</h2><div class="border-t border-ink/20">${faq.map(([q, a]) => `<details class="group border-b border-ink/20"><summary class="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-semibold text-ink [&::-webkit-details-marker]:hidden">${esc(q)}<span aria-hidden="true" class="tw-plus"></span></summary><p class="m-0 max-w-2xl pb-6 pr-10 leading-relaxed text-mute">${esc(a)}</p></details>`).join("")}</div></section>`
    : "";

  // Políticas (menores, cancelación, etc.): las generales primero; las de una opción llevan "Solo para: <opción>". Párrafos por línea.
  const pol = (polsIn || policiesOf(p, L)).slice().sort((a, b) => (a.option ? 1 : 0) - (b.option ? 1 : 0));
  const pl = pol.length
    ? `<section id="politicas" data-fx="up" class="mt-16 scroll-mt-24"><h2 class="${H2}">${esc(L.policies || "Políticas")}</h2><dl class="gvp">${pol.map((x) => `<div><dt>${esc(x.title)}${x.option ? `<span class="gvp-only">${esc(L.policyOnly || "Solo para")}: ${esc(x.option)}</span>` : ""}</dt><dd>${x.text.split(/\n+/).map((t) => t.trim()).filter(Boolean).map((t) => `<p>${esc(t).replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>").replace(/\*\*/g, "")}</p>`).join("")}</dd></div>`).join("")}</dl><link rel="stylesheet" href="/assets/options.css?v=2"></section>`
    : "";

  return { top: top + hor, inc, st, tb, ga, fq, pl, ld: faqLd(faq) };
}

// Comparador de una categoría: aparece solo cuando hay datos de 2 o más paquetes.
export function compareTable(pkgs, L = {}) {
  const rows = pkgs.map((p) => ({ p, f: new Map((parseMeta(p.meta).facts || []).map((r) => [r[0], r[1]])) })).filter((x) => x.f.size >= 2);
  if (rows.length < 2) return "";
  const labels = [...new Set(rows.flatMap((x) => [...x.f.keys()]))].slice(0, 8);
  const head = rows.map((x) => `<th scope="col" class="bg-night px-4 py-3 text-left align-bottom"><a href="/paquetes/${esc(x.p.slug)}/" class="no-underline"><span class="font-display text-base font-semibold leading-snug text-white hover:underline">${esc(x.p.title)}</span></a></th>`).join("");
  const body = labels.map((l) => `<tr class="border-t border-ink/10"><th scope="row" class="sticky left-0 bg-white px-4 py-3 text-left text-sm font-semibold text-mute">${esc(l)}</th>${rows.map((x) => `<td class="px-4 py-3 text-ink">${esc(x.f.get(l) || "–")}</td>`).join("")}</tr>`).join("");
  return `<section id="comparar" class="mt-16 scroll-mt-24"><h2 class="${H2}">${esc(L.compare || "Compará las opciones")}</h2><div class="${SCROLLER}" tabindex="0" role="region" aria-label="${esc(L.compareAria || "Comparador")}"><table class="w-full min-w-[36rem] border-collapse text-left text-[0.95rem]"><thead><tr><th scope="col" class="sticky left-0 bg-night px-4 py-3"><span class="sr-only">${esc(L.compareAria || "Comparador")}</span></th>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
}

const FB = {
  es: { q: "Buscar", ph: "Ej: tigre, tango, familia", d: "Duración", all: "Todas", s: "Hasta 4 h", m: "5 a 7 h", l: "Día completo", one: " experiencia", many: " experiencias" },
  pt: { q: "Buscar", ph: "Ex.: tigre, tango, família", d: "Duração", all: "Todas", s: "Até 4 h", m: "5 a 7 h", l: "Dia inteiro", one: " experiência", many: " experiências" },
};
export const filterBar = (n, lang = "es") => n < 6 ? "" : ((F) => `<div data-gv-filter class="mb-10 grid gap-4 border-y border-ink/15 py-5 sm:grid-cols-[1fr_15rem_auto] sm:items-end"><label class="grid gap-1.5 text-[0.9375rem] font-semibold text-ink">${F.q}<input type="search" data-q placeholder="${F.ph}" autocomplete="off" class="tw-field font-normal"></label><label class="grid gap-1.5 text-[0.9375rem] font-semibold text-ink">${F.d}<select data-d class="tw-field font-normal"><option value="">${F.all}</option><option value="s">${F.s}</option><option value="m">${F.m}</option><option value="l">${F.l}</option></select></label><p data-n data-one="${F.one}" data-many="${F.many}" role="status" aria-live="polite" class="m-0 min-h-6 text-sm font-semibold text-mute sm:pb-3"></p></div><script src="/assets/filter.js?v=4" defer></script>`)(/^es/i.test(lang) ? FB.es : FB.pt);

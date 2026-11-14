// Portada: panel "Oferta relâmpago" (el del medio del tríptico "O que você quer viver?").
// 1) Si algún producto publicado tiene "Oferta relámpago en la portada hasta" (meta.flash, hora de Buenos Aires) y todavía no venció,
//    se muestra el que termina antes, con cuenta regresiva real hasta esa hora (public/assets/flash.js).
// 2) Si no hay ninguna activa: el producto publicado con mayor descuento real (precio anterior vs. precio), SIN reloj (no se inventa urgencia).
// 3) Si tampoco hay descuentos: queda el panel de siempre (City Tour), que viene en la página (data-flash-slot).
import { esc } from "./html.js";
import { parseMeta, optionsOf, cheapestOption } from "./ficha.js";
import { parsePrice } from "./seo.js";

// "2026-11-20T23:59" (hora BA, sin zona) → milisegundos. Argentina no tiene horario de verano: UTC−3 fijo.
export const flashMs = (s) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(s || "")) ? Date.parse(s + ":00-03:00") : NaN);

const priceOf = (p) => {
  const best = cheapestOption(optionsOf(p));
  const price = best ? best.price : p.price, old = best ? best.old : p.price_old;
  const n = Number(parsePrice(price)) || 0, o = Number(parsePrice(old)) || 0;
  return { price, old: o > n && n > 0 ? old : "", pct: o > n && n > 0 ? Math.round(((o - n) / o) * 100) : 0 };
};

export function pickFlash(rows, now = Date.now()) {
  const live = rows.map((p) => ({ p, end: flashMs(parseMeta(p.meta).flash) })).filter((x) => x.end > now).sort((a, b) => a.end - b.end);
  if (live.length) return { p: live[0].p, end: live[0].end, ...priceOf(live[0].p) };
  const off = rows.map((p) => ({ p, ...priceOf(p) })).filter((x) => x.pct >= 5 && x.p.image).sort((a, b) => b.pct - a.pct);
  return off.length ? { ...off[0], end: 0 } : null;
}

const BOLT = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z"/></svg>';

// Mismo marco que los otros paneles del tríptico (src/components/home/Intents.astro).
const tile = (img, alt, pos, href, band, inner) => `<li class="group/tile relative isolate flex-1 overflow-hidden bg-night transition-[flex-grow] duration-700 ease-soft md:hover:flex-[1.5] md:focus-within:flex-[1.5]"><img src="${esc(img)}" alt="${esc(alt)}" width="1672" height="941" loading="lazy" style="object-position:${esc(pos)}" class="absolute inset-0 -z-10 size-full object-cover transition duration-1000 ease-soft group-hover/tile:scale-105"><a href="${esc(href)}" class="flex h-full min-h-80 flex-col justify-end text-white no-underline focus-visible:outline-offset-[-6px] focus-visible:outline-white md:min-h-0">${inner.top || ""}<span class="block p-6 sm:p-8 ${band}">${inner.body}</span></a></li>`;

export function flashTile(f, L) {
  const es = L.lang === "es";
  const T = es
    ? { flash: "Oferta relámpago", best: "Mayor descuento del momento", per: "por persona", ends: "Termina en", over: "Oferta terminada", cta: "Aprovechar la oferta", d: "d" }
    : { flash: "Oferta relâmpago", best: "Maior desconto do momento", per: "por pessoa", ends: "Termina em", over: "Oferta encerrada", cta: "Aproveitar a oferta", d: "d" };
  const p = f.p;
  const timer = f.end ? `<span class="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-white/90"><span>${esc(T.ends)}</span><span data-flash-end="${new Date(f.end).toISOString()}" data-over="${esc(T.over)}" data-d="${esc(T.d)}" class="rounded-md bg-white/15 px-2 py-1 font-mono text-base tabular-nums tracking-wide text-white" aria-live="off"></span></span>` : "";
  const top = `<span class="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-bold text-white shadow-lg sm:left-6 sm:top-6">${BOLT}${esc(f.end ? T.flash : T.best)}${f.pct ? ` · -${f.pct}%` : ""}</span>`;
  const body = `<span class="block text-sm font-semibold uppercase tracking-[0.14em] text-celeste">${esc(f.end ? T.flash : T.best)}</span>`
    + `<span class="mt-1.5 block font-display text-[clamp(1.6rem,2.5vw,2.25rem)] font-semibold leading-[1.1] tracking-tight">${esc(p.title)}</span>`
    + `<span class="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">${f.old ? `<s class="text-white/70">${esc(f.old)}</s>` : ""}<span class="font-display text-3xl font-semibold text-white">${esc(f.price)}</span><span class="text-sm text-white/80">${esc(T.per)}</span></span>`
    + timer
    + `<span class="tw-link mt-5 inline-flex items-center gap-2 font-semibold">${esc(T.cta)}<i aria-hidden="true" class="tw-arrow"></i></span>`;
  const li = tile(p.image, p.image_alt || p.title, "50% 50%", `/paquetes/${p.slug}/`, "bg-night", { top, body });
  return f.end ? li.replace(/<\/li>$/, '<script src="/assets/flash.js?v=1" defer></script></li>') : li;
}

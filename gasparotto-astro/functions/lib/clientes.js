// "Nuestros clientes": fotos que el equipo sube desde el panel (tabla client_photos, ver functions/lib/api/clientes.js).
// Página /clientes/ (galería completa) y franja de la portada (las últimas 8, solo si hay al menos 4).
import { esc } from "./html.js";

export const CLIENTES_PATH = "/clientes/";
export const HOME_MIN = 4;

export const clientesText = (lang) => lang === "es"
  ? { title: "Nuestros clientes", eyebrow: "Quienes viajaron con nosotros", lead: "Fotos reales de clientes que vivieron Buenos Aires con Gasparotto Viajes.", desc: "Fotos reales de clientes de Gasparotto Viajes en Buenos Aires: city tour, shows de tango y paseos.", empty: "Muy pronto vas a ver acá las fotos de nuestros clientes.", all: "Ver todas las fotos", next: "¿Querés ser el próximo?", nextLead: "Elegí tu paseo y reservá en pocos minutos.", cta: "Ver paseos", contact: "Hablar con nosotros", photo: "Cliente de Gasparotto Viajes" }
  : { title: "Nossos clientes", eyebrow: "Quem viajou com a gente", lead: "Fotos reais de clientes que viveram Buenos Aires com a Gasparotto Viajes.", desc: "Fotos reais de clientes da Gasparotto Viajes em Buenos Aires: city tour, shows de tango e passeios.", empty: "Em breve você vai ver aqui as fotos dos nossos clientes.", all: "Ver todas as fotos", next: "Quer ser o próximo?", nextLead: "Escolha seu passeio e reserve em poucos minutos.", cta: "Ver passeios", contact: "Fale com a gente", photo: "Cliente da Gasparotto Viajes" };

export const PHOTOS_SQL = "SELECT id, image, caption, created_at FROM client_photos WHERE published=1 ORDER BY id DESC";

// Página completa (va dentro del layout del sitio).
export function clientesBody(photos, lang) {
  const t = clientesText(lang);
  const hero = `<section data-hero class="tw-page relative isolate overflow-hidden bg-night text-white"><div class="tw-wrap grid items-center gap-12 py-16 sm:py-24"><div>`
    + `<p data-fx="hero" class="m-0 mb-4 text-base font-semibold text-celeste">${esc(t.eyebrow)}</p>`
    + `<h1 data-fx="hero" class="m-0 font-display text-title font-semibold text-white">${esc(t.title)}</h1>`
    + `<p data-fx="hero" class="m-0 mt-7 max-w-xl text-lead text-white/80">${esc(t.lead)}</p></div></div></section>`;
  const grid = photos.length
    ? `<ul class="m-0 list-none columns-1 gap-5 p-0 sm:columns-2 lg:columns-3">${photos.map((p, i) => `<li class="mb-5 break-inside-avoid"><figure class="m-0"><img src="${esc(p.image)}" alt="${esc(p.caption || t.photo)}" loading="${i < 3 ? "eager" : "lazy"}" decoding="async" class="block h-auto w-full rounded-lg bg-mist object-cover">${p.caption ? `<figcaption class="mt-2 text-sm text-mute">${esc(p.caption)}</figcaption>` : ""}</figure></li>`).join("")}</ul>`
    : `<p class="m-0 text-lg text-mute">${esc(t.empty)}</p>`;
  const cta = `<section class="tw bg-primary text-white"><div data-fx="up" class="tw-wrap tw-section grid items-end gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16"><div><h2 class="m-0 font-display text-h2 font-semibold text-white">${esc(t.next)}</h2><p class="m-0 mt-5 max-w-md text-lead text-white/90">${esc(t.nextLead)}</p></div>`
    + `<div class="flex flex-wrap gap-3 lg:justify-end"><a href="/paquetes/" class="tw-btn tw-btn--light"><span>${esc(t.cta)}</span></a><a href="/contacto/" class="tw-btn tw-btn--ghost"><span>${esc(t.contact)}</span></a></div></div></section>`;
  return `${hero}<section class="tw tw-section bg-white"><div class="tw-wrap">${grid}</div></section>${cta}`;
}

// Franja de la portada: hasta 8 fotos (4 en celular) y enlace a la galería. Vacía si hay pocas fotos.
export function clientesStrip(photos, lang) {
  if (photos.length < HOME_MIN) return "";
  const t = clientesText(lang);
  const list = photos.slice(0, 8);
  return `<section class="tw tw-section bg-mist"><div class="tw-wrap">`
    + `<div data-fx="up" class="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-3"><div><p class="m-0 mb-4 text-base font-semibold text-accent">${esc(t.eyebrow)}</p><h2 class="m-0 font-display text-h2 font-semibold text-ink">${esc(t.title)}</h2></div><a href="${CLIENTES_PATH}" class="tw-link font-semibold text-primary">${esc(t.all)}</a></div>`
    + `<ul class="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:gap-4 md:grid-cols-4">${list.map((p, i) => `<li class="${i >= 4 ? "hidden md:block" : ""}"><a href="${CLIENTES_PATH}" class="block overflow-hidden rounded-lg"><img src="${esc(p.image)}" alt="${esc(p.caption || t.photo)}" loading="lazy" decoding="async" class="block aspect-square w-full object-cover transition duration-700 ease-soft hover:scale-105"></a></li>`).join("")}</ul>`
    + `</div></section>`;
}

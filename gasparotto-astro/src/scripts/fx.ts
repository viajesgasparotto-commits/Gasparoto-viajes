// Guion de la portada: 1) el título sube línea por línea (data-line), 2) el resto del hero entra,
//   3) al bajar: la línea de "Cómo reservar" se rellena con el scroll (data-timeline) y la foto del fundador se descubre (data-wipe).
// Animaciones del sitio con Motion (https://motion.dev). Se cargan en todas las páginas desde render.js.
// Marcado en el HTML:  data-fx="hero"  → entrada escalonada al cargar
//                      data-fx="up"    → aparece al entrar en pantalla (data-fx-delay="0.1" opcional)
//                      data-parallax="-80" en un hijo de [data-hero] → se desplaza con el scroll
import { animate, inView, scroll, stagger } from "motion";

const root = document.documentElement;
const ease = [0.2, 0.7, 0.2, 1] as const;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

(window as unknown as { __fx: number }).__fx = 1; // avisa a render.js que el script cargó

// Cabecera: sombra al hacer scroll (sin Motion) y menú móvil animado.
function header() {
  const hd = document.querySelector<HTMLElement>("[data-site-header]");
  if (hd) {
    const set = () => (window.scrollY > 8 ? hd.setAttribute("data-stuck", "") : hd.removeAttribute("data-stuck"));
    set();
    addEventListener("scroll", set, { passive: true });
  }
  const menu = document.querySelector<HTMLDetailsElement>("[data-menu]");
  if (!menu) return;
  addEventListener("keydown", (e) => { if (e.key === "Escape") menu.open = false; });
  if (reduce) return;
  menu.addEventListener("toggle", () => {
    if (!menu.open) return;
    const panel = menu.querySelector<HTMLElement>("[data-menu-panel]");
    const items = menu.querySelectorAll<HTMLElement>("[data-menu-item]");
    if (panel) animate(panel, { opacity: [0, 1], y: [-12, 0] }, { duration: 0.25, ease });
    animate(items, { opacity: [0, 1], x: [-16, 0] }, { duration: 0.4, ease, delay: stagger(0.05, { startDelay: 0.05 }) });
  });
}

// Formulario de reserva: conv.js avisa con eventos gv:* y acá se anima con Motion (sin Motion el formulario funciona igual).
function leadForm() {
  const on = <T = unknown>(name: string, fn: (target: HTMLElement, detail: T) => void) =>
    document.addEventListener("gv:" + name, (e) => { if (!reduce) fn(e.target as HTMLElement, (e as CustomEvent<T>).detail); });

  // Campo inválido: sacudida corta.
  on<{ field: HTMLElement }>("invalid", (_f, { field }) => {
    animate(field, { x: [0, -7, 7, -4, 4, 0] }, { duration: 0.4, ease: "easeOut" });
  });
  // Personas: el número "rebota" al sumar o restar.
  on<{ el: HTMLElement }>("pax", (_f, { el }) => {
    animate(el, { scale: [1.25, 1] }, { type: "spring", stiffness: 500, damping: 22 });
  });
  // Cambio de paso: el panel nuevo entra con un fundido corto.
  on<{ el: HTMLElement }>("step", (_f, { el }) => {
    animate(el, { opacity: [0, 1], y: [10, 0] }, { duration: 0.3, ease });
  });
  // Enviado: entra la confirmación, el círculo salta y el tilde se dibuja.
  on("sent", (form) => {
    const box = form.querySelector<HTMLElement>("[data-sent]");
    if (!box) return;
    animate(box, { opacity: [0, 1], y: [16, 0] }, { duration: 0.45, ease });
    const badge = box.querySelector<HTMLElement>("[data-badge]");
    if (badge) animate(badge, { scale: [0.5, 1] }, { type: "spring", stiffness: 320, damping: 15, delay: 0.05 });
    const check = box.querySelector<SVGPathElement>("[data-check]");
    if (check) animate(check, { pathLength: [0, 1] }, { duration: 0.45, delay: 0.2, ease });
  });
  // "Hacer otra consulta": vuelve el formulario con un fundido.
  on("reset", (form) => {
    const fields = form.querySelector<HTMLElement>("[data-fields]");
    if (fields) animate(fields, { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, ease });
  });
}

// Artículo del blog: marca en el índice la sección que se está leyendo y resuelve "copiar enlace" / compartir. Sin Motion: funciona aunque reduce-motion esté activo.
function article() {
  const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-toc] a[href^='#']")];
  const byId = new Map<string, HTMLAnchorElement[]>();
  links.forEach((a) => { const id = decodeURIComponent(a.hash.slice(1)); byId.set(id, [...(byId.get(id) || []), a]); });
  const heads = [...byId.keys()].map((id) => document.getElementById(id)).filter((h): h is HTMLElement => !!h);
  if (heads.length) {
    const mark = (id: string) => links.forEach((a) => (decodeURIComponent(a.hash.slice(1)) === id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    const io = new IntersectionObserver((entries) => {
      const seen = entries.filter((e) => e.isIntersecting);
      if (seen.length) mark(seen[0].target.id);
    }, { rootMargin: "-96px 0px -70% 0px" });
    heads.forEach((h) => io.observe(h));
  }
  document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((btn) => {
    const box = btn.closest<HTMLElement>("[data-share]");
    const url = box?.dataset.url || location.href;
    const label = btn.getAttribute("aria-label") || "";
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(url); } catch {
        const ta = document.createElement("textarea"); ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.append(ta); ta.select();
        try { document.execCommand("copy"); } catch { /* sin portapapeles: el enlace queda en la barra */ }
        ta.remove();
      }
      btn.setAttribute("data-done", ""); btn.setAttribute("aria-label", btn.dataset.ok || label);
      setTimeout(() => { btn.removeAttribute("data-done"); btn.setAttribute("aria-label", label); }, 2200);
    });
  });
}

function init() {
  header();
  leadForm();
  article();
  if (reduce) return; // sin movimiento: lo de abajo no corre
  // 1) Título por líneas (solo la portada) y 2) el resto del hero, que espera a que el título haya subido.
  const lines = document.querySelectorAll<HTMLElement>("[data-line]");
  if (lines.length) animate(lines, { y: ["105%", "0%"] }, { duration: 1, ease, delay: stagger(0.12, { startDelay: 0.1 }) });
  const hero = document.querySelectorAll<HTMLElement>('[data-fx="hero"]');
  if (hero.length) {
    animate(hero, { opacity: [0, 1], y: [28, 0] }, { duration: 0.9, ease, delay: stagger(0.09, { startDelay: lines.length ? 0.45 : 0.08 }) });
  }

  // 3a) Línea de tiempo: se rellena a medida que se baja por la sección (en móvil vertical, en escritorio horizontal).
  document.querySelectorAll<HTMLElement>("[data-timeline]").forEach((tl) => {
    tl.querySelectorAll<HTMLElement>("[data-timeline-fill]").forEach((el) => {
      const axis = el.dataset.timelineFill === "x" ? "scaleX" : "scaleY";
      scroll(animate(el, { [axis]: [0, 1] }, { ease: "linear" }), { target: tl, offset: ["start 75%", "end 65%"] });
    });
  });

  // Barra de avance de lectura en la cabecera.
  const bar = document.querySelector<HTMLElement>("[data-progress]");
  if (bar) scroll(animate(bar, { scaleX: [0, 1] }, { ease: "linear" }));

  // 3b) Wipe: la foto se descubre de arriba hacia abajo al entrar en pantalla.
  inView(
    document.querySelectorAll<HTMLElement>("[data-wipe]"),
    (el) => {
      animate(el, { clipPath: ["inset(0 0 100% 0 round 0.375rem)", "inset(0 0 0% 0 round 0.375rem)"] }, { duration: 1.1, ease });
    },
    { margin: "0px 0px -12% 0px" },
  );

  inView(
    document.querySelectorAll<HTMLElement>('[data-fx="up"]'),
    (el) => {
      const delay = Number((el as HTMLElement).dataset.fxDelay || 0);
      animate(el, { opacity: [0, 1], y: [32, 0] }, { duration: 0.8, ease, delay });
    },
    { margin: "0px 0px -8% 0px" },
  );

  document.querySelectorAll<HTMLElement>("[data-hero]").forEach((section) => {
    section.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
      const dy = Number(el.dataset.parallax || -60);
      scroll(animate(el, { y: [0, dy] }, { ease: "linear" }), {
        target: section,
        offset: ["start start", "end start"],
      });
    });
  });
}

try {
  init();
  if (reduce) root.classList.remove("fx-on");
} catch {
  root.classList.remove("fx-on"); // si algo falla, que el contenido quede visible
}

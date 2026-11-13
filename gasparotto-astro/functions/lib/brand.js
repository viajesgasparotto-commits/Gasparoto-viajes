// Capa de marca (white-label): todo lo que cambia entre agencias vive en variables de entorno (wrangler.jsonc → vars).
// El JS de conversión (/assets/conv.js) y los estilos (/assets/tw.css) son los mismos para todas; se tiñen con las variables CSS de abajo.
import { esc } from "./html.js";
import { BRAND } from "./seo.js";

// Subir este número cuando cambie conv.js (los /assets/* se cachean un año).
export const ASSET_V = "22";

const hex = (v, fallback) => (/^#[0-9a-f]{3,8}$/i.test(String(v || "").trim()) ? String(v).trim() : fallback);

// Colores por defecto neutros. Cada agencia define BRAND_PRIMARY / BRAND_ACCENT / BRAND_CTA.
// Los usan el sitio público (themeVars) y el panel de administración (/api/brand y /api/me).
export function brandColors(env) {
  return {
    primary: hex(env.BRAND_PRIMARY, "#003195"),
    accent: hex(env.BRAND_ACCENT, "#ee964b"),
    cta: hex(env.BRAND_CTA, "#15803d"), // verde WhatsApp oscuro: contraste AA con texto blanco
  };
}

export function themeVars(env) {
  const { primary, accent, cta } = brandColors(env);
  return `:root{--gv-primary:${primary};--gv-accent:${accent};--gv-cta:${cta}}`;
}

// Textos de confianza de la ficha de paquete. BRAND_PERKS = "texto 1|texto 2|texto 3" (opcional).
export function perks(env, L) {
  const custom = String(env.BRAND_PERKS || "").split("|").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  if (custom.length) return custom;
  return L.lang === "es"
    ? ["Atención 100% personalizada", "Reservá fácil y rápido por WhatsApp", "Te armamos el plan a tu medida"]
    : ["Atendimento 100% personalizado", "Reserve fácil e rápido pelo WhatsApp", "Montamos o roteiro sob medida"];
}

// <head>: variables de marca (las usa tw.css: --color-primary, --color-accent, --color-cta).
export const headInject = (env) =>
  `<style id="gv-theme">${themeVars(env)}</style>`;

// Banner de cookies + carga condicional de medición. Solo aparece si hay GTM_ID o META_PIXEL_ID válidos.
// Los IDs se validan con formato estricto antes de llegar al HTML.
export const CONSENT_V = "2";
const GTM_RE = /^GTM-[A-Z0-9]{4,12}$/, META_RE = /^\d{5,20}$/;
export function consentTag(env) {
  const gtm = String(env.GTM_ID || "").trim(), meta = String(env.META_PIXEL_ID || "").trim(), priv = String(env.PRIVACY_URL || "").trim();
  const g = GTM_RE.test(gtm) ? gtm : "", m = META_RE.test(meta) ? meta : "";
  if (!g && !m) return "";
  const p = /^(\/(?!\/)|https:\/\/)[^\s"'<>]*$/.test(priv) ? priv : "";
  return `<script defer src="/assets/consent.js?v=${CONSENT_V}" data-gtm="${g}" data-meta="${m}" data-privacy="${esc(p)}"></script>`;
}

// Final del <body>: configuración para conv.js (sin datos sensibles) + el script.
export function bodyInject(env, L) {
  const cfg = {
    wa: String(env.WHATSAPP_NUMBER || "").replace(/\D/g, ""),
    brand: BRAND,
    lang: L.lang,
    waPrefix: L.waTitle,
    waGeneric: L.lang === "es" ? "Hola, quiero consultar por sus experiencias" : "Olá, quero consultar sobre as experiências",
    waAria: L.waBook,
    leads: !!env.DB,
  };
  return `<script>window.__GV=${JSON.stringify(cfg).replace(/</g, "\\u003c")}</script><script defer src="/assets/conv.js?v=${ASSET_V}"></script>${consentTag(env)}`;
}

// Inyecta head + body en un HTML ya armado como texto (páginas dinámicas).
export function injectTheme(html, env, L) {
  if (html.includes('id="gv-theme"')) return html;
  return html.replace(/<\/head>/i, headInject(env) + "</head>").replace(/<\/body>/i, bodyInject(env, L) + "</body>");
}

export { esc };

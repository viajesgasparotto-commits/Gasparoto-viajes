// Prueba del banner de cookies y de la carga condicional de GTM y Meta Pixel. Sin red ni navegador.
// Uso: npm run test:analitica
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { consentTag, injectTheme } from "../functions/lib/brand.js";

const page = "<html lang=\"pt-BR\"><head></head><body></body></html>";
const L = { lang: "pt-BR", waTitle: "", waBook: "", waTitle2: "" };

// ---- Servidor: solo se inyecta con IDs válidos y sin datos inyectados ----
assert.equal(consentTag({}), "", "sin IDs no hay banner");
assert.equal(consentTag({ GTM_ID: "", META_PIXEL_ID: "" }), "", "IDs vacíos no hay banner");
assert.equal(consentTag({ GTM_ID: "GTM-x\"><script>alert(1)</script>" }), "", "GTM con formato inválido se ignora");
assert.equal(consentTag({ META_PIXEL_ID: "abc" }), "", "Pixel no numérico se ignora");
assert.ok(!injectTheme(page, {}, L).includes("consent.js"), "la página sin medición no carga el banner");

const tag = consentTag({ GTM_ID: "GTM-ABC123", META_PIXEL_ID: "1234567890123", PRIVACY_URL: "/privacidad/" });
assert.ok(tag.includes('data-gtm="GTM-ABC123"') && tag.includes('data-meta="1234567890123"'), tag);
assert.ok(tag.includes('data-privacy="/privacidad/"'));
assert.ok(consentTag({ GTM_ID: "GTM-ABC123", PRIVACY_URL: "javascript:alert(1)" }).includes('data-privacy=""'), "URL javascript: no se acepta");
assert.ok(consentTag({ GTM_ID: "GTM-ABC123", PRIVACY_URL: "https://ejemplo.com/p\"x" }).includes('data-privacy=""'), "URL con comillas no se acepta");
assert.ok(injectTheme(page, { GTM_ID: "GTM-ABC123" }, L).includes("/assets/consent.js"), "con GTM válido se carga el banner");
console.log("✓ servidor: el banner solo sale con IDs válidos y la URL de privacidad se valida");

// ---- Navegador: comportamiento del banner con un DOM simulado ----
const code = readFileSync(new URL("../public/assets/consent.js", import.meta.url), "utf8");
function el(tag) {
  const o = { tag, attrs: {}, dataset: {}, children: [], listeners: {}, innerHTML: "", textContent: "" };
  o.setAttribute = (k, v) => { o.attrs[k] = v; };
  o.getAttribute = (k) => (k in o.attrs ? o.attrs[k] : null);
  o.appendChild = (c) => { o.children.push(c); return c; };
  o.addEventListener = (t, f) => { (o.listeners[t] ||= []).push(f); };
  o.querySelector = () => null;
  o.remove = () => { o.removed = true; };
  return o;
}
function run({ dataAttrs, stored = null, lang = "pt-BR" }) {
  const store = new Map(stored ? [["gv_consent", JSON.stringify(stored)]] : []);
  const head = el("head"), body = el("body");
  const script = el("script");
  Object.entries(dataAttrs).forEach(([k, v]) => script.setAttribute(k, v));
  globalThis.window = globalThis;
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) };
  globalThis.document = {
    currentScript: script,
    documentElement: { lang },
    head, body,
    createElement: (t) => el(t),
    getElementById: (id) => body.children.find((c) => c.id === id) || null,
  };
  delete globalThis.dataLayer; delete globalThis.fbq; delete globalThis.gtag; delete globalThis.gvConsent;
  new Function(code)();
  const banner = body.children.find((c) => c.id === "gv-consent") || null;
  return { head, body, banner, store, fbq: globalThis.fbq, gtag: globalThis.gtag, dataLayer: globalThis.dataLayer };
}
const clickBtn = (banner, c) => banner.listeners.click[0]({ target: { closest: (s) => (s === "[data-c]" ? { dataset: { c } } : null) } });
const scripts = (r) => r.head.children.filter((c) => c.tag === "script").map((c) => c.src || "");
const cfg = { "data-gtm": "GTM-ABC123", "data-meta": "1234567890123", "data-privacy": "/privacidad/" };

// 1) Primera visita: aparece el banner y no se carga ningún script de terceros
let r = run({ dataAttrs: cfg });
assert.ok(r.banner, "aparece el banner");
assert.equal(scripts(r).length, 0, "antes de aceptar no se carga nada");
assert.equal(r.fbq, undefined, "sin Pixel antes de aceptar");
assert.ok(r.banner.innerHTML.includes('href="/privacidad/"'), "enlace a la política");
assert.equal(r.store.has("gv_consent"), false);

// 2) Rechazar: se guarda la decisión, no se carga nada, el banner se va
clickBtn(r.banner, "0");
assert.equal(JSON.parse(r.store.get("gv_consent")).a, 0);
assert.equal(scripts(r).length, 0, "rechazar no carga GTM");
assert.equal(globalThis.fbq, undefined, "rechazar no carga Pixel");
assert.equal(r.banner.removed, true);

// 3) Aceptar: carga GTM con consent denegado→concedido, y Pixel con PageView
r = run({ dataAttrs: cfg });
clickBtn(r.banner, "1");
assert.equal(JSON.parse(r.store.get("gv_consent")).a, 1);
const gtm = scripts(r).find((s) => s.includes("googletagmanager.com/gtm.js"));
assert.ok(gtm && gtm.includes("id=GTM-ABC123"), "carga GTM con el ID");
assert.ok(scripts(r).some((s) => s.includes("connect.facebook.net/en_US/fbevents.js")), "carga Pixel");
assert.ok(globalThis.dataLayer.some((x) => x && x[0] === "consent" && x[1] === "default" && x[2].analytics_storage === "denied"), "consentimiento por defecto denegado");
assert.ok(globalThis.dataLayer.some((x) => x && x[0] === "consent" && x[1] === "update" && x[2].analytics_storage === "granted"), "consentimiento concedido al aceptar");
assert.ok(typeof globalThis.gtag === "function", "gtag disponible para conv.js");
console.log("✓ navegador: rechazar no carga nada; aceptar carga GTM (consent mode) y Pixel");

// 4) Visita con elección guardada: sin banner; si aceptó, carga; si rechazó, no
r = run({ dataAttrs: cfg, stored: { v: 1, a: 1, ts: 1 } });
assert.equal(r.banner, null, "no vuelve a mostrar el banner");
assert.ok(scripts(r).some((s) => s.includes("gtm.js")), "con aceptación previa carga GTM");
r = run({ dataAttrs: cfg, stored: { v: 1, a: 0, ts: 1 } });
assert.equal(r.banner, null);
assert.equal(scripts(r).length, 0, "con rechazo previo no carga nada");
console.log("✓ visitas siguientes: respetan la elección guardada");

// 5) Inglés/portugués según el idioma, y sin enlace si no hay URL de privacidad
r = run({ dataAttrs: { "data-gtm": "GTM-ABC123" }, lang: "es-AR" });
assert.ok(r.banner.innerHTML.includes("Aceptar") && r.banner.innerHTML.includes("Rechazar"));
assert.ok(!r.banner.innerHTML.includes("<a "), "sin PRIVACY_URL no hay enlace");
console.log("✓ textos según idioma y sin enlace de privacidad si no está configurado");
console.log("\nTodo OK");

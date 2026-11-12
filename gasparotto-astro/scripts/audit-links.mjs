// Auditoría de enlaces internos de dist/ (para el alta de una agencia nueva o antes de publicar).
// Uso: npm run audit      (sale con código 1 si encuentra problemas)
// Informa: 1) enlaces /?p=ID del sitio anterior sin destino en lib/site.js, 2) enlaces internos a páginas que no existen.
// Los enlaces /?p=ID también se resuelven con el campo "ID viejo" de los posts del panel; eso no se puede ver sin la base.
import fs from "fs";
import path from "path";
import { SITE, legacyTarget, staticRedirect } from "../functions/lib/site.js";

const DIST = "dist";
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!["assets", "admin"].includes(e.name) || d !== DIST) walk(p); }
    else if (e.name.endsWith(".html")) files.push(p);
  }
})(DIST);

const legacy = new Map(), dead = new Map(), contacts = new Map();
const add = (m, k, f) => m.set(k, (m.get(k) || new Set()).add(f));
const DYNAMIC = /^\/(blog|paquetes|media|api|admin|assets)(\/|$)/;

for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  const page = "/" + path.relative(DIST, f).replace(/index\.html$/, "");
  // Datos de contacto escritos a mano en las páginas estáticas (hay que confirmar que son los de la agencia)
  for (const m of html.matchAll(/wa\.me\/(\d{8,15})|api\.whatsapp\.com\/send\?phone=(\d{8,15})|mailto:([^"?\s]+)|instagram\.com\/([\w.]+)/g))
    add(contacts, m[1] ? "WhatsApp " + m[1] : m[2] ? "WhatsApp " + m[2] : m[3] ? "Email " + m[3] : "Instagram @" + m[4], page);
  for (const m of html.matchAll(/<a\s[^>]*?href="([^"]+)"/g)) {
    const href = m[1];
    if (/[\\]|&quot;/.test(href) || !href.startsWith("/") || href.startsWith("//")) continue;
    const u = new URL(href, "http://x");
    if (u.pathname === "/" && u.searchParams.has("p")) {
      const id = u.searchParams.get("p");
      if (!legacyTarget(id)) add(legacy, id, page);
      continue;
    }
    if (u.pathname === "/" || DYNAMIC.test(u.pathname) || SITE.listings.some((l) => l.listing === u.pathname) || SITE.pages[u.pathname.replace(/\/?$/, "/")] || staticRedirect(u.pathname)) continue;
    const rel = u.pathname.replace(/^\/+|\/+$/g, "");
    if (rel === "" || fs.existsSync(path.join(DIST, rel, "index.html")) || fs.existsSync(path.join(DIST, rel)) ) continue;
    add(dead, u.pathname, page);
  }
}

const show = (title, m) => {
  console.log(`\n${title}: ${m.size}`);
  for (const [k, v] of [...m].sort((a, b) => b[1].size - a[1].size)) console.log(`  ${k}   (en ${v.size} página${v.size > 1 ? "s" : ""})`);
};
console.log(`Revisadas ${files.length} páginas.`);
const cfgWa = (fs.readFileSync("wrangler.jsonc", "utf8").match(/"WHATSAPP_NUMBER":\s*"(\d*)"/) || [])[1] || "";
let foreign = 0;
console.log("\nDatos de contacto fijos en las páginas estáticas (verificar que sean los de esta agencia):");
for (const [k, v] of [...contacts].sort()) {
  const bad = k.startsWith("WhatsApp ") && cfgWa && k.slice(9) !== cfgWa;
  if (bad) foreign++;
  console.log(`  ${bad ? "⚠ DISTINTO del WHATSAPP_NUMBER configurado  " : ""}${k}   (en ${v.size} página${v.size > 1 ? "s" : ""})`);
}
if (!cfgWa) console.log("  (WHATSAPP_NUMBER vacío en wrangler.jsonc: no se pudo comparar)");
show("Enlaces /?p=ID sin destino (caen en " + SITE.legacyFallback + " salvo que un post tenga ese 'ID viejo')", legacy);
show("Enlaces internos a páginas que no existen", dead);
process.exit(legacy.size || dead.size || foreign ? 1 : 0);

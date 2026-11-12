// Alta de una agencia nueva: renombra proyecto, base D1 y bucket R2, y carga los datos de contacto.
// Uso: node scripts/new-agency.mjs --slug mi-agencia --name "Mi Agencia" --url https://miagencia.com --wa 5491100000000
// Solo letras minúsculas, números y guiones en --slug. Se puede correr de nuevo para cambiar valores.
import fs from "fs";

const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : ""; };
const logo = arg("logo");
const slug = arg("slug"), name = arg("name"), url = arg("url").replace(/\/+$/, ""), wa = arg("wa").replace(/\D/g, "");
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !name || !/^https:\/\/[^\s/]+$/.test(url)) {
  console.error('Uso: node scripts/new-agency.mjs --slug mi-agencia --name "Mi Agencia" --url https://miagencia.com [--wa 5491100000000] [--logo ruta/logo.png]');
  process.exit(1);
}

const w = fs.readFileSync("wrangler.jsonc", "utf8");
const old = (w.match(/"name":\s*"([^"]+)"/) || [])[1];
const swap = (s) => s.split(`${old}-db`).join(`${slug}-db`).split(`${old}-images`).join(`${slug}-images`)
  .replace(new RegExp(`(--project-name |project create |"name": ")${old}\\b`, "g"), `$1${slug}`);

let nw = swap(w)
  .replace(/"SITE_URL":\s*"[^"]*"/, `"SITE_URL": ${JSON.stringify(url)}`)
  .replace(/"WHATSAPP_NUMBER":\s*"[^"]*"/, `"WHATSAPP_NUMBER": ${JSON.stringify(wa)}`)
  .replace(/"BRAND_NAME":\s*"[^"]*"/, `"BRAND_NAME": ${JSON.stringify(name)}`);
fs.writeFileSync("wrangler.jsonc", nw);

for (const f of ["package.json"]) fs.writeFileSync(f, swap(fs.readFileSync(f, "utf8")).replace(`"name": "${old}"`, `"name": "${slug}"`));

if (logo) {
  if (!/\.png$/i.test(logo) || !fs.existsSync(logo)) { console.error("--logo debe ser un archivo .png existente"); process.exit(1); }
  fs.copyFileSync(logo, "public/assets/logo.png");
}
console.log(`Listo: proyecto "${slug}", base "${slug}-db", bucket "${slug}-images", sitio ${url}.`);
console.log("Siguiente: editar src/data/* y src/pages/fragmentos/* (textos), completar lib/site.js y correr: npm run audit");

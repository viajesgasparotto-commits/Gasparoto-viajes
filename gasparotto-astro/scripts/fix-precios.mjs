// Corrige una vez los precios guardados sin "$" ("R 150" → "R$ 150") en paquetes y servicios: precio, precio anterior,
// precios de cada opción y precio de boletería. Desde ahora el panel los guarda bien solo (ficha.js → precio()).
// Uso (en el Codespace): node scripts/fix-precios.mjs          → muestra qué cambiaría
//                        node scripts/fix-precios.mjs --aplicar → lo guarda en la base
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { precio } from "../functions/lib/ficha.js";

const DB = "gasparotto-viajes-db";
const wr = (args) => execFileSync("npx", ["wrangler", "d1", "execute", DB, "--remote", ...args], { encoding: "utf8", maxBuffer: 64 << 20 });
const out = wr(["--json", "--command", "SELECT id, title, price, price_old, meta FROM packages"]);
const rows = JSON.parse(out.slice(out.indexOf("[")))[0].results;
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const sql = [];
for (const r of rows) {
  const set = [];
  const p = precio(r.price), po = precio(r.price_old);
  if (r.price && p !== r.price) set.push(`price=${q(p)}`);
  if (r.price_old && po !== r.price_old) set.push(`price_old=${q(po)}`);
  let m = null;
  try { m = JSON.parse(r.meta || "{}"); } catch { m = null; }
  if (m && typeof m === "object") {
    let cambio = false;
    if (Array.isArray(m.options)) m.options = m.options.map((o) => {
      if (!Array.isArray(o)) return o;
      const n = [...o]; n[1] = o[1] == null ? o[1] : precio(o[1]); n[2] = o[2] == null ? o[2] : precio(o[2]);
      if (n[1] !== o[1] || n[2] !== o[2]) cambio = true;
      return n;
    });
    if (typeof m.box === "string" && m.box && precio(m.box) !== m.box) { m.box = precio(m.box); cambio = true; }
    if (cambio) set.push(`meta=${q(JSON.stringify(m))}`);
  }
  if (set.length) {
    console.log(`#${r.id} ${r.title}: ${r.price} → ${p}${r.price_old ? ` · antes ${r.price_old} → ${po}` : ""}${set.some((x) => x.startsWith("meta")) ? " · opciones/boletería" : ""}`);
    sql.push(`UPDATE packages SET ${set.join(", ")} WHERE id=${Number(r.id)};`);
  }
}
console.log(`${sql.length} de ${rows.length} productos para corregir.`);
if (process.argv.includes("--aplicar") && sql.length) {
  const f = "/tmp/fix-precios.sql";
  fs.writeFileSync(f, sql.join("\n") + "\n");
  wr(["--file", f, "--yes"]);
  console.log("LISTO: precios corregidos.");
}

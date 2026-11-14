// Formulario de la ficha con reserva por horario: contrato entre public/assets/conv.js y el markup que arma functions/_middleware.js.
// No hay DOM en el proyecto, así que se verifica por texto: selectores, campos, textos en ES y PT, y la versión del script.
// Uso: npm run test:formulario-horario
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const conv = read("public/assets/conv.js");
const mw = read("functions/_middleware.js");
const brand = read("functions/lib/brand.js");
const reservas = read("functions/lib/api/reservas.js");

// 1) Todo lo que conv.js busca con [data-…] existe en el markup del servidor. Los botones de horario los crea el propio script.
const createdByScript = new Set(["data-time", "data-day", "data-itt", "data-itd", "data-slug", "data-bad", "data-x", "data-ok", "data-d", "data-t"]); // + la ventana para elegir fecha/horario de cada servicio (itModal) // botones de día y de horario, y los renglones y selectores del itinerario de un paquete: los crea conv.js
const queried = [...new Set([...conv.matchAll(/\[(data-[a-z-]+)/g)].map((m) => m[1]))];
for (const attr of queried) {
  if (createdByScript.has(attr)) continue;
  assert.ok(mw.includes(attr), `conv.js busca [${attr}] y el servidor no lo renderiza`);
}
console.log(`✓ ${queried.length} selectores de conv.js existen en el formulario`);

// 2) Campos y bloques del horario: el campo oculto "time", la lista de horarios, el error y la fila del resumen/confirmación.
for (const hook of ['name="time"', "data-times", "data-time-list", 'data-err="time"', "data-time-row", 'data-dv="time"', 'data-dl="time"', 'rcRow("time", TT.rc, true)']) {
  assert.ok(mw.includes(hook), `falta en el formulario: ${hook}`); // rcRow arma data-rc y data-rc-row a partir de la clave
}
assert.ok(conv.includes('q("time")') && conv.includes("slotMap"), "conv.js no lee el horario elegido");
console.log("✓ campos de horario en el formulario y en conv.js");

// 3) Textos de conv.js en ES y PT: mismas claves y mismos marcadores ({n}, {t}) en las dos lenguas.
const start = conv.indexOf("var L = G.lang");
const esAt = conv.indexOf("? {", start) + 2;
const ptAt = conv.indexOf(": { voucher", esAt);
const endAt = conv.indexOf("};", ptAt);
assert.ok(start >= 0 && esAt > 2 && ptAt > esAt && endAt > ptAt, "no encuentro el objeto de textos L");
const keysOf = (s) => new Map([...s.matchAll(/[{,]\s*([A-Za-z]\w*):\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => [m[1], m[2]]));
const ES = keysOf(conv.slice(esAt, ptAt)), PT = keysOf(conv.slice(ptAt, endAt));
const marks = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
assert.deepEqual([...ES.keys()].sort(), [...PT.keys()].sort(), "ES y PT tienen claves distintas");
for (const [k, es] of ES) assert.equal(marks(es), marks(PT.get(k)), `marcadores distintos en ${k}`);
const used = [...new Set([...conv.matchAll(/\bL\.(\w+)/g)].map((m) => m[1]))];
for (const k of used) {
  assert.ok(ES.has(k), `falta el texto ES: L.${k}`);
  assert.ok(PT.has(k), `falta el texto PT: L.${k}`);
}
for (const k of ["timeBad", "timeFull", "timeLeft", "timeLeftOne", "timeGone", "fullTimeLeft", "fullTimeNo", "dTime"]) {
  assert.ok(ES.has(k) && PT.has(k), `texto nuevo sin traducción: ${k}`);
}
console.log(`✓ ${used.length} textos de conv.js en ES y PT, con los mismos marcadores`);

// 4) Ningún texto de horario queda sin uso: los que se definen se usan.
for (const k of ["timeBad", "timeFull", "timeLeft", "timeLeftOne", "timeGone", "fullTimeLeft", "fullTimeNo", "dTime"]) {
  assert.ok(conv.includes("L." + k), `texto definido y sin uso: ${k}`);
}

// 5) Versión del script: conv.js se cachea un año, así que cada cambio sube ASSET_V.
const v = Number(brand.match(/ASSET_V = "(\d+)"/)?.[1]);
assert.ok(v >= 15, `ASSET_V debe ser al menos 15 (está en ${v}): conv.js cambió y el caché de un año lo ocultaría`);
console.log(`✓ ASSET_V = ${v}`);

// 6) La reserva manda la hora y el servidor responde con ella; /api/avail también lista los horarios llenos (para "Sin lugar").
assert.ok(/date: d\.date, time: d\.time/.test(conv), "/api/book no recibe el horario");
assert.ok(/function bookFail\(j, status, d\)/.test(conv) && /bookFail\(x\.j, x\.r\.status, d\)/.test(conv), "el error de reserva no recibe el día y horario");
assert.ok(reservas.includes('x.st !== "past"'), "/api/avail filtra los horarios llenos: deben listarse con left 0");
console.log("✓ envío del horario, error por horario agotado y listado de horarios llenos");

// 7) Panel (B4): interruptor "Reservar por horario" que viaja en el PUT de reglas, aviso sin horarios, cupos por horario, hora en reservas y voucher.
const admin = read("public/admin/admin.js");
for (const s of [
  'id="av-time"', "time_booking:$('#av-time').checked?1:0", 'id="av-time-warn"', "const hasT=(c.times||[]).length>0",
  "c.by_time?'Cupo por horario':'Cupo por día'", "oneD.slots", "${paxTxt(r)}${r.time?' · '+esc(r.time)+' h':''}",
  "\\u{1F4C5} ${fecha}${d.time?' · '+d.time+' h':''}", "(a.time||'').localeCompare(b.time||'')",
]) assert.ok(admin.includes(s), `panel: falta ${s}`);
console.log("✓ panel: interruptor, aviso, cupos por horario, hora en reservas y voucher");

for (const s of ['data-slot-ac="${s.st===\'closed\'?\'open_time\':\'close_time\'}"', "action:b.dataset.slotAc", "Notas de los horarios"]) {
  assert.ok(admin.includes(s), `panel (horario cerrado / traducciones): falta ${s}`);
}
console.log("✓ panel: cerrar y abrir un horario, y notas de horarios en la traducción");

// 8) Mensajes de WhatsApp: lo que recibe la agencia (después de codificar la URL y decodificarla) tiene saltos de línea reales, sin "\\n" literal, y con emojis.
const LES = eval("(" + conv.slice(esAt, ptAt).trim() + ")"), LPT = eval("(" + conv.slice(ptAt + 1, endAt + 1).trim() + ")");
assert.ok(!conv.includes("\\\\n"), "conv.js tiene \\\\n escrito dos veces: se vería como texto literal en WhatsApp");
for (const [lang, L] of [["es", LES], ["pt", LPT]]) {
  const bk = L.bkWa.replace("{id}", "12").replace("{pkg}", "Tigre").replace("{date}", "03/11/2026 · 09:00 h").replace("{n}", "2").replace("{name}", "Ana");
  const paid = L.paidWa.replace("{id}", "12").replace("{pkg}", "Tigre").replace("{date}", "03/11/2026 · 09:00 h").replace("{n}", "2").replace("{name}", "Ana");
  for (const msg of [bk, paid]) {
    const got = decodeURIComponent(encodeURIComponent(msg));
    assert.ok(got.includes("\n") && !got.includes("\\n"), lang + ": falta salto de línea real");
    assert.ok(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(got), lang + ": no llegan los emojis");
    assert.ok(!got.includes("\ufffd") && !/\?{2,}/.test(got), lang + ": caracteres perdidos");
  }
}
console.log("✓ mensajes de WhatsApp: saltos de línea y emojis llegan intactos (ES y PT)");

console.log("\nFormulario con horario y panel: todo OK (contrato estático; falta probar en navegador)");

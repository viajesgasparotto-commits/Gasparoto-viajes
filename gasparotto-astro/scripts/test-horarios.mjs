// Horarios de salida (informativos) de paquetes y servicios: normalización, ficha y tarjeta.
// Uso: npm run test:horarios
import assert from "node:assert/strict";
import { normTime, normMeta, timesOf, fichaHtml } from "../functions/lib/ficha.js";
import { pkgCard } from "../functions/lib/html.js";

// 1) normTime: formatos válidos → HH:MM; el resto se descarta
for (const [i, o] of [["9:30", "09:30"], ["09.30", "09:30"], ["9h30", "09:30"], ["14:30 h", "14:30"], ["9 h", "09:00"], ["23:59", "23:59"], ["0:00", "00:00"]]) assert.equal(normTime(i), o, i);
for (const i of ["", "abc", "24:00", "9:60", "9", "AM 8:30", null, undefined, "25h"]) assert.equal(normTime(i), "", String(i));
console.log("✓ normTime: formatos válidos y descarte de inválidos");

// 2) normMeta: ordena, no repite (queda la primera nota), recorta notas y limita a 24
const m = JSON.parse(normMeta({ times: [["14:30", "Tarde"], ["9:00", "<b>Mañana</b>"], ["09:00", "repetido"], ["xx", "mala"], "18h", ["10:15"]] }));
assert.deepEqual(m.times, [["09:00", "Mañana"], ["10:15", ""], ["14:30", "Tarde"], ["18:00", ""]]);
assert.equal(JSON.parse(normMeta({ times: Array.from({ length: 40 }, (_, i) => [`${String(i % 24).padStart(2, "0")}:${i < 24 ? "00" : "30"}`, ""]) })).times.length, 24);
assert.equal(JSON.parse(normMeta({ times: "no es lista" })).times.length, 0);
assert.equal(JSON.parse(normMeta("{}")).times.length, 0);
assert.equal(JSON.parse(normMeta({ times: [["9:00", "x".repeat(300)]] })).times[0][1].length, 80);
console.log("✓ normMeta: orden, duplicados, notas sin HTML, límites y entradas raras");

// 3) Los productos viejos (sin times) siguen igual
const old = { slug: "a", title: "A", meta: JSON.stringify({ facts: [["Duración", "4 horas"]] }) };
assert.deepEqual(timesOf(old), []);
assert.ok(!fichaHtml(old, [], { includes: "I", noIncludes: "N" }).top.includes("<time"));
console.log("✓ compatibilidad: paquetes sin horarios no cambian");

// 4) Ficha: aparece el bloque con etiqueta por idioma y escapa la nota
const p = { slug: "t", title: "Tigre", price: "100", excerpt: "", meta: normMeta({ times: [["09:00", "Salida <script>x</script>"], ["14:30", ""]] }) };
let h = fichaHtml(p, [], { times: "Horarios de salida" }).top;
assert.ok(h.includes("Horarios de salida") && h.includes('datetime="09:00"') && h.includes('datetime="14:30"'));
assert.ok(!h.includes("<script") && h.includes("Salida x"), "al guardar se quitan las etiquetas");
const crudo = { ...p, meta: JSON.stringify({ times: [["09:00", "<img src=x onerror=1>"]] }) }; // dato que no pasó por normMeta
assert.ok(!fichaHtml(crudo, [], {}).top.includes("<img") && fichaHtml(crudo, [], {}).top.includes("&lt;img"), "al mostrar se escapa");
h = fichaHtml(p, [], { times: "Horários de saída" }).top; assert.ok(h.includes("Horários de saída"));
assert.ok(fichaHtml(p, [], {}).top.includes("Horarios de salida"), "etiqueta por defecto");
console.log("✓ ficha: bloque de horarios, idiomas, escape de HTML");

// 5) Tarjeta: muestra hasta 3 horarios y marca que hay más
const L = { lang: "es", featured: "Destacado", timesShort: "Horarios" };
let c = pkgCard({ ...p, meta: normMeta({ times: [["09:00"], ["11:00"], ["14:30"]] }) }, "#", L);
assert.ok(c.includes("09:00 · 11:00 · 14:30") && !c.includes("…"));
c = pkgCard({ ...p, meta: normMeta({ times: [["09:00"], ["11:00"], ["14:30"], ["18:00"]] }) }, "#", L);
assert.ok(c.includes("09:00 · 11:00 · 14:30 …") && !c.includes("18:00"));
c = pkgCard({ ...p, meta: normMeta({}) }, "#", L); assert.ok(!c.includes("Horarios"));
console.log("✓ tarjeta: hasta 3 horarios + «…», y nada si no hay");
console.log("\nHorarios: todo OK");

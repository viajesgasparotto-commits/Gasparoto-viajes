// Voucher de reserva pagada: página HTML imprimible (se guarda como PDF desde el navegador).
// Nunca muestra el token ni datos internos. Solo se usa con reservas en estado "pagada".
import { esc } from "./html.js";
import { BRAND, LOGO, siteUrl } from "./seo.js";
import { langOf } from "./render.js";

const T = {
  es: { loc: "es-AR", title: "Voucher de reserva", status: "Pagada · confirmada", exp: "Experiencia", date: "Fecha de la salida", pax: "Personas", adults: "adultos", kids: "niños", adult1: "adulto", kid1: "niño", holder: "Titular", total: "Total pagado", paid: "Fecha de pago", booking: "Reserva", note: "Presentá este voucher el día de la salida, en pantalla o impreso. Ante cualquier cambio, escribinos por WhatsApp.", wa: "Escribir por WhatsApp", foot: "Comprobante generado automáticamente. Conservalo hasta completar la experiencia.", na: "A confirmar", itin: "Itinerario", start: "Inicio del paquete" },
  "pt-BR": { loc: "pt-BR", title: "Voucher de reserva", status: "Paga · confirmada", exp: "Experiência", date: "Data da saída", pax: "Pessoas", adults: "adultos", kids: "crianças", adult1: "adulto", kid1: "criança", holder: "Titular", total: "Total pago", paid: "Data do pagamento", booking: "Reserva", note: "Apresente este voucher no dia da saída, na tela ou impresso. Para qualquer alteração, fale conosco pelo WhatsApp.", wa: "Falar no WhatsApp", foot: "Comprovante gerado automaticamente. Guarde-o até concluir a experiência.", na: "A confirmar", itin: "Roteiro", start: "Início do pacote" },
};

const money = (cents, cur, L) => {
  if (!cents) return L.na;
  try { return new Intl.NumberFormat(L.loc, { style: "currency", currency: cur || "BRL" }).format(Number(cents) / 100); }
  catch { return `${(Number(cents) / 100).toFixed(2)} ${cur || ""}`; }
};
const longDate = (day, L) => {
  const d = new Date(String(day) + "T00:00:00Z");
  return isNaN(d) ? String(day) : d.toLocaleDateString(L.loc, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};
const stamp = (s, L) => {
  const t = Date.parse(String(s || "").replace(" ", "T") + "Z");
  return t ? new Date(t).toLocaleString(L.loc, { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }) : "";
};

const shortDate = (day, L) => {
  const d = new Date(String(day) + "T00:00:00Z");
  return isNaN(d) ? String(day) : d.toLocaleDateString(L.loc, { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
};
// row: fila de bookings + package_title (+ itin: [{ title, option, day, time }] si es un paquete que combina servicios). Devuelve el HTML completo del voucher.
export function voucherPage(env, row) {
  const L = T[langOf(env)] || T.es;
  const digits = String(env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const wa = digits ? `https://wa.me/${digits}` : "";
  const people = Number(row.children) > 0
    ? `${row.adults} ${Number(row.adults) === 1 ? L.adult1 : L.adults} · ${row.children} ${Number(row.children) === 1 ? L.kid1 : L.kids}`
    : `${row.pax} ${langOf(env) === "pt-BR" ? (row.pax === 1 ? "pessoa" : "pessoas") : (row.pax === 1 ? "persona" : "personas")}`;
  const host = siteUrl(env).replace(/^https?:\/\//, "");
  const itin = Array.isArray(row.itin) ? row.itin : [];
  const cell = (k, v) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
  return `<!doctype html><html lang="${esc(langOf(env))}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(L.booking)} #${esc(row.id)} · ${esc(BRAND)}</title>
<style>
:root{--ink:#1c2333;--mute:#6b7390;--line:#e6e9f2;--brand:#003195;--ok:#0f6b3a}
*{box-sizing:border-box}body{margin:0;background:#f3f5fa;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.v{max-width:720px;margin:28px auto;background:#fff;border-radius:16px;box-shadow:0 10px 40px #1c23281a;overflow:hidden}
.vh{display:flex;align-items:center;gap:14px;padding:22px 28px;background:var(--brand);color:#fff}
.vh img{height:44px;width:auto;max-width:72px;background:#fff;border-radius:8px;padding:4px;object-fit:contain}
.vh b{display:block;font-size:16px}.vh span{font-size:13px;opacity:.85}
.st{margin-left:auto;background:#fff;color:var(--ok);font-weight:700;font-size:12.5px;padding:6px 12px;border-radius:999px}
.body{padding:26px 28px 8px}
.kicker{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);font-weight:700;margin:0}
h1{font-size:24px;line-height:1.2;margin:6px 0 20px;letter-spacing:-.01em}
dl{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin:0}
dl div{padding:12px 0;border-top:1px solid var(--line)}
dt{font-size:12px;color:var(--mute);font-weight:600;margin-bottom:2px}
dd{margin:0;font-size:15px;font-weight:600}
.total{margin:18px 0 0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-radius:12px;background:#f5f8ff;border:1px solid #dbe5fb}
.total span{font-size:13px;color:var(--mute);font-weight:600}.total b{font-size:22px;color:var(--brand);font-variant-numeric:tabular-nums}
.it{margin:18px 0 0}.it h2{margin:0 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
.it ol{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}.it li{display:grid;grid-template-columns:150px 1fr;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.it li span{color:var(--mute);font-size:13.5px}.it li span::first-letter{text-transform:uppercase}.it li b{font-weight:600}
@media(max-width:560px){.it li{grid-template-columns:1fr;gap:2px}}
.note{margin:18px 0 0;font-size:13.5px;color:#4b5570}
.wa{display:inline-block;margin-top:14px;color:var(--brand);font-weight:600;text-decoration:none}
footer{padding:16px 28px 22px;font-size:12px;color:var(--mute);border-top:1px solid var(--line);margin-top:20px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
@media(max-width:560px){dl{grid-template-columns:1fr}.body{padding:20px 18px 6px}.vh{padding:18px}.st{display:none}}
@page{size:A4;margin:14mm}
@media print{body{background:#fff}.v{margin:0;box-shadow:none;border-radius:0;max-width:none}.wa{color:var(--ink)}}
</style></head><body><main class="v">
<header class="vh"><img src="${esc(LOGO)}" alt=""><div><b>${esc(BRAND)}</b><span>${esc(L.title)}</span></div><span class="st">${esc(L.status)}</span></header>
<div class="body">
<p class="kicker">${esc(L.booking)} #${esc(row.id)}</p>
<h1>${esc(row.package_title || L.booking)}${row.option_name ? ` · ${esc(row.option_name)}` : ""}</h1>
<dl>
${cell(itin.length ? L.start : L.date, esc(longDate(row.day, L) + (row.time ? " · " + row.time + " h" : "")))}
${cell(L.pax, esc(people))}
${cell(L.holder, esc(row.name || "—"))}
${cell(L.paid, esc(stamp(row.paid_at, L) || "—"))}
</dl>
${itin.length ? `<section class="it"><h2>${esc(L.itin)}</h2><ol>${itin.map((x) => `<li><span>${esc(shortDate(x.day, L))}${x.time ? ` · ${esc(x.time)} h` : ""}</span><b>${esc(x.title)}${x.option ? ` · ${esc(x.option)}` : ""}</b></li>`).join("")}</ol></section>` : ""}
<section class="total"><span>${esc(L.total)}</span><b>${esc(money(row.total, row.currency, L))}</b></section>
<p class="note">${esc(L.note)}</p>
${wa ? `<a class="wa" href="${esc(wa)}">${esc(L.wa)} →</a>` : ""}
</div>
<footer><span>${esc(BRAND)} · ${esc(host)}</span><span>${esc(L.foot)}</span></footer>
</main></body></html>`;
}

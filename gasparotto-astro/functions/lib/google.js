// Reseñas y fotos de Google. Única fuente: Places API (New) con GOOGLE_PLACES_API_KEY (secret) y GOOGLE_PLACE_ID (wrangler.jsonc).
// Se consulta a Google como mucho una vez por día (caché en la tabla settings). Si falla, se siguen mostrando los
// últimos datos buenos; si nunca hubo datos, el bloque muestra solo los botones "Ver avaliações" y "Deixar uma avaliação".
// Ya no hay carga manual de calificación ni de comentarios. La clave nunca sale al navegador: las fotos pasan por /google-foto/<n>.
import { esc } from "./html.js";
import { BRAND } from "./seo.js";

const KEY_PLACES = "google_places", PLACES_TTL = 24 * 3600e3, RETRY_WAIT = 15 * 60e3;
// Formato del caché. Si lo guardó una versión anterior (sin comentarios ni fotos), se vuelve a pedir a Google en vez de esperar 24 h.
const CACHE_V = 2;
const FIELDS = "displayName,rating,userRatingCount,reviews,photos,googleMapsUri";
const MAX_PHOTOS = 10; // Google devuelve hasta 10 fotos y hasta 5 reseñas por ficha
const PHOTO_W = 1200;
const MIN_COUNT = 5; // por debajo de este número de opiniones no se muestra la calificación (quedan los botones y el mapa)

const MESES = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  pt: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
};
const GT = {
  es: { all: "Ver todas en Google", some: "Ver opiniones en Google", write: "Dejar una reseña", head: "Opiniones en Google", of: (c, b) => `${c} opiniones sobre ${b}`, prev: "Comentarios anteriores", next: "Comentarios siguientes", list: "Comentarios de clientes en Google", more: "Leer más", src: "Reseña publicada en Google", open: "Ver reseña en Google", map: (b) => `Mapa de ${b} en Google Maps`, stars: (n) => `${n} de 5 estrellas`, loc: "es-AR", photos: "Fotos en Google", kick: "Opiniones en Google", title: "Quienes viajaron con nosotros, nos recomiendan", by: (a) => `Foto de ${a} en Google`, alt: (b) => `Foto de ${b} publicada en Google` },
  pt: { all: "Ver todas no Google", some: "Ver avaliações no Google", write: "Deixar uma avaliação", head: "Avaliações no Google", of: (c, b) => `${c} avaliações sobre ${b}`, prev: "Comentários anteriores", next: "Próximos comentários", list: "Comentários de clientes no Google", more: "Ler mais", src: "Avaliação publicada no Google", open: "Ver avaliação no Google", map: (b) => `Mapa da ${b} no Google Maps`, stars: (n) => `${n} de 5 estrelas`, loc: "pt-BR", photos: "Fotos no Google", kick: "Avaliações no Google", title: "Quem viajou com a gente, recomenda", by: (a) => `Foto de ${a} no Google`, alt: (b) => `Foto de ${b} publicada no Google` },
};
const gl = (env) => (/^es/i.test(String((env && env.SITE_LANG) || "es")) ? "es" : "pt");
const mesAnio = (w, l = "es") => (w ? `${MESES[l][Number(w.slice(5, 7)) - 1]} de ${w.slice(0, 4)}` : "");
const AVATARS = ["#0066a9", "#0f5b63", "#7a3b8f", "#b4531a", "#2f6b2f", "#8a2f4a", "#35506b"];
const avatarColor = (n) => AVATARS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATARS.length];
const starsHtml = (n, G = GT.es) => `<span class="gvr-stars" role="img" aria-label="${G.stars(n)}">${"★".repeat(n)}<i>${"★".repeat(5 - n)}</i></span>`;


// ---------- Places API (New) ----------
async function fetchPlace(env) {
  const key = String(env.GOOGLE_PLACES_API_KEY).trim(), pid = String(env.GOOGLE_PLACE_ID).trim();
  const lang = gl(env) === "es" ? "es" : "pt-BR";
  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(pid)}?languageCode=${lang}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
  });
  if (!r.ok) {
    const e = await r.json().catch(() => null);
    return { error: String(e?.error?.message || `HTTP ${r.status}`).slice(0, 300), tried: Date.now() };
  }
  let d = await r.json(), retried = false;
  // Si Google manda la nota pero ni comentarios ni fotos, se vuelve a pedir sin idioma (es lo único que cambia respecto de una
  // consulta común) y se usa la respuesta que traiga más datos. diag queda guardado para que el panel muestre qué devolvió Google.
  const has = (x) => (x?.reviews?.length || 0) + (x?.photos?.length || 0);
  if (!has(d) && (d.userRatingCount || 0) > 0) {
    retried = true;
    const r2 = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(pid)}`, { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS } }).catch(() => null);
    const d2 = r2 && r2.ok ? await r2.json().catch(() => null) : null;
    if (d2 && has(d2) > has(d)) d = d2;
  }
  const diag = { fields: Object.keys(d || {}).slice(0, 12), reviews: d.reviews?.length || 0, photos: d.photos?.length || 0, retried, place: String(d.displayName?.text || "").slice(0, 80) };
  const now = Date.now();
  return {
    v: CACHE_V, fetched: now, tried: now, diag,
    rating: Number(d.rating) || 0,
    count: Number(d.userRatingCount) || 0,
    reviews: (d.reviews || []).slice(0, 5).map((q) => ({
      name: String(q.authorAttribution?.displayName || "").slice(0, 60),
      stars: Number(q.rating) || 5,
      text: String(q.text?.text || q.originalText?.text || "").slice(0, 2000),
      publish: String(q.publishTime || ""),
      link: String(q.googleMapsUri || ""),
      photo: /^https:\/\//.test(String(q.authorAttribution?.photoUri || "")) ? String(q.authorAttribution.photoUri).slice(0, 300) : "",
    })),
    photos: await Promise.all((d.photos || []).filter((p) => /^places\/[^/]+\/photos\/[^/]+$/.test(String(p.name || ""))).slice(0, MAX_PHOTOS).map(async (p) => ({
      name: String(p.name),
      author: String(p.authorAttributions?.[0]?.displayName || "").slice(0, 60),
      authorUri: /^https:\/\//.test(String(p.authorAttributions?.[0]?.uri || "")) ? String(p.authorAttributions[0].uri).slice(0, 300) : "",
      w: Number(p.widthPx) || 0, h: Number(p.heightPx) || 0,
      uri: await photoUri(key, p.name),
    }))),
  };
}

// Dirección pública de la imagen (googleusercontent). Se pide una vez por día al refrescar la ficha, así cada visita
// no cuenta como una consulta paga de foto. Si falla, el proxy pide la foto con la clave.
async function photoUri(key, name) {
  try {
    const r = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=${PHOTO_W}&skipHttpRedirect=true`, { headers: { "X-Goog-Api-Key": key } });
    if (!r.ok) return "";
    const u = String((await r.json())?.photoUri || "");
    return /^https:\/\/[\w.-]+\.googleusercontent\.com\//.test(u) ? u.slice(0, 1000) : "";
  } catch { return ""; }
}

// Pista en español para el error más común de Google, para que el panel diga qué arreglar.
const placesHint = (m = "") => {
  const s = String(m).toLowerCase();
  if (!s) return "";
  if (s.includes("referer") || s.includes("referrer")) return "La clave tiene restricción de sitio web (referrer). Cambiala a «Ninguna» o restringila solo por API: el servidor no envía referrer, así que Google la rechaza.";
  if (s.includes("api key not valid") || s.includes("api_key_invalid") || s.includes("api key invalid")) return "La clave no es válida. Revisá el secreto GOOGLE_PLACES_API_KEY (sin espacios ni saltos de línea).";
  if (s.includes("billing")) return "El proyecto de Google Cloud necesita facturación activa.";
  if (s.includes("has not been used") || s.includes("disabled") || s.includes("not enabled") || s.includes("service_disabled")) return "Places API (New) no está habilitada en el proyecto de Google Cloud de esta clave.";
  if (s.includes("not found")) return "El Place ID no existe. Revisá GOOGLE_PLACE_ID.";
  return "Google devolvió un error. Revisá el mensaje y la configuración de la clave.";
};

// Datos de Google cacheados. Devuelve null si no hay clave o no hay datos aún.
// force = true ignora el caché y los tiempos de espera (botón "Probar conexión" del panel).
export async function placesData(env, force = false) {
  if (!env.DB || !String(env.GOOGLE_PLACES_API_KEY || "").trim() || !String(env.GOOGLE_PLACE_ID || "").trim()) return null;
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(KEY_PLACES).first().catch(() => null);
  let c = null;
  try { c = JSON.parse(row?.value || "null"); } catch { c = null; }
  const now = Date.now();
  if (!force) {
    const fresh = c?.fetched && now - c.fetched < PLACES_TTL && c.v === CACHE_V;
    if (fresh) return c;
    if (now - (c?.tried || 0) < RETRY_WAIT) return c?.fetched ? c : null; // no reintentar en cada visita si Google falla
  }
  let fresh;
  try { fresh = await fetchPlace(env); } catch (e) { fresh = { error: "No se pudo conectar con Google: " + String(e?.message || e).slice(0, 200), tried: now }; }
  if (fresh.error) {
    console.error("Google Places:", fresh.error);
    await savePlaces(env, { ...(c || {}), tried: now, error: fresh.error, errorAt: now });
    return c?.fetched ? c : null; // si había datos buenos, se siguen mostrando
  }
  await savePlaces(env, fresh);
  return fresh;
}
async function savePlaces(env, value) {
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(KEY_PLACES, JSON.stringify(value)).run().catch(() => {});
}

// Estado de la conexión para el panel (no llama a Google: solo lee el último resultado guardado).
export async function placesStatus(env) {
  const configured = !!String(env.GOOGLE_PLACES_API_KEY || "").trim() && !!String(env.GOOGLE_PLACE_ID || "").trim();
  const row = env.DB ? await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(KEY_PLACES).first().catch(() => null) : null;
  let c = null;
  try { c = JSON.parse(row?.value || "null"); } catch { c = null; }
  return {
    configured,
    connected: !!c?.fetched && !c?.error,
    lastOk: Number(c?.fetched) || 0,
    error: String(c?.error || ""),
    errorAt: Number(c?.errorAt) || 0,
    hint: c?.error ? placesHint(c.error) : "",
    rating: Number(c?.rating) || 0,
    count: Number(c?.count) || 0,
    reviews: (c?.reviews || []).length,
    photos: (c?.photos || []).length,
    old: !!c?.fetched && c.v !== CACHE_V, // datos guardados por una versión anterior: se renuevan en la próxima visita
    diag: c?.diag || null, // qué campos devolvió Google en la última consulta correcta (para el panel)
  };
}

// Proxy de foto: la clave se usa aquí, en el servidor. /google-foto/<n> = foto n del caché.
export async function googlePhoto(env, idx) {
  const key = String(env.GOOGLE_PLACES_API_KEY || "").trim();
  const api = await placesData(env);
  const p = api?.photos?.[Number(idx)];
  if (!key || !p) return new Response("", { status: 404 });
  let r = p.uri ? await fetch(p.uri).catch(() => null) : null;
  if (!r || !r.ok) r = await fetch(`https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=${PHOTO_W}`, { headers: { "X-Goog-Api-Key": key } }).catch(() => null);
  if (!r || !r.ok) return new Response("", { status: 404 });
  return new Response(r.body, { headers: { "content-type": r.headers.get("content-type") || "image/jpeg", "cache-control": "public, max-age=86400" } });
}

const apiQuote = (q) => {
  const when = /^\d{4}-\d{2}/.test(q.publish) ? q.publish.slice(0, 7) : "";
  const link = /^https:\/\//.test(q.link || "") ? q.link : "";
  return { name: q.name || "Google", stars: Math.min(5, Math.max(1, Math.round(q.stars) || 5)), text: q.text, when, link, photo: q.photo || "" };
};
const photosHtml = (G, photos) => `<div class="gvr-fotos"><h3>${esc(G.photos)}</h3><ul>${photos.map((p, i) => `<li><figure><img src="/google-foto/${i}" alt="${esc(G.alt(BRAND))}" loading="lazy" decoding="async"${p.w && p.h ? ` width="${p.w}" height="${p.h}"` : ""}>${p.author ? `<figcaption>${p.authorUri ? `<a href="${esc(p.authorUri)}" target="_blank" rel="noopener">${esc(G.by(p.author))}</a>` : esc(G.by(p.author))}</figcaption>` : ""}</figure></li>`).join("")}</ul></div>`;

// Bloque de reseñas para portada y contacto. Estilos en /assets/google.css (colores y formas de la marca).
//   variant "reviews" (portada): calificación + comentarios + fotos, sin mapa.
//   variant "map" (contacto): calificación + mapa de la ficha.
export async function googleBlock(env, variant = "reviews") {
  const lg = gl(env), G = GT[lg];
  const pid = String(env.GOOGLE_PLACE_ID || "").trim();
  const api = await placesData(env);
  const rating = api?.rating ? String(api.rating) : "";
  const count = api?.count || 0;
  const quotes = variant === "map" ? [] : (api?.reviews || []).filter((q) => q.text).map(apiQuote);
  const photos = variant === "reviews" && api?.photos?.length ? photosHtml(G, api.photos) : "";
  const r = Number(rating);
  const show = !!pid && r >= 1 && r <= 5 && count >= MIN_COUNT;
  const reviewsUrl = `https://search.google.com/local/reviews?placeid=${encodeURIComponent(pid)}`;
  const writeUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(pid)}`;
  const mapSrc = pid
    ? `https://www.google.com/maps?q=place_id:${encodeURIComponent(pid)}&output=embed`
    : "https://www.google.com/maps?q=Florida+537,+Buenos+Aires&output=embed";
  const btn = (href, label, cls) => `<a href="${esc(href)}" target="_blank" rel="noopener" class="tw-btn tw-btn--sm ${cls}"><span>${esc(label)}</span></a>`;
  const actions = pid ? `<div class="gvr-act">${btn(reviewsUrl, show ? G.all : G.some, "tw-btn--line")}${btn(writeUrl, G.write, "tw-btn--primary")}</div>` : "";
  const head = show
    ? `<div class="gvr-head"><div class="gvr-score"><b>${esc(r.toFixed(1).replace(".", ","))}</b>${starsHtml(Math.round(r), G)}</div><div class="gvr-sum"><strong>${G.head}</strong><span>${esc(G.of(count.toLocaleString(G.loc), BRAND))}</span></div>${actions}</div>`
    : actions ? `<div class="gvr-head gvr-head--lite">${actions}</div>` : "";
  const cards = quotes.length
    ? `<div class="gvr-wrap" data-gvr><button type="button" class="gvr-nav gvr-prev" aria-label="${G.prev}" hidden><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><ul class="gvr-list" tabindex="0" aria-label="${G.list}">${quotes.map((q) => `<li class="gvr-card"><div class="gvr-who"><span class="gvr-av" style="background:${avatarColor(q.name)}" aria-hidden="true">${esc([...q.name][0].toUpperCase())}${q.photo ? `<img src="${esc(q.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</span><div><b>${esc(q.name)}</b>${q.when ? `<small>${esc(mesAnio(q.when, lg))}</small>` : ""}</div></div>${starsHtml(q.stars, G)}<p class="gvr-txt">${esc(q.text)}</p><button type="button" class="gvr-more" hidden>${G.more}</button>${q.link ? `<a class="gvr-src" href="${esc(q.link)}" target="_blank" rel="noopener">${G.open} ↗</a>` : `<span class="gvr-src">${G.src}</span>`}</li>`).join("")}</ul><button type="button" class="gvr-nav gvr-next" aria-label="${G.next}" hidden><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div>`
    : "";
  const map = variant === "map"
    ? `<div class="gvr-map"><iframe title="${esc(G.map(BRAND))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${esc(mapSrc)}"></iframe></div>`
    : "";
  if (!head && !cards && !map) return "";
  return `<div class="gvr"><link rel="stylesheet" href="/assets/google.css?v=5">${head}${cards}${photos}${map}${cards ? '<script src="/assets/google.js?v=2" defer></script>' : ""}</div>`;
}

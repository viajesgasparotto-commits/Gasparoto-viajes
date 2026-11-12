// Caché de lecturas para no ir a D1 en cada visita.
//  1) memoize(): guarda en memoria del servidor (por instancia) el resultado de una consulta unos segundos.
//  2) edgeGet/edgePut: guarda el HTML ya armado de las páginas públicas en el caché de Cloudflare (por datacenter) EDGE_TTL segundos.
// Las visitas se siguen contando (recordView corre igual con el caché) y el panel limpia lo suyo al guardar (purge()).
export const EDGE_TTL = 60;
// Solo páginas de contenido (índice y notas del blog, paquetes, listados). La portada no entra: lleva cookie de A/B por visitante.
export const EDGE_RE = /^\/(?:blog|paquetes|servicios)\/(?:[^./]+\/)*$/;

const memo = new Map();
export async function memoize(key, ttlMs, fn, keep = (v) => v != null) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.v;
  const v = await fn();
  if (keep(v)) memo.set(key, { at: Date.now(), v }); // un resultado vacío (por ejemplo, la base caída) no se guarda
  return v;
}
export const clearMemo = () => memo.clear();

const store = () => (typeof caches !== "undefined" && caches.default) || null;
const keyOf = (origin, path) => new Request(origin + path, { method: "GET" });

export async function edgeGet(url) {
  try { return (await store()?.match(keyOf(url.origin, url.pathname))) || null; } catch { return null; }
}
export async function edgePut(url, res) {
  const c = store();
  if (!c || res.status !== 200 || res.headers.has("set-cookie") || !/text\/html/i.test(res.headers.get("content-type") || "")) return;
  const h = new Headers(res.headers);
  h.set("cache-control", `public, max-age=${EDGE_TTL}`);
  try { await c.put(keyOf(url.origin, url.pathname), new Response(res.clone().body, { status: 200, headers: h })); } catch { /* el caché es opcional */ }
}
// Tras guardar algo en el panel: limpia las lecturas en memoria y, en este datacenter, las páginas indicadas.
export async function purge(origin, paths = []) {
  clearMemo();
  const c = store();
  if (c) await Promise.all(paths.map((p) => c.delete(keyOf(origin, p)).catch(() => {})));
}

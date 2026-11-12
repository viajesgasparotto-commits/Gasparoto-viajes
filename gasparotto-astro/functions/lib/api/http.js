// Utilidades de respuesta y de texto compartidas por todas las rutas de /api.



export const json = (d, s = 200, h = {}) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", ...h } });

// Origin inválido (ej. "null") se trata como origen ajeno en vez de provocar un error 500.
export const sameOrigin = (origin, url) => { try { return new URL(origin).host === url.host; } catch { return false; } };
export const cleanTxt = (v, n) => String(v ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
// Días de una ventana de consulta del panel: entre 1 y 365 (por defecto 30).
export const clampDays = (v, def = 30) => Math.min(365, Math.max(1, parseInt(v, 10) || def));

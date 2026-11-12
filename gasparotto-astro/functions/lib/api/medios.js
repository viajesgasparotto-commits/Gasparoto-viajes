// Subida de imágenes y videos al almacenamiento (R2).

import { json } from "./http.js";

export const IMG_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
const MAX_UPLOAD = 8 * 1024 * 1024;
const VID_TYPES = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const MAX_VIDEO = 50 * 1024 * 1024;
// Tipo real de un video según sus primeros bytes (MP4/MOV llevan "ftyp" en el byte 4; WebM empieza con 1A 45 DF A3).
function sniffVideo(buf) {
  const b = new Uint8Array(buf.slice(0, 16)), at = (s, o = 0) => [...s].every((c, i) => b[o + i] === c.charCodeAt(0));
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  if (at("ftyp", 4) && !at("avif", 8) && !at("avis", 8) && !at("heic", 8) && !at("heix", 8) && !at("mif1", 8)) return at("qt  ", 8) ? "video/quicktime" : "video/mp4";
  return null;
}
// Tipo real de una imagen según sus primeros bytes (null si no es ninguno de los permitidos).
export function sniffImage(buf) {
  const b = new Uint8Array(buf.slice(0, 16)), at = (s, o = 0) => [...s].every((c, i) => b[o + i] === c.charCodeAt(0));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && at("PNG\r\n", 1) && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (at("GIF87a") || at("GIF89a")) return "image/gif";
  if (at("RIFF") && at("WEBP", 8)) return "image/webp";
  if (at("ftyp", 4) && (at("avif", 8) || at("avis", 8))) return "image/avif";
  return null;
}

// POST /api/upload: imágenes y videos a R2, validando el contenido real del archivo.
export async function manejarMedios({ request, env, res, method }) {
  // Subida de imágenes a R2 (solo formatos seguros; sin SVG)
  if (res === "upload" && method === "POST") {
    if (!env.IMAGES) return json({ error: "R2 no está conectado (binding IMAGES). Pegá una URL de imagen." }, 500);
    const type = (request.headers.get("content-type") || "").split(";")[0].trim();
    if (Object.hasOwn(VID_TYPES, type)) {
      const vlen = Number(request.headers.get("content-length") || 0);
      if (!vlen || vlen > MAX_VIDEO) return json({ error: "El video debe pesar menos de 50 MB. Comprimilo (por ejemplo con HandBrake o CapCut, 1080p) y volvé a subirlo." }, 413);
      const vbuf = await request.arrayBuffer();
      if (vbuf.byteLength > MAX_VIDEO) return json({ error: "El video debe pesar menos de 50 MB." }, 413);
      const real = sniffVideo(vbuf);
      if (real !== type) return json({ error: "El archivo no es un video válido del formato indicado." }, 415);
      const vkey = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${VID_TYPES[type]}`;
      await env.IMAGES.put(vkey, vbuf, { httpMetadata: { contentType: type } });
      return json({ url: `/media/${vkey}` });
    }
    const ext = Object.hasOwn(IMG_TYPES, type) ? IMG_TYPES[type] : undefined;
    if (!ext) return json({ error: "Formato no permitido. Imágenes: JPG, PNG, WEBP, GIF o AVIF. Videos: MP4, WebM o MOV." }, 415);
    const len = Number(request.headers.get("content-length") || 0);
    if (!len || len > MAX_UPLOAD) return json({ error: "La imagen debe pesar menos de 8 MB." }, 413);
    const key = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const buf = await request.arrayBuffer();
    if (buf.byteLength > MAX_UPLOAD) return json({ error: "La imagen debe pesar menos de 8 MB." }, 413);
    if (sniffImage(buf) !== type) return json({ error: "El archivo no es una imagen válida del formato indicado." }, 415); // no alcanza con lo que dice el navegador: se mira el contenido
    await env.IMAGES.put(key, buf, { httpMetadata: { contentType: type } });
    return json({ url: `/media/${key}` });
  }
  return null;
}

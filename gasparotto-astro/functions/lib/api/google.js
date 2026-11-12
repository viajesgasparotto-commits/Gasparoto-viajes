// Panel: estado de la conexión con Google Places (GET /api/google-reviews) y "Probar conexión" (PUT {refresh:true}).
// La calificación, los comentarios y las fotos salen solo de la API: ya no se cargan a mano.
import { placesData, placesStatus } from "../google.js";
import { json } from "./http.js";

export async function manejarGoogle({ request, env, res, method }) {
  if (res !== "google-reviews") return null;
  if (method === "GET") return json({ places: await placesStatus(env) });
  if (method === "PUT") {
    const b = await request.json().catch(() => ({}));
    if (b.refresh !== true) return json({ error: "Las reseñas se toman de Google automáticamente; no se cargan a mano." }, 400);
    // Probar conexión: consulta a Google ya (sin esperar el tiempo de reintento) y devuelve el resultado.
    await placesData(env, true);
    return json({ ok: true, places: await placesStatus(env) });
  }
  return json({ error: "Método no permitido" }, 405);
}

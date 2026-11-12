// Aviso programado del asistente IA: cada 5 minutos le pide a la web que envíe los seguimientos pendientes.
// Se publica aparte de la web: cd cron && npx wrangler deploy  ·  clave: npx wrangler secret put IA_CRON_KEY (la misma que en la web).
export default {
  async scheduled(_ev, env, ctx) {
    ctx.waitUntil(fetch(env.TARGET, { method: "POST", headers: { "x-cron-key": env.IA_CRON_KEY, "content-type": "application/json" }, body: "{}" })
      .then(async (r) => console.log("seguimiento", r.status, (await r.text()).slice(0, 300)))
      .catch((e) => console.error("seguimiento", e?.message)));
  },
  async fetch() { return new Response("gasparotto-ia-cron: ok"); },
};

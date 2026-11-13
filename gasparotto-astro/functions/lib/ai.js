// Proveedor de IA intercambiable: Gemini (gratis, para pruebas) o Claude (producción).
// Se elige con la variable IA_PROVEEDOR = "gemini" | "claude". Si no está, se usa el que tenga clave (Claude primero).
//   Gemini: GEMINI_API_KEY  (opcional GEMINI_MODEL, por defecto gemini-3.5-flash)
//   Claude: ANTHROPIC_API_KEY (opcional CLAUDE_MODEL, por defecto claude-sonnet-5-5)
// El resto del sitio solo llama a askAI(): cambiar de proveedor no toca ningún otro archivo.
// Respaldo: si el proveedor elegido falla (o no tiene clave) y el otro tiene clave, responde el otro. El cliente nunca queda sin respuesta.
// Caché: el system puede traer CORTE_CACHE. Lo de antes (reglas, catálogo) es igual en todas las charlas y Claude lo cobra 20 veces más barato
// cuando se repite; lo de después (datos de esta charla) va aparte. Gemini lo recibe todo junto.

export const DEFAULT_MODELS = { gemini: "gemini-3.5-flash", claude: "claude-sonnet-5-5" };
export const CORTE_CACHE = "\n\n<<<FIN_PARTE_FIJA>>>\n\n";
const TIMEOUT_MS = 15000; // por intento: Cloudflare da ~30 s para terminar después de responderle a Meta

export function aiConfig(env = {}) {
  const has = { gemini: !!String(env.GEMINI_API_KEY || "").trim(), claude: !!String(env.ANTHROPIC_API_KEY || "").trim() };
  let provider = String(env.IA_PROVEEDOR || "").trim().toLowerCase();
  if (provider !== "gemini" && provider !== "claude") provider = has.claude ? "claude" : "gemini";
  // El elegido no tiene clave pero el otro sí: se usa el otro (así nunca se apaga por una clave faltante).
  if (!has[provider]) { const otro = provider === "claude" ? "gemini" : "claude"; if (has[otro]) provider = otro; }
  const model = String((provider === "claude" ? env.CLAUDE_MODEL : env.GEMINI_MODEL) || "").trim() || DEFAULT_MODELS[provider];
  return { provider, model, ready: has[provider] };
}

// Une turnos seguidos del mismo rol y garantiza que la charla empiece por el cliente (lo exigen ambas APIs).
export function normalizeTurns(messages = []) {
  const out = [];
  for (const m of messages) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const text = String(m.text ?? "").trim();
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && last.role === role) last.text += "\n" + text;
    else out.push({ role, text });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

// messages: [{ role: "user" | "assistant", text }]. Devuelve el texto de la respuesta (o lanza un Error con un mensaje legible).
export async function askAI(env, { system = "", messages = [], maxTokens = 700, temperature = 0.5 } = {}) {
  const cfg = aiConfig(env);
  const otro = cfg.provider === "claude" ? "gemini" : "claude";
  const cfgOtro = aiConfig({ ...env, IA_PROVEEDOR: otro });
  const turns = normalizeTurns(messages);
  if (!turns.length) throw new Error("No hay mensaje del cliente");
  const [fijo, variable = ""] = String(system).split(CORTE_CACHE);
  const usar = (c) => c.provider === "claude" ? askClaude(env, c.model, fijo, variable, turns, maxTokens) : askGemini(env, c.model, [fijo, variable].filter(Boolean).join("\n\n"), turns, maxTokens, temperature);
  if (!cfg.ready) {
    if (cfgOtro.ready) return usar(cfgOtro);
    throw new Error(cfg.provider === "claude" ? "Falta ANTHROPIC_API_KEY" : "Falta GEMINI_API_KEY");
  }
  try { return await usar(cfg); }
  catch (e) {
    if (!cfgOtro.ready) throw e;
    console.error(`IA ${cfg.provider} falló (${e?.message}); respondo con ${otro}`);
    return usar(cfgOtro);
  }
}

async function post(url, headers, body) {
  let r;
  try {
    r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    throw new Error(e?.name === "TimeoutError" ? "La IA tardó demasiado en responder" : "No se pudo conectar con la IA");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || data?.error?.type || `HTTP ${r.status}`;
    const err = new Error(r.status === 429 ? "Se alcanzó el límite de uso de la IA (429). Esperá un rato o subí de plan." : `Error de la IA: ${String(msg).slice(0, 200)}`);
    err.status = r.status;
    throw err;
  }
  return data;
}

// Gemini a veces responde "alta demanda" (503) o límite (429): se reintenta y, si sigue, se usa un modelo de respaldo.
// GEMINI_MODELO_RESPALDO (lista separada por comas; por defecto gemini-3.5-flash-lite,gemini-2.5-flash). GEMINI_PENSAR = presupuesto de "pensamiento" (por defecto 1024; 0 lo apaga):
// pensar un poco antes de responder hace que siga mejor las reglas (presentarse, una pregunta por mensaje, usar el catálogo).
async function askGemini(env, model, system, turns, maxTokens, temperature) {
  // Respaldo: si el modelo principal está saturado, prueba otros (Google retira modelos viejos: por eso hay más de uno).
  const respaldos = String(env.GEMINI_MODELO_RESPALDO || "gemini-3.5-flash-lite,gemini-2.5-flash").split(",").map((m) => m.trim()).filter((m) => m && m !== model);
  const intentos = [model, model, ...respaldos];
  let last;
  for (let i = 0; i < intentos.length; i++) {
    try { return await geminiOnce(env, intentos[i], system, turns, maxTokens, temperature); }
    catch (e) {
      last = e;
      // Con el modelo principal solo se reintenta si está saturado; un respaldo que falle por lo que sea pasa al siguiente.
      if (i < 2 && ![429, 500, 502, 503, 504].includes(e.status)) { if (!respaldos.length) throw e; i = 1; continue; }
      if (i < intentos.length - 1) await new Promise((r) => setTimeout(r, i === 0 ? 1500 : 500));
    }
  }
  throw last;
}

async function geminiOnce(env, model, system, turns, maxTokens, temperature) {
  const generationConfig = { maxOutputTokens: maxTokens, temperature };
  const pensar = Math.max(0, parseInt(env.GEMINI_PENSAR ?? "1024", 10) || 0);
  // El pensamiento gasta del mismo cupo de salida: se suma para que la respuesta no salga cortada.
  if (/^gemini-[3-9]/i.test(model)) {
    // Gemini 3 en adelante maneja el pensamiento solo: se deja margen para que no corte la respuesta.
    generationConfig.maxOutputTokens = maxTokens + 2048;
  } else if (/flash/i.test(model)) {
    const budget = /lite/i.test(model) ? 0 : pensar;
    generationConfig.thinkingConfig = { thinkingBudget: budget };
    generationConfig.maxOutputTokens = maxTokens + budget;
  }
  const data = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { "x-goog-api-key": String(env.GEMINI_API_KEY).trim() },
    {
      ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
      contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] })),
      generationConfig,
    });
  const c = data?.candidates?.[0];
  const text = (c?.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error(c?.finishReason ? `La IA no devolvió texto (${c.finishReason})` : "La IA no devolvió texto");
  return text;
}

async function askClaude(env, model, fijo, variable, turns, maxTokens) {
  // La parte fija lleva cache_control: la primera vez se guarda y las siguientes (por 5 min) se cobran al 5%.
  const system = [
    ...(fijo ? [{ type: "text", text: fijo, cache_control: { type: "ephemeral" } }] : []),
    ...(variable ? [{ type: "text", text: variable }] : []),
  ];
  const data = await post("https://api.anthropic.com/v1/messages",
    { "x-api-key": String(env.ANTHROPIC_API_KEY).trim(), "anthropic-version": "2023-06-01" },
    // Sin temperature: algunos modelos nuevos de Claude no la aceptan y el valor por defecto ya sirve para chat.
    { model, max_tokens: maxTokens, ...(system.length ? { system } : {}), messages: turns.map((t) => ({ role: t.role, content: t.text })) });
  const text = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!text) throw new Error("La IA no devolvió texto");
  return text;
}

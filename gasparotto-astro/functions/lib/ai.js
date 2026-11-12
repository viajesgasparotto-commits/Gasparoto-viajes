// Proveedor de IA intercambiable: Gemini (gratis, para pruebas) o Claude (producción).
// Se elige con la variable IA_PROVEEDOR = "gemini" | "claude". Si no está, se usa el que tenga clave (Claude primero).
//   Gemini: GEMINI_API_KEY  (opcional GEMINI_MODEL, por defecto gemini-2.5-flash)
//   Claude: ANTHROPIC_API_KEY (opcional CLAUDE_MODEL, por defecto claude-sonnet-5-5)
// El resto del sitio solo llama a askAI(): cambiar de proveedor no toca ningún otro archivo.

export const DEFAULT_MODELS = { gemini: "gemini-2.5-flash", claude: "claude-sonnet-5-5" };
const TIMEOUT_MS = 25000;

export function aiConfig(env = {}) {
  const has = { gemini: !!String(env.GEMINI_API_KEY || "").trim(), claude: !!String(env.ANTHROPIC_API_KEY || "").trim() };
  let provider = String(env.IA_PROVEEDOR || "").trim().toLowerCase();
  if (provider !== "gemini" && provider !== "claude") provider = has.claude ? "claude" : "gemini";
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
  if (!cfg.ready) throw new Error(cfg.provider === "claude" ? "Falta ANTHROPIC_API_KEY" : "Falta GEMINI_API_KEY");
  const turns = normalizeTurns(messages);
  if (!turns.length) throw new Error("No hay mensaje del cliente");
  return cfg.provider === "claude" ? askClaude(env, cfg.model, system, turns, maxTokens) : askGemini(env, cfg.model, system, turns, maxTokens, temperature);
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
    throw new Error(r.status === 429 ? "Se alcanzó el límite de uso de la IA (429). Esperá un rato o subí de plan." : `Error de la IA: ${String(msg).slice(0, 200)}`);
  }
  return data;
}

async function askGemini(env, model, system, turns, maxTokens, temperature) {
  const generationConfig = { maxOutputTokens: maxTokens, temperature };
  // Los modelos Flash "piensan" antes de contestar y ese pensamiento gasta el cupo de salida: para chat corto se apaga.
  if (/flash/i.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
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

async function askClaude(env, model, system, turns, maxTokens) {
  const data = await post("https://api.anthropic.com/v1/messages",
    { "x-api-key": String(env.ANTHROPIC_API_KEY).trim(), "anthropic-version": "2023-06-01" },
    // Sin temperature: algunos modelos nuevos de Claude no la aceptan y el valor por defecto ya sirve para chat.
    { model, max_tokens: maxTokens, ...(system ? { system } : {}), messages: turns.map((t) => ({ role: t.role, content: t.text })) });
  const text = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!text) throw new Error("La IA no devolvió texto");
  return text;
}

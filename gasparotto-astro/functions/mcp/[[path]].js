// /mcp y /mcp/<clave>: conector de Claude para el blog (servidor MCP). La lógica está en functions/lib/mcp.js.
import { handleMcp } from "../lib/mcp.js";
export const onRequest = (ctx) => handleMcp(ctx.request, ctx.env);

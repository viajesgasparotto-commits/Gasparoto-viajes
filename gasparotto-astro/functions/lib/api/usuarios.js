// /api/users: alta, edición y baja de usuarios del panel (solo administradores).

import { MIN_PASSWORD, ROLES, hashPassword, validEmail } from "../users.js";
import { cleanTxt, json } from "./http.js";

export async function manejarUsuarios({ ctx, request, env, res, id, method, user }) {
  // Usuarios del panel: solo administradores. Un usuario no puede desactivarse, borrarse ni quitarse el rol de admin a sí mismo.
  if (res === "users") {
    if (user.role !== "admin") return json({ error: "No tenés permiso para administrar usuarios" }, 403);
    const rid = id && /^\d+$/.test(id) ? Number(id) : null;
    if (method === "GET") {
      const rows = (await env.DB.prepare("SELECT id, email, name, role, active, created_at, last_login FROM users ORDER BY id").all()).results;
      return json({ users: rows, self: user.id });
    }
    const b = await request.json().catch(() => ({}));
    const name = cleanTxt(b.name, 80), email = String(b.email ?? "").trim().toLowerCase(), password = String(b.password ?? "");
    if (method === "POST" && !rid) {
      if (!name) return json({ error: "Falta el nombre" }, 400);
      if (!validEmail(email)) return json({ error: "El email no es válido" }, 400);
      if (password.length < MIN_PASSWORD || password.length > 200) return json({ error: `La clave tiene que tener al menos ${MIN_PASSWORD} caracteres` }, 400);
      if (!ROLES.includes(b.role)) return json({ error: "Rol inválido" }, 400);
      try {
        const r = await env.DB.prepare("INSERT INTO users (email, name, role, pass_hash) VALUES (?,?,?,?)").bind(email, name, b.role, await hashPassword(password)).run();
        return json({ ok: true, id: r.meta?.last_row_id }, 201);
      } catch (e) {
        if (/UNIQUE/i.test(String(e.message))) return json({ error: "Ya existe un usuario con ese email" }, 409);
        throw e;
      }
    }
    if (!rid) return json({ error: "Método no permitido" }, 405);
    const cur = await env.DB.prepare("SELECT id, name, email FROM users WHERE id=?").bind(rid).first();
    if (!cur) return json({ error: "No existe ese usuario" }, 404);
    if (method === "PUT") {
      const set = [], vals = [];
      if (b.name !== undefined) { if (!name) return json({ error: "Falta el nombre" }, 400); set.push("name=?"); vals.push(name); }
      if (b.email !== undefined) { if (!validEmail(email)) return json({ error: "El email no es válido" }, 400); set.push("email=?"); vals.push(email); }
      if (b.role !== undefined) {
        if (!ROLES.includes(b.role)) return json({ error: "Rol inválido" }, 400);
        if (rid === user.id && b.role !== "admin") return json({ error: "No podés quitarte el rol de administrador a vos mismo" }, 400);
        set.push("role=?"); vals.push(b.role);
      }
      if (b.active !== undefined) {
        const on = b.active === true || b.active === 1 || b.active === "1";
        if (rid === user.id && !on) return json({ error: "No podés desactivar tu propio usuario" }, 400);
        set.push("active=?"); vals.push(on ? 1 : 0);
      }
      if (password) {
        if (password.length < MIN_PASSWORD || password.length > 200) return json({ error: `La clave tiene que tener al menos ${MIN_PASSWORD} caracteres` }, 400);
        set.push("pass_hash=?"); vals.push(await hashPassword(password));
      }
      if (!set.length) return json({ error: "Nada para cambiar" }, 400);
      ctx.act = { title: cur.name || cur.email, detail: [password && "cambió la clave", b.role !== undefined && "rol: " + b.role, b.active !== undefined && (b.active === true || b.active === 1 || b.active === "1" ? "activó" : "desactivó")].filter(Boolean).join(", ") };
      try { await env.DB.prepare(`UPDATE users SET ${set.join(", ")} WHERE id=?`).bind(...vals, rid).run(); }
      catch (e) { if (/UNIQUE/i.test(String(e.message))) return json({ error: "Ya existe un usuario con ese email" }, 409); throw e; }
      return json({ ok: true });
    }
    if (method === "DELETE") {
      if (rid === user.id) return json({ error: "No podés borrar tu propio usuario" }, 400);
      await env.DB.prepare("DELETE FROM users WHERE id=?").bind(rid).run();
      ctx.act = { title: cur.name || cur.email };
      return json({ ok: true });
    }
    return json({ error: "Método no permitido" }, 405);
  }
  return null;
}

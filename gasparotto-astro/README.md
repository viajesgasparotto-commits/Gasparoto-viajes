# Sitio de agencia de viajes (Astro + Tailwind + Motion sobre Cloudflare Pages + D1 + R2)

- **Front:** Astro (`src/`) + Tailwind v4 + Motion. `npm run build` genera `dist/`.
- **Motor dinámico:** `functions/` (Cloudflare Pages Functions: panel, API, paquetes y blog desde D1). Layout con cabecera/pie en `functions/lib/render.js`.
- **Estáticos:** `public/` (assets, `/admin/`, `_pages/`, `_headers`) se copia tal cual a `dist/`.

Primera vez: `npm install` · Probar: `npm run dev` · Publicar: `npm run deploy`.
Cloudflare Pages desde Git: *Build command* `npm run build`, *Output* `dist`.

Estado de la migración y próximos pasos: `MIGRACION-ASTRO.md`.
Entregar a una agencia: `WHITE-LABEL.md`. Desplegar: `INSTRUCCIONES-DESPLIEGUE.txt`. Panel: `ADMIN.md`.

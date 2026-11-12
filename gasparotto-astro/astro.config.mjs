import { defineConfig } from "astro/config";

// Astro genera el front estático en dist/. Las Functions de Cloudflare (functions/) siguen siendo el motor
// dinámico (panel, API, D1, R2): Astro NO las reemplaza todavía. Ver MIGRACION-ASTRO.md.
export default defineConfig({
  output: "static",
  outDir: "./dist",
  publicDir: "./public",
  build: { format: "directory" },
  compressHTML: false, // los fragmentos llevan marcadores <!--PANEL:...--> y un comentario JSON inicial
  devToolbar: { enabled: false },
});

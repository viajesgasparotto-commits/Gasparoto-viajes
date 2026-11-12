// Empaqueta src/scripts/fx.ts (Motion) en public/assets/fx.js: un solo archivo, con solo lo que se usa de Motion.
import { build } from "esbuild";

await build({
  entryPoints: ["src/scripts/fx.ts"],
  outfile: "public/assets/fx.js",
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  legalComments: "none",
});
console.log("fx.js listo");

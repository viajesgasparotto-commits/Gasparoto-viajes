// Marcadores que reemplaza el motor (functions/_middleware.js → fillTokens y staticPage).
// Se escriben acá como texto literal para que Astro no los interprete.
export const T = {
  LOGO: "{{LOGO}}",
  WA_URL: "{{WA_URL}}",
  BRAND: "{{BRAND}}",
  AB: "{{AB}}",
  AB_CTA: "{{AB_CTA}}",
} as const;

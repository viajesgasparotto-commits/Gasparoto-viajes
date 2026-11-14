// ============================================================================
//  DATOS DE LA AGENCIA (lo único que se edita al entregar el producto a otra agencia)
//  El resto de /functions es el motor y no se toca. Sin dependencias: lo usan también los scripts de /scripts.
// ============================================================================

export const SITE = {
  // Páginas fijas que listan paquetes. Cada una es una categoría del panel ("Paquetes").
  // listing = ruta de la página estática en dist/ (debe contener el marcador <!--PANEL:PAQUETES-->, ver scripts/limpiar-listados.mjs).
  // Si una agencia no tiene páginas fijas, dejar [] : el panel crea categorías dinámicas en /paquetes/categoria/<slug>/.
  listings: [], // categorías dinámicas: /paquetes/categoria/<slug>/ (se administran en el panel)

  // Categorías fijas: las enlazan las fotos de la portada (src/data/home.ts → intents). Si faltan se crean solas al abrir el panel,
  // y desde el panel se pueden renombrar (el nombre visible) pero no borrar ni cambiarles la dirección: así esos enlaces nunca dan 404.
  fixedCategories: [
    { slug: "show-de-tango", label: "Shows de tango" },
    { slug: "city-tour", label: "City tour" },
    { slug: "paseos", label: "Passeios" },
  ],

  // Páginas fijas: ruta -> nombre del fragmento: src/pages/fragmentos/<nombre>.astro (1ª línea JSON con título y descripción, ver src/lib/meta.ts).
  pages: {
    "/nosotros/": "nosotros",
    "/contacto/": "contacto",
    "/reservas/": "reservas",
    "/traslados/": "traslados",
    "/guia-buenos-aires/": "guia",
  },

  // Datos del negocio para el schema (Organization + TravelAgency) de la portada.
  // Se usan en Google para el panel de la marca y la ficha de mapa. Dejar en "" lo que no aplique.
  business: {
    street: "Florida 537, Local 356",
    locality: "Ciudad Autónoma de Buenos Aires",
    postalCode: "C1005",
    country: "AR",
    phone: "+54 11 6419-9083",
    lat: -34.6017646,
    lng: -58.3745329,
    sameAs: [
      "https://www.instagram.com/gasparottoviajes/",
      "https://www.facebook.com/profile.php?id=61578579680087",
      "https://www.tiktok.com/@gasparotto.viajes",
    ],
  },

  // Categorías iniciales del blog (se siembran una sola vez al primer ingreso al panel).
  seedPostCategories: ["Dicas de viagem", "Noite portenha"],

  // Enlaces viejos del sitio anterior (WordPress): /?p=ID -> ruta nueva.
  // Orden de resolución: 1) "ID viejo" cargado en un post del panel, 2) este mapa, 3) legacyFallback.
  // Para detectar los que faltan: npm run audit
  legacyPages: {},
  legacyFallback: "/blog/",

  // Redirecciones fijas (302). Una clave que termina en * es un prefijo.
  // Se resuelven antes de buscar contenido: sirven para links viejos que no tienen página nueva.
  redirects: {
    // Sitio WordPress anterior (301). /trip/<slug> se resuelve en _middleware.js.
    "/destinations/buenos-aires": "/paquetes/",
    "/destinations/iguazu": "/paquetes/categoria/shows-de-tango/",
    "/destinations/*": "/paquetes/",
    "/destinatinos": "/paquetes/",
    "/activities/show-de-tango": "/paquetes/categoria/shows-de-tango/",
    "/activities/city-tour": "/paquetes/categoria/city-tour/",
    "/activities/delta-tigre": "/paquetes/categoria/delta-del-tigre/",
    "/activities/parques-buenos-aires": "/paquetes/categoria/parques-y-excursiones/",
    "/activities/degustacion-buenos-aires": "/paquetes/categoria/degustaciones-y-bodegas/",
    "/activities/paquetes-buenos-aires": "/paquetes/categoria/paquetes-de-viaje-buenos-aires/",
    "/activities/*": "/paquetes/",
    "/contact-us": "/contacto/",
    "/category/*": "/blog/",
    "/author/*": "/blog/",
  },
};

export const legacyTarget = (id) => SITE.legacyPages[String(id)] || "";

// Devuelve el destino de una redirección fija para una ruta, o "".
export function staticRedirect(path) {
  const p = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (SITE.redirects[p]) return SITE.redirects[p];
  for (const [k, v] of Object.entries(SITE.redirects)) if (k.endsWith("*") && p.startsWith(k.slice(0, -1))) return v;
  return "";
}

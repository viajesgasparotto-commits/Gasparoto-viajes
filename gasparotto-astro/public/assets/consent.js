// Banner de cookies y carga condicional de medición (Google Tag Manager y Meta Pixel).
// Ningún script de terceros se carga hasta que la persona acepta. La elección queda en este navegador (localStorage).
// Se inyecta solo si la agencia configuró GTM_ID y/o META_PIXEL_ID (functions/lib/brand.js → consentTag).
(function () {
  var me = document.currentScript || document.querySelector('script[src*="consent.js"]');
  var GTM = (me && me.getAttribute("data-gtm")) || "";
  var META = (me && me.getAttribute("data-meta")) || "";
  var PRIV = (me && me.getAttribute("data-privacy")) || "";
  var KEY = "gv_consent";
  var es = /^es/i.test(document.documentElement.lang || "");
  var T = es
    ? { text: "Usamos cookies para medir las visitas y mejorar nuestros anuncios. Solo las activamos si aceptás.", accept: "Aceptar", reject: "Rechazar", policy: "Política de privacidad", label: "Cookies" }
    : { text: "Usamos cookies para medir as visitas e melhorar nossos anúncios. Só as ativamos se você aceitar.", accept: "Aceitar", reject: "Recusar", policy: "Política de privacidade", label: "Cookies" };

  function read() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); return s && s.v === 1 ? s : null; } catch (e) { return null; }
  }
  function save(ok) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, a: ok ? 1 : 0, ts: Date.now() })); } catch (e) { /* sin almacenamiento: el banner vuelve a aparecer */ }
  }

  // Google Consent Mode: denegado por defecto y concedido al aceptar. GTM se carga recién después de aceptar.
  var loaded = false;
  function loadTrackers() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    if (GTM) {
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      window.gtag("consent", "update", { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
      window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
      var g = document.createElement("script");
      g.async = true;
      g.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM);
      document.head.appendChild(g);
    }
    if (META) {
      if (!window.fbq) {
        var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        window._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
        var f = document.createElement("script");
        f.async = true;
        f.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(f);
      }
      window.fbq("init", META);
      window.fbq("track", "PageView");
    }
  }

  var CSS = "#gv-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:560px;margin:0 auto;background:#fff;color:#1c2333;border-radius:14px;box-shadow:0 10px 40px rgba(28,35,51,.25);padding:16px 18px;font:14px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
    "#gv-consent p{margin:0 0 12px}#gv-consent a{color:var(--gv-primary,#003195);text-decoration:underline}" +
    ".gvc-b{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}" +
    "#gv-consent button{font:inherit;font-weight:600;padding:9px 16px;border-radius:999px;cursor:pointer;border:1px solid #c9d1e3;background:#fff;color:#1c2333}" +
    "#gv-consent .gvc-yes{background:var(--gv-primary,#003195);border-color:var(--gv-primary,#003195);color:#fff}" +
    "#gv-consent button:focus-visible{outline:3px solid #93c5ea;outline-offset:2px}";

  // Solo enlaces internos o https, y sin comillas (el valor sale del servidor, pero se vuelve a comprobar).
  var privOk = /^(\/(?!\/)|https:\/\/)[^\s"'<>]*$/.test(PRIV) ? PRIV : "";

  function banner() {
    if (document.getElementById("gv-consent")) return;
    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    var el = document.createElement("div");
    el.id = "gv-consent";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", T.label);
    el.innerHTML = "<p>" + T.text + (privOk ? ' <a href="' + privOk + '">' + T.policy + "</a>" : "") + "</p>" +
      '<div class="gvc-b"><button type="button" data-c="0">' + T.reject + '</button><button type="button" class="gvc-yes" data-c="1">' + T.accept + "</button></div>";
    el.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest("[data-c]");
      if (!b) return;
      var ok = b.dataset.c === "1";
      save(ok);
      if (el.remove) el.remove();
      if (ok) loadTrackers();
    });
    document.body.appendChild(el);
    var first = el.querySelector ? el.querySelector(".gvc-yes") : null;
    if (first && first.focus) first.focus({ preventScroll: true });
  }

  // Permite volver a mostrar el banner desde la consola o desde un enlace futuro del footer.
  window.gvConsent = { open: banner };

  var st = read();
  if (st && st.a === 1) loadTrackers();
  else if (!st) banner();
})();

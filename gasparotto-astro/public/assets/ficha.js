/* Ficha de servicio/paquete: ventana de reserva, "Ver todas las fotos" y "Leer más". ES5, sin dependencias.
   La reserva (formulario #pedir, conv.js) vive dentro de [data-bk]. Acá solo se abre y se cierra: en PC centrada, en el celular como hoja.
   Cualquier enlace a #pedir la abre (botón de la tarjeta, barra fija del celular, "Escolher" de cada opción, tarjetas del listado con /#pedir). */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, bk = doc.querySelector("[data-bk]");
  if (bk) {
    doc.body.appendChild(bk); // fuera de columnas con sticky/transform: así "fixed" cubre toda la pantalla
    bk.className += " is-m";
    var panel = bk.querySelector(".gvbk-panel"), body = bk.querySelector(".gvbk-body"), last = null;
    var open = function () {
      if (bk.classList.contains("is-open")) return;
      carry();
      last = doc.activeElement;
      bk.classList.add("is-open"); root.classList.add("gvbk-lock");
      if (body) body.scrollTop = 0;
      setTimeout(function () { var x = bk.querySelector(".gvbk-x"); if (x) x.focus({ preventScroll: true }); }, 30);
      try { if (location.hash !== "#pedir") history.pushState({ gvbk: 1 }, "", "#pedir"); } catch (e) { /* sin historial */ }
    };
    var shut = function (fromPop) {
      if (!bk.classList.contains("is-open")) return;
      bk.classList.remove("is-open"); root.classList.remove("gvbk-lock");
      back();
      if (!fromPop && location.hash === "#pedir") { try { history.back(); } catch (e) { /* nada */ } }
      if (last && last.focus) last.focus({ preventScroll: true });
    };
    doc.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href="#pedir"], [data-bk-open]');
      if (a) { e.preventDefault(); open(); return; }
      if (e.target.closest && e.target.closest("[data-bk-close]")) { e.preventDefault(); shut(); }
    });
    doc.addEventListener("keydown", function (e) {
      if (!bk.classList.contains("is-open")) return;
      if (e.key === "Escape") { shut(); return; }
      if (e.key === "Tab") { // el foco no sale de la ventana
        var f = panel.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
        var vis = [].filter.call(f, function (x) { return x.offsetParent !== null; });
        if (!vis.length) return;
        var first = vis[0], end = vis[vis.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); end.focus(); }
        else if (!e.shiftKey && doc.activeElement === end) { e.preventDefault(); first.focus(); }
      }
    });
    // "Atrás" del celular cierra la ventana en vez de salir de la página.
    window.addEventListener("popstate", function () { if (location.hash !== "#pedir") shut(true); else open(); });
    if (location.hash === "#pedir") { try { history.replaceState(null, "", location.pathname + location.search); history.pushState({ gvbk: 1 }, "", "#pedir"); } catch (e) {} open(); }
  }

  // Selección rápida de la tarjeta (opción y personas) con total; al abrir la reserva se pasa al formulario.
  var Q = doc.querySelector("[data-q]"), form = doc.getElementById("pedir");
  function qN() { var o = Q && Q.querySelector("[data-q-n]"); return o ? Number(o.textContent) || 1 : 0; }
  function qOpt() { var r = Q && Q.querySelector('input[name="q-opt"]:checked'); return r || null; }
  function qTotal() {
    var t = Q && Q.querySelector("[data-q-total]"); if (!t) return;
    var o = qOpt(), u = o && Number(o.getAttribute("data-unit")) > 0 ? Number(o.getAttribute("data-unit")) : Number(t.getAttribute("data-unit"));
    var n = qN(), mn = Number(t.getAttribute("data-min")) || 1, mx = Number(t.getAttribute("data-max")) || 20;
    t.querySelector("b").textContent = (t.getAttribute("data-cur") + " " + Math.round((u * n) / 100).toLocaleString("es-AR")).trim();
    var bs = Q.querySelectorAll("[data-q-pax]"); bs[0].disabled = n <= mn; bs[1].disabled = n >= mx;
  }
  if (Q) {
    Q.addEventListener("click", function (e) {
      var b = e.target.closest("[data-q-pax]"); if (!b) return;
      var t = Q.querySelector("[data-q-total]"), mn = t ? Number(t.getAttribute("data-min")) || 1 : 1, mx = t ? Number(t.getAttribute("data-max")) || 20 : 20;
      Q.querySelector("[data-q-n]").textContent = Math.min(mx, Math.max(mn, qN() + Number(b.getAttribute("data-q-pax"))));
      qTotal();
    });
    Q.addEventListener("change", qTotal);
    qTotal();
  }
  function carry() {
    if (!Q || !form) return;
    var o = qOpt();
    if (o) { var fo = form.querySelector('input[name="option"][value="' + o.value + '"]'); if (fo && !fo.checked) { fo.checked = true; fo.dispatchEvent(new Event("change", { bubbles: true })); } }
    var n = qN(), el = form.querySelector("#gv-adults") || form.querySelector("#gv-pax");
    if (el && n) { el.value = n; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
  }
  // Al cerrar, la tarjeta muestra lo que quedó en el formulario (personas).
  function back() {
    if (!Q || !form) return;
    var el = form.querySelector("#gv-adults") || form.querySelector("#gv-pax"), o = Q.querySelector("[data-q-n]");
    if (el && o && Number(el.value) > 0) { o.textContent = Math.round(Number(el.value)); qTotal(); }
  }
  // Al elegir otra opción en el formulario o en la lista de la ficha, la tarjeta la acompaña.
  if (form && Q) form.addEventListener("change", function (e) { if (e.target.name === "option") { var r = Q.querySelector('input[name="q-opt"][value="' + e.target.value + '"]'); if (r) { r.checked = true; qTotal(); } } });

  // "Ver todas las fotos": abre el visor de la galería desde la primera.
  var all = doc.querySelector("[data-gvg-all]");
  if (all) all.addEventListener("click", function () { var t = doc.querySelector(".gvg-hero [data-gvi]"); if (t) t.click(); });

  // Descripción larga: se recorta con "Leer más".
  [].forEach.call(doc.querySelectorAll("[data-more]"), function (el) {
    if (el.scrollHeight < 420) return;
    el.classList.add("is-c");
    var b = doc.createElement("button");
    b.type = "button"; b.className = "gv-more"; b.textContent = el.getAttribute("data-more-l") || "Ver más";
    b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", function () {
      var c = el.classList.toggle("is-c");
      b.textContent = c ? el.getAttribute("data-more-l") : el.getAttribute("data-less-l");
      b.setAttribute("aria-expanded", c ? "false" : "true");
    });
    el.parentNode.insertBefore(b, el.nextSibling);
  });
})();

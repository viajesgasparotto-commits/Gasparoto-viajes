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
  // Niños: cantidad y edad de cada uno. Precio por edad con los mismos tramos que el formulario (% del adulto o precio fijo);
  // sin edad elegida, el niño se cuenta como adulto (el total nunca promete menos de lo que se cobra) y se pide la edad.
  function qK() { var o = Q && Q.querySelector("[data-q-k]"); return o ? Number(o.textContent) || 0 : 0; }
  var AG = Q && Q.querySelector("[data-q-ages]"), AL = {}; try { AL = AG ? JSON.parse(AG.getAttribute("data-l")) : {}; } catch (e) { AL = {}; }
  // Tramos de niños de la opción marcada: si la política de menores es solo de algunas opciones (data-kid-scope), en las demás pagan como adultos.
  function qScoped() {
    var t = Q && Q.querySelector("[data-q-total]"), sc = []; try { sc = JSON.parse((t && t.getAttribute("data-kid-scope")) || "[]") || []; } catch (e) { sc = []; }
    var o = qOpt(); return !sc.length || !o || sc.indexOf(o.value) >= 0;
  }
  function qTiers() { var t = Q && Q.querySelector("[data-q-total]"); if (!qScoped()) return []; try { return JSON.parse((t && t.getAttribute("data-kid-tiers")) || "[]") || []; } catch (e) { return []; } }
  function qKidHint() { var h = Q && Q.querySelector("[data-q-khint]"); if (h) h.textContent = qScoped() ? h.getAttribute("data-on") : h.getAttribute("data-off"); }
  function qAges() { return AG ? [].map.call(AG.querySelectorAll("select"), function (s) { return s.value === "" ? null : Number(s.value); }) : []; }
  function kidPct(age, unit, tiers) {
    if (age === null) return 100;
    for (var i = 0; i < tiers.length; i++) if (age >= tiers[i].from && age <= tiers[i].to) return tiers[i].amt != null ? (unit > 0 ? Math.min(100, tiers[i].amt * 100 / unit) : 100) : tiers[i].pct;
    return 100;
  }
  function renderAges() {
    qKidHint();
    if (!AG) return;
    var c = qTiers().length ? qK() : 0, had = qAges();
    AG.hidden = c < 1;
    var h = "";
    for (var i = 0; i < c; i++) {
      h += '<label>' + (AL.child || "").replace("{n}", i + 1) + '<select data-q-age><option value="">' + AL.age + "</option>";
      for (var a = 0; a <= 17; a++) h += '<option value="' + a + '"' + (had[i] === a ? " selected" : "") + ">" + (a === 0 ? AL.less1 : a === 1 ? AL.one : (AL.n || "").replace("{n}", a)) + "</option>";
      h += "</select></label>";
    }
    if (c && had.slice(0, c).filter(function (x) { return x !== null && x !== undefined; }).length < c) h += "<p>" + AL.ask + "</p>";
    AG.innerHTML = h;
  }
  function qTotal() {
    var t = Q && Q.querySelector("[data-q-total]"); if (!t) return;
    var o = qOpt(), u = o && Number(o.getAttribute("data-unit")) > 0 ? Number(o.getAttribute("data-unit")) : Number(t.getAttribute("data-unit"));
    var n = qN(), k = qK(), mn = Number(t.getAttribute("data-min")) || 1, mx = Number(t.getAttribute("data-max")) || 20;
    var tiers = qTiers(), ages = qAges(), kids = 0;
    for (var i = 0; i < k; i++) kids += Math.round(u * kidPct(ages[i] === undefined ? null : ages[i], u, tiers) / 100);
    t.querySelector("b").textContent = (t.getAttribute("data-cur") + " " + Math.round((u * n + kids) / 100).toLocaleString("es-AR")).trim();
    var bs = Q.querySelectorAll("[data-q-pax]"); bs[0].disabled = n <= mn || n + k <= mn; bs[1].disabled = n + k >= mx;
    var ks = Q.querySelectorAll("[data-q-kid]"); if (ks.length) { ks[0].disabled = k <= 0; ks[1].disabled = n + k >= mx; }
  }
  if (Q) {
    Q.addEventListener("click", function (e) {
      var b = e.target.closest("[data-q-pax], [data-q-kid]"); if (!b) return;
      var t = Q.querySelector("[data-q-total]"), mn = t ? Number(t.getAttribute("data-min")) || 1 : 1, mx = t ? Number(t.getAttribute("data-max")) || 20 : 20;
      if (b.hasAttribute("data-q-kid")) {
        Q.querySelector("[data-q-k]").textContent = Math.min(mx - qN(), Math.max(0, qK() + Number(b.getAttribute("data-q-kid"))));
        renderAges();
      } else Q.querySelector("[data-q-n]").textContent = Math.min(mx - qK(), Math.max(1, qN() + Number(b.getAttribute("data-q-pax")), mn - qK()));
      qTotal();
    });
    // Al elegir una edad no se rearma la lista (no se pierde el foco): solo se saca el aviso cuando ya están todas.
    Q.addEventListener("change", function (e) {
      if (e.target.name === "q-opt") renderAges();
      if (e.target.hasAttribute && e.target.hasAttribute("data-q-age") && AG) { var p = AG.querySelector("p"); if (p && qAges().indexOf(null) < 0) p.remove(); }
      qTotal();
    });
    renderAges();
    qTotal();
  }
  function carry() {
    if (!Q || !form) return;
    var o = qOpt();
    if (o) { var fo = form.querySelector('input[name="option"][value="' + o.value + '"]'); if (fo && !fo.checked) { fo.checked = true; fo.dispatchEvent(new Event("change", { bubbles: true })); } }
    var n = qN(), el = form.querySelector("#gv-adults") || form.querySelector("#gv-pax");
    if (el && n) { el.value = n; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
    // Niños y sus edades: el formulario arma un selector de edad por niño al cambiar la cantidad; después se copia cada edad.
    var ch = form.querySelector("#gv-children");
    if (ch && Q.querySelector("[data-q-k]")) {
      ch.value = qK(); ch.dispatchEvent(new Event("input", { bubbles: true })); ch.dispatchEvent(new Event("change", { bubbles: true })); ch.dispatchEvent(new Event("blur")); // conv.js arma los selectores de edad al salir del campo
      var ages = qAges(), sel = form.querySelectorAll("[data-ages-list] select");
      for (var i = 0; i < sel.length; i++) if (ages[i] !== null && ages[i] !== undefined && sel[i].value !== String(ages[i])) { sel[i].value = String(ages[i]); sel[i].dispatchEvent(new Event("change", { bubbles: true })); }
    }
  }
  // Al cerrar, la tarjeta muestra lo que quedó en el formulario (personas).
  function back() {
    if (!Q || !form) return;
    var el = form.querySelector("#gv-adults") || form.querySelector("#gv-pax"), o = Q.querySelector("[data-q-n]");
    if (el && o && Number(el.value) > 0) o.textContent = Math.round(Number(el.value));
    var ch = form.querySelector("#gv-children"), k = Q.querySelector("[data-q-k]");
    if (ch && k) {
      var fa = [].map.call(form.querySelectorAll("[data-ages-list] select"), function (s) { return s.value; });
      k.textContent = Math.max(0, Math.round(Number(ch.value)) || 0); renderAges();
      [].forEach.call(Q.querySelectorAll("[data-q-age]"), function (s, i) { if (fa[i] !== undefined) s.value = fa[i]; });
      renderAges();
    }
    qTotal();
  }
  // Al elegir otra opción en el formulario o en la lista de la ficha, la tarjeta la acompaña.
  if (form && Q) form.addEventListener("change", function (e) { if (e.target.name === "option") { var r = Q.querySelector('input[name="q-opt"][value="' + e.target.value + '"]'); if (r) { r.checked = true; qTotal(); } } });

  // Políticas en el formulario ("Antes de reservar, confira as políticas (Menores)"): solo las de la opción elegida o las de todas.
  var PF = doc.querySelector("[data-pol-form]");
  function polForm() {
    if (!PF || !form) return;
    var o = form.querySelector('input[name="option"]:checked'), v = o ? o.value : null, any = false;
    [].forEach.call(PF.querySelectorAll("[data-pol-opt]"), function (x) { var k = x.getAttribute("data-pol-opt"), on = !k || v === null || k === v; x.hidden = !on; if (on) any = true; });
    PF.hidden = !any;
  }
  if (PF && form) { form.addEventListener("change", function (e) { if (e.target.name === "option") polForm(); }); polForm(); }

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

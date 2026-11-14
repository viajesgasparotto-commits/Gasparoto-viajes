/* Portada: cuenta regresiva de la "Oferta relâmpago" hasta la hora que se cargó en el panel (data-flash-end, ISO). ES5. */
(function () {
  "use strict";
  var els = document.querySelectorAll("[data-flash-end]");
  if (!els.length) return;
  var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
  function tick() {
    var now = Date.now(), live = false;
    for (var i = 0; i < els.length; i++) {
      var el = els[i], left = Math.floor((Date.parse(el.getAttribute("data-flash-end")) - now) / 1000);
      if (!(left > 0)) { el.textContent = el.getAttribute("data-over"); continue; }
      live = true;
      var d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
      el.textContent = (d ? d + el.getAttribute("data-d") + " " : "") + p2(h) + ":" + p2(m) + ":" + p2(s);
    }
    if (live) setTimeout(tick, 1000);
  }
  tick();
})();

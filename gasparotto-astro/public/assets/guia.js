/* Guía de Buenos Aires (/guia-buenos-aires/): armador de itinerario y checklist. ES5, sin dependencias.
   El HTML ya trae un itinerario de 3 días escrito (para Google y sin JavaScript); esto lo rehace según lo que elija la persona. */
(function () {
  "use strict";
  var form = document.querySelector("[data-guia]"), out = document.querySelector("[data-guia-out]");
  if (!form || !out) return;

  var L = {
    tango: '<a href="/paquetes/categoria/show-de-tango/">show de tango com jantar</a>',
    city: '<a href="/paquetes/categoria/city-tour/">city tour</a>',
    tigre: '<a href="/paquetes/categoria/paseos/">passeio ao Delta do Tigre</a>',
    tras: '<a href="/traslados/">traslado</a>'
  };
  var strip = function (h) { return h.replace(/<[^>]+>/g, ""); };

  function plan(d, quem, g) {
    var has = function (k) { return g.indexOf(k) >= 0; }, fam = quem === "familia", night = has("noite") && !fam;
    var dinner = has("comida") ? "parrilla clássica: bife de chorizo, empanadas e um Malbec" : "jantar em um restaurante tradicional";
    var days = [];
    // Día 1: llegada y centro
    days.push({ t: "Chegada e Centro", s: [
      ["Manhã", "Chegada e " + L.tras + " até o hotel."],
      ["Tarde", "Obelisco, Av. 9 de Julho e Calle Florida" + (has("compras") ? ", com compras nas Galerías Pacífico" : "") + ". Passe na nossa loja, na Florida 537."],
      ["Noite", fam ? "Jantar cedo em Puerto Madero, à beira do dique." : night ? "Drinks e jantar em Puerto Madero." : "Jantar em Puerto Madero, à beira do dique."]] });
    // Día 2: city tour + tango
    days.push({ t: "City tour" + (has("tango") || !fam ? " e tango" : ""), s: [
      ["Manhã", L.city + ": Plaza de Mayo, Casa Rosada, San Telmo, La Boca (Caminito), Puerto Madero, Recoleta e Palermo."],
      ["Tarde", "Cemitério da Recoleta e a Floralis Genérica" + (has("comida") ? "; café com medialunas em um café notável" : "") + "."],
      ["Noite", has("tango") || !fam ? L.tango + (has("tango") ? " — o melhor da viagem" : ", o programa mais típico da cidade") + "." : dinner + "."]] });
    var rest = [];
    var tigre = { t: "Delta do Tigre", s: [["Dia todo", L.tigre + ": barco pelos canais, Puerto de Frutos e casas sobre a água."], ["Noite", night ? "Bares de Palermo Soho." : "Descanso e " + dinner + "."]] };
    var telmo = { t: "San Telmo e La Boca", s: [
      ["Manhã", "San Telmo: Plaza Dorrego e antiquários (aos domingos, a feira de San Telmo)."],
      ["Tarde", has("futebol") ? "La Bombonera e o museu do Boca Juniors, em La Boca." : "Caminito, em La Boca, com calma para fotos."],
      ["Noite", has("tango") && !fam ? "Uma milonga, onde os portenhos dançam tango de verdade." : dinner + " em San Telmo."]] };
    var palermo = { t: "Palermo", s: [
      ["Manhã", fam ? "Jardim Japonês, Bosques de Palermo e o Planetário." : "Jardim Japonês e Bosques de Palermo" + (has("cultura") ? ", e o MALBA (arte latino-americana)" : "") + "."],
      ["Tarde", has("compras") ? "Lojas de design e roupa em Palermo Soho." : "Passeio por Palermo Soho, com cafés e lojinhas."],
      ["Noite", has("vinho") ? "Degustação de vinhos argentinos e jantar em Palermo." : night ? "Bares e baladas de Palermo." : dinner + " em Palermo."]] };
    var colon = { t: "Cultura e Corrientes", s: [
      ["Manhã", "Visita guiada ao Teatro Colón."],
      ["Tarde", "Livraria El Ateneo Grand Splendid e Av. Corrientes" + (has("cultura") ? "; Museu Nacional de Belas Artes, na Recoleta" : "") + "."],
      ["Noite", "Pizza portenha na Av. Corrientes e uma peça de teatro."]] };
    var futebol = { t: "Futebol", s: [["Manhã", "Museu e estádio do River Plate (Monumental), em Núñez."], ["Tarde", "Se houver jogo, viver a torcida argentina é inesquecível."], ["Noite", dinner + "."]] };
    var compras = { t: "Compras e último passeio", s: [["Manhã", "Outlets da Av. Córdoba, em Villa Crespo."], ["Tarde", "Reserva Ecológica Costanera Sur, ao lado de Puerto Madero."], ["Noite", "Jantar de despedida."]] };

    // Orden según los gustos: lo que más le interesa va antes (por si tiene pocos días).
    if (has("natureza")) rest.push(tigre);
    rest.push(telmo);
    if (has("cultura")) rest.push(colon);
    rest.push(palermo);
    if (!has("natureza")) rest.push(tigre);
    if (!has("cultura")) rest.push(colon);
    if (has("futebol")) rest.push(futebol);
    rest.push(compras);
    if (!has("futebol")) rest.push(futebol);
    days = days.concat(rest).slice(0, d);
    // Con 2 días no entra el Delta: se avisa.
    var note = d < 3 ? "Com mais um dia, dá para incluir o Delta do Tigre." : "";
    return { days: days, note: note };
  }

  function prefs() {
    var f = new FormData(form), g = f.getAll("gosto");
    return { d: parseInt(f.get("dias"), 10) || 3, quem: f.get("quem") || "casal", g: g };
  }

  var wa = document.querySelector("[data-guia-wa]");
  function render() {
    var p = prefs(), r = plan(p.d, p.quem, p.g), h = "", txt = [];
    for (var i = 0; i < r.days.length; i++) {
      var day = r.days[i];
      h += '<li class="gg-day"><h3>Dia ' + (i + 1) + " · " + day.t + "</h3>";
      txt.push("Dia " + (i + 1) + " - " + day.t);
      for (var j = 0; j < day.s.length; j++) {
        h += "<p><b>" + day.s[j][0] + ":</b> " + day.s[j][1] + "</p>";
        txt.push("  " + day.s[j][0] + ": " + strip(day.s[j][1]));
      }
      h += "</li>";
    }
    out.innerHTML = '<ol class="gg-days">' + h + "</ol>" + (r.note ? '<p class="gg-note">' + r.note + "</p>" : "") +
      '<p class="gg-note">Último dia: deixe o ' + L.tras + " ao aeroporto combinado (Ezeiza fica a cerca de 1 hora).</p>";
    if (wa) {
      try {
        var u = new URL(wa.getAttribute("data-wa-base"), location.href), base = u.searchParams.get("text") || "";
        var who = { casal: "casal", familia: "família com crianças", amigos: "amigos", sozinho: "sozinho(a)" }[p.quem] || p.quem;
        // encodeURIComponent (espacios como %20): WhatsApp no siempre traduce el "+" a espacio.
        wa.href = u.origin + u.pathname + "?text=" + encodeURIComponent(base + "\n\n" + p.d + " dias, " + who + "\n" + txt.join("\n") + "\n\nPodem me ajudar a reservar?");
      } catch (e) { /* sin URL: queda el enlace con el mensaje base */ }
    }
  }

  // ?dias=4 (los botones de la portada) preselecciona los días.
  var q = /[?&]dias=(\d)/.exec(location.search);
  if (q) { var r0 = form.querySelector('input[name="dias"][value="' + q[1] + '"]'); if (r0) r0.checked = true; }
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });
  render();

  var pr = document.querySelector("[data-guia-print]");
  if (pr) { pr.hidden = false; pr.addEventListener("click", function () { window.print(); }); }

  // Checklist: se guarda en este navegador (si el almacenamiento no está disponible, igual funciona en la página).
  var box = document.querySelector("[data-guia-check]"), prog = document.querySelector("[data-guia-prog]"), KEY = "gv_guia_check";
  if (!box) return;
  var inputs = box.querySelectorAll("input"), saved = [];
  try { saved = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { saved = []; }
  for (var k = 0; k < inputs.length; k++) if (saved.indexOf(inputs[k].value) >= 0) inputs[k].checked = true;
  function upd() {
    var on = [];
    for (var k = 0; k < inputs.length; k++) if (inputs[k].checked) on.push(inputs[k].value);
    try { localStorage.setItem(KEY, JSON.stringify(on)); } catch (e) { /* modo privado */ }
    if (prog) {
      prog.hidden = false;
      prog.querySelector("i").style.width = Math.round((on.length / inputs.length) * 100) + "%";
      prog.querySelector("b").textContent = on.length === inputs.length ? "Tudo pronto. Boa viagem!" : on.length + " de " + inputs.length + " prontos";
    }
  }
  box.addEventListener("change", upd);
  upd();
})();

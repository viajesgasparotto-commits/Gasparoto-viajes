/* Capa de conversión — sin dependencias. Configuración en window.__GV (la inyecta functions/lib/brand.js). */
(function () {
  "use strict";
  var G = window.__GV || {};
  var doc = document;
  var L = G.lang === "es"
    ? { voucher: "Descargar voucher", sentTitle: "Tu consulta está lista", sentBody: "Abrimos WhatsApp con los datos de tu reserva. Solo falta enviar el mensaje.", okTitle: "Recibimos tu consulta", okBody: "Te respondemos a la brevedad por WhatsApp.", nameBad: "Escribí tu nombre para continuar.", phoneBad: "Ingresá un WhatsApp válido, con código de área.", paxBad: "Indicá entre {a} y {b} personas.", dateBad: "Elegí una fecha del calendario.", left: "Quedan {n} lugares ese día.", leftOne: "Queda 1 lugar ese día.", noDays: "No hay fechas disponibles por ahora. Escribinos y lo vemos.", calErr: "No pudimos cargar la disponibilidad. Probá de nuevo.", name: "Nombre", phone: "WhatsApp", date: "Fecha", pax: "Personas", notes: "Comentarios", hello: "Hola, quiero reservar", bkTitle: "Reserva pendiente", bkBody: "Te guardamos el lugar. Para confirmarla escribinos por WhatsApp antes de que termine el tiempo.", bkRef: "Reserva #{id} · {date} · {n} personas", bkTotal: " · Total {total}", bkHold: "Lugar guardado por {t}", bkNote: "Si no se confirma a tiempo, el lugar se libera para otros viajeros.", bkOver: "Se terminó el tiempo", bkOverNote: "El lugar se liberó. Si todavía hay disponibilidad, podés volver a reservar.", bkRelease: "Cancelar esta reserva", bkRelTitle: "Reserva cancelada", bkRelBody: "Liberamos tu lugar. Cuando quieras, podés elegir otra fecha.", bkWa: "*Reserva #{id}* · {pkg}\n\u{1F4C5} {date}\n\u{1F465} {n}\n\u{1F464} {name}\n\nHola, quiero confirmarla.", bkFull: "Ese día ya no tiene lugar para esa cantidad de personas. Elegí otra fecha o menos personas.", bkGone: "Esa fecha ya no está disponible. Elegí otra.", bkLimit: "Ya tenés reservas pendientes. Confirmalas o cancelalas antes de hacer otra.", bkRate: "Demasiados intentos. Probá de nuevo en unos minutos.", bkErr: "No pudimos crear la reserva. Probá de nuevo o escribinos por WhatsApp.", bkSending: "Reservando…", payPix: "Pagar con Pix", bkBodyPay: "Te guardamos el lugar. Pagá con Pix para confirmarla ahora, o escribinos por WhatsApp.", payTitle: "Pagá con Pix", payScan: "Escaneá el QR con la app de tu banco o copiá el código Pix.", payCopy: "Copiar código Pix", payCopied: "¡Código copiado!", payWait: "Esperando el pago… se confirma solo, no cierres esta página.", payBusy: "Generando código…", payErr: "No pudimos generar el código Pix. Probá de nuevo o escribinos por WhatsApp.", paidTitle: "¡Pago recibido!", paidBody: "Tu reserva está confirmada. Nos ponemos en contacto por WhatsApp con los detalles.", paidWa: "\u{2705} *Pago recibido · Reserva #{id}*\n\u{1F4E6} {pkg}\n\u{1F4C5} {date}\n\u{1F465} {n}\n\u{1F464} {name}\n\nHola, ya pagué la reserva.", person: "persona", people: "personas", adultOne: "adulto", adultMany: "adultos", childOne: "niño", childMany: "niños", sumTotal: "Total", sumPickDate: "Elegí una fecha", sumNote: "Todavía no se cobra nada: primero guardamos tu lugar.", sumNotePix: "Todavía no se cobra nada. Después pagás con Pix el monto exacto de arriba.", trSaved: "Lugar guardado", trPay: "Pago con Pix", trWa: "Confirmar por WhatsApp", trDone: "Reserva confirmada", icsBtn: "Agregar a mi calendario", payAmount: "Total a pagar: {t}", dPkg: "Paquete", dDate: "Fecha", dPax: "Personas", dTotal: "Total", dRef: "Referencia", sumHold: "Guardamos tu lugar {n} minutos después de reservar.", nextPix: "Pagá con Pix ahora para confirmar tu lugar.", nextWa: "Confirmalo por WhatsApp antes de que venza el plazo para asegurar tu lugar.", nextPaid: "Listo: te escribimos por WhatsApp con los detalles del viaje.", fullLeft: "Ese día quedan {n} lugares. Bajá la cantidad de personas o elegí otra fecha.", fullNo: "Ese día ya no tiene lugar. Elegí otra fecha.", rcNoDate: "A coordinar", rcPax1: "1 persona", rcPaxN: "{n} personas", timeBad: "Elegí un horario para continuar.", timeFull: "Sin lugar", timeLeft: "Quedan {n} lugares a las {t}", timeLeftOne: "Queda 1 lugar a las {t}", timeGone: "Ese horario ya no está disponible. Elegí otro.", fullTimeLeft: "A las {t} quedan {n} lugares. Bajá la cantidad de personas o elegí otro horario.", fullTimeNo: "A las {t} ya no hay lugar. Elegí otro horario.", dTime: "Horario", slotLeft: "Quedan {n}", slotLeftOne: "Queda 1", slotShort: "Solo {n}", timeAdj: "Ajustamos a {n} personas: es lo que queda a las {t}.", timeAdjOne: "Ajustamos a 1 persona: es lo que queda a las {t}.", timeAria: "{t}, {s}", timeHint: "Elegí un horario para continuar.", opt: "Opción", itDay: "Día {n}", itPickDay: "Día", itPickTime: "Horario", itNo: "sin lugar", itLeft: "quedan {n}", itLoading: "Cargando el itinerario…", itTime: "Elegí el horario de {t}.", itFull: "{t} ya no tiene lugar el {d}. Elegí otra fecha de inicio u otro día.", itGen: "Revisá el itinerario: falta elegir un día u horario.", bdDisc: "Descuento del paquete ({p}%)", bdPer: "Precio por persona", dItin: "Itinerario", waItin: "\u{1F5D3} Itinerario:", waTotal: "\u{1F4B0} Total {t}", sumStart: "Inicio: {d}" }
    : { voucher: "Baixar voucher", sentTitle: "Sua consulta está pronta", sentBody: "Abrimos o WhatsApp com os dados da sua reserva. Falta só enviar a mensagem.", okTitle: "Recebemos seu pedido", okBody: "Respondemos em breve pelo WhatsApp.", nameBad: "Digite seu nome para continuar.", phoneBad: "Informe um WhatsApp válido, com DDD.", paxBad: "Informe entre {a} e {b} pessoas.", dateBad: "Escolha uma data no calendário.", left: "Restam {n} vagas nesse dia.", leftOne: "Resta 1 vaga nesse dia.", noDays: "Não há datas disponíveis por enquanto. Escreva para nós e resolvemos.", calErr: "Não foi possível carregar a disponibilidade. Tente de novo.", name: "Nome", phone: "WhatsApp", date: "Data", pax: "Pessoas", notes: "Comentários", hello: "Olá, quero reservar", bkTitle: "Reserva pendente", bkBody: "Guardamos a sua vaga. Para confirmar, escreva para nós no WhatsApp antes de o tempo acabar.", bkRef: "Reserva #{id} · {date} · {n} pessoas", bkTotal: " · Total {total}", bkHold: "Vaga guardada por {t}", bkNote: "Se não for confirmada a tempo, a vaga é liberada para outros viajantes.", bkOver: "O tempo acabou", bkOverNote: "A vaga foi liberada. Se ainda houver disponibilidade, você pode reservar de novo.", bkRelease: "Cancelar esta reserva", bkRelTitle: "Reserva cancelada", bkRelBody: "Liberamos a sua vaga. Quando quiser, escolha outra data.", bkWa: "*Reserva #{id}* · {pkg}\n\u{1F4C5} {date}\n\u{1F465} {n}\n\u{1F464} {name}\n\nOlá, quero confirmá-la.", bkFull: "Esse dia não tem mais vagas para essa quantidade de pessoas. Escolha outra data ou menos pessoas.", bkGone: "Essa data não está mais disponível. Escolha outra.", bkLimit: "Você já tem reservas pendentes. Confirme ou cancele antes de fazer outra.", bkRate: "Muitas tentativas. Tente de novo em alguns minutos.", bkErr: "Não foi possível criar a reserva. Tente de novo ou escreva para nós no WhatsApp.", bkSending: "Reservando…", payPix: "Pagar com Pix", bkBodyPay: "Guardamos a sua vaga. Pague com Pix para confirmá-la agora, ou escreva para nós no WhatsApp.", payTitle: "Pague com Pix", payScan: "Escaneie o QR no app do seu banco ou copie o código Pix.", payCopy: "Copiar código Pix", payCopied: "Código copiado!", payWait: "Aguardando o pagamento… a confirmação é automática, não feche esta página.", payBusy: "Gerando código…", payErr: "Não foi possível gerar o código Pix. Tente de novo ou escreva para nós no WhatsApp.", paidTitle: "Pagamento recebido!", paidBody: "Sua reserva está confirmada. Entraremos em contato pelo WhatsApp com os detalhes.", paidWa: "\u{2705} *Pagamento recebido · Reserva #{id}*\n\u{1F4E6} {pkg}\n\u{1F4C5} {date}\n\u{1F465} {n}\n\u{1F464} {name}\n\nOlá, já paguei a reserva.", person: "pessoa", people: "pessoas", adultOne: "adulto", adultMany: "adultos", childOne: "criança", childMany: "crianças", sumTotal: "Total", sumPickDate: "Escolha uma data", sumNote: "Nada é cobrado agora: primeiro guardamos a sua vaga.", sumNotePix: "Nada é cobrado agora. Depois você paga com Pix o valor exato acima.", trSaved: "Vaga guardada", trPay: "Pagamento com Pix", trWa: "Confirmar pelo WhatsApp", trDone: "Reserva confirmada", icsBtn: "Adicionar ao meu calendário", payAmount: "Total a pagar: {t}", dPkg: "Pacote", dDate: "Data", dPax: "Pessoas", dTotal: "Total", dRef: "Referência", sumHold: "Guardamos a sua vaga por {n} minutos depois da reserva.", nextPix: "Pague com Pix agora para confirmar a sua vaga.", nextWa: "Confirme pelo WhatsApp antes de o prazo acabar para garantir a sua vaga.", nextPaid: "Pronto: escrevemos pelo WhatsApp com os detalhes da viagem.", fullLeft: "Esse dia tem {n} vagas. Diminua a quantidade de pessoas ou escolha outra data.", fullNo: "Esse dia não tem mais vagas. Escolha outra data.", rcNoDate: "A combinar", rcPax1: "1 pessoa", rcPaxN: "{n} pessoas", timeBad: "Escolha um horário para continuar.", timeFull: "Sem vagas", timeLeft: "Restam {n} vagas às {t}", timeLeftOne: "Resta 1 vaga às {t}", timeGone: "Esse horário não está mais disponível. Escolha outro.", fullTimeLeft: "Às {t} restam {n} vagas. Diminua a quantidade de pessoas ou escolha outro horário.", fullTimeNo: "Às {t} não há mais vagas. Escolha outro horário.", dTime: "Horário", slotLeft: "Restam {n}", slotLeftOne: "Resta 1", slotShort: "Só {n}", timeAdj: "Ajustamos para {n} pessoas: é o que resta às {t}.", timeAdjOne: "Ajustamos para 1 pessoa: é o que resta às {t}.", timeAria: "{t}, {s}", timeHint: "Escolha um horário para continuar.", opt: "Opção", itDay: "Dia {n}", itPickDay: "Dia", itPickTime: "Horário", itNo: "sem vagas", itLeft: "restam {n}", itLoading: "Carregando o roteiro…", itTime: "Escolha o horário de {t}.", itFull: "{t} não tem mais vagas em {d}. Escolha outra data de início ou outro dia.", itGen: "Revise o roteiro: falta escolher um dia ou horário.", bdDisc: "Desconto do pacote ({p}%)", bdPer: "Preço por pessoa", dItin: "Roteiro", waItin: "\u{1F5D3} Roteiro:", waTotal: "\u{1F4B0} Total {t}", sumStart: "Início: {d}" };

  // Textos del precio de niños por edad (tramos que se configuran en el panel).
  var KL = G.lang === "es"
    ? { free: "gratis", at: "al {p}%", age: "Edad", child: "Niño {n}", less1: "Menos de 1 año", one: "1 año", n: "{n} años", agesLbl: "edades", agesBad: "Indicá la edad de cada niño." }
    : { free: "grátis", at: "a {p}%", age: "Idade", child: "Criança {n}", less1: "Menos de 1 ano", one: "1 ano", n: "{n} anos", agesLbl: "idades", agesBad: "Informe a idade de cada criança." };

  var WA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.5c.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"/><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>';

  function waUrl(text) {
    return G.wa ? "https://wa.me/" + G.wa + "?text=" + encodeURIComponent(text) : "/reservas/";
  }

  // ---- Medición: dataLayer / gtag / fbq + registro en el panel (consultas) ----
  var sent = {};
  function track(item, source) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "gv_whatsapp_click", item: item || "", page: location.pathname });
      if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { method: "whatsapp", item_name: item || "" });
      if (typeof window.fbq === "function") window.fbq("track", "Contact");
    } catch (e) {}
    var key = (item || "") + "|" + location.pathname;
    if (!G.leads || sent[key] && Date.now() - sent[key] < 30000) return;
    sent[key] = Date.now();
    try {
      var body = JSON.stringify({ source: "whatsapp", package: item || "", page: location.pathname, message: source || "" });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/lead", new Blob([body], { type: "application/json" }));
      else fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: body, keepalive: true });
    } catch (e) {}
  }

  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.hasAttribute("data-gv-nolog")) return;
    var href = a.getAttribute("href") || "";
    if (a.hasAttribute("data-gv-wa") || /^https?:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) {
      track(a.getAttribute("data-gv-wa") || "", a.hasAttribute("data-gv-bar") ? "barra" : "boton");
    }
  }, true);

  // ---- Botón flotante de WhatsApp (solo si la página no trae uno propio) ----
  function fab() {
    if (!G.wa || doc.querySelector(".tw-fab")) return;
    var a = doc.createElement("a");
    a.className = "tw-fab";
    a.setAttribute("data-gv-wa", "flotante");
    a.setAttribute("aria-label", G.waAria || "WhatsApp");
    a.href = waUrl(G.waGeneric || "Hola");
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = WA_SVG;
    doc.body.appendChild(a);
  }

  // ---- Formulario de consulta de la ficha de paquete ----
  // Dos pasos: 1) Tu viaje (fecha y personas) y 2) Tus datos (nombre, teléfono, comentarios). El teléfono del visitante no se pide (le llega a la agencia con el mensaje de WhatsApp);
  // solo se muestra el campo phone si la agencia no tiene número configurado (el servidor decide).
  // Al enviar: abre wa.me con los datos y guarda la consulta en el panel (si hay base). fx.ts anima los eventos gv:* con Motion.
  function emit(el, name, detail) { el.dispatchEvent(new CustomEvent("gv:" + name, { bubbles: true, detail: detail || {} })); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function today() { var t = new Date(); return t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate()); }
  function niceDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : ""; }

  // Fecha y horario en una sola línea: "03/11/2026 · 09:00 h". El horario sale de la respuesta del servidor o del formulario.
  function whenOf(d, j) { var t = (j && j.time) || (d && d.time) || ""; return niceDate(d && d.date) + (t ? " \u00b7 " + t + " h" : ""); }

  function leadForms() {
    var forms = doc.querySelectorAll("form[data-gv-lead]");
    Array.prototype.forEach.call(forms, function (f) {
      var msgs = f.querySelectorAll(".gv-lead-msg"), msg = msgs[0]; // un mensaje de estado por paso: msg apunta al del paso visible
      var fields = f.querySelector("[data-fields]"), sentBox = f.querySelector("[data-sent]");
      var q = function (n) { return f.querySelector('[name="' + n + '"]'); };
      var dateEl = q("date"), paxEl = q("pax"), nameEl = q("name"), phoneEl = q("phone");
      var timeEl = q("time"), timesBox = f.querySelector("[data-times]"), timeList = f.querySelector("[data-time-list]"); // reserva por horario (solo si el paquete la tiene)
      var errOf = function (el) { return el && f.querySelector('[data-err="' + el.name + '"]'); };
      var minus = f.querySelector('[data-pax="-1"]'), plus = f.querySelector('[data-pax="1"]');
      if (dateEl) dateEl.min = today();

      function setErr(el, text) {
        var p = errOf(el);
        if (!el || !p) return;
        if (text) { el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", p.id); p.textContent = text; p.hidden = false; }
        else { el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); p.textContent = ""; p.hidden = true; }
      }
      // Límites de personas: 1–99 por defecto; en paquetes con reserva por fecha los fija el panel (mínimo/máximo) y el cupo del día elegido (curMax).
      var PMIN = Number(f.getAttribute("data-min-pax")) || 1, PMAX = Number(f.getAttribute("data-max-pax")) || 99, curMax = PMAX;
      // Paquetes/servicios que aceptan niños: el formulario trae Adultos y Niños; "pax" es un campo oculto que siempre vale adultos + niños,
      // así el mínimo/máximo, el cupo del día, el total y la reserva siguen funcionando con el total de personas.
      var kidsOn = f.hasAttribute("data-kids"), adEl = q("adults"), chEl = q("children");
      // Tramos de precio por edad (data-kid-tiers): [{from,to,pct}]. Sin tramos, los niños pagan el precio completo y no se pregunta la edad.
      var kidTiers = []; try { kidTiers = JSON.parse(f.getAttribute("data-kid-tiers") || "[]") || []; } catch (e) { kidTiers = []; }
      // Paquete que combina servicios (data-kid-mode="tab"): el % sale de la política de cada servicio y se muestra por edad ("1 niño de 6 años × R$ 310").
      var kidTab = f.getAttribute("data-kid-mode") === "tab";
      var agesBox = f.querySelector("[data-ages]"), agesList = f.querySelector("[data-ages-list]"), agesErr = f.querySelector('[data-err="ages"]');
      function kidPct(age) { for (var i = 0; i < kidTiers.length; i++) if (age >= kidTiers[i].from && age <= kidTiers[i].to) return kidTiers[i].pct; return 100; }
      function getAges() { var out = []; if (agesList) Array.prototype.forEach.call(agesList.querySelectorAll("select"), function (s) { out.push(s.value === "" ? null : Number(s.value)); }); return out; }
      function ageOpts() { var h = '<option value="">' + KL.age + "</option>"; for (var i = 0; i <= 17; i++) h += '<option value="' + i + '">' + (i === 0 ? KL.less1 : i === 1 ? KL.one : KL.n.replace("{n}", i)) + "</option>"; return h; }
      // Un selector de edad por cada niño; conserva lo ya elegido al sumar o quitar niños.
      function renderAges() {
        if (!agesBox || !kidTiers.length) return;
        var c = Math.max(0, Math.round(Number(chEl.value)) || 0);
        agesBox.hidden = c < 1;
        while (agesList.children.length > c) agesList.removeChild(agesList.lastChild);
        for (var i = agesList.children.length; i < c; i++) {
          var w = doc.createElement("div");
          w.innerHTML = '<label class="tw-label-f" for="gv-age-' + i + '">' + KL.child.replace("{n}", i + 1) + '</label><select id="gv-age-' + i + '" class="tw-field mt-1.5">' + ageOpts() + "</select>";
          w.querySelector("select").addEventListener("change", function () { if (agesErr) { agesErr.hidden = true; agesErr.textContent = ""; } });
          agesList.appendChild(w);
        }
      }
      function kidsFit() {
        var max = Math.max(1, curMax), a = Math.max(1, Math.round(Number(adEl.value)) || 1), c = Math.max(0, Math.round(Number(chEl.value)) || 0);
        if (a > max) a = max;
        if (a + c > max) c = max - a;
        if (a + c < PMIN) a = PMIN - c;
        adEl.value = a; chEl.value = c; paxEl.value = a + c;
      }
      function qtyBtn(kind, dir) { return f.querySelector('[data-qty="' + kind + ':' + dir + '"]'); }
      function kidsDetail(d) {
        var a = Math.round(Number(d && d.adults)) || 0, c = Math.round(Number(d && d.children)) || 0;
        var ag = kidTiers.length ? getAges().filter(function (x) { return x !== null; }) : [];
        return kidsOn && c > 0 ? a + " " + (a === 1 ? L.adultOne : L.adultMany) + " + " + c + " " + (c === 1 ? L.childOne : L.childMany) + (ag.length === c ? ", " + KL.agesLbl + " " + ag.join(", ") : "") : "";
      }
      // Reemplaza "{n} personas" (o "{n}") por el total y, si viajan niños, el detalle entre paréntesis.
      function nPax(tpl, n, d) { var det = kidsDetail(d); return det ? tpl.replace("{n} " + L.people, n + " " + L.people + " (" + det + ")").replace("{n}", n) : tpl.replace("{n}", n); }
      function leadMsg(d) { var m = String(d.message || "").trim(), det = kidsDetail(d); return det ? det + (m ? " \u00b7 " + m : "") : m; }
      function clampPax() { if (kidsOn) { kidsFit(); return Number(paxEl.value); } var n = Math.round(Number(paxEl.value)); return isFinite(n) ? Math.min(curMax, Math.max(PMIN, n)) : Math.min(curMax, Math.max(PMIN, 2)); }
      function paxMsg() { return L.paxBad.replace("{a}", PMIN).replace("{b}", curMax); }
      function syncPax() {
        if (kidsOn) {
          kidsFit(); renderAges();
          var a = Number(adEl.value), c = Number(chEl.value), t = a + c, set = function (kind, dir, off) { var b = qtyBtn(kind, dir); if (b) b.disabled = off; };
          set("adults", -1, a <= 1 || t <= PMIN); set("adults", 1, t >= curMax); set("children", -1, c <= 0 || t <= PMIN); set("children", 1, t >= curMax);
          return;
        }
        var n = Number(paxEl.value) || 1; if (minus) minus.disabled = n <= PMIN; if (plus) plus.disabled = n >= curMax;
      }
      syncPax();
      if (kidsOn) {
        Array.prototype.forEach.call(f.querySelectorAll("[data-qty]"), function (b) {
          b.addEventListener("click", function () {
            var p = b.getAttribute("data-qty").split(":"), el = p[0] === "adults" ? adEl : chEl;
            el.value = Math.max(p[0] === "adults" ? 1 : 0, (Math.round(Number(el.value)) || 0) + Number(p[1]));
            msg.className = "gv-lead-msg"; msg.textContent = "";
            syncPax(); emit(f, "pax", { el: el });
          });
        });
        [adEl, chEl].forEach(function (el) {
          el.addEventListener("input", function () { paxEl.value = (Math.round(Number(adEl.value)) || 0) + (Math.round(Number(chEl.value)) || 0); });
          el.addEventListener("blur", function () { if (el.value !== "") syncPax(); });
        });
      }

      Array.prototype.forEach.call(f.querySelectorAll("[data-pax]"), function (b) {
        b.addEventListener("click", function () {
          paxEl.value = Math.min(curMax, Math.max(PMIN, clampPax() + Number(b.getAttribute("data-pax"))));
          msg.className = "gv-lead-msg"; msg.textContent = "";
          syncPax(); emit(f, "pax", { el: paxEl });
        });
      });
      paxEl.addEventListener("input", syncPax);
      if (!kidsOn) paxEl.addEventListener("blur", function () { if (paxEl.value !== "") { paxEl.value = clampPax(); syncPax(); } });
      [nameEl, phoneEl].forEach(function (el) { if (el) el.addEventListener("input", function () { setErr(el, ""); }); });

      // ---- Itinerario de un paquete que combina servicios (form[data-bundle]) ----
      // Al elegir la fecha de inicio se pide /api/avail?start=: un renglón por servicio con su día (y horario). En modo "libre" el cliente puede
      // mover cada servicio dentro de los días del paquete; si la agencia no fijó el horario de un servicio que se reserva por horario, lo elige él.
      // El campo oculto "plan" lleva la elección al servidor y el máximo de personas pasa a ser el del servicio con menos lugar.
      var BU = null; try { BU = JSON.parse(f.getAttribute("data-bundle") || "null"); } catch (e) { BU = null; }
      var itList = f.querySelector("[data-itin-list]"), itHint = f.querySelector("[data-itin-hint]"), itHintTxt = itHint ? itHint.textContent : "", planEl = q("plan"), itErr = f.querySelector('[data-err="plan"]');
      var IT = null, SEL = {}, calLeft = PMAX, itReq = 0;
      var fShort = new Intl.DateTimeFormat(G.lang === "es" ? "es-AR" : "pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
      function shortDay(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? fShort.format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))) : ""; }
      function itDayN(day) { return Math.round((Date.parse(day + "T00:00:00Z") - Date.parse(IT.start + "T00:00:00Z")) / 864e5) + 1; }
      function itOpt(it, day) { var d = day || SEL[it.slug].day; for (var i = 0; i < it.days.length; i++) if (it.days[i].day === d) return it.days[i]; return null; }
      function bestSlot(o) { var m = 0; (o ? o.slots : []).forEach(function (x) { if (x.left > m) m = x.left; }); return m; }
      // Lugares que quedan para un servicio con el día/horario elegido (null = el servicio no limita: no se reserva por fecha).
      function itLeft(it, day) {
        if (!it.reservable) return null;
        var o = itOpt(it, day); if (!o) return 0;
        if (!it.pick_time) return o.left;
        var t = !day || day === SEL[it.slug].day ? SEL[it.slug].time : "";
        if (!t) return bestSlot(o);
        for (var i = 0; i < o.slots.length; i++) if (o.slots[i].t === t) return o.slots[i].left;
        return 0;
      }
      function itMax() { var m = null; if (IT) IT.items.forEach(function (it) { var l = itLeft(it); if (l != null) m = m == null ? l : Math.min(m, l); }); return m; }
      function autoTime(it) { if (!it.pick_time || SEL[it.slug].time) return; var o = itOpt(it), open = (o ? o.slots : []).filter(function (x) { return x.left > 0; }); if (open.length === 1) SEL[it.slug].time = open[0].t; }
      function itErrClear() { if (itErr) { itErr.hidden = true; itErr.textContent = ""; } if (itList) Array.prototype.forEach.call(itList.querySelectorAll("[data-bad]"), function (x) { x.removeAttribute("data-bad"); }); }
      function itSync(quiet) {
        if (planEl) planEl.value = IT ? JSON.stringify(IT.items.map(function (it) { return { slug: it.slug, day: SEL[it.slug].day, time: SEL[it.slug].time || "" }; })) : "";
        if (!IT) return;
        var m = itMax(); curMax = Math.max(1, Math.min(PMAX, calLeft, m == null ? PMAX : m)); paxEl.value = clampPax(); syncPax();
        if (!quiet) emit(f, "pax", { el: planEl });
      }
      function leftLbl(n) { return n == null ? "" : n <= 0 ? L.itNo : n <= 5 ? L.itLeft.replace("{n}", n) : ""; }
      function itLines(list) { return (list || []).map(function (x) { return "\u2022 " + shortDay(x.day) + (x.time ? " " + x.time : "") + " \u00b7 " + x.title + (x.option ? " (" + x.option + ")" : ""); }); }
      function itNow() { return IT ? IT.items.map(function (it) { return { title: it.title, option: it.option, day: SEL[it.slug].day, time: SEL[it.slug].time || "" }; }).sort(function (a, b) { return (a.day + a.time) < (b.day + b.time) ? -1 : 1; }) : []; }
      function sel(lbl, attr, slug, opts, onChange) {
        var w = doc.createElement("label"), se = doc.createElement("select");
        w.appendChild(doc.createTextNode(lbl)); se.setAttribute(attr, slug);
        opts.forEach(function (o) { var op = doc.createElement("option"); op.value = o.v; op.textContent = o.t; if (o.off) op.disabled = true; if (o.on) op.selected = true; se.appendChild(op); });
        se.addEventListener("change", function () { onChange(se.value); itErrClear(); itSync(); itRender(); var again = itList.querySelector("[" + attr + '="' + slug + '"]'); if (again) again.focus(); });
        w.appendChild(se); return w;
      }
      function itRender() {
        if (!itList) return;
        itList.textContent = ""; itList.hidden = !IT;
        if (itHint) { itHint.hidden = !!IT; if (!IT) itHint.textContent = itHintTxt; }
        if (!IT) return;
        var pax = Math.round(Number(paxEl.value)) || PMIN;
        IT.items.forEach(function (it) {
          var s = SEL[it.slug], li = doc.createElement("li"), head = doc.createElement("div"), nm = doc.createElement("div"), b = doc.createElement("b"), dd = doc.createElement("span"), ctl = doc.createElement("div");
          li.className = "gvi-r"; li.setAttribute("data-slug", it.slug); head.className = "gvi-h"; dd.className = "gvi-d"; ctl.className = "gvi-ctl";
          b.textContent = it.title; nm.appendChild(b);
          if (it.option) { var sm = doc.createElement("small"); sm.textContent = it.option; nm.appendChild(sm); }
          dd.textContent = L.itDay.replace("{n}", itDayN(s.day)) + " \u00b7 " + shortDay(s.day) + (s.time ? " \u00b7 " + s.time : "");
          head.appendChild(nm); head.appendChild(dd); li.appendChild(head);
          if (IT.mode === "libre" && it.days.length > 1)
            ctl.appendChild(sel(L.itPickDay, "data-itd", it.slug, it.days.map(function (o) { var l = itLeft(it, o.day); return { v: o.day, t: L.itDay.replace("{n}", itDayN(o.day)) + " \u00b7 " + shortDay(o.day) + (leftLbl(l) ? " \u00b7 " + leftLbl(l) : ""), off: l != null && l < pax && o.day !== s.day, on: o.day === s.day }; }),
              function (v) { SEL[it.slug] = { day: v, time: it.time || "" }; autoTime(it); }));
          if (it.pick_time) {
            var o = itOpt(it);
            ctl.appendChild(sel(L.itPickTime, "data-itt", it.slug, [{ v: "", t: L.itPickTime + "\u2026", on: !s.time }].concat((o ? o.slots : []).map(function (x) { return { v: x.t, t: x.t + (leftLbl(x.left) ? " \u00b7 " + leftLbl(x.left) : ""), off: x.left < pax && x.t !== s.time, on: x.t === s.time }; })),
              function (v) { SEL[it.slug].time = v; }));
          }
          if (ctl.children.length) li.appendChild(ctl);
          itList.appendChild(li);
        });
      }
      // Elige el día sugerido de cada servicio (o el primero con lugar para las personas elegidas) y, si hay un solo horario libre, ese horario.
      function itinLoad(day, left) {
        calLeft = left == null ? PMAX : left; IT = null; SEL = {}; itErrClear(); itRender();
        if (itHint) itHint.textContent = L.itLoading;
        var my = ++itReq;
        fetch("/api/avail?slug=" + encodeURIComponent(f.getAttribute("data-slug") || "") + "&start=" + encodeURIComponent(day)).then(function (r) { return r.json(); })
          .then(function (d) {
            if (my !== itReq || !d || !d.items) return;
            IT = d; var pax = Math.round(Number(paxEl.value)) || PMIN;
            d.items.forEach(function (it) {
              SEL[it.slug] = { day: it.def, time: it.time || "" };
              var l = itLeft(it, it.def);
              if (l != null && l < pax) for (var i = 0; i < it.days.length; i++) { var x = itLeft(it, it.days[i].day); if (x >= pax) { SEL[it.slug].day = it.days[i].day; break; } }
              autoTime(it);
            });
            itSync(true); itRender(); emit(f, "pax", { el: planEl });
          })
          .catch(function () { if (my === itReq && itHint) itHint.textContent = L.calErr; });
      }
      function itinClear() { itReq++; IT = null; SEL = {}; calLeft = PMAX; if (planEl) planEl.value = ""; itErrClear(); itRender(); }
      if (BU) f.addEventListener("gv:pax", function (e) { if (IT && !(e.detail && e.detail.el === planEl)) itRender(); });

      // ---- Calendario de disponibilidad (solo si el paquete tiene reserva por fecha: se activa en el panel > Disponibilidad) ----
      // Pide los días abiertos a /api/avail (público) mes por mes; elegir un día llena el campo oculto "date" y limita las personas al cupo que queda.
      var calBox = f.querySelector("[data-cal]"), calApi = null;
      function initCal() {
        var loc = G.lang === "es" ? "es-AR" : "pt-BR", startDow = G.lang === "es" ? 1 : 0, slug = f.getAttribute("data-slug") || "";
        var titleEl = calBox.querySelector("[data-cal-title]"), gridEl = calBox.querySelector("[data-cal-grid]"), noteEl = calBox.querySelector("[data-cal-note]");
        var prevB = calBox.querySelector('[data-cal-nav="-1"]'), nextB = calBox.querySelector('[data-cal-nav="1"]');
        var cache = {}, meta = null, month = "", want = "", picked = "", pickedNote = "", slotMap = {}; // slotMap: horarios de cada día (día -> [{t, left}])
        var fMonth = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric", timeZone: "UTC" });
        var fWd = new Intl.DateTimeFormat(loc, { weekday: "short", timeZone: "UTC" });
        var fFull = new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
        function mdate(m, d) { var p = m.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, d || 1)); }
        function shift(m, n) { var d = mdate(m); d.setUTCMonth(d.getUTCMonth() + n); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1); }
        function leftText(n) { return n === 1 ? L.leftOne : L.left.replace("{n}", n); }
        function el(tag, cls, text) { var e = doc.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; }
        function load(m) {
          var key = m || "now";
          if (cache[key]) return Promise.resolve(cache[key]);
          return fetch("/api/avail?slug=" + encodeURIComponent(slug) + "&month=" + encodeURIComponent(m || "")).then(function (r) { return r.json(); })
            .then(function (d) { if (!d || !d.enabled) throw 0; cache[key] = cache[d.month] = d; return d; });
        }
        function mark() {
          Array.prototype.forEach.call(gridEl.querySelectorAll("button[data-day]"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-day") === picked ? "true" : "false"); });
        }
        // Con reserva por horario el cupo vale por horario: "Quedan N lugares ese día" engañaría (N es el del mejor horario), así que ahí la nota la da cada horario.
        function pick(day, left, user) {
          var byT = !!(meta && meta.by_time), was = curPax();
          picked = day; pickedNote = byT ? "" : leftText(left);
          dateEl.value = day; setErr(dateEl, "");
          pickTime("");
          curMax = Math.min(PMAX, left); paxEl.value = clampPax(); syncPax();
          if (byT && curPax() < was) pickedNote = leftText(left); // el mejor horario de ese día no alcanza para todas las personas: se avisa
          noteEl.textContent = pickedNote; mark(); renderTimes(user); emit(f, "pax", { el: paxEl });
          if (BU) itinLoad(day, left);
        }
        // 1) Botones de horario del día elegido: hora + cuántos lugares quedan (solo cuando son pocos). Sin lugar = deshabilitado.
        //    Si a un horario le quedan menos lugares que las personas ya elegidas se marca ("Solo 2"): sigue elegible, pero al tocarlo se avisa que se ajustan las personas.
        function curPax() { return Math.round(Number(paxEl.value)) || PMIN; }
        function slotSub(s, pax) {
          if (!s.left) return L.timeFull;
          if (s.left < pax) return L.slotShort.replace("{n}", s.left);
          return s.left <= 5 ? (s.left === 1 ? L.slotLeftOne : L.slotLeft.replace("{n}", s.left)) : "";
        }
        function renderTimes(reveal) {
          if (!timesBox) return;
          var list = picked ? (slotMap[picked] || []) : [], cur = timeEl.value, pax = curPax();
          timeList.textContent = "";
          timesBox.hidden = !list.length;
          list.forEach(function (s) {
            var sub = slotSub(s, pax), b = el("button", "tw-cal-day tw-slot");
            b.appendChild(el("span", "", s.t));
            if (sub) b.appendChild(el("small", "", sub));
            b.type = "button"; b.setAttribute("data-time", s.t); b.setAttribute("aria-pressed", s.t === cur ? "true" : "false");
            b.setAttribute("aria-label", sub ? L.timeAria.replace("{t}", s.t).replace("{s}", sub) : s.t);
            if (s.left && s.left < pax) b.setAttribute("data-short", "1");
            if (!s.left) b.disabled = true;
            else b.addEventListener("click", (function (t, left) { return function () { pickTime(t, left, true); }; })(s.t, s.left));
            timeList.appendChild(b);
          });
          // Un solo horario con lugar: se elige solo (un toque menos). Si hay varios, elige el cliente.
          var open = list.filter(function (s) { return s.left > 0; });
          if (!timeEl.value && open.length === 1) pickTime(open[0].t, open[0].left);
          // Después de tocar un día, los horarios aparecen debajo del calendario: en el celular quedaban fuera de pantalla.
          if (reveal && !timesBox.hidden && timesBox.scrollIntoView) {
            var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            timesBox.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
          }
        }
        // 6) Elegir un horario ajusta el cupo de personas al de ese horario. Con t vacío solo se limpia la elección.
        function pickTime(t, left) {
          if (!timeEl) return;
          timeEl.value = t || ""; setErr(timeEl, "");
          if (t) {
            var was = curPax();
            curMax = Math.min(PMAX, left); paxEl.value = clampPax(); syncPax();
            // Si el horario no alcanza para las personas que había elegido, se avisa en vez de recortar en silencio.
            var now = curPax();
            noteEl.textContent = now < was ? (now === 1 ? L.timeAdjOne : L.timeAdj.replace("{n}", now)).replace("{t}", t)
              : left === 1 ? L.timeLeftOne.replace("{t}", t) : L.timeLeft.replace("{n}", left).replace("{t}", t);
          }
          Array.prototype.forEach.call(timeList.querySelectorAll("button[data-time]"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-time") === t ? "true" : "false"); });
          emit(f, "pax", { el: timeEl });
        }
        function draw(d) {
          meta = d; month = want = d.month; Object.keys(d.slots || {}).forEach(function (k) { slotMap[k] = d.slots[k]; });
          titleEl.textContent = fMonth.format(mdate(month));
          prevB.disabled = month <= d.from_month; nextB.disabled = month >= d.to_month;
          gridEl.textContent = "";
          for (var i = 0; i < 7; i++) gridEl.appendChild(el("span", "tw-cal-wd", fWd.format(new Date(Date.UTC(2026, 0, 4 + (startDow + i) % 7)))));
          var lead = (mdate(month).getUTCDay() - startDow + 7) % 7, n = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
          for (var k = 0; k < lead; k++) gridEl.appendChild(el("span", "", ""));
          for (var day = 1; day <= n; day++) {
            var key = month + "-" + pad(day), left = d.days[key];
            if (left == null) { gridEl.appendChild(el("span", "tw-cal-day", String(day))); continue; }
            var b = el("button", "tw-cal-day", String(day));
            b.type = "button"; b.setAttribute("data-day", key); b.setAttribute("aria-label", fFull.format(mdate(month, day)) + ". " + leftText(left));
            b.addEventListener("click", (function (key, left) { return function () { pick(key, left, true); }; })(key, left));
            gridEl.appendChild(b);
          }
          mark();
          noteEl.textContent = pickedNote || (Object.keys(d.days).length ? "" : L.noDays);
          renderTimes();
        }
        function start(m, tries) {
          load(m).then(function (d) {
            if (!Object.keys(d.days).length && d.month < d.to_month && tries > 0) return start(shift(d.month, 1), tries - 1);
            draw(d);
          }).catch(function () { noteEl.textContent = L.calErr; });
        }
        Array.prototype.forEach.call(calBox.querySelectorAll("[data-cal-nav]"), function (b) {
          b.addEventListener("click", function () {
            // "want" = último mes pedido: toques seguidos avanzan de a un mes y solo se dibuja la respuesta más reciente.
            var w = shift(want || month, Number(b.getAttribute("data-cal-nav")));
            if (meta && (w < meta.from_month || w > meta.to_month)) return;
            want = w;
            load(w).then(function (d) { if (w === want) draw(d); }).catch(function () { noteEl.textContent = L.calErr; });
          });
        });
        // Cambiar las personas (botones − / +, adultos / niños) re-marca qué horarios alcanzan, sin perder el horario elegido.
        f.addEventListener("gv:pax", function (e) { if (timesBox && !timesBox.hidden && !(e.detail && e.detail.el === timeEl)) renderTimes(); });
        start("", 6);
        return {
          reset: function () { if (BU) itinClear(); picked = ""; pickedNote = ""; dateEl.value = ""; pickTime(""); curMax = PMAX; if (meta) draw(meta); else noteEl.textContent = ""; },
          // Vuelve a pedir los lugares al servidor (después de reservar, liberar o si el día se llenó) y avisa con una nota si hace falta.
          refresh: function (note, keep) {
            var was = keep ? picked : "", wasTime = keep && timeEl ? timeEl.value : "";
            if (BU) itinClear();
            cache = {}; picked = ""; pickedNote = ""; dateEl.value = ""; curMax = PMAX; paxEl.value = clampPax(); syncPax(); pickTime("");
            load(month || "").then(function (d) {
              draw(d);
              if (was && d.days[was] != null) {
                pick(was, d.days[was]); // conserva el día; si el horario elegido sigue con lugar, también se conserva
                var s = (slotMap[was] || []).filter(function (x) { return x.t === wasTime && x.left > 0; })[0];
                if (s) pickTime(s.t, s.left);
              }
              if (note) noteEl.textContent = note;
            }).catch(function () { noteEl.textContent = L.calErr; });
          },
          focus: function () { var b = gridEl.querySelector('[aria-pressed="true"]') || gridEl.querySelector("button[data-day]") || prevB; if (b) b.focus(); }
        };
      }
      if (calBox) calApi = initCal();

      // ---- Pasos del formulario: 1 = fecha y personas, 2 = datos de contacto ----
      var panels = f.querySelectorAll("[data-step]"), stepItems = f.querySelectorAll("[data-stepi]"), step = 1;
      var recapBox = f.querySelector("[data-recap]");
      function collect() { var d = {}; Array.prototype.forEach.call(f.elements, function (el) { if (el.name && !((el.type === "radio" || el.type === "checkbox") && !el.checked)) d[el.name] = el.value; }); return d; }
      function clearMsgs() { Array.prototype.forEach.call(msgs, function (m) { m.className = "gv-lead-msg"; m.textContent = ""; }); }
      // Total en centavos: adultos a precio completo + cada niño según su tramo de edad (redondeo igual al del servidor, que es quien manda).
      function calcTotal() {
        var n = Math.round(Number(paxEl.value)) || 0;
        if (!kidsOn) return unit * n;
        var a = Math.round(Number(adEl.value)) || 0, c = Math.round(Number(chEl.value)) || 0, t = unit * a, ag = getAges();
        for (var i = 0; i < c; i++) t += kidTiers.length && ag[i] !== null && ag[i] !== undefined ? Math.round(unit * kidPct(ag[i]) / 100) : unit;
        return t;
      }
      // "R$ 100 × 2 adultos + 1 niño gratis + 1 niño al 50%"
      function sumLine(n) {
        if (!kidsOn) return money(unit / 100, cur) + " × " + n + " " + (n === 1 ? L.person : L.people);
        var a = Math.round(Number(adEl.value)) || 0, c = Math.round(Number(chEl.value)) || 0, parts = [money(unit / 100, cur) + " × " + a + " " + (a === 1 ? L.adultOne : L.adultMany)];
        if (c > 0) {
          if (!kidTiers.length) parts.push(c + " " + (c === 1 ? L.childOne : L.childMany));
          else {
            var by = {}, order = [], ag = getAges();
            if (kidTab) { for (var j = 0; j < c; j++) parts.push("1 " + L.childOne + (ag[j] === null || ag[j] === undefined ? "" : " (" + KL.n.replace("{n}", ag[j]) + ")")); }
            else {
            for (var i = 0; i < c; i++) { var pc = ag[i] === null || ag[i] === undefined ? 100 : kidPct(ag[i]); if (!(pc in by)) { by[pc] = 0; order.push(pc); } by[pc]++; }
            order.forEach(function (pc) { parts.push(by[pc] + " " + (by[pc] === 1 ? L.childOne : L.childMany) + (pc === 0 ? " " + KL.free : pc < 100 ? " " + KL.at.replace("{p}", pc) : "")); });
            }
          }
        }
        return parts.join(" + ");
      }
      // Desglose del total: composición del precio del paquete (servicios − descuento) y cuánto paga cada grupo (adultos, niños por tramo de edad).
      function breakRows(n) {
        var rows = [], m = function (c) { return money(c / 100, cur); };
        if (BU && BU.comp && !optSel()) {
          BU.comp.forEach(function (c) { rows.push(["c", c.t + (c.o ? " \u00b7 " + c.o : ""), m(c.u)]); });
          if (BU.disc) rows.push(["d", L.bdDisc.replace("{p}", BU.disc), "\u2212" + m(BU.sum - unit)]);
          rows.push(["s", L.bdPer, m(unit)]);
        }
        if (!kidsOn) { rows.push(["p", n + " " + (n === 1 ? L.person : L.people) + " \u00d7 " + m(unit), m(unit * n)]); return rows; }
        var a = Math.round(Number(adEl.value)) || 0, c = Math.round(Number(chEl.value)) || 0, ag = getAges(), by = {}, order = [];
        rows.push(["p", a + " " + (a === 1 ? L.adultOne : L.adultMany) + " \u00d7 " + m(unit), m(unit * a)]);
        if (kidTab) {
          for (var j = 0; j < c; j++) {
            var has = ag[j] !== null && ag[j] !== undefined, ea = has ? Math.round(unit * kidPct(ag[j]) / 100) : unit;
            rows.push(["p", "1 " + L.childOne + (has ? " (" + KL.n.replace("{n}", ag[j]) + ")" : "") + (ea === 0 ? " " + KL.free : " \u00d7 " + m(ea)), m(ea)]);
          }
          return rows;
        }
        for (var i = 0; i < c; i++) { var pc = kidTiers.length && ag[i] !== null && ag[i] !== undefined ? kidPct(ag[i]) : 100; if (!(pc in by)) { by[pc] = 0; order.push(pc); } by[pc]++; }
        order.forEach(function (pc) {
          var k = by[pc], each = Math.round(unit * pc / 100), lbl = k + " " + (k === 1 ? L.childOne : L.childMany);
          rows.push(["p", pc === 0 ? lbl + " " + KL.free : pc < 100 ? lbl + " " + KL.at.replace("{p}", pc) + " \u00d7 " + m(each) : lbl + " \u00d7 " + m(each), m(each * k)]);
        });
        return rows;
      }
      function updRecap() {
        if (!recapBox) return;
        var n = Math.round(Number(paxEl.value)) || 0, dv = dateEl ? dateEl.value : "", tot = unit && n >= 1 ? money(calcTotal() / 100, cur) : "";
        recapBox.querySelector('[data-rc="date"]').textContent = dv ? longDate(dv) : L.rcNoDate;
        var tm = timeEl ? timeEl.value : ""; recapBox.querySelector('[data-rc="time"]').textContent = tm ? tm + " h" : ""; recapBox.querySelector('[data-rc-row="time"]').hidden = !tm;
        recapBox.querySelector('[data-rc="pax"]').textContent = (n === 1 ? L.rcPax1 : L.rcPaxN.replace("{n}", n)) + (kidsDetail(collect()) ? " (" + kidsDetail(collect()) + ")" : "");
        recapBox.querySelector('[data-rc="total"]').textContent = tot;
        var ro = recapBox.querySelector('[data-rc="option"]'); if (ro) ro.textContent = optName();
        var ri = recapBox.querySelector('[data-rc="itin"]'); if (ri) { var il = itLines(itNow()); ri.textContent = il.join("\n"); recapBox.querySelector('[data-rc-row="itin"]').hidden = !il.length; }
        recapBox.querySelector('[data-rc-row="total"]').hidden = !tot;
      }
      function goStep(n, quiet) {
        step = n; clearMsgs(); msg = msgs[n - 1] || msgs[0];
        Array.prototype.forEach.call(panels, function (p) { p.hidden = Number(p.getAttribute("data-step")) !== n; });
        Array.prototype.forEach.call(stepItems, function (li) {
          var i = Number(li.getAttribute("data-stepi")), st = i < n ? "done" : i === n ? "now" : "todo";
          li.setAttribute("data-s", st);
          if (st === "now") li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
          li.querySelector("[data-sdot]").textContent = st === "done" ? "\u2713" : String(i);
        });
        if (n === 2) updRecap();
        var panel = f.querySelector('[data-step="' + n + '"]');
        emit(f, "step", { el: panel });
        if (quiet) return;
        panel.focus({ preventScroll: true });
        if (f.getBoundingClientRect().top < 0 && f.scrollIntoView) f.scrollIntoView({ block: "start", behavior: "smooth" });
      }
      // Paso 1: personas dentro del rango y, con calendario, una fecha elegida. Devuelve el elemento a enfocar si algo falla.
      function checkTrip(d) {
        var bad = null, pax = Number(d.pax);
        setErr(dateEl, ""); setErr(timeEl, "");
        if (!(pax >= PMIN && pax <= curMax)) { msg.className = "gv-lead-msg err"; msg.textContent = paxMsg(); bad = paxEl; }
        if (calApi && !String(d.date || "")) { setErr(dateEl, L.dateBad); bad = calBox; }
        if (calApi && timesBox && String(d.date || "") && !String(d.time || "")) { setErr(timeEl, L.timeBad); bad = timeList.querySelector("button:not([disabled])") || calBox; }
        // Paquete que combina servicios: el itinerario tiene que estar cargado y con horario en los servicios que lo piden.
        if (BU && calApi && String(d.date || "")) {
          itErrClear();
          if (!IT) { if (itErr) { itErr.textContent = L.itLoading; itErr.hidden = false; } bad = bad || calBox; }
          else for (var ii = 0; ii < IT.items.length; ii++) {
            var it = IT.items[ii];
            if (it.pick_time && !SEL[it.slug].time) {
              if (itErr) { itErr.textContent = L.itTime.replace("{t}", it.title); itErr.hidden = false; }
              var row = itList.querySelector('[data-slug="' + it.slug + '"]'); if (row) row.setAttribute("data-bad", "1");
              bad = itList.querySelector('[data-itt="' + it.slug + '"]') || bad || calBox; break;
            }
          }
        }
        // Con tarifa por edad hace falta la edad de cada niño (define cuánto paga cada uno).
        if (agesErr) { agesErr.hidden = true; agesErr.textContent = ""; }
        if (kidsOn && kidTiers.length && Math.round(Number(d.children)) > 0) {
          var ag = getAges(), miss = ag.indexOf(null);
          if (ag.length < Math.round(Number(d.children)) || miss >= 0) { if (agesErr) { agesErr.textContent = KL.agesBad; agesErr.hidden = false; } bad = agesList.querySelectorAll("select")[Math.max(0, miss)] || bad; }
        }
        return bad;
      }
      // Paso 2: nombre y, si se pide, un WhatsApp con código de área.
      function checkContact(d) {
        var bad = null, name = String(d.name || "").trim(), phone = String(d.phone || "").trim();
        setErr(nameEl, ""); setErr(phoneEl, "");
        if (phoneEl && phone.replace(/\D/g, "").length < 6) { setErr(phoneEl, L.phoneBad); bad = phoneEl; }
        if (!name) { setErr(nameEl, L.nameBad); bad = nameEl; }
        return bad;
      }
      function focusBad(bad) { if (!bad) return; if (bad === calBox) calApi.focus(); else bad.focus(); emit(f, "invalid", { field: bad }); }
      function goNext() {
        var bad = checkTrip(collect());
        if (bad) { focusBad(bad); return; }
        goStep(2);
        try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: "gv_form_step", step: 2, item: f.getAttribute("data-package") || "" }); } catch (e) {}
      }
      var nextBtn = f.querySelector("[data-next-step]"), backBtn = f.querySelector("[data-back-step]"), editBtn = f.querySelector("[data-edit-step]");
      if (nextBtn) nextBtn.addEventListener("click", goNext);
      [backBtn, editBtn].forEach(function (b) { if (b) b.addEventListener("click", function () { goStep(1); }); });

      // ---- Reserva pendiente (paquetes con reserva por fecha) ----
      var holdTimer = null, held = null, holdEnd = 0, pollTimer = null; // holdEnd = instante en que vence la retención; pollTimer = consulta de pago Pix
      var payBox = f.querySelector("[data-pay]"), payBtn = f.querySelector("[data-pay-btn]"), pixBox = f.querySelector("[data-pix]"), pixQr = f.querySelector("[data-pix-qr]"), pixCode = f.querySelector("[data-pix-code]"), pixCopy = f.querySelector("[data-pix-copy]"), pixWait = f.querySelector("[data-pix-wait]"), pixAmount = f.querySelector("[data-pix-amount]"), trackEl = f.querySelector("[data-track]"), icsBtn = f.querySelector("[data-ics]"), lastBk = null; // held = { id, token } de la reserva pendiente que se está mostrando
      var bkBox = f.querySelector("[data-booking]"), refEl = f.querySelector("[data-ref]"), holdEl = f.querySelector("[data-hold]"), holdNote = f.querySelector("[data-hold-note]"), relBtn = f.querySelector("[data-release]");
      var submitBtn = f.querySelector('button[type="submit"]');
      function stopTimer() { if (holdTimer) { clearInterval(holdTimer); holdTimer = null; } }
      function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
      function resetPay() { stopPoll(); if (trackEl) trackEl.hidden = true; if (icsBtn) icsBtn.hidden = true; if (payBox) { payBox.hidden = true; pixBox.hidden = true; payBtn.hidden = false; payBtn.disabled = false; pixQr.removeAttribute("src"); } }
      // Resumen de precio en vivo (solo paquetes con reserva por fecha y precio numérico: el formulario trae data-unit en centavos y data-cur).
      var sumBox = f.querySelector("[data-summary]"), unit = Number(f.getAttribute("data-unit")) || 0, cur = f.getAttribute("data-cur") || "BRL";
      // Opciones con precio del mismo producto (radios name="option" con data-unit en centavos): la elegida fija el precio por persona,
      // se suma al nombre del paquete en el resumen, en WhatsApp y en la reserva, y viaja al servidor (que recalcula el total).
      var optEls = f.querySelectorAll('input[name="option"]');
      function optSel() { for (var i = 0; i < optEls.length; i++) if (optEls[i].checked) return optEls[i]; return null; }
      function optName() { var o = optSel(); return o ? o.getAttribute("data-label") || "" : ""; }
      function pkgName() { var b = f.getAttribute("data-package") || "", o = optName(); return o ? b + " \u00b7 " + o : b; }
      function syncOpt() { var o = optSel(); if (o && f.hasAttribute("data-unit") && Number(o.getAttribute("data-unit")) > 0) { unit = Number(o.getAttribute("data-unit")); cur = o.getAttribute("data-cur") || cur; } }
      Array.prototype.forEach.call(optEls, function (o) { o.addEventListener("change", function () { syncOpt(); updSummary(); updRecap(); emit(f, "option", { name: optName() }); }); });
      // "Escolher" en la lista de opciones de la ficha: marca esa opción y vuelve al paso 1 del formulario (el enlace ya lleva a #pedir).
      Array.prototype.forEach.call(doc.querySelectorAll("[data-pick-option]"), function (a) {
        a.addEventListener("click", function () {
          var o = optEls[Number(a.getAttribute("data-pick-option"))]; if (!o) return;
          if (!sentBox.hidden) return;
          o.checked = true; o.dispatchEvent(new Event("change", { bubbles: true }));
          if (step !== 1) goStep(1, true);
          setTimeout(function () { try { o.focus({ preventScroll: true }); } catch (e) {} }, 350);
        });
      });
      syncOpt();
      function updSummary() {
        if (!sumBox || !unit) return;
        var n = Math.round(Number(paxEl.value)), dEl = f.querySelector('input[name="date"]'), dv = dEl ? dEl.value : "";
        if (!(n >= 1)) { sumBox.hidden = true; return; }
        var br = sumBox.querySelector("[data-sum-break]"), rows = breakRows(n);
        sumBox.querySelector("[data-sum-line]").textContent = br ? "" : sumLine(n);
        if (br) { br.textContent = ""; rows.forEach(function (r) { var w = doc.createElement("div"), dt = doc.createElement("dt"), ddd = doc.createElement("dd"); w.className = "gvb-" + r[0]; dt.textContent = r[1]; ddd.textContent = r[2]; w.appendChild(dt); w.appendChild(ddd); br.appendChild(w); }); br.hidden = !rows.length; }
        sumBox.querySelector("[data-sum-date]").textContent = dv ? (BU ? L.sumStart.replace("{d}", whenOf({ date: dv })) : whenOf({ date: dv, time: timeEl ? timeEl.value : "" })) : L.sumPickDate;
        sumBox.querySelector("[data-sum-label]").textContent = L.sumTotal;
        sumBox.querySelector("[data-sum-total]").textContent = money(calcTotal() / 100, cur);
        sumBox.querySelector("[data-sum-note]").textContent = f.getAttribute("data-paymode") === "pix" ? L.sumNotePix : L.sumNote;
        var pk = sumBox.querySelector("[data-sum-pkg]"); if (pk) pk.textContent = pkgName();
        var hd = sumBox.querySelector("[data-sum-hold]"); if (hd) hd.textContent = L.sumHold.replace("{n}", f.getAttribute("data-hold-min") || 20);
        sumBox.hidden = false;
      }
      f.addEventListener("click", function () { setTimeout(updSummary, 0); });
      f.addEventListener("input", updSummary);
      updSummary();
      // Pasos de la reserva: stage 2 = guardado, falta pagar/confirmar; stage 4 = todo completo.
      function setTrack(stage, withPix) {
        if (!trackEl) return;
        var labels = [L.trSaved, withPix ? L.trPay : L.trWa, L.trDone];
        Array.prototype.forEach.call(trackEl.querySelectorAll("[data-tstep]"), function (li, i) {
          var st = i + 1 < stage ? "done" : i + 1 === stage ? "now" : "todo";
          li.setAttribute("data-s", st);
          li.querySelector("[data-tdot]").textContent = st === "done" ? "\u2713" : String(i + 1);
          li.querySelector("[data-tlabel]").textContent = labels[i];
        });
        trackEl.hidden = false;
      }
      // Evento de calendario (.ics, todo el día) para guardar la salida en el teléfono.
      function icsUrl(b) {
        var esc = function (t) { return String(t).replace(/([,;\\])/g, "\\$1"); }, y = +b.d.date.slice(0, 4), m = +b.d.date.slice(5, 7), dd = +b.d.date.slice(8, 10), nx = new Date(Date.UTC(y, m - 1, dd + 1));
        var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Reserva//" + location.hostname, "BEGIN:VEVENT", "UID:reserva-" + b.j.id + "@" + location.hostname,
          "DTSTAMP:" + new Date().toISOString().replace(/[-:]|\.\d{3}/g, ""), "DTSTART;VALUE=DATE:" + b.d.date.replace(/-/g, ""), "DTEND;VALUE=DATE:" + nx.getUTCFullYear() + pad(nx.getUTCMonth() + 1) + pad(nx.getUTCDate()),
          "SUMMARY:" + esc(b.pkg), "DESCRIPTION:" + esc("#" + b.j.id + " \u00b7 " + b.j.pax + " " + (b.j.pax === 1 ? L.person : L.people)), "END:VEVENT", "END:VCALENDAR"];
        return URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
      }
      function mmss(sec) { return Math.floor(sec / 60) + ":" + pad(sec % 60); }
      function money(n, cur) { try { return new Intl.NumberFormat(G.lang === "es" ? "es-AR" : "pt-BR", { style: "currency", currency: cur }).format(n); } catch (e) { return cur + " " + n; } }
      // Detalle de la reserva en la confirmación (fecha larga, personas, total, referencia) y el paso siguiente.
      var detBox = f.querySelector("[data-detail]"), nextEl = f.querySelector("[data-next]");
      function hideDetail() { if (detBox) detBox.hidden = true; if (nextEl) nextEl.hidden = true; }
      function longDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); if (!m) return ""; try { return new Intl.DateTimeFormat(G.lang === "es" ? "es-AR" : "pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))); } catch (e) { return niceDate(iso); } }
      function fillDetail(j, d, pkg, next) {
        if (!detBox) return;
        var labels = { pkg: L.dPkg, date: L.dDate, time: L.dTime, pax: L.dPax, total: L.dTotal, ref: L.dRef };
        labels.itin = L.dItin;
        var vals = { itin: itLines(j.itin).join("\n"), pkg: pkg, date: longDate(d.date), time: (j.time || d.time) ? (j.time || d.time) + " h" : "", pax: j.pax + " " + (j.pax === 1 ? L.person : L.people) + (kidsDetail(d) ? " (" + kidsDetail(d) + ")" : ""), total: Number(j.total) > 0 ? money(j.total, j.currency) : "", ref: "#" + j.id };
        Object.keys(vals).forEach(function (k) {
          var dl = detBox.querySelector('[data-dl="' + k + '"]'), dv = detBox.querySelector('[data-dv="' + k + '"]');
          if (dl) dl.textContent = labels[k];
          if (dv) dv.textContent = vals[k];
        });
        var timeRow = detBox.querySelector('[data-dv="time"]'); if (timeRow && timeRow.parentNode) timeRow.parentNode.hidden = !vals.time;
        var itRow = detBox.querySelector('[data-dv="itin"]'); if (itRow && itRow.parentNode) itRow.parentNode.hidden = !vals.itin;
        var totRow = detBox.querySelector('[data-dv="total"]');
        if (totRow && totRow.parentNode) totRow.parentNode.hidden = !vals.total;
        if (nextEl) { nextEl.textContent = next || ""; nextEl.hidden = !next; }
        detBox.hidden = false;
      }
      function showSent(title, body, waHref) {
        hideDetail();
        sentBox.querySelector("[data-sent-title]").textContent = title;
        sentBox.querySelector("[data-sent-body]").textContent = body;
        var again = sentBox.querySelector("[data-wa-again]");
        if (G.wa && waHref) { again.setAttribute("href", waHref); again.hidden = false; } else again.hidden = true;
        fields.hidden = true; sentBox.hidden = false;
        emit(f, "sent");
        sentBox.focus({ preventScroll: true });
        if (sentBox.scrollIntoView) sentBox.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      function bookFail(j, status, d) {
        var code = j && j.code, m = L.bkErr, t = d && d.time;
        if (code === "full" || code === "unavailable" || code === "off" || code === "pax" || code === "time" || code === "item_full" || code === "itin" || code === "itin_time") goStep(1, true);
        if (code === "full") m = t ? (j.left > 0 ? L.fullTimeLeft.replace("{n}", j.left).replace("{t}", t) : L.fullTimeNo.replace("{t}", t)) : (j.left > 0 ? L.fullLeft.replace("{n}", j.left) : L.fullNo);
        else if (code === "unavailable" || code === "off") m = t ? L.timeGone : L.bkGone;
        else if (code === "time") m = L.timeBad;
        else if (code === "limit") m = L.bkLimit; else if (code === "rate" || status === 429) m = L.bkRate;
        else if (code === "pax") m = paxMsg();
        else if (code === "item_full") m = L.itFull.replace("{t}", j.item || "").replace("{d}", shortDay(j.day) + (j.time ? " " + j.time : ""));
        else if (code === "itin" || code === "itin_time") m = L.itGen;
        msg.className = "gv-lead-msg err"; msg.textContent = m;
        // Si el día se llenó o cambió, se actualiza el calendario para no volver a ofrecerlo.
        if (code === "full" || code === "unavailable" || code === "item_full") calApi.refresh(null, true); // recarga horarios y días; el día elegido se conserva si sigue abierto
      }
      // Mensaje de WhatsApp: después de los datos de la reserva van el itinerario (paquetes que combinan servicios) y el total.
      function waPlus(text, j) {
        var add = [], lines = itLines(j && j.itin);
        if (lines.length) add.push(L.waItin + "\n" + lines.join("\n"));
        if (j && Number(j.total) > 0) add.push(L.waTotal.replace("{t}", money(j.total, j.currency)));
        var i = text.indexOf("\n\n");
        return add.length ? (i < 0 ? text + "\n" + add.join("\n") : text.slice(0, i) + "\n" + add.join("\n") + text.slice(i)) : text;
      }
      function booked(j, d, name, pkg) {
        held = { id: j.id, token: j.token };
        holdEnd = Date.now() + (Number(j.expires_in) || 0) * 1000; lastBk = { j: j, d: d, name: name, pkg: pkg }; var total = Number(j.total) > 0 ? L.bkTotal.replace("{total}", money(j.total, j.currency)) : "";
        refEl.textContent = nPax(L.bkRef.replace("{id}", j.id).replace("{date}", whenOf(d, j)), j.pax, d) + total;
        holdNote.textContent = L.bkNote; relBtn.textContent = L.bkRelease; relBtn.hidden = false; bkBox.hidden = false;
        function tick() {
          var left = Math.max(0, Math.round((holdEnd - Date.now()) / 1000));
          if (left > 0) { holdEl.textContent = L.bkHold.replace("{t}", mmss(left)); return; }
          stopTimer(); held = null; resetPay(); if (nextEl) nextEl.hidden = true;
          holdEl.textContent = L.bkOver; holdNote.textContent = L.bkOverNote; relBtn.hidden = true;
          sentBox.querySelector("[data-wa-again]").hidden = true;
          if (calApi) calApi.refresh();
        }
        stopTimer(); tick(); holdTimer = setInterval(tick, 1000);
        var wa = waUrl(waPlus(nPax(L.bkWa.replace("{id}", j.id).replace("{pkg}", pkg).replace("{date}", whenOf(d, j)), j.pax, d).replace("{name}", name), j));
        resetPay(); if (j.pay === "pix" && payBox) { payBox.hidden = false; payBtn.querySelector("span").textContent = L.payPix; }
        showSent(L.bkTitle, j.pay === "pix" ? L.bkBodyPay : L.bkBody, wa);
        fillDetail(j, d, pkg, j.pay === "pix" ? L.nextPix : L.nextWa);
        setTrack(2, j.pay === "pix");
        try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: "gv_lead_form", item: pkg }, { event: "gv_booking_pending", item: pkg, value: j.total, currency: j.currency }); if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { method: "booking", item_name: pkg }); if (typeof window.fbq === "function") window.fbq("track", "InitiateCheckout", { content_name: pkg, value: j.total, currency: j.currency }); } catch (e) {}
        calApi.refresh();
      }
      function book(d, name, phone, pax, pkg) {
        if (submitBtn) submitBtn.disabled = true;
        msg.className = "gv-lead-msg"; msg.textContent = L.bkSending;
        fetch("/api/book", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: f.getAttribute("data-slug") || "", date: d.date, time: d.time || "", option: d.option !== undefined ? d.option : "", plan: BU && IT ? JSON.parse(planEl.value || "[]") : undefined, pax: pax, adults: kidsOn ? Number(d.adults) : undefined, children: kidsOn ? Number(d.children) : undefined, ages: kidsOn && kidTiers.length ? getAges().filter(function (x) { return x !== null; }) : undefined, name: name, phone: phone, message: String(d.message || "").trim(), page: location.pathname, website: d.website || "" }) })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
          .then(function (x) {
            if (submitBtn) submitBtn.disabled = false; msg.textContent = "";
            if (x.r.ok && x.j && x.j.ok && x.j.id) booked(x.j, d, name, pkg);
            else if (x.r.status >= 500) consultFallback(d, name, phone, pax, pkg);
            else bookFail(x.j, x.r.status, d);
          })
          .catch(function () { if (submitBtn) submitBtn.disabled = false; msg.textContent = ""; consultFallback(d, name, phone, pax, pkg); });
      }
      // Si el servidor de reservas no responde, nunca se pierde la venta: se arma el mensaje de WhatsApp de siempre (el cliente lo envía con un toque).
      function consultFallback(d, name, phone, pax, pkg) {
        var text = "*" + L.hello + " " + pkg + "*\n*" + L.name + ":* " + name + "\n*" + L.phone + ":* " + phone + "\n*" + L.date + ":* " + whenOf(d) + "\n*" + L.pax + ":* " + pax + (kidsDetail(d) ? " (" + kidsDetail(d) + ")" : "");
        sentBox.querySelector("[data-booking]").hidden = true; relBtn.hidden = true; if (trackEl) trackEl.hidden = true;
        showSent(L.sentTitle, L.sentBody, waUrl(text));
      }

      // ---- Cobro con Pix (fase 3): crea el código, lo muestra (QR + copia e cola) y consulta el pago hasta que se confirme ----
      // Botón para descargar el voucher (página imprimible) con el enlace privado de la reserva.
      function addVoucher(b) {
        var a = document.createElement("a");
        a.href = "/api/book/voucher?id=" + encodeURIComponent(b.j.id) + "&token=" + encodeURIComponent(b.j.token);
        a.target = "_blank"; a.rel = "noopener"; a.className = "gv-voucher"; a.textContent = L.voucher;
        a.style.cssText = "display:inline-block;margin-top:14px;font-weight:600;color:inherit;text-decoration:underline";
        sentBox.appendChild(a);
      }
      function paid() {
        var b = lastBk; stopTimer(); resetPay(); held = null; bkBox.hidden = true; relBtn.hidden = true;
        showSent(L.paidTitle, L.paidBody, b ? waUrl(waPlus(nPax(L.paidWa.replace("{id}", b.j.id).replace("{pkg}", b.pkg).replace("{date}", whenOf(b.d, b.j)), b.j.pax, b.d).replace("{name}", b.name), b.j)) : "");
        if (b && b.j.token && b.j.id) addVoucher(b);
        if (b) fillDetail(b.j, b.d, b.pkg, L.nextPaid);
        setTrack(4, true);
        if (icsBtn && b) { icsBtn.href = icsUrl(b); icsBtn.setAttribute("download", "reserva-" + b.j.id + ".ics"); icsBtn.querySelector("span").textContent = L.icsBtn; icsBtn.hidden = false; }
        try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: "gv_booking_paid", item: b && b.pkg, value: b && b.j.total, currency: b && b.j.currency }); if (typeof window.gtag === "function" && b) window.gtag("event", "purchase", { transaction_id: String(b.j.id), value: b.j.total, currency: b.j.currency, items: [{ item_name: b.pkg }] }); if (typeof window.fbq === "function" && b) window.fbq("track", "Purchase", { content_name: b.pkg, value: b.j.total, currency: b.j.currency }, { eventID: "gv-" + b.j.id }); } catch (e) {}
        if (calApi) calApi.refresh();
      }
      function poll() {
        stopPoll(); var n = 0;
        pollTimer = setInterval(function () {
          if (!held || ++n > 400) { stopPoll(); return; }
          fetch("/api/book/status?id=" + encodeURIComponent(held.id) + "&token=" + encodeURIComponent(held.token), { cache: "no-store" })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) { if (!j) return; if (j.paid) paid(); else if (j.status === "vencida" || j.status === "cancelada") stopPoll(); })
            .catch(function () {});
        }, 5000);
      }
      if (payBtn) payBtn.addEventListener("click", function () {
        if (!held) return;
        var h = held; payBtn.disabled = true; msg.className = "gv-lead-msg"; payBtn.querySelector("span").textContent = L.payBusy;
        fetch("/api/book/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: h.id, token: h.token }) })
          .then(function (r) { return r.json().catch(function () { return {}; }); })
          .then(function (j) {
            payBtn.querySelector("span").textContent = L.payPix;
            if (j && j.paid) { paid(); return; }
            if (!j || !j.ok || !j.code) { payBtn.disabled = false; holdNote.textContent = L.payErr; return; }
            if (j.expires_in) holdEnd = Date.now() + j.expires_in * 1000; // el cobro Pix alarga la retención mientras el código esté vigente
            pixCode.value = j.code; pixWait.textContent = L.payWait; if (pixAmount) pixAmount.textContent = L.payAmount.replace("{t}", money(j.total, j.currency));
            if (j.qr) { pixQr.setAttribute("src", "data:image/png;base64," + j.qr); pixQr.hidden = false; } else pixQr.hidden = true;
            pixBox.hidden = false; payBtn.hidden = true; poll();
            if (pixBox.scrollIntoView) pixBox.scrollIntoView({ block: "nearest", behavior: "smooth" });
          })
          .catch(function () { payBtn.disabled = false; payBtn.querySelector("span").textContent = L.payPix; holdNote.textContent = L.payErr; });
      });
      if (pixCopy) pixCopy.addEventListener("click", function () {
        var done = function () { pixCopy.querySelector("span").textContent = L.payCopied; setTimeout(function () { pixCopy.querySelector("span").textContent = L.payCopy; }, 2200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(pixCode.value).then(done, function () { pixCode.select(); try { document.execCommand("copy"); done(); } catch (e) {} });
        else { pixCode.select(); try { document.execCommand("copy"); done(); } catch (e) {} }
      });
      if (relBtn) relBtn.addEventListener("click", function () {
        if (!held) return;
        var h = held; relBtn.disabled = true;
        fetch("/api/book/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: h.id, token: h.token }) })
          .catch(function () {})
          .then(function () {
            relBtn.disabled = false; stopTimer(); resetPay(); held = null; bkBox.hidden = true; relBtn.hidden = true;
            showSent(L.bkRelTitle, L.bkRelBody, "");
            if (calApi) calApi.refresh();
          });
      });

      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        if (step === 1) { goNext(); return; } // Enter en el paso 1 avanza, no envía
        var d = collect();
        if (d.website) return; // campo trampa: solo lo llenan los bots
        var name = String(d.name || "").trim(), phone = String(d.phone || "").trim();
        msg.className = "gv-lead-msg"; msg.textContent = "";
        var trip = checkTrip(d);
        if (trip) { goStep(1, true); focusBad(checkTrip(d)); return; } // por si el cupo cambió mientras completaba el paso 2
        var bad = checkContact(d), pax = Number(d.pax);
        if (bad) { focusBad(bad); return; }

        var pkg = pkgName();
        // Paquete con reserva por fecha: se crea la reserva pendiente en el servidor (retiene el cupo) en vez de abrir WhatsApp directo.
        if (calApi) { book(d, name, phone, pax, pkg); return; }
        var text = L.hello + " " + pkg + "\n" + L.name + ": " + name +
          (phoneEl ? "\n" + L.phone + ": " + phone : "") +
          (d.date ? "\n" + L.date + ": " + niceDate(d.date) : "") + "\n" + L.pax + ": " + pax + (kidsDetail(d) ? " (" + kidsDetail(d) + ")" : "") +
          (String(d.message || "").trim() ? "\n" + L.notes + ": " + d.message.trim() : "");
        // Se abre WhatsApp en el mismo gesto del toque (así el navegador no lo bloquea) y la consulta se guarda en segundo plano.
        var url = waUrl(text);
        if (G.wa) window.open(url, "_blank", "noopener");
        if (G.leads) {
          try {
            fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, keepalive: true,
              body: JSON.stringify({ name: name, phone: phone, date: d.date || "", pax: pax, message: (optName() ? L.opt + ": " + optName() + (leadMsg(d) ? " \u00b7 " : "") : "") + leadMsg(d), package: f.getAttribute("data-package") || "", slug: f.getAttribute("data-slug") || "", page: location.pathname, source: "form", website: d.website || "" }) }).catch(function () {});
          } catch (e) {}
        }
        try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: "gv_lead_form", item: pkg }); if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { method: "form", item_name: pkg }); if (typeof window.fbq === "function") window.fbq("track", "Lead", { content_name: pkg }); } catch (e) {}

        // Confirmación en el mismo lugar del formulario.
        sentBox.querySelector("[data-sent-title]").textContent = G.wa ? L.sentTitle : L.okTitle;
        sentBox.querySelector("[data-sent-body]").textContent = G.wa ? L.sentBody : L.okBody;
        var again = sentBox.querySelector("[data-wa-again]");
        if (G.wa) again.setAttribute("href", url); else again.hidden = true;
        fields.hidden = true; sentBox.hidden = false;
        emit(f, "sent");
        sentBox.focus({ preventScroll: true });
        if (sentBox.scrollIntoView) sentBox.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });

      var back = f.querySelector("[data-again]");
      if (back) back.addEventListener("click", function () {
        f.reset(); stopTimer(); resetPay(); held = null; if (bkBox) bkBox.hidden = true; if (relBtn) relBtn.hidden = true; goStep(1, true);
        if (calApi) calApi.reset(); syncPax(); syncOpt(); updSummary(); setErr(nameEl, ""); setErr(phoneEl, "");
        sentBox.hidden = true; fields.hidden = false;
        emit(f, "reset");
        f.querySelector('[data-step="1"]').focus({ preventScroll: true });
      });
    });
  }

  // ---- Mapa de calor: hasta dónde baja cada visita y en qué hace clic. Un único envío al salir; sin cookies ni datos personales. ----
  function heat() {
    if (navigator.doNotTrack === "1" || /^\/(admin|api)(\/|$)/.test(location.pathname)) return;
    var maxRatio = 0, clicks = [], sentOnce = false, raf = 0;
    function measure() {
      raf = 0;
      var h = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
      if (!h) return;
      var r = Math.min(1, ((window.pageYOffset || 0) + (window.innerHeight || 0)) / h);
      if (r > maxRatio) maxRatio = r;
    }
    function queue() { if (!raf) raf = requestAnimationFrame(measure); }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue, { passive: true });
    window.addEventListener("load", queue);
    measure();
    doc.addEventListener("click", function (e) {
      if (clicks.length >= 8 || !e.target || !e.target.closest) return;
      var el = e.target.closest("a,button,summary,[data-track]");
      if (!el) return;
      var sec = el.closest("section[id],[data-panel],header,footer,nav"), secName = sec ? (sec.id || sec.getAttribute("data-panel") || sec.tagName.toLowerCase()) : "";
      var txt = (el.getAttribute("data-track") || el.getAttribute("aria-label") || el.textContent || el.getAttribute("href") || "").replace(/\s+/g, " ").trim().slice(0, 40);
      if (txt) clicks.push((secName ? secName + " › " : "") + (el.tagName === "A" ? "enlace: " : "botón: ") + txt);
    }, true);
    function send() {
      if (sentOnce) return;
      sentOnce = true; measure();
      var body = JSON.stringify({ p: location.pathname, v: (window.innerWidth || 1024) < 768 ? "m" : "d", d: Math.floor(maxRatio * 10), c: clicks });
      try {
        if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
        else fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: body, keepalive: true });
      } catch (e) {}
    }
    window.addEventListener("pagehide", send);
    doc.addEventListener("visibilitychange", function () { if (doc.visibilityState === "hidden") send(); });
  }

  function init() { fab(); leadForms(); try { heat(); } catch (e) {} }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();

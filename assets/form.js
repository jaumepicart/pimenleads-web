// Envío de formularios a Formspree, compartido por todas las páginas.
// Cada <form data-lead-form> configura su envío con atributos data-*:
//   data-subject        texto del asunto del correo
//   data-subject-field  campo cuyo valor se añade al asunto
//   data-origen         de qué página viene la solicitud
//   data-next           página a la que se redirige al enviar
//   data-error          mensaje si faltan campos obligatorios
// Si el formulario tiene bloques .step, se muestra por pasos (sin JS se ven todos).
(function () {
  var ENDPOINT = "https://formspree.io/f/myekaoar";
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  // De dónde llega la visita (anuncio, Instagram…), para saber qué canal trae cada solicitud.
  // Se lee de la URL de la propia página; no se guarda nada en el navegador.
  var params = new URLSearchParams(location.search);
  var campaign = {};
  UTM_KEYS.forEach(function (k) { if (params.get(k)) { campaign[k] = params.get(k); } });
  if (document.referrer && document.referrer.indexOf(location.host) === -1) {
    campaign.referrer = document.referrer;
  }

  // Los enlaces a las landings conservan el origen: si se entra por la portada, el formulario está en otra página.
  each(document.querySelectorAll('a[href^="reforma-"]'), function (a) {
    var url = new URL(a.href);
    UTM_KEYS.forEach(function (k) { if (campaign[k]) { url.searchParams.set(k, campaign[k]); } });
    a.href = url.href;
  });

  function isValid(el) {
    var v = el.value.trim();
    if (!v) { return false; }
    if (el.type === "email") { return /^\S+@\S+\.\S+$/.test(v); }
    if (el.type === "tel") { return v.replace(/\D/g, "").length >= 9; }
    return true;
  }

  function mark(el, ok) {
    if (ok) { el.removeAttribute("aria-invalid"); } else { el.setAttribute("aria-invalid", "true"); }
    return ok;
  }

  // Campos obligatorios sin rellenar dentro de `scope`, en orden de aparición.
  // Los grupos de opciones (radio) se marcan con <fieldset data-required>.
  function invalidFields(scope) {
    var bad = [];
    each(scope.querySelectorAll("input[required]:not([type=checkbox]):not([type=radio]), select[required], textarea[required], fieldset[data-required]"), function (el) {
      var ok = el.tagName === "FIELDSET" ? !!el.querySelector("input:checked") : isValid(el);
      if (!mark(el, ok)) { bad.push(el); }
    });
    return bad;
  }

  function focusField(el) {
    (el.tagName === "FIELDSET" ? el.querySelector("input") : el).focus();
  }

  each(document.querySelectorAll("form[data-lead-form]"), function (form) {
    var msg = form.querySelector(".msg");
    var btn = form.querySelector('button[type="submit"]');
    var consent = form.querySelector('input[name="consent"]');
    var consentLabel = consent.closest("label");
    var steps = form.querySelectorAll(".step");
    var current = 0;
    var lastPointer = 0;

    function showError(text, field) {
      msg.className = "msg err";
      msg.textContent = text;
      if (field) { focusField(field); }
    }

    function showStep(i, moveFocus) {
      current = i;
      each(steps, function (s, k) { s.hidden = k !== i; });
      form.querySelector(".progress span").style.width = ((i + 1) / steps.length * 100) + "%";
      form.querySelector(".stepcount").textContent = "Paso " + (i + 1) + " de " + steps.length;
      msg.className = "msg";
      msg.textContent = "";
      if (moveFocus) {
        var card = form.closest(".formcard");
        if (card.getBoundingClientRect().top < 0) { card.scrollIntoView({ block: "start" }); }
        steps[i].querySelector(".step-title").focus({ preventScroll: true });
      }
    }

    function nextStep() {
      var bad = invalidFields(steps[current]);
      if (bad.length) { showError(bad[0].getAttribute("data-error") || steps[current].dataset.error || form.dataset.error, bad[0]); return; }
      showStep(current + 1, true);
    }

    // "Todavía no lo sé": aparece un cuadro para que la persona cuente qué quiere hacer.
    var detalleBox = form.querySelector("[data-detalle-box]");
    var detalleTa = detalleBox && detalleBox.querySelector("textarea");
    function syncDetalle() {
      if (!detalleBox) { return; }
      var on = !!form.querySelector("input[data-detalle]:checked");
      detalleBox.hidden = !on;
      detalleTa.required = on;
    }

    if (steps.length) {
      form.classList.add("js-steps");
      showStep(0, false);
      // Un enlace (por ejemplo, de un anuncio) puede llegar con la reforma ya elegida:
      // ?opcion=2 marca la segunda tarjeta del primer paso y pasa directamente al segundo.
      var opcion = parseInt(params.get("opcion"), 10);
      var tarjetas = steps[0].querySelectorAll("input[type=radio]");
      if (opcion > 0 && tarjetas[opcion - 1]) {
        tarjetas[opcion - 1].checked = true;
        syncDetalle();
        showStep(tarjetas[opcion - 1].hasAttribute("data-detalle") ? 0 : 1, false);
      }
      form.addEventListener("click", function (e) {
        if (e.target.closest(".step-next")) { nextStep(); }
        if (e.target.closest(".step-back")) { showStep(current - 1, true); }
      });
      // Al tocar una opción se pasa solo al paso siguiente; con teclado (flechas) no,
      // para que se pueda recorrer las opciones sin saltar de paso.
      form.addEventListener("pointerdown", function () { lastPointer = Date.now(); });
      form.addEventListener("change", function (e) {
        var step = e.target.closest(".step");
        syncDetalle();
        if (e.target.type === "radio" && step && step.hasAttribute("data-auto") && !e.target.hasAttribute("data-detalle") && Date.now() - lastPointer < 1500) {
          mark(e.target.closest("fieldset"), true);
          setTimeout(nextStep, 180);
        }
      });
    }

    form.addEventListener("input", function (e) {
      if (e.target.getAttribute("aria-invalid") === "true" && isValid(e.target)) {
        e.target.removeAttribute("aria-invalid");
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Intro en un paso intermedio = pasar al siguiente.
      if (steps.length && current < steps.length - 1) { nextStep(); return; }
      msg.className = "msg";

      var bad = invalidFields(form);
      if (bad.length) {
        var step = bad[0].closest(".step");
        if (step) { showStep(Array.prototype.indexOf.call(steps, step), false); invalidFields(step); }
        showError((step && step.dataset.error) || form.dataset.error, bad[0]);
        return;
      }
      if (!consent.checked) {
        showError("No se ha enviado: marca la casilla de consentimiento para continuar.");
        consentLabel.classList.add("bad");
        consentLabel.scrollIntoView({ behavior: "smooth", block: "center" });
        consent.focus();
        return;
      }
      consentLabel.classList.remove("bad");

      var data = new FormData();
      var datos = { tipo_solicitud: form.dataset.tipo === "empresa" ? "empresa" : "particular", tipo: form.dataset.tipo, origen: {} };
      var subjectValue = form.elements[form.dataset.subjectField].value.trim();
      data.append("_subject", form.dataset.subject + " · " + subjectValue);
      data.append("origen", form.dataset.origen);
      var groups = {};
      each(form.elements, function (el) {
        if (!el.name || el.name === "consent" || el.tagName === "BUTTON" || el.tagName === "FIELDSET") { return; }
        if (el.type === "checkbox" || el.type === "radio") {
          groups[el.name] = groups[el.name] || [];
          if (el.checked) { groups[el.name].push(el.value); }
          return;
        }
        var val = el.value.trim();
        if (el.name === "mensaje" && detalleTa && detalleTa.value.trim() && !detalleBox.hidden) {
          val = "Qué quiere hacer: " + detalleTa.value.trim() + (val ? " | " + val : "");
        }
        datos[el.name] = val;
        data.append(el.name, val || (el.name === "_gotcha" ? "" : "—"));
      });
      Object.keys(groups).forEach(function (k) {
        // En la base de datos, las casillas múltiples van como lista y las de una opción como texto.
        datos[k] = form.querySelector('input[type=radio][name="' + k + '"]') ? (groups[k][0] || "") : groups[k];
        data.append(k, groups[k].join(", ") || "—");
      });
      if (consent.value && consent.value !== "on") {
        data.append("consentimiento", consent.value);
        datos.consentimiento = consent.value;
      }
      data.append("pagina", location.pathname);
      datos.origen.pagina = location.pathname;
      Object.keys(campaign).forEach(function (k) {
        data.append(k, campaign[k]);
        datos.origen[k] = campaign[k];
      });

      btn.disabled = true;
      msg.textContent = "Enviando…";
      var sends = [fetch(ENDPOINT, {
        method: "POST",
        body: data,
        headers: { "Accept": "application/json" }
      })];
      var cfg = window.PIMEN_CONFIG || {};
      if (cfg.supabaseUrl && cfg.supabaseKey) {
        sends.push(fetch(cfg.supabaseUrl + "/rest/v1/rpc/recibir_solicitud", {
          method: "POST",
          body: JSON.stringify({ datos: datos }),
          headers: { "Content-Type": "application/json", "apikey": cfg.supabaseKey, "Authorization": "Bearer " + cfg.supabaseKey }
        }));
      }
      // Basta con que llegue a uno de los dos sitios (correo o base de datos).
      Promise.all(sends.map(function (p) {
        return p.then(function (r) { return r.ok; }, function () { return false; });
      })).then(function (oks) {
        if (oks.indexOf(true) === -1) { throw new Error("fallo"); }
        form.reset();
        location.href = form.dataset.next;
      }).catch(function () {
        showError("No se ha podido enviar. Inténtalo de nuevo o escríbenos a comercial@pimenleads.com.");
        btn.disabled = false;
      });
    });
  });

  // Botón fijo en móvil: aparece cuando el formulario ha quedado por encima de la pantalla.
  var sticky = document.querySelector(".sticky");
  var card = document.querySelector(".formcard");
  if (sticky && card && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      sticky.classList.toggle("show", !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(card);
  }
})();

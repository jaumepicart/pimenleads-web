// Envío de formularios a Formspree, compartido por todas las páginas.
// Cada <form data-lead-form> configura su envío con atributos data-*:
//   data-subject        texto del asunto del correo
//   data-subject-field  campo cuyo valor se añade al asunto
//   data-origen         de qué página viene la solicitud
//   data-next           página a la que se redirige al enviar
//   data-error          mensaje si faltan campos obligatorios
(function () {
  var ENDPOINT = "https://formspree.io/f/myekaoar";
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

  // De dónde llega la visita (anuncio, Instagram…), para saber qué canal trae cada solicitud.
  // Se lee de la URL de la propia página; no se guarda nada en el navegador.
  var params = new URLSearchParams(location.search);
  var campaign = {};
  UTM_KEYS.forEach(function (k) { if (params.get(k)) { campaign[k] = params.get(k); } });
  if (document.referrer && document.referrer.indexOf(location.host) === -1) {
    campaign.referrer = document.referrer;
  }

  function isValid(el) {
    var v = el.value.trim();
    if (!v) { return false; }
    if (el.type === "email") { return /^\S+@\S+\.\S+$/.test(v); }
    if (el.type === "tel") { return v.replace(/\D/g, "").length >= 9; }
    return true;
  }

  Array.prototype.forEach.call(document.querySelectorAll("form[data-lead-form]"), function (form) {
    var msg = form.querySelector(".msg");
    var btn = form.querySelector('button[type="submit"]');
    var consent = form.querySelector('input[name="consent"]');
    var consentLabel = consent.closest("label");

    form.addEventListener("input", function (e) {
      if (e.target.getAttribute("aria-invalid") === "true" && isValid(e.target)) {
        e.target.removeAttribute("aria-invalid");
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.className = "msg";

      var invalid = Array.prototype.filter.call(
        form.querySelectorAll("input[required]:not([type=checkbox]), select[required], textarea[required]"),
        function (el) {
          var ok = isValid(el);
          if (ok) { el.removeAttribute("aria-invalid"); } else { el.setAttribute("aria-invalid", "true"); }
          return !ok;
        }
      );
      if (invalid.length) {
        msg.className = "msg err";
        msg.textContent = form.dataset.error;
        invalid[0].focus();
        return;
      }
      if (!consent.checked) {
        msg.className = "msg err";
        msg.textContent = "No se ha enviado: marca la casilla de consentimiento para continuar.";
        consentLabel.classList.add("bad");
        consentLabel.scrollIntoView({ behavior: "smooth", block: "center" });
        consent.focus();
        return;
      }
      consentLabel.classList.remove("bad");

      var data = new FormData();
      var subjectValue = form.elements[form.dataset.subjectField].value.trim();
      data.append("_subject", form.dataset.subject + " · " + subjectValue);
      data.append("origen", form.dataset.origen);
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.name === "consent" || el.type === "checkbox" || el.tagName === "BUTTON") { return; }
        data.append(el.name, el.value.trim() || (el.name === "_gotcha" ? "" : "—"));
      });
      var groups = {};
      Array.prototype.forEach.call(form.querySelectorAll('input[type=checkbox]:not([name="consent"])'), function (c) {
        groups[c.name] = groups[c.name] || [];
        if (c.checked) { groups[c.name].push(c.value); }
      });
      Object.keys(groups).forEach(function (k) { data.append(k, groups[k].join(", ") || "—"); });
      if (consent.value && consent.value !== "on") { data.append("consentimiento", consent.value); }
      data.append("pagina", location.pathname);
      Object.keys(campaign).forEach(function (k) { data.append(k, campaign[k]); });

      btn.disabled = true;
      msg.textContent = "Enviando…";
      fetch(ENDPOINT, {
        method: "POST",
        body: data,
        headers: { "Accept": "application/json" }
      }).then(function (r) {
        if (!r.ok) { throw new Error("fallo"); }
        form.reset();
        location.href = form.dataset.next;
      }).catch(function () {
        msg.className = "msg err";
        msg.textContent = "No se ha podido enviar. Inténtalo de nuevo o escríbenos a comercial@pimenleads.com.";
        btn.disabled = false;
      });
    });
  });
})();

// Medición de Google Ads y Google Analytics 4 con consentimiento previo.
// La etiqueta de Google solo se carga si la persona acepta las cookies en el aviso.
// Mientras googleAds.id y analytics.id estén vacíos en assets/config.js, no se carga nada ni se muestra el aviso.
// Los eventos de abajo (clics, formulario, scroll, secciones) también van a la medición propia sin cookies de
// assets/visitas.js, que cuenta a todas las visitas, acepten o no las cookies de Google.
//
// Además, si la visita llega desde un anuncio (gclid o utm_medium=cpc), se marca la página con
// la clase "desde-anuncio" para ocultar los enlaces que sacan de la landing.
(function () {
  var params = new URLSearchParams(location.search);
  if (params.get("gclid") || params.get("gbraid") || params.get("wbraid") || /^(cpc|ppc|paid)$/i.test(params.get("utm_medium") || "")) {
    document.documentElement.classList.add("desde-anuncio");
  }

  var ads = (window.PIMEN_CONFIG || {}).googleAds || {};
  var ga = (window.PIMEN_CONFIG || {}).analytics || {};
  if (!ads.id && !ga.id) { return; }
  document.documentElement.classList.add("cookies-activas");

  var CLAVE = "pimen_cookies"; // "si" o "no"; es solo la elección del aviso, no se usa para nada más.
  function eleccion() { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(CLAVE, v); } catch (e) {} }

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  var cargada = false;

  function conversion(etiqueta) {
    if (cargada && ads.id && etiqueta) { gtag("event", "conversion", { send_to: ads.id + "/" + etiqueta }); }
  }

  // Eventos para saber dónde pulsan las personas. A GA4 solo llegan si aceptaron las cookies; a la medición
  // propia (assets/visitas.js, anónima y sin cookies) llegan siempre.
  function evento(nombre, datos) {
    if (window.pimenVisitas) { window.pimenVisitas.evento(nombre, datos, /^(form_enviar|form_ok|clic_llamar|clic_whatsapp|cookies_)/.test(nombre)); }
    if (cargada && ga.id) { gtag("event", nombre, datos || {}); }
  }
  window.pimenEvento = evento; // para form.js

  function zonaDe(el) {
    var z = el.closest("header, .sticky, footer, form, section, main");
    return z ? (z.id || (z.className || "").split(" ")[0] || z.tagName.toLowerCase()) : "otra";
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("a, button");
    if (!el) { return; }
    var href = el.getAttribute("href") || "";
    var datos = { zona: zonaDe(el), texto: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60) };
    if (/^tel:/.test(href)) { evento("clic_llamar", datos); }
    else if (/wa\.me\//.test(href)) { evento("clic_whatsapp", datos); }
    else if (el.classList.contains("step-next")) {
      // El avance de paso lo registra form.js (también cuando avanza solo al tocar una opción).
    }
    else if (el.matches('button[type="submit"]')) { evento("form_enviar", datos); }
    else if (el.classList.contains("btn") || href.charAt(0) === "#") { datos.destino = href; evento("clic_boton", datos); }
  });

  // Primera interacción con el formulario.
  var formIniciado = false;
  function formInicio(e) {
    if (formIniciado || !(e.target.closest && e.target.closest("[data-lead-form]"))) { return; }
    formIniciado = true;
    evento("form_inicio", { tipo: e.target.closest("[data-lead-form]").dataset.tipo || "" });
  }
  document.addEventListener("input", formInicio);
  document.addEventListener("change", formInicio);

  // Profundidad de scroll y secciones vistas.
  var hitos = [25, 50, 75, 100], vistos = {};
  window.addEventListener("scroll", function () {
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    if (alto <= 0) { return; }
    var pct = (window.scrollY / alto) * 100;
    hitos.forEach(function (h) {
      if (pct >= h - 1 && !vistos[h]) { vistos[h] = true; evento("scroll_profundidad", { porcentaje: h }); }
    });
  }, { passive: true });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (items) {
      items.forEach(function (i) {
        if (i.isIntersecting) { io.unobserve(i.target); evento("seccion_vista", { seccion: i.target.id }); }
      });
    }, { threshold: 0.4 });
    document.addEventListener("DOMContentLoaded", function () {
      document.querySelectorAll("section[id]").forEach(function (s) { io.observe(s); });
    });
  }

  function cargarGoogle() {
    if (cargada) { return; }
    cargada = true;
    gtag("consent", "default", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "denied", analytics_storage: ga.id ? "granted" : "denied" });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ads.id || ga.id);
    document.head.appendChild(s);
    gtag("js", new Date());
    if (ads.id) { gtag("config", ads.id); }
    if (ga.id) { gtag("config", ga.id); }
    // Página de gracias de particulares = solicitud enviada (la de empresas lleva ?de=empresa).
    if (document.body.dataset.conversion === "lead" && params.get("de") !== "empresa") {
      conversion(ads.conversionLead);
      evento("generate_lead");
    }
  }

  // Clics en llamar o WhatsApp también cuentan como contacto.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href*="wa.me/"]');
    if (a) { conversion(ads.conversionContacto); }
  });

  function borrarCookiesGoogle() {
    document.cookie.split(";").forEach(function (c) {
      var nombre = c.split("=")[0].trim();
      if (/^(_gcl|_ga|_gid|_gac)/.test(nombre)) {
        [location.hostname, "." + location.hostname.replace(/^www\./, "")].forEach(function (d) {
          document.cookie = nombre + "=; Max-Age=0; path=/; domain=" + d;
        });
        document.cookie = nombre + "=; Max-Age=0; path=/";
      }
    });
  }

  function aviso() {
    if (document.querySelector(".cookies")) { return; }
    var caja = document.createElement("div");
    caja.className = "cookies";
    caja.setAttribute("role", "region");
    caja.setAttribute("aria-label", "Aviso de cookies");
    caja.innerHTML =
      '<p>Usamos cookies de Google para medir las visitas y qué anuncios nos traen solicitudes, no para mostrarte publicidad. ' +
      '<a href="legal.html#cookies">Más información</a></p>' +
      '<div class="cookies-botones">' +
      '<button type="button" class="cookies-btn" data-v="no">Rechazar</button>' +
      '<button type="button" class="cookies-btn" data-v="si">Aceptar</button>' +
      "</div>";
    caja.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-v]");
      if (!b) { return; }
      guardar(b.dataset.v);
      evento("cookies_" + b.dataset.v);
      caja.remove();
      if (b.dataset.v === "si") { cargarGoogle(); }
      else { borrarCookiesGoogle(); if (cargada) { location.reload(); } } // por si las había aceptado antes
    });
    document.body.appendChild(caja);
  }

  // Enlaces o botones para cambiar la elección (por ejemplo, en el aviso legal).
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-cookies]")) { e.preventDefault(); aviso(); }
  });

  var v = eleccion();
  if (v === "si") { cargarGoogle(); }
  else if (v === "no") { borrarCookiesGoogle(); }
  else { evento("cookies_aviso"); aviso(); }
})();

// Medición de Google Ads con consentimiento previo.
// La etiqueta de Google solo se carga si la persona acepta las cookies en el aviso.
// Mientras googleAds.id esté vacío en assets/config.js, no se carga nada ni se muestra el aviso.
//
// Además, si la visita llega desde un anuncio (gclid o utm_medium=cpc), se marca la página con
// la clase "desde-anuncio" para ocultar los enlaces que sacan de la landing.
(function () {
  var params = new URLSearchParams(location.search);
  if (params.get("gclid") || params.get("gbraid") || params.get("wbraid") || /^(cpc|ppc|paid)$/i.test(params.get("utm_medium") || "")) {
    document.documentElement.classList.add("desde-anuncio");
  }

  var ads = (window.PIMEN_CONFIG || {}).googleAds || {};
  if (!ads.id) { return; }
  document.documentElement.classList.add("cookies-activas");

  var CLAVE = "pimen_cookies"; // "si" o "no"; es solo la elección del aviso, no se usa para nada más.
  function eleccion() { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(CLAVE, v); } catch (e) {} }

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  var cargada = false;

  function conversion(etiqueta) {
    if (cargada && etiqueta) { gtag("event", "conversion", { send_to: ads.id + "/" + etiqueta }); }
  }

  function cargarGoogle() {
    if (cargada) { return; }
    cargada = true;
    gtag("consent", "default", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "denied", analytics_storage: "denied" });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ads.id);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", ads.id);
    // Página de gracias de particulares = solicitud enviada (la de empresas lleva ?de=empresa).
    if (document.body.dataset.conversion === "lead" && params.get("de") !== "empresa") {
      conversion(ads.conversionLead);
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
      '<p>Usamos cookies de Google solo para medir qué anuncios nos traen solicitudes, no para mostrarte publicidad. ' +
      '<a href="legal.html#cookies">Más información</a></p>' +
      '<div class="cookies-botones">' +
      '<button type="button" class="cookies-btn" data-v="no">Rechazar</button>' +
      '<button type="button" class="cookies-btn" data-v="si">Aceptar</button>' +
      "</div>";
    caja.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-v]");
      if (!b) { return; }
      guardar(b.dataset.v);
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
  else { aviso(); }
})();

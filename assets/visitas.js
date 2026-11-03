// Medición propia, anónima y sin cookies: guarda en la base de datos del panel (Supabase) qué se hace en cada
// página (scroll, formulario, llamadas…), para saber dónde se van las visitas, también las de quien rechaza las
// cookies de Google. Ver supabase/visitas.sql.
//
// No usa cookies ni localStorage ni identifica a nadie: el id de cada visita se crea al cargar la página y solo
// vive en memoria. No se envía la IP (la base de datos no la guarda), ni el navegador, ni el gclid, ni nada de lo
// escrito en el formulario.
//
// Otros scripts mandan eventos con window.pimenVisitas.evento(nombre, datos, enseguida).
(function () {
  var cfg = window.PIMEN_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey) { return; }
  if (navigator.webdriver || /bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent || "")) { return; }
  // Las visitas de quien está dentro del panel (socios) no cuentan.
  try {
    for (var i = 0; i < localStorage.length; i++) {
      if (/^sb-.*-auth-token$/.test(localStorage.key(i))) { return; }
    }
  } catch (e) {}

  var params = new URLSearchParams(location.search);
  var ancho = window.innerWidth || 0;
  var base = {
    visita: aleatorio(),
    pagina: location.pathname.slice(0, 100),
    anuncio: !!(params.get("gclid") || params.get("gbraid") || params.get("wbraid") || /^(cpc|ppc|paid)$/i.test(params.get("utm_medium") || "")),
    dispositivo: ancho < 768 ? "movil" : ancho < 1100 ? "tablet" : "escritorio",
    campana: (params.get("utm_campaign") || "").slice(0, 40)
  };

  function aleatorio() {
    try {
      var a = new Uint8Array(8);
      crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    } catch (e) { return Math.random().toString(16).slice(2, 18); }
  }

  var cola = [], temporizador = null, total = 0, MAX_EVENTOS = 80;

  function enviar() {
    clearTimeout(temporizador);
    temporizador = null;
    while (cola.length) {
      var lote = cola.splice(0, 30);
      try {
        // keepalive: el envío no se corta si la persona cambia de página o cierra la pestaña.
        fetch(cfg.supabaseUrl + "/rest/v1/rpc/registrar_visita", {
          method: "POST",
          body: JSON.stringify({ datos: Object.assign({}, base, { eventos: lote }) }),
          keepalive: true,
          headers: { "Content-Type": "application/json", "apikey": cfg.supabaseKey, "Authorization": "Bearer " + cfg.supabaseKey }
        }).catch(function () {});
      } catch (e) {}
    }
  }

  function evento(nombre, datos, enseguida) {
    if (total >= MAX_EVENTOS) { return; }
    total++;
    cola.push({ e: nombre, d: datos || {}, ms: Math.round(performance.now()) });
    if (enseguida) { enviar(); }
    else if (!temporizador) { temporizador = setTimeout(enviar, 4000); }
  }

  var referrer = "";
  try {
    if (document.referrer) {
      var r = new URL(document.referrer);
      if (r.host !== location.host) { referrer = r.hostname.replace(/^www\./, "").slice(0, 60); }
    }
  } catch (e) {}
  evento("vista", { ancho: ancho, alto: window.innerHeight || 0, referrer: referrer }, true);

  // Al salir o cambiar de pestaña: tiempo desde que se abrió la página y lo que quedara por enviar.
  function salida() {
    evento("salida", { segundos: Math.min(1800, Math.round(performance.now() / 1000)) }, true);
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") { salida(); } });
  window.addEventListener("pagehide", salida);

  window.pimenVisitas = { evento: evento };
})();

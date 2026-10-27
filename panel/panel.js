// Panel interno de Pimen Leads: pendientes, directorio de prospección (reformistas y canal), clientes (leads), empresas, envíos y resumen.
// Los datos vienen de Supabase; el acceso lo controla la tabla admins (ver supabase/schema.sql).
// Todo el texto que viene de formularios se pinta con textContent: nunca como HTML.
(function () {
  "use strict";

  var cfg = window.PIMEN_CONFIG || {};
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");

  var TIPOS = { bano: "Baño", cocina: "Cocina", integral: "Integral", otro: "Otro" };
  var ESTADOS_LEAD = { nuevo: "Nuevo", por_verificar: "Por verificar", verificado: "Verificado", enviado: "Enviado", cerrado: "Cerrado", descartado: "Inválido / descartado" };
  var ESTADOS_EMPRESA = { interesada: "Interesada", prueba: "En prueba", activa: "Activa", pausada: "Pausada", baja: "Baja" };
  var RESULTADOS = { pendiente: "Pendiente", contactado: "Contactado", presupuestado: "Presupuestado", ganado: "Ganado", perdido: "Perdido" };
  var DEVOLUCIONES = { no: "Sin devolución", solicitada: "Devolución pedida", aceptada: "Devuelto", rechazada: "Devolución rechazada" };
  var MOTIVOS = ["No contesta", "Datos falsos", "Solo quiere saber el precio", "Fuera de zona", "Duplicado", "Ya tiene empresa", "Otro"];

  // Prospección: dos tipos de ficha de contacto (reformista y canal) con su propio embudo; los clientes finales son los leads.
  var CONTACTO_TIPOS = { proveedor: "Reformista", canal: "Canal" };
  var SUBTIPOS = { administracion: "Administración de fincas", inmobiliaria: "Inmobiliaria", gestora: "Gestora", otro: "Otro canal" };
  var SUBTIPOS_PLURAL = { administracion: "Administraciones", inmobiliaria: "Inmobiliarias", gestora: "Gestoras", otro: "Otros canales" };
  var ESTADOS_PROV = {
    nuevo: "Nuevo", email_enviado: "Email enviado", respondio: "Respondió", llamada_pendiente: "Llamada pendiente", contactado: "Contactado",
    no_interesa: "No interesa ahora", acuerdo_cerrado: "Acuerdo cerrado", activo: "Activo", pausado: "Pausado / descartado"
  };
  var ESTADOS_CANAL = {
    nuevo: "Nuevo", email_enviado: "Email enviado", llamada_hecha: "Llamada hecha", no_interesa: "No interesa ahora", colabora: "Colabora", inactivo: "Inactivo"
  };
  var ESTADOS_CONTACTO = Object.assign({}, ESTADOS_PROV, ESTADOS_CANAL);
  var REFORMAS = { bano: "Baños", cocina: "Cocinas", integral: "Integrales" };
  var CANALES = { email: "Email", llamada: "Llamada", whatsapp: "WhatsApp" };
  var ESTADOS_INTER = {
    email: { enviado: "Enviado", respondido: "Respondido", sin_respuesta: "Sin respuesta", rebotado: "Rebotado" },
    llamada: { pendiente: "Pendiente", hecha: "Hecha", no_contesta: "No contesta", no_interesa: "No interesa", devolver_llamada: "Devolver llamada" },
    whatsapp: { enviado: "Enviado", respondido: "Respondido", pendiente: "Pendiente" }
  };
  var ESTADOS_INTER_TODOS = Object.assign({}, ESTADOS_INTER.email, ESTADOS_INTER.llamada, ESTADOS_INTER.whatsapp);
  var CUENTA_COMERCIAL = "comercial@pimenleads.com";
  var DOMINIOS_GENERICOS = ["gmail.com", "hotmail.com", "hotmail.es", "yahoo.es", "yahoo.com", "outlook.com", "outlook.es", "icloud.com", "telefonica.net"];
  var ACCION_POR_ESTADO = {
    respondio: "Llamar (respondió al correo)", llamada_pendiente: "Llamar", acuerdo_cerrado: "Enviar el primer lead gratis y pasar a activo",
    contactado: "Seguimiento", llamada_hecha: "Esperar respuesta / seguimiento"
  };
  var VIAS = { telefono: "Teléfono", whatsapp: "WhatsApp", canal: "Canal (partner)", otro: "Otro" };

  var state = {
    session: null,
    leads: [],
    empresas: [],
    contactos: [],
    interacciones: [],
    sinProspeccion: false,
    dirTipo: "",
    dirSub: "",
    dirReforma: "",
    dirEstado: "",
    dirBusqueda: "",
    altaTipo: "proveedor",
    altaCanal: null,
    registrando: null,
    filtroLead: "nuevo",
    filtroTipo: "",
    busqueda: "",
    filtroEmpresa: "",
    periodo: "mes"
  };
  var sb;

  // ── Utilidades ────────────────────────────────────────────────────────

  // Crea un elemento. Los textos siempre se insertan como texto, no como HTML.
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) { return; }
        if (k === "class") { el.className = v; }
        else if (k === "text") { el.textContent = v; }
        else if (k.slice(0, 2) === "on") { el.addEventListener(k.slice(2), v); }
        else if (k === "value" || k === "checked" || k === "selected" || k === "disabled") { el[k] = v; }
        else { el.setAttribute(k, v === true ? "" : v); }
      });
    }
    for (var i = 2; i < arguments.length; i++) { append(el, arguments[i]); }
    return el;
  }
  function append(el, child) {
    if (child == null || child === false) { return; }
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(typeof child === "string" || typeof child === "number" ? document.createTextNode(String(child)) : child);
  }

  var fmtFecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  var fmtDia = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });
  var fmtEuro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  function fecha(d) { return fmtFecha.format(new Date(d)); }
  function dia(d) { return fmtDia.format(new Date(d)); }
  function euros(n) { return fmtEuro.format(Number(n) || 0); }
  function pct(a, b) { return b ? Math.round(a / b * 100) + " %" : "—"; }
  function digitos(t) { return String(t || "").replace(/\D/g, ""); }
  function telWa(t) {
    var d = digitos(t).replace(/^00/, "");
    return d.length === 9 ? "34" + d : d;
  }
  function waUrl(tel, texto) { return "https://wa.me/" + telWa(tel) + "?text=" + encodeURIComponent(texto); }
  function badge(v, labels) { return h("span", { class: "badge", "data-v": v, text: labels[v] || v }); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  var toastTimer;
  function toast(texto, esError) {
    toastEl.textContent = texto;
    toastEl.className = "pn-toast" + (esError ? " err" : "");
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, esError ? 6000 : 2500);
  }

  // Ejecuta un cambio en la base de datos, avisa y recarga los datos.
  function guardar(query, okTexto) {
    return query.then(function (res) {
      if (res.error) { throw res.error; }
      if (okTexto) { toast(okTexto); }
      return cargar();
    }).catch(function (err) {
      toast("No se ha podido guardar: " + (err.message || err), true);
    });
  }

  // Descarga un CSV que Excel abre bien en español (separador ";", coma decimal y BOM UTF-8).
  function descargarCSV(nombre, cabecera, filas) {
    function celda(v) {
      if (typeof v === "number") { return String(v).replace(".", ","); }
      v = v == null ? "" : String(v);
      return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    var texto = [cabecera].concat(filas).map(function (f) { return f.map(celda).join(";"); }).join("\r\n");
    var url = URL.createObjectURL(new Blob(["\ufeff" + texto], { type: "text/csv;charset=utf-8" }));
    var a = h("a", { href: url, download: nombre });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  var CABECERA_ENVIOS = ["Fecha envío", "Empresa", "Lead", "Tipo", "Reforma", "Zona", "Cliente", "Precio (€, sin IVA)", "Resultado", "Devolución", "Cobrado"];
  function filaEnvio(x) {
    var emp = empresaPorId(x.empresa_id);
    return [x.created_at.slice(0, 10), emp ? emp.nombre : "#" + x.empresa_id, "#" + x.lead.id, TIPOS[x.lead.tipo], x.lead.reforma, x.lead.zona, x.lead.nombre,
      Number(x.precio), RESULTADOS[x.resultado], DEVOLUCIONES[x.devolucion], x.cobrado ? "Sí" : "No"];
  }
  function slug(t) { return norm(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function empresaPorId(id) {
    return state.empresas.filter(function (e) { return e.id === id; })[0];
  }
  function todosLosEnvios() {
    var out = [];
    state.leads.forEach(function (l) {
      (l.envios || []).forEach(function (e) { out.push(Object.assign({ lead: l }, e)); });
    });
    return out;
  }
  function cuenta(e) { return e.devolucion !== "aceptada"; }

  // ── Carga y acceso ────────────────────────────────────────────────────

  function cargar() {
    return Promise.all([
      sb.from("leads").select("*, envios(*)").order("created_at", { ascending: false }).limit(2000),
      sb.from("empresas").select("*").order("nombre"),
      sb.from("contactos").select("*").order("nombre").limit(5000),
      sb.from("interacciones").select("*").limit(20000)
    ]).then(function (r) {
      if (r[0].error) { throw r[0].error; }
      if (r[1].error) { throw r[1].error; }
      state.leads = r[0].data;
      state.empresas = r[1].data;
      // Si todavía no se ha ejecutado supabase/prospeccion.sql, el resto del panel sigue funcionando.
      state.sinProspeccion = !!(r[2].error || r[3].error);
      state.contactos = state.sinProspeccion ? [] : r[2].data;
      state.interacciones = state.sinProspeccion ? [] : r[3].data;
      render();
    }).catch(function (err) {
      toast("Error al cargar datos: " + (err.message || err), true);
    });
  }

  function arrancar() {
    if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase) {
      app.replaceChildren(h("div", { class: "pn-login" }, h("div", { class: "card" },
        h("h2", { text: "Falta conectar la base de datos" }),
        h("p", { text: "Rellena supabaseUrl y supabaseKey en assets/config.js. Los pasos están en supabase/LEEME.md." })
      )));
      return;
    }
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
    sb.auth.onAuthStateChange(function (_evento, session) {
      // Las llamadas a Supabase no deben hacerse dentro de este callback.
      setTimeout(function () { alCambiarSesion(session); }, 0);
    });
  }

  function alCambiarSesion(session) {
    var antes = state.session && state.session.user.id;
    state.session = session;
    if (!session) { pintarLogin(); return; }
    if (antes === session.user.id && state.leads.length) { return; }
    sb.rpc("es_admin").then(function (res) {
      if (res.error || !res.data) { pintarSinAcceso(); return; }
      cargar();
    });
  }

  function pintarLogin(enviadoA) {
    var email = h("input", { type: "email", id: "login-email", autocomplete: "email", required: true });
    var msg = h("p", { class: "msg" });
    var form = h("form", {
      onsubmit: function (e) {
        e.preventDefault();
        var correo = email.value.trim();
        if (!/^\S+@\S+\.\S+$/.test(correo)) { msg.className = "msg err"; msg.textContent = "Escribe un correo válido."; return; }
        msg.className = "msg"; msg.textContent = "Enviando…";
        sb.auth.signInWithOtp({ email: correo, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (res) {
          if (res.error) { msg.className = "msg err"; msg.textContent = res.error.message; return; }
          pintarLogin(correo);
        });
      }
    },
      h("div", { class: "field" }, h("label", { for: "login-email", text: "Tu correo" }), email),
      h("button", { class: "btn", type: "submit", text: "Enviarme el enlace de acceso" }),
      msg
    );
    app.replaceChildren(h("div", { class: "pn-login" }, h("div", { class: "card" },
      h("a", { class: "brand", href: "../" }, h("span", { class: "mark", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i")), "Pimen Leads"),
      h("h2", { text: "Panel interno" }),
      enviadoA
        ? h("p", { text: "Te hemos enviado un enlace a " + enviadoA + ". Ábrelo en este mismo navegador para entrar." })
        : [h("p", { class: "meta", text: "Te enviamos un enlace a tu correo. Solo pueden entrar los correos autorizados." }), form]
    )));
    if (!enviadoA) { email.focus(); }
  }

  function pintarSinAcceso() {
    app.replaceChildren(h("div", { class: "pn-login" }, h("div", { class: "card" },
      h("h2", { text: "Este correo no tiene acceso" }),
      h("p", { text: (state.session.user.email || "") + " no está en la lista de administradores. Pide que lo añadan en la tabla admins." }),
      h("button", { class: "btn btn-ghost", type: "button", text: "Salir", onclick: function () { sb.auth.signOut(); } })
    )));
  }

  // ── Estructura y navegación (#pendientes, #contactos, #contactos/7, #contactos/nuevo, #leads, #leads/12, #leads/nuevo, #empresas, #empresas/3, #empresas/nueva, #resumen) ──

  function ruta() {
    var partes = location.hash.replace(/^#/, "").split("/");
    return { vista: partes[0] || "pendientes", id: partes[1] || null };
  }

  function render() {
    if (!state.session) { return; }
    var r = ruta();
    var nuevos = state.leads.filter(function (l) { return l.estado === "nuevo" || l.estado === "por_verificar"; }).length;
    var interesadas = state.empresas.filter(function (e) { return e.estado === "interesada"; }).length;
    if (r.vista !== "contactos") { state.registrando = null; }
    function tab(vista, texto, n) {
      return h("a", { href: "#" + vista, "aria-current": r.vista === vista ? "page" : null }, texto, n ? h("span", { class: "count", text: n }) : null);
    }
    var top = h("header", { class: "pn-top" }, h("div", { class: "bar" },
      h("a", { class: "brand", href: "#pendientes" }, h("span", { class: "mark", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i")), "Pimen Leads ", h("small", { text: "panel" })),
      h("nav", { class: "pn-tabs", "aria-label": "Secciones del panel" },
        tab("pendientes", "Pendientes", totalPendientes()), tab("contactos", "Directorio"), tab("leads", "Clientes", nuevos),
        tab("empresas", "Empresas", interesadas), tab("resumen", "Resumen")),
      h("div", { class: "pn-user" },
        h("button", { class: "linkbtn", type: "button", text: "Actualizar", onclick: function () { cargar().then(function () { toast("Datos actualizados"); }); } }),
        h("span", { text: state.session.user.email }),
        h("button", { class: "linkbtn", type: "button", text: "Salir", onclick: function () { sb.auth.signOut(); } }))
    ));
    var main = h("main", { class: "pn-main" });
    if (r.vista === "contactos") { vistaContactos(main, r.id); }
    else if (r.vista === "empresas") { vistaEmpresas(main, r.id); }
    else if (r.vista === "resumen") { vistaResumen(main); }
    else if (r.vista === "leads") { vistaLeads(main, r.id); }
    else { vistaPendientes(main); }
    var scroll = window.scrollY;
    app.replaceChildren(top, main);
    window.scrollTo(0, scroll);
  }

  // ── Prospección: pendientes y directorio de reformistas y canal ───────

  function ordenInter(a, b) {
    var ta = a.ocurrio_at ? new Date(a.ocurrio_at).getTime() : null;
    var tb = b.ocurrio_at ? new Date(b.ocurrio_at).getTime() : null;
    if (ta === tb) { return b.id - a.id; }
    if (ta === null) { return 1; }
    if (tb === null) { return -1; }
    return tb - ta;
  }
  var cacheInter = { src: null, map: {} };
  // Interacciones de una ficha, la más reciente primero (las sin fecha, al final).
  function internasDe(id) {
    if (cacheInter.src !== state.interacciones) {
      cacheInter = { src: state.interacciones, map: {} };
      state.interacciones.forEach(function (i) {
        var k = i.contacto_id != null ? i.contacto_id : "l" + i.lead_id;
        (cacheInter.map[k] = cacheInter.map[k] || []).push(i);
      });
      Object.keys(cacheInter.map).forEach(function (k) { cacheInter.map[k].sort(ordenInter); });
    }
    return cacheInter.map[id] || [];
  }
  function estadosDe(c) { return c.tipo === "canal" ? ESTADOS_CANAL : ESTADOS_PROV; }
  function fechaInter(i) { return i.ocurrio_at ? fecha(i.ocurrio_at) : "sin fecha anotada"; }
  function reformasTexto(c) {
    var r = c.reformas || [];
    if (!r.length) { return "tipo por clasificar"; }
    var nombres = r.map(function (t) { return REFORMAS[t].toLowerCase(); }).join(", ");
    return r.length > 1 ? "mixto (" + nombres + ")" : nombres;
  }
  function tipoTexto(c) { return c.tipo === "canal" ? SUBTIPOS[c.subtipo] : "Reformista · " + reformasTexto(c); }
  function autorActual() { return state.session && state.session.user.email ? state.session.user.email.toLowerCase() : null; }
  function ahoraLocal() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
  function hoyISO() { return ahoraLocal().slice(0, 10); }
  function contactoPorId(id) { return state.contactos.filter(function (c) { return c.id === id; })[0]; }

  function lineaUltima(c) {
    var its = internasDe(c.id);
    if (!its.length) { return "Aún no le hemos escrito ni llamado"; }
    var i = its[0];
    return CANALES[i.canal] + ": " + (ESTADOS_INTER_TODOS[i.estado] || i.estado).toLowerCase() + " · " + fechaInter(i) +
      (i.canal === "email" && i.direccion === "saliente" && i.desde ? " · desde " + i.desde : "");
  }
  // Resumen de una frase para saber si ya hemos escrito a esta empresa.
  function yaEscritos(c) {
    var its = internasDe(c.id);
    var correos = its.filter(function (i) { return i.canal === "email" && i.direccion === "saliente"; });
    var llamadas = its.filter(function (i) { return i.canal === "llamada"; });
    if (!correos.length && !llamadas.length) { return "Todavía no le hemos escrito ni llamado."; }
    var partes = [];
    if (correos.length) {
      var u = correos[0];
      partes.push("Ya le escribimos" + (correos.length > 1 ? " (" + correos.length + " correos)" : "") + ": último correo " +
        (u.ocurrio_at ? "el " + fecha(u.ocurrio_at) : "(fecha no anotada)") + " desde " + (u.desde || "una cuenta sin anotar") +
        (u.campana ? ", «" + u.campana + "»" : "") + ".");
      partes.push(its.some(function (i) { return i.canal === "email" && i.estado === "respondido"; }) ? "Respondió." : "Sin respuesta anotada.");
    }
    if (llamadas.length) {
      partes.push("Llamada " + (ESTADOS_INTER.llamada[llamadas[0].estado] || llamadas[0].estado).toLowerCase() + " (" + fechaInter(llamadas[0]) + ").");
    }
    return partes.join(" ");
  }

  function filaContacto(c, selId) {
    return h("button", {
      class: "row", type: "button", "aria-current": selId === c.id ? "true" : null,
      onclick: function () { location.hash = "contactos/" + c.id; }
    },
      h("span", { class: "l1" }, h("span", { class: "name", text: c.nombre }), badge(c.estado, ESTADOS_CONTACTO)),
      h("span", { class: "l2", text: [tipoTexto(c), c.email].filter(Boolean).join(" · ") }),
      h("span", { class: "l2", text: lineaUltima(c) }),
      c.proxima_accion ? h("span", { class: "l2 toca", text: "Toca: " + c.proxima_accion + (c.proxima_fecha ? " · " + dia(c.proxima_fecha) : "") }) : null
    );
  }

  function avisoProspeccion() {
    return h("div", { class: "card" }, h("h2", { text: "Falta crear las tablas de prospección" }),
      h("p", { text: "Ejecuta supabase/prospeccion.sql en el SQL Editor de Supabase y, después, la carga de contactos. Los pasos están en supabase/LEEME.md." }));
  }

  // Cuenta lo que hay que hacer hoy, en orden de prioridad.
  function gruposPendientes() {
    var cs = state.contactos, hoy = hoyISO(), usados = {};
    function grupo(titulo, nota, filtro) {
      var items = cs.filter(function (c) { return !usados[c.id] && filtro(c); });
      items.forEach(function (c) { usados[c.id] = true; });
      return { titulo: titulo, nota: nota, items: items };
    }
    var cerrados = ["no_interesa", "pausado", "inactivo"];
    return [
      grupo("Respondió y tiene llamada pendiente", null, function (c) { return c.tipo === "proveedor" && c.estado === "llamada_pendiente"; }),
      grupo("Respondió: hay que llamar", null, function (c) { return c.tipo === "proveedor" && c.estado === "respondio"; }),
      grupo("Acuerdo cerrado: activar y mandar el primer lead", "Un acuerdo no es el final: envíale el primer lead gratis y pásalo a activo.", function (c) { return c.tipo === "proveedor" && c.estado === "acuerdo_cerrado"; }),
      grupo("Canal con llamada hecha, a la espera", null, function (c) { return c.tipo === "canal" && c.estado === "llamada_hecha"; }),
      grupo("Seguimiento con fecha de hoy o vencida", null, function (c) { return c.proxima_fecha && c.proxima_fecha <= hoy && cerrados.indexOf(c.estado) === -1; })
    ];
  }
  // Leads inválidos ya enviados: las empresas deben saberlo en los 7 días siguientes al envío.
  function invalidosPorAvisar() {
    return state.leads.filter(function (l) {
      return l.estado === "descartado" && (l.envios || []).some(function (e) { return !e.avisada; });
    });
  }
  function totalPendientes() {
    var n = invalidosPorAvisar().length; state.leads.filter(function (l) { return l.estado === "nuevo" || l.estado === "por_verificar"; }).length;
    gruposPendientes().forEach(function (g) { n += g.items.length; });
    return n;
  }

  function vistaPendientes(main) {
    main.appendChild(h("div", { class: "pn-toolbar" }, h("h2", { text: "Pendientes" }), h("span", { class: "spacer" }),
      h("a", { class: "btn btn-sm btn-ghost", href: "#contactos", text: "Buscar antes de llamar" }),
      h("a", { class: "btn btn-sm", href: "#contactos/nuevo", text: "+ Nuevo contacto" })));
    var cont = h("div", { class: "pn-pend" });
    var nuevos = state.leads.filter(function (l) { return l.estado === "nuevo" || l.estado === "por_verificar"; });
    var hay = false;
    if (nuevos.length) {
      hay = true;
      cont.appendChild(h("section", {}, h("h3", { text: "Clientes por verificar (" + nuevos.length + ")" }),
        h("p", { class: "meta", text: "Solicitudes que han entrado y todavía no se han llamado." }),
        h("div", { class: "pn-list" }, nuevos.map(function (l) {
          return h("button", { class: "row", type: "button", onclick: function () { location.hash = "leads/" + l.id; } },
            h("span", { class: "l1" }, h("span", { class: "name", text: l.nombre }), badge(l.estado, ESTADOS_LEAD), h("span", { class: "when", text: fecha(l.created_at) })),
            h("span", { class: "l2", text: [TIPOS[l.tipo], l.zona, l.plazo].filter(Boolean).join(" · ") }));
        }))));
    }
    var invalidos = invalidosPorAvisar();
    if (invalidos.length) {
      hay = true;
      cont.appendChild(h("section", {}, h("h3", { text: "Leads inválidos: avisar a las empresas (" + invalidos.length + ")" }),
        h("p", { class: "meta", text: "No se cobran, pero hay que avisar en los 7 días siguientes al envío." }),
        h("div", { class: "pn-list" }, invalidos.map(function (l) {
          var primero = l.envios.reduce(function (m, e) { return e.created_at < m ? e.created_at : m; }, l.envios[0].created_at);
          return h("button", { class: "row", type: "button", onclick: function () { location.hash = "leads/" + l.id; } },
            h("span", { class: "l1" }, h("span", { class: "name", text: l.nombre }), badge(l.estado, ESTADOS_LEAD)),
            h("span", { class: "l2 toca", text: "Avisar antes del " + dia(new Date(new Date(primero).getTime() + 7 * 864e5)) }));
        }))));
    }
    if (state.sinProspeccion) {
      cont.appendChild(avisoProspeccion());
    } else {
      gruposPendientes().forEach(function (g) {
        if (!g.items.length) { return; }
        hay = true;
        cont.appendChild(h("section", {}, h("h3", { text: g.titulo + " (" + g.items.length + ")" }),
          g.nota ? h("p", { class: "meta", text: g.nota }) : null,
          h("div", { class: "pn-list" }, g.items.map(function (c) { return filaContacto(c, null); }))));
      });
      var sinRespuesta = state.contactos.filter(function (c) { return c.estado === "email_enviado"; }).length;
      if (sinRespuesta) {
        cont.appendChild(h("p", { class: "meta" }, sinRespuesta + " fichas con el correo enviado y sin respuesta anotada. Se siguen desde el ",
          h("a", { href: "#contactos", text: "directorio" }), "; no ensucian los pendientes."));
      }
    }
    if (!hay && !state.sinProspeccion) { cont.insertBefore(h("p", { class: "pn-empty", text: "Nada pendiente ahora mismo." }), cont.firstChild); }
    main.appendChild(cont);
  }

  function contactosFiltrados() {
    var q = norm(state.dirBusqueda);
    return state.contactos.filter(function (c) {
      if (state.dirTipo && c.tipo !== state.dirTipo) { return false; }
      if (state.dirTipo === "canal" && state.dirSub && c.subtipo !== state.dirSub) { return false; }
      if (state.dirTipo === "proveedor" && state.dirReforma) {
        var r = c.reformas || [];
        if (state.dirReforma === "sin" ? r.length : state.dirReforma === "mixto" ? r.length < 2 : r.indexOf(state.dirReforma) === -1) { return false; }
      }
      if (state.dirEstado && c.estado !== state.dirEstado) { return false; }
      if (q) {
        var texto = norm([c.nombre, c.email, c.dominio, c.contacto, c.telefono].join(" "));
        if (texto.indexOf(q) === -1 && digitos(c.telefono).indexOf(digitos(q) || "@@") === -1) { return false; }
      }
      return true;
    });
  }

  // Importar listas pegadas (Excel, Gmail…): teléfonos, contactos nuevos o quién ha respondido.
  function vistaImportar(main) {
    var MODOS = [
      ["telefonos", "Añadir teléfonos a fichas que ya existen"],
      ["nuevos", "Añadir contactos nuevos (por ejemplo, una tanda que falta)"],
      ["respondieron", "Marcar que han respondido al correo"]
    ];
    var AYUDA = {
      telefonos: "Una línea por ficha: correo (o nombre exacto) y teléfono, separados por tabulador, «;» o coma. Puedes pegar dos columnas de Excel.",
      nuevos: "Una línea por contacto: nombre, correo y teléfono (el teléfono es opcional). Si solo pones el correo, el nombre se saca del dominio. Los correos que ya existen se saltan.",
      respondieron: "Pega los correos de quien ha contestado (vale «Nombre <correo>», una línea por respuesta). Se busca por correo y, si no, por dominio de empresa."
    };
    var modo = h("select", { id: "imp-modo", onchange: function () { pintarOpciones(); salida.replaceChildren(); } },
      MODOS.map(function (o) { return h("option", { value: o[0], text: o[1] }); }));
    var ayuda = h("p", { class: "meta" });
    var texto = h("textarea", { id: "imp-texto", rows: "8", placeholder: "Pega aquí…" });
    var opciones = h("div", { class: "grid2" });
    var salida = h("div", {});
    var tipo, sub, reformas, registrar, fechaEnvio, campana;

    function pintarOpciones() {
      ayuda.textContent = AYUDA[modo.value];
      opciones.replaceChildren();
      if (modo.value !== "nuevos") { return; }
      tipo = h("select", { "aria-label": "Tipo de ficha", onchange: pintarOpciones }, [["proveedor", "Empresas de reformas"], ["canal", "Canal"]].map(function (o) {
        return h("option", { value: o[0], text: o[1], selected: tipo && tipo.value === o[0] });
      }));
      sub = h("select", { "aria-label": "Tipo de canal" }, Object.keys(SUBTIPOS).map(function (k) { return h("option", { value: k, text: SUBTIPOS[k] }); }));
      reformas = h("div", { class: "checks-inline" }, Object.keys(REFORMAS).map(function (t) {
        return h("label", {}, h("input", { type: "checkbox", name: "imp-reformas", value: t }), REFORMAS[t]);
      }));
      registrar = h("input", { type: "checkbox", id: "imp-reg", checked: true });
      fechaEnvio = h("input", { type: "date", "aria-label": "Fecha del envío" });
      campana = h("input", { type: "text", value: "Primer contacto sin coste", "aria-label": "Campaña" });
      opciones.appendChild(h("div", { class: "field" }, h("label", { text: "Tipo de ficha" }), tipo));
      opciones.appendChild(tipo.value === "canal" ? h("div", { class: "field" }, h("label", { text: "Tipo de canal (obligatorio)" }), sub)
        : h("fieldset", {}, h("legend", { text: "Tipo de reforma (vacío = por clasificar)" }), reformas));
      opciones.appendChild(h("label", { class: "inline" }, registrar, " Ya les hemos escrito: anotar el correo enviado desde " + CUENTA_COMERCIAL));
      opciones.appendChild(h("div", { class: "field" }, h("label", { text: "Fecha del envío (vacío = sin fecha anotada)" }), fechaEnvio));
      opciones.appendChild(h("div", { class: "field" }, h("label", { text: "Campaña o asunto" }), campana));
    }

    function lineas() { return texto.value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean); }
    function campos(l) {
      var sep = l.indexOf("\t") !== -1 ? "\t" : l.indexOf(";") !== -1 ? ";" : ",";
      return l.split(sep).map(function (x) { return x.trim(); });
    }
    function correoEn(t) { var m = String(t).match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/); return m ? m[0].toLowerCase() : null; }
    function porCorreoONombre(clave) {
      var k = norm(clave), e = String(clave).toLowerCase();
      return state.contactos.filter(function (c) { return (c.email && c.email.toLowerCase() === e) || norm(c.nombre) === k; })[0];
    }
    function porDominio(correo) {
      var exacto = state.contactos.filter(function (c) { return c.email && c.email.toLowerCase() === correo; })[0];
      if (exacto) { return exacto; }
      var dom = correo.split("@")[1];
      if (DOMINIOS_GENERICOS.indexOf(dom) !== -1) { return null; }
      var m = state.contactos.filter(function (c) { return c.dominio === dom; });
      return m.length === 1 ? m[0] : null;
    }

    function planificar() {
      var items = [], m = modo.value;
      if (m === "telefonos") {
        lineas().forEach(function (l) {
          var f = campos(l), c = f[0] && porCorreoONombre(f[0]), tel = f[1];
          if (!c) { items.push({ texto: f[0] + ": no hay ninguna ficha con ese correo o nombre", ok: false }); }
          else if (!tel) { items.push({ texto: c.nombre + ": falta el teléfono", ok: false }); }
          else { items.push({ texto: c.nombre + " → " + tel, ok: true, run: function () { return sb.from("contactos").update({ telefono: tel }).eq("id", c.id); } }); }
        });
      } else if (m === "respondieron") {
        var vistos = {};
        lineas().forEach(function (l) {
          var correo = correoEn(l);
          if (!correo) { items.push({ texto: l + ": no hay ningún correo", ok: false }); return; }
          var c = porDominio(correo);
          if (!c) { items.push({ texto: correo + ": no coincide con ninguna ficha (revisa si es otro dominio)", ok: false }); return; }
          if (vistos[c.id]) { return; }
          vistos[c.id] = true;
          var salientes = internasDe(c.id).filter(function (i) { return i.canal === "email" && i.direccion === "saliente"; });
          items.push({
            texto: c.nombre + (c.email && c.email.toLowerCase() !== correo ? " (por dominio, " + correo + ")" : "") + " → respondió", ok: true,
            run: function () {
              var q = salientes.length
                ? sb.from("interacciones").update({ estado: "respondido" }).eq("id", salientes[0].id)
                : sb.from("interacciones").insert({ contacto_id: c.id, canal: "email", direccion: "entrante", estado: "respondido", resumen: "Respuesta anotada desde Importar", autor: autorActual() });
              return q.then(function (res) {
                if (res.error || c.tipo !== "proveedor" || ["nuevo", "email_enviado"].indexOf(c.estado) === -1) { return res; }
                return sb.from("contactos").update({ estado: "respondio", proxima_accion: c.proxima_accion || ACCION_POR_ESTADO.respondio }).eq("id", c.id);
              });
            }
          });
        });
      } else {
        var existentes = {};
        state.contactos.forEach(function (c) { if (c.email) { existentes[c.email.toLowerCase()] = true; } });
        lineas().forEach(function (l) {
          var f = campos(l), correo = correoEn(l), nombre = f[0], derivado = false, tel = null;
          if (correoEn(f[0] || "") && f.length === 1) { nombre = null; }
          if (!nombre) {
            if (!correo) { items.push({ texto: l + ": falta el nombre o el correo", ok: false }); return; }
            nombre = correo.split("@")[1].replace(/\.[a-z]+$/, "").replace(/^./, function (x) { return x.toUpperCase(); }); derivado = true;
          }
          f.forEach(function (x) { if (!correoEn(x) && x !== f[0] && /\d{6,}/.test(x.replace(/\s/g, ""))) { tel = x; } });
          if (correo && existentes[correo]) { items.push({ texto: nombre + " (" + correo + "): ya existe, se salta", ok: false }); return; }
          if (correo) { existentes[correo] = true; }
          var fila = {
            tipo: tipo.value, nombre: nombre, nombre_derivado: derivado, email: correo, telefono: tel,
            estado: registrar.checked ? "email_enviado" : "nuevo"
          };
          if (tipo.value === "canal") { fila.subtipo = sub.value; }
          else { fila.reformas = Array.prototype.filter.call(reformas.querySelectorAll("input"), function (x) { return x.checked; }).map(function (x) { return x.value; }); }
          items.push({ texto: nombre + (correo ? " (" + correo + ")" : "") + (derivado ? " · nombre sacado del dominio" : ""), ok: true, fila: fila });
        });
      }
      return items;
    }

    function aplicar(items) {
      var buenos = items.filter(function (i) { return i.ok; });
      var trabajo;
      if (modo.value === "nuevos") {
        var filas = buenos.map(function (i) { return i.fila; });
        trabajo = sb.from("contactos").insert(filas).select("id, email").then(function (res) {
          if (res.error || !registrar.checked) { return res; }
          var cuando = fechaEnvio.value ? new Date(fechaEnvio.value + "T12:00:00").toISOString() : null;
          return sb.from("interacciones").insert(res.data.map(function (c) {
            return { contacto_id: c.id, canal: "email", direccion: "saliente", ocurrio_at: cuando, desde: CUENTA_COMERCIAL, campana: campana.value.trim() || null, estado: "enviado", resumen: "Añadido con Importar", autor: autorActual() };
          }));
        });
      } else {
        trabajo = Promise.all(buenos.map(function (i) { return Promise.resolve(i.run()); })).then(function (rs) {
          var mal = rs.filter(function (r) { return r.error; })[0];
          return mal || { data: rs };
        });
      }
      state.registrando = null;
      guardar(trabajo, buenos.length + (modo.value === "nuevos" ? " fichas añadidas" : " fichas actualizadas")).then(function () { location.hash = "contactos"; });
    }

    var revisar = h("button", {
      class: "btn btn-sm", type: "button", text: "Revisar antes de importar",
      onclick: function () {
        var items = planificar(), buenos = items.filter(function (i) { return i.ok; });
        if (modo.value === "nuevos" && tipo.value === "canal" && !sub.value) { toast("Elige el tipo de canal", true); return; }
        salida.replaceChildren(
          h("p", { class: "ya", text: buenos.length + " se aplicarán · " + (items.length - buenos.length) + " no se pueden aplicar" }),
          h("ul", { class: "imp-lista" }, items.slice(0, 300).map(function (i) { return h("li", { class: i.ok ? "ok" : "ko", text: (i.ok ? "✓ " : "✗ ") + i.texto }); })),
          buenos.length ? h("div", { class: "actions" }, h("button", { class: "btn btn-sm", type: "button", text: "Aplicar " + buenos.length, onclick: function () { aplicar(items); } })) : null);
      }
    });
    state.registrando = "importar";
    pintarOpciones();
    main.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver al directorio", onclick: function () { state.registrando = null; location.hash = "contactos"; } }));
    main.appendChild(h("div", { class: "card", style: "max-width:760px" }, h("h2", { text: "Importar lista" }),
      h("div", { class: "field" }, h("label", { for: "imp-modo", text: "Qué quieres hacer" }), modo), ayuda, texto, opciones,
      h("div", { class: "actions" }, revisar), salida));
  }

  // Copia de seguridad en CSV (abre bien en Excel): fichas filtradas y su historial.
  function exportarContactos() {
    var fichas = contactosFiltrados(), dia0 = new Date().toISOString().slice(0, 10);
    function ultimo(its, canal) { var i = its.filter(function (x) { return x.canal === canal; })[0]; return i ? (ESTADOS_INTER_TODOS[i.estado] + " · " + fechaInter(i)) : ""; }
    descargarCSV("directorio-" + dia0 + ".csv",
      ["Tipo", "Subtipo / reformas", "Nombre", "Correo", "Teléfono", "Estado", "Próxima acción", "Fecha próxima acción", "Correos enviados", "Último correo", "Última llamada", "Notas"],
      fichas.map(function (c) {
        var its = internasDe(c.id);
        return [CONTACTO_TIPOS[c.tipo], c.tipo === "canal" ? SUBTIPOS[c.subtipo] : reformasTexto(c), c.nombre, c.email, c.telefono, ESTADOS_CONTACTO[c.estado],
          c.proxima_accion, c.proxima_fecha, its.filter(function (i) { return i.canal === "email" && i.direccion === "saliente"; }).length, ultimo(its, "email"), ultimo(its, "llamada"), c.notas];
      }));
    var filas = [];
    fichas.forEach(function (c) {
      internasDe(c.id).forEach(function (i) {
        filas.push([c.nombre, CONTACTO_TIPOS[c.tipo], CANALES[i.canal], i.direccion, i.ocurrio_at ? i.ocurrio_at.slice(0, 16).replace("T", " ") : "sin fecha anotada",
          i.desde, i.campana, ESTADOS_INTER_TODOS[i.estado], i.resumen, i.autor]);
      });
    });
    setTimeout(function () {
      descargarCSV("historial-" + dia0 + ".csv", ["Ficha", "Tipo", "Canal", "Dirección", "Fecha", "Desde", "Campaña", "Estado", "Resumen", "Registrado por"], filas);
    }, 400);
    toast("Descargando directorio e historial (" + fichas.length + " fichas)");
  }

  function vistaContactos(main, id) {
    if (state.sinProspeccion) { main.appendChild(avisoProspeccion()); return; }
    if (id === "importar") { vistaImportar(main); return; }
    var nuevo = id === "nuevo";
    var sel = nuevo ? {} : id ? contactoPorId(Number(id)) : null;
    var split = h("div", { class: "pn-split" + (sel ? " has-detail" : "") });
    if (sel) { main.classList.add("has-detail"); }
    var lista = h("div", { class: "pn-list" });
    var contador = h("p", { class: "meta" });

    function pintarLista() {
      var filas = contactosFiltrados();
      lista.replaceChildren(contador);
      contador.textContent = filas.length + (filas.length === 1 ? " ficha" : " fichas");
      if (!filas.length) { lista.appendChild(h("p", { class: "pn-empty", text: "Ninguna ficha con este filtro. Si no aparece, es que aún no le hemos escrito." })); return; }
      filas.forEach(function (c) { lista.appendChild(filaContacto(c, sel && sel.id)); });
    }

    var porTipo = { proveedor: 0, canal: 0 };
    state.contactos.forEach(function (c) { porTipo[c.tipo]++; });
    function chipTipo(valor, texto, n) {
      return h("button", {
        class: "chip", type: "button", "aria-pressed": state.dirTipo === valor ? "true" : "false",
        onclick: function () { state.dirTipo = valor; state.dirSub = ""; state.dirReforma = ""; state.dirEstado = ""; render(); }
      }, texto, h("b", { text: n }));
    }
    var buscar = h("input", {
      type: "search", placeholder: "Buscar por nombre, correo o dominio (ej. finquesfalcon.com)", value: state.dirBusqueda, "aria-label": "Buscar contactos",
      oninput: function () { state.dirBusqueda = buscar.value; pintarLista(); }
    });
    var tb1 = h("div", { class: "pn-toolbar" },
      chipTipo("", "Todos", state.contactos.length), chipTipo("proveedor", "Reformistas", porTipo.proveedor), chipTipo("canal", "Canal", porTipo.canal),
      buscar, h("a", { class: "btn btn-sm btn-ghost", href: "#contactos/importar", text: "Importar lista" }),
      h("button", { class: "btn btn-sm btn-ghost", type: "button", text: "Exportar CSV", onclick: exportarContactos }),
      h("a", { class: "btn btn-sm", href: "#contactos/nuevo", text: "+ Nuevo contacto" }));

    var tb2 = h("div", { class: "pn-toolbar" });
    if (state.dirTipo === "canal") {
      var cuenta = {};
      state.contactos.forEach(function (c) { if (c.tipo === "canal") { cuenta[c.subtipo] = (cuenta[c.subtipo] || 0) + 1; } });
      [["", "Todos los canales"]].concat(Object.keys(SUBTIPOS_PLURAL).map(function (k) { return [k, SUBTIPOS_PLURAL[k]]; })).forEach(function (o) {
        tb2.appendChild(h("button", {
          class: "chip", type: "button", "aria-pressed": state.dirSub === o[0] ? "true" : "false",
          onclick: function () { state.dirSub = o[0]; render(); }
        }, o[1], h("b", { text: o[0] ? (cuenta[o[0]] || 0) : porTipo.canal })));
      });
    }
    if (state.dirTipo === "proveedor") {
      var refSel = h("select", { "aria-label": "Tipo de reforma", onchange: function () { state.dirReforma = refSel.value; pintarLista(); } },
        [["", "Todos los tipos de reforma"], ["bano", "Baños"], ["cocina", "Cocinas"], ["integral", "Integrales"], ["mixto", "Mixto"], ["sin", "Por clasificar"]].map(function (o) {
          return h("option", { value: o[0], text: o[1], selected: state.dirReforma === o[0] });
        }));
      tb2.appendChild(refSel);
    }
    var etiquetas = state.dirTipo ? (state.dirTipo === "canal" ? ESTADOS_CANAL : ESTADOS_PROV) : ESTADOS_CONTACTO;
    var estSel = h("select", { "aria-label": "Estado", onchange: function () { state.dirEstado = estSel.value; pintarLista(); } },
      h("option", { value: "", text: "Todos los estados" }),
      Object.keys(etiquetas).map(function (k) { return h("option", { value: k, text: etiquetas[k], selected: state.dirEstado === k }); }));
    tb2.appendChild(estSel);

    pintarLista();
    var detalle = h("div", { class: "pn-detail" });
    if (sel) { detalleContacto(detalle, sel, nuevo); }
    else if (id) { detalle.appendChild(h("p", { class: "pn-empty", text: "Esa ficha no existe." })); }
    else { detalle.appendChild(h("p", { class: "pn-empty", text: "Busca por nombre o dominio antes de llamar, o elige una ficha." })); }

    main.appendChild(tb1);
    if (!sel) { main.appendChild(tb2); }
    split.appendChild(lista);
    split.appendChild(detalle);
    main.appendChild(split);
  }

  // Fichas que comparten correo o dominio (salvo gmail, etc.) con otra ficha o con una empresa.
  function avisoDuplicados(email, excluirId) {
    var e = String(email || "").trim().toLowerCase();
    if (!e) { return null; }
    var dom = e.split("@")[1] || "";
    var propio = dom && DOMINIOS_GENERICOS.indexOf(dom) === -1;
    var otros = state.contactos.filter(function (x) {
      return x.id !== excluirId && x.email && (x.email.toLowerCase() === e || (propio && x.dominio === dom));
    });
    var empresas = state.empresas.filter(function (x) {
      var m = String(x.email || "").toLowerCase();
      return m && (m === e || (propio && m.split("@")[1] === dom));
    });
    if (!otros.length && !empresas.length) { return null; }
    var enlaces = otros.map(function (x) { return h("a", { href: "#contactos/" + x.id, text: x.nombre + (x.email.toLowerCase() === e ? " (mismo correo)" : "") }); })
      .concat(empresas.map(function (x) { return h("a", { href: "#empresas/" + x.id, text: x.nombre + " (empresa en Empresas)" }); }));
    return h("p", { class: "alert" }, "Ya existe en el panel: ",
      enlaces.map(function (a, i) { return [i ? ", " : "", a]; }), ".");
  }

  function sugerenciaEstado(c, canal, dir, estado) {
    var prov = c.tipo === "proveedor";
    if (estado === "no_interesa") { return "no_interesa"; }
    if (["acuerdo_cerrado", "activo", "pausado", "colabora", "inactivo"].indexOf(c.estado) !== -1) { return c.estado; }
    if (canal === "llamada") {
      if (estado === "hecha") { return prov ? "contactado" : "llamada_hecha"; }
      return prov ? "llamada_pendiente" : c.estado;
    }
    if (estado === "respondido") { return prov ? "respondio" : c.estado; }
    if (canal === "email" && estado === "enviado" && dir === "saliente" && c.estado === "nuevo") { return "email_enviado"; }
    return c.estado;
  }

  // Registrar correo, llamada o WhatsApp en pocos clics. Sirve para fichas de contacto ({ c }) y para clientes ({ l }).
  function bloqueRegistro(dueno) {
    var c = dueno.c, esLead = !c;
    var idDueno = esLead ? "l" + dueno.l.id : c.id;
    var reg = h("div", {});
    function cerrarRegistro() { state.registrando = null; reg.replaceChildren(botonesRegistro()); }
    function botonesRegistro() {
      return h("div", { class: "actions" }, Object.keys(CANALES).map(function (k) {
        return h("button", { class: "btn btn-sm" + (k === "llamada" ? "" : " btn-ghost"), type: "button", text: "Registrar " + (k === "llamada" ? "llamada" : k === "email" ? "correo" : "WhatsApp"), onclick: function () { abrirRegistro(k); } });
      }));
    }
    function abrirRegistro(canal) {
      state.registrando = idDueno;
      var dir = h("select", { "aria-label": "Dirección" },
        h("option", { value: "saliente", text: canal === "llamada" ? "Llamamos nosotros" : "Enviado por nosotros" }),
        h("option", { value: "entrante", text: canal === "llamada" ? "Nos llaman" : "Recibido de ellos" }));
      var est = h("select", { "aria-label": "Estado" }, Object.keys(ESTADOS_INTER[canal]).map(function (k) {
        return h("option", { value: k, text: ESTADOS_INTER[canal][k], selected: k === (canal === "llamada" ? "hecha" : "enviado") });
      }));
      var cuando = h("input", { type: "datetime-local", value: ahoraLocal(), "aria-label": "Fecha y hora" });
      var desde = h("input", { type: "text", value: CUENTA_COMERCIAL, "aria-label": "Enviado desde" });
      var campana = h("input", { type: "text", value: esLead ? "" : c.tipo === "canal" ? "Primer contacto canal" : "Primer contacto sin coste", "aria-label": "Campaña o asunto" });
      var resumen = h("textarea", { "aria-label": "Resumen o resultado", placeholder: canal === "llamada" ? "Qué dijo, qué hay que hacer…" : "Resumen" });
      var nuevoEstado, accion, fechaProx, accionTocada = false;
      function recalcular() {
        if (esLead) { return; }
        nuevoEstado.value = sugerenciaEstado(c, canal, dir.value, est.value);
        if (!accionTocada) {
          var igual = nuevoEstado.value === c.estado;
          accion.value = igual ? (c.proxima_accion || "") : (ACCION_POR_ESTADO[nuevoEstado.value] || "");
          fechaProx.value = igual ? (c.proxima_fecha || "") : "";
        }
      }
      if (!esLead) {
        nuevoEstado = h("select", { "aria-label": "Estado de la ficha" },
          Object.keys(estadosDe(c)).map(function (k) { return h("option", { value: k, text: estadosDe(c)[k], selected: k === c.estado }); }));
        accion = h("input", { type: "text", value: c.proxima_accion || "", placeholder: "Próxima acción (ej. Llamar el jueves)", "aria-label": "Próxima acción" });
        fechaProx = h("input", { type: "date", value: c.proxima_fecha || "", "aria-label": "Fecha de la próxima acción" });
        accion.addEventListener("input", function () { accionTocada = true; });
      }
      dir.addEventListener("change", function () {
        if (canal !== "llamada") { est.value = dir.value === "entrante" ? "respondido" : "enviado"; }
        recalcular();
      });
      est.addEventListener("change", recalcular);
      var esCorreoSaliente = function () { return canal === "email" && dir.value === "saliente"; };
      var extraCorreo = h("div", { class: "grid2" },
        h("label", {}, "Enviado desde", desde), h("label", {}, "Campaña o asunto", campana));
      if (canal !== "email") { extraCorreo.hidden = true; }
      dir.addEventListener("change", function () { desde.disabled = !esCorreoSaliente(); });
      var guardarBtn = h("button", {
        class: "btn btn-sm", type: "button", text: "Guardar",
        onclick: function () {
          var fila = {
            canal: canal, direccion: dir.value,
            ocurrio_at: cuando.value ? new Date(cuando.value).toISOString() : new Date().toISOString(),
            desde: esCorreoSaliente() ? (desde.value.trim() || null) : null,
            campana: canal === "email" ? (campana.value.trim() || null) : null,
            estado: est.value, resumen: resumen.value.trim() || null, autor: autorActual()
          };
          if (esLead) { fila.lead_id = dueno.l.id; } else { fila.contacto_id = c.id; }
          state.registrando = null;
          var texto = (canal === "llamada" ? "Llamada" : canal === "email" ? "Correo" : "WhatsApp") + " registrado";
          if (esLead) { guardar(sb.from("interacciones").insert(fila), texto); return; }
          var cambios = { estado: nuevoEstado.value, proxima_accion: accion.value.trim() || null, proxima_fecha: fechaProx.value || null };
          guardar(sb.from("interacciones").insert(fila).then(function (res) {
            return res.error ? res : sb.from("contactos").update(cambios).eq("id", c.id);
          }), texto);
        }
      });
      reg.replaceChildren(h("div", { class: "reg-form" },
        h("h3", { text: canal === "llamada" ? "Registrar llamada" : canal === "email" ? "Registrar correo" : "Registrar WhatsApp" }),
        h("div", { class: "fields" }, h("label", {}, "Quién", dir), h("label", {}, "Resultado", est), h("label", {}, "Cuándo", cuando)),
        extraCorreo, resumen,
        esLead ? null : h("div", { class: "fields" }, h("label", {}, "La ficha pasa a", nuevoEstado), h("label", {}, "Próxima acción", accion), h("label", {}, "Para el día", fechaProx)),
        h("div", { class: "actions" }, guardarBtn, h("button", { class: "linkbtn", type: "button", text: "Cancelar", onclick: cerrarRegistro }))));
      recalcular();
    }
    reg.appendChild(botonesRegistro());
    return h("div", { class: "card" }, h("h3", { text: "Registrar" }), reg);
  }

  // Historial de correos, llamadas y WhatsApp de una ficha ({ c }) o de un cliente ({ l }): cambiar estado, corregir y borrar.
  function bloqueHistorial(dueno) {
    var c = dueno.c, esLead = !c;
    var its = esLead ? internasDe("l" + dueno.l.id) : internasDe(c.id);
    var tl = h("div", { class: "card" }, h("h3", { text: "Historial (" + its.length + ")" }));
    if (!its.length) {
      tl.appendChild(h("p", { class: "meta", text: esLead ? "Sin llamadas ni mensajes registrados con este cliente." : "Sin correos ni llamadas registrados. Antes de escribirle, comprueba que no esté ya con otro nombre o dominio." }));
    }
    its.forEach(function (i) {
      var item = h("div", { class: "tl" });
      tl.appendChild(item);
      function ver() {
        var sel = h("select", {
          "aria-label": "Estado de la interacción",
          onchange: function () {
            var q = sb.from("interacciones").update({ estado: sel.value }).eq("id", i.id);
            var avanza = !esLead && i.canal === "email" && sel.value === "respondido" && c.tipo === "proveedor" && ["nuevo", "email_enviado"].indexOf(c.estado) !== -1;
            if (avanza) {
              q = q.then(function (res) {
                return res.error ? res : sb.from("contactos").update({ estado: "respondio", proxima_accion: c.proxima_accion || ACCION_POR_ESTADO.respondio }).eq("id", c.id);
              });
            }
            guardar(q, avanza ? "Respondido: la ficha pasa a «Respondió» y a Pendientes" : "Estado guardado");
          }
        }, Object.keys(ESTADOS_INTER[i.canal]).map(function (k) { return h("option", { value: k, text: ESTADOS_INTER[i.canal][k], selected: i.estado === k }); }));
        item.replaceChildren(
          h("div", { class: "card-head" },
            h("strong", { text: i.canal === "llamada" ? (i.direccion === "entrante" ? "Llamada entrante" : "Llamada saliente") : CANALES[i.canal] + (i.direccion === "entrante" ? " recibido" : " enviado por nosotros") }),
            h("span", { class: "meta", text: fechaInter(i) })),
          h("div", { class: "tags" }, sel,
            i.desde ? h("span", { class: "meta", text: "desde " + i.desde }) : null,
            i.campana ? h("span", { class: "meta", text: "«" + i.campana + "»" }) : null,
            i.autor ? h("span", { class: "meta", text: "por " + i.autor.split("@")[0] }) : null),
          i.resumen ? h("p", { class: "meta", text: i.resumen }) : null,
          h("div", { class: "actions" },
            h("button", { class: "linkbtn", type: "button", text: "Corregir", onclick: editar }),
            h("button", {
              class: "linkbtn", type: "button", text: "Borrar",
              onclick: function () { if (confirm("¿Borrar este registro del historial? No se puede deshacer.")) { guardar(sb.from("interacciones").delete().eq("id", i.id), "Registro borrado"); } }
            })));
      }
      function editar() {
        state.registrando = esLead ? "l" + dueno.l.id : c.id;
        var local = "";
        if (i.ocurrio_at) { var d = new Date(i.ocurrio_at); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); local = d.toISOString().slice(0, 16); }
        var cuando = h("input", { type: "datetime-local", value: local, "aria-label": "Fecha y hora" });
        var campana = h("input", { type: "text", value: i.campana || "", "aria-label": "Campaña o asunto" });
        var resumen = h("textarea", { "aria-label": "Resumen", value: i.resumen || "" });
        item.replaceChildren(h("div", { class: "reg-form" },
          h("div", { class: "fields" }, h("label", {}, "Cuándo (vacío = sin fecha)", cuando), i.canal === "email" ? h("label", {}, "Campaña o asunto", campana) : null),
          resumen,
          h("div", { class: "actions" },
            h("button", {
              class: "btn btn-sm", type: "button", text: "Guardar",
              onclick: function () {
                state.registrando = null;
                guardar(sb.from("interacciones").update({
                  ocurrio_at: cuando.value ? new Date(cuando.value).toISOString() : null,
                  campana: i.canal === "email" ? (campana.value.trim() || null) : i.campana,
                  resumen: resumen.value.trim() || null
                }).eq("id", i.id), "Registro corregido");
              }
            }),
            h("button", { class: "linkbtn", type: "button", text: "Cancelar", onclick: function () { state.registrando = null; ver(); } }))));
      }
      ver();
    });
    return tl;
  }

  function detalleContacto(cont, c, nuevo) {
    cont.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver a la lista", onclick: function () { state.registrando = null; location.hash = "contactos"; } }));

    // Formulario de alta / edición. El tipo no se cambia: cada ficha nace con su tipo y subtipo.
    var tipo = nuevo ? state.altaTipo : c.tipo;
    var datosForm = nuevo ? { tipo: tipo, estado: "nuevo", reformas: [] } : c;
    var etiquetasEstado = tipo === "canal" ? ESTADOS_CANAL : ESTADOS_PROV;
    function campo(nombre, etiqueta, tipoInput, extra) {
      var input = h("input", Object.assign({ type: tipoInput || "text", id: "ct-" + nombre, name: nombre, value: datosForm[nombre] == null ? "" : datosForm[nombre] }, extra || {}));
      return h("div", { class: "field" }, h("label", { for: "ct-" + nombre, text: etiqueta }), input);
    }
    var avisoEl = h("div", {});
    function pintarAviso(valor) {
      var a = avisoDuplicados(valor, nuevo ? null : c.id);
      avisoEl.replaceChildren();
      if (a) { avisoEl.appendChild(a); }
    }
    var emailCampo = campo("email", "Correo", "email", { onchange: function (ev) { pintarAviso(ev.target.value); } });
    var estadoSel = h("select", { id: "ct-estado", name: "estado" },
      Object.keys(etiquetasEstado).map(function (k) { return h("option", { value: k, text: etiquetasEstado[k], selected: datosForm.estado === k }); }));
    var tipoCampo;
    if (tipo === "canal") {
      tipoCampo = h("div", { class: "field" }, h("label", { for: "ct-subtipo", text: "Tipo de canal (obligatorio)" }),
        h("select", { id: "ct-subtipo", name: "subtipo", required: true },
          h("option", { value: "", text: "Elige…" }),
          Object.keys(SUBTIPOS).map(function (k) { return h("option", { value: k, text: SUBTIPOS[k], selected: datosForm.subtipo === k }); })));
    } else {
      tipoCampo = h("fieldset", {}, h("legend", { text: "Tipo de reforma que hace (sin marcar = por clasificar)" }),
        h("div", { class: "checks-inline" }, Object.keys(REFORMAS).map(function (t) {
          return h("label", {}, h("input", { type: "checkbox", name: "reformas", value: t, checked: (datosForm.reformas || []).indexOf(t) !== -1 }), REFORMAS[t]);
        })));
    }
    var notas = h("textarea", { id: "ct-notas", name: "notas", value: datosForm.notas || "", placeholder: "Notas internas" });
    var form = h("form", {
      onsubmit: function (ev) {
        ev.preventDefault();
        var f = ev.target;
        var datos = {
          nombre: f.nombre.value.trim(),
          contacto: f.contacto.value.trim() || null,
          email: f.email.value.trim().toLowerCase() || null,
          telefono: f.telefono.value.trim() || null,
          estado: f.estado.value,
          notas: f.notas.value.trim() || null
        };
        if (tipo === "canal") {
          datos.subtipo = f.subtipo.value;
          if (!datos.subtipo) { toast("Elige el tipo de canal: administración, inmobiliaria, gestora u otro", true); f.subtipo.focus(); return; }
        } else {
          datos.reformas = Array.prototype.filter.call(f.querySelectorAll("input[name=reformas]"), function (x) { return x.checked; }).map(function (x) { return x.value; });
        }
        if (!datos.nombre) { toast("Pon el nombre", true); f.nombre.focus(); return; }
        if (nuevo) {
          datos.tipo = tipo;
          var repetido = datos.email && state.contactos.some(function (x) { return x.email && x.email.toLowerCase() === datos.email; });
          if (repetido && !confirm("Ya hay una ficha con ese correo. ¿Crear otra igualmente?")) { return; }
          sb.from("contactos").insert(datos).select("id").single().then(function (res) {
            if (res.error) { toast("No se ha podido guardar: " + res.error.message, true); return; }
            toast("Ficha creada");
            location.hash = "contactos/" + res.data.id;
            cargar();
          });
        } else {
          datos.nombre_derivado = c.nombre_derivado && datos.nombre === c.nombre;
          guardar(sb.from("contactos").update(datos).eq("id", c.id), "Ficha guardada");
        }
      }
    },
      h("div", { class: "grid2" },
        campo("nombre", "Nombre", "text", { required: true }), campo("contacto", "Persona de contacto"),
        emailCampo, campo("telefono", "Teléfono", "tel"),
        h("div", { class: "field" }, h("label", { for: "ct-estado", text: "Estado" }), estadoSel),
        tipoCampo),
      avisoEl,
      h("div", { class: "field" }, h("label", { for: "ct-notas", text: "Notas internas" }), notas),
      h("div", { class: "actions" }, h("button", { class: "btn btn-sm", type: "submit", text: nuevo ? "Crear ficha" : "Guardar cambios" }))
    );

    if (nuevo) {
      var elegir = h("div", { class: "pn-toolbar" }, ["proveedor", "canal"].map(function (t) {
        return h("button", {
          class: "chip", type: "button", "aria-pressed": state.altaTipo === t ? "true" : "false",
          onclick: function () { state.altaTipo = t; render(); }
        }, t === "proveedor" ? "Empresa de reformas" : "Canal (inmobiliaria, administración…)");
      }));
      cont.appendChild(h("div", { class: "card" }, h("h2", { text: "Nuevo contacto" }),
        h("p", { class: "meta", text: "Los clientes finales no se dan de alta aquí: van en Clientes." }), elegir, form));
      return;
    }

    // Cabecera: quién es y si ya le hemos escrito
    var dup = avisoDuplicados(c.email, c.id);
    cont.appendChild(h("div", { class: "card" },
      h("div", { class: "card-head" },
        h("h2", {}, c.nombre, " ", badge(c.estado, ESTADOS_CONTACTO)),
        h("span", { class: "meta", text: tipoTexto(c) })),
      c.tipo === "proveedor" && !(c.reformas || []).length ? h("p", { class: "alert", text: "Tipo de reforma por clasificar: pregúntaselo en la llamada y márcalo en «Editar ficha»." }) : null,
      c.nombre_derivado ? h("p", { class: "meta", text: "Nombre sacado del dominio del correo: corrígelo en «Editar ficha» cuando lo sepas." }) : null,
      h("p", { class: "ya" }, yaEscritos(c)),
      c.proxima_accion ? h("p", { class: "toca-grande" }, h("strong", { text: "Toca: " }), c.proxima_accion + (c.proxima_fecha ? " · " + dia(c.proxima_fecha) : "")) : null,
      h("div", { class: "actions" },
        c.telefono ? h("a", { class: "btn btn-sm", href: "tel:" + digitos(c.telefono), text: "Llamar " + c.telefono }) : null,
        c.telefono ? h("a", { class: "btn btn-sm btn-ghost", href: waUrl(c.telefono, "Hola, soy de Pimen Leads."), target: "_blank", rel: "noopener", text: "WhatsApp" }) : null,
        c.email ? h("a", { class: "btn btn-sm btn-ghost", href: "mailto:" + c.email, text: c.email }) : null),
      !c.telefono ? h("p", { class: "meta", text: "Sin teléfono anotado. Añádelo en «Editar ficha» cuando lo tengas." }) : null,
      dup,
      c.contacto || c.notas ? h("dl", { class: "kv" }, kv("Persona de contacto", c.contacto), kv("Notas", c.notas)) : null
    ));

    cont.appendChild(bloqueRegistro({ c: c }));
    cont.appendChild(bloqueHistorial({ c: c }));

    // Reformista: paso a empresa que recibe leads
    if (c.tipo === "proveedor") {
      var emp = c.empresa_id ? empresaPorId(c.empresa_id) : null;
      var puedeCrear = !emp && ["acuerdo_cerrado", "activo"].indexOf(c.estado) !== -1;
      if (emp || puedeCrear) {
        cont.appendChild(h("div", { class: "card" }, h("h3", { text: "Recibir leads" }),
          emp ? h("p", {}, "Ficha en Empresas: ", h("a", { href: "#empresas/" + emp.id, text: emp.nombre }), " (" + ESTADOS_EMPRESA[emp.estado] + "). Ahí se le asignan los leads: solo tipos y zonas que encajen, 3 empresas como máximo por solicitud.")
            : [h("p", { class: "meta", text: "Para asignarle clientes finales hace falta su ficha en Empresas. Se crea «en prueba»: el primer lead que reciba es gratis." }),
              h("div", { class: "actions" }, h("button", {
                class: "btn btn-sm", type: "button", text: "Crear ficha en Empresas",
                onclick: function () {
                  sb.from("empresas").insert({ nombre: c.nombre, contacto: c.contacto, email: c.email, telefono: c.telefono, tipos: c.reformas || [], estado: "prueba" })
                    .select("id").single().then(function (res) {
                      if (res.error) { toast("No se ha podido crear: " + res.error.message, true); return; }
                      guardar(sb.from("contactos").update({ empresa_id: res.data.id }).eq("id", c.id), "Creada en Empresas, en prueba");
                    });
                }
              }))]));
      }
    }

    // Canal: clientes que nos ha derivado
    if (c.tipo === "canal") {
      var derivados = state.leads.filter(function (l) { return l.canal_id === c.id; });
      cont.appendChild(h("div", { class: "card" }, h("h3", { text: "Clientes derivados (" + derivados.length + ")" }),
        derivados.length ? derivados.map(function (l) { return h("p", {}, h("a", { href: "#leads/" + l.id, text: "#" + l.id + " " + l.nombre }), " · " + [TIPOS[l.tipo], l.zona].filter(Boolean).join(" · ")); })
          : h("p", { class: "meta", text: "Todavía no nos ha derivado a nadie. Cuando mande a alguien que quiera reformar, se da de alta como cliente con este canal de origen." }),
        h("div", { class: "actions" }, h("button", {
          class: "btn btn-sm btn-ghost", type: "button", text: "+ Cliente derivado por este canal",
          onclick: function () { state.altaCanal = c.id; location.hash = "leads/nuevo"; }
        }))));
    }

    cont.appendChild(h("details", { class: "card" }, h("summary", { text: "Editar ficha" }), form));
  }

  // ── Leads ─────────────────────────────────────────────────────────────

  function leadsFiltrados() {
    var q = norm(state.busqueda);
    return state.leads.filter(function (l) {
      if (state.filtroLead && l.estado !== state.filtroLead) { return false; }
      if (state.filtroTipo && l.tipo !== state.filtroTipo) { return false; }
      if (q) {
        var texto = norm([l.nombre, l.telefono, l.email, l.zona, l.reforma, "#" + l.id].join(" "));
        if (texto.indexOf(q) === -1 && digitos(l.telefono).indexOf(digitos(q) || "@@") === -1) { return false; }
      }
      return true;
    });
  }

  function duplicados(lead) {
    var d = digitos(lead.telefono).slice(-9);
    if (!d) { return []; }
    return state.leads.filter(function (l) { return l.id !== lead.id && digitos(l.telefono).slice(-9) === d; });
  }

  function vistaLeads(main, id) {
    var nuevo = id === "nuevo";
    var sel = nuevo ? {} : id ? state.leads.filter(function (l) { return String(l.id) === id; })[0] : null;
    var split = h("div", { class: "pn-split" + (sel ? " has-detail" : "") });
    var lista = h("div", { class: "pn-list" });

    function pintarLista() {
      var filas = leadsFiltrados();
      lista.replaceChildren();
      if (!state.leads.length) { lista.appendChild(h("p", { class: "pn-empty", text: "Aún no hay clientes de reforma en el panel. Cuando entre una solicitud, se verifica y se manda a 3 empresas como máximo." })); return; }
      if (!filas.length) { lista.appendChild(h("p", { class: "pn-empty", text: "No hay clientes con este filtro." })); return; }
      filas.forEach(function (l) {
        var n = (l.envios || []).length;
        lista.appendChild(h("button", {
          class: "row", type: "button", "aria-current": sel && sel.id === l.id ? "true" : null,
          onclick: function () { location.hash = "leads/" + l.id; }
        },
          h("span", { class: "l1" },
            h("span", { class: "name", text: l.nombre }),
            duplicados(l).length ? h("span", { class: "badge warn", text: "Repetido" }) : null,
            badge(l.estado, ESTADOS_LEAD),
            h("span", { class: "when", text: fecha(l.created_at) })),
          h("span", { class: "l2", text: [TIPOS[l.tipo], l.reforma, l.zona, l.plazo].filter(Boolean).join(" · ") }),
          n ? h("span", { class: "l2", text: "Enviado a " + n + " de 3 empresas" }) : null
        ));
      });
    }

    var counts = {};
    state.leads.forEach(function (l) { counts[l.estado] = (counts[l.estado] || 0) + 1; });
    function chip(valor, texto) {
      return h("button", {
        class: "chip", type: "button", "aria-pressed": state.filtroLead === valor ? "true" : "false",
        onclick: function () { state.filtroLead = valor; render(); }
      }, texto, h("b", { text: valor ? (counts[valor] || 0) : state.leads.length }));
    }
    var buscar = h("input", {
      type: "search", placeholder: "Buscar nombre, teléfono, zona o #id", value: state.busqueda, "aria-label": "Buscar leads",
      oninput: function () { state.busqueda = buscar.value; pintarLista(); }
    });
    var tipoSel = h("select", { "aria-label": "Tipo de reforma", onchange: function () { state.filtroTipo = tipoSel.value; pintarLista(); } },
      h("option", { value: "", text: "Todos los tipos" }),
      Object.keys(TIPOS).map(function (k) { return h("option", { value: k, text: TIPOS[k], selected: state.filtroTipo === k }); }));

    var toolbar = h("div", { class: "pn-toolbar" },
      chip("nuevo", "Nuevos"), chip("por_verificar", "Por verificar"), chip("verificado", "Verificados"), chip("enviado", "Enviados"),
      chip("cerrado", "Cerrados"), chip("descartado", "Descartados"), chip("", "Todos"),
      tipoSel, buscar, h("a", { class: "btn btn-sm", href: "#leads/nuevo", text: "+ Nuevo cliente" }));

    pintarLista();
    var detalle = h("div", { class: "pn-detail" });
    if (nuevo) { detalleLeadNuevo(detalle); }
    else if (sel) { detalleLead(detalle, sel); }
    else if (id) { detalle.appendChild(h("p", { class: "pn-empty", text: "Ese lead no existe o no está entre los cargados." })); }
    else { detalle.appendChild(h("p", { class: "pn-empty", text: state.leads.length ? "Elige un cliente de la lista." : "Si te llega una solicitud por teléfono, WhatsApp o un canal, dala de alta con «+ Nuevo cliente»." })); }

    if (sel) { main.classList.add("has-detail"); }
    main.appendChild(toolbar);
    split.appendChild(lista);
    split.appendChild(detalle);
    main.appendChild(split);
  }

  // Alta manual de un cliente final: llamada, WhatsApp o derivado por un canal.
  function detalleLeadNuevo(cont) {
    var canales = state.contactos.filter(function (c) { return c.tipo === "canal"; });
    function campo(nombre, etiqueta, tipoInput, extra) {
      return h("div", { class: "field" }, h("label", { for: "cl-" + nombre, text: etiqueta }),
        h("input", Object.assign({ type: tipoInput || "text", id: "cl-" + nombre, name: nombre }, extra || {})));
    }
    var via = h("select", { id: "cl-via", name: "via", onchange: function () { canalSel.hidden = via.value !== "canal"; } },
      Object.keys(VIAS).map(function (k) { return h("option", { value: k, text: VIAS[k], selected: state.altaCanal ? k === "canal" : k === "telefono" }); }));
    var canalSel = h("select", { id: "cl-canal", name: "canal", "aria-label": "Canal que lo deriva" },
      h("option", { value: "", text: "¿Qué canal lo deriva?" }),
      canales.map(function (c) { return h("option", { value: c.id, text: c.nombre + " (" + SUBTIPOS[c.subtipo] + ")", selected: state.altaCanal === c.id }); }));
    canalSel.hidden = via.value !== "canal";
    var tipo = h("select", { id: "cl-tipo", name: "tipo" }, ["bano", "cocina", "integral"].map(function (k) { return h("option", { value: k, text: TIPOS[k] }); }));
    var vivienda = h("select", { id: "cl-vivienda", name: "vivienda" }, ["", "Propietario", "Inquilino", "Comunidad", "Local"].map(function (v) { return h("option", { value: v, text: v || "Vivienda…" }); }));
    var mensaje = h("textarea", { id: "cl-mensaje", name: "mensaje", placeholder: "Alcance de la obra, comentarios…" });
    var form = h("form", {
      onsubmit: function (ev) {
        ev.preventDefault();
        var f = ev.target;
        var datos = {
          tipo: f.tipo.value, nombre: f.nombre.value.trim(), telefono: f.telefono.value.trim(), email: f.email.value.trim().toLowerCase() || null,
          zona: f.zona.value.trim() || null, plazo: f.plazo.value.trim() || null, vivienda: f.vivienda.value || null, mensaje: f.mensaje.value.trim() || null,
          origen: { via: f.via.value }, canal_id: f.via.value === "canal" && f.canal.value ? Number(f.canal.value) : null
        };
        if (f.via.value === "canal" && !datos.canal_id) { toast("Elige el canal que lo deriva", true); f.canal.focus(); return; }
        if (!datos.nombre || !datos.telefono) { toast("Nombre y teléfono son obligatorios", true); return; }
        state.altaCanal = null;
        sb.from("leads").insert(datos).select("id").single().then(function (res) {
          if (res.error) { toast("No se ha podido guardar: " + res.error.message, true); return; }
          toast("Cliente dado de alta: verifícalo con una llamada");
          location.hash = "leads/" + res.data.id;
          cargar();
        });
      }
    },
      h("div", { class: "grid2" },
        campo("nombre", "Nombre", "text", { required: true }), campo("telefono", "Teléfono", "tel", { required: true }),
        campo("email", "Correo", "email"),
        h("div", { class: "field" }, h("label", { for: "cl-tipo", text: "Tipo de reforma" }), tipo),
        campo("zona", "Zona (barrio, CP o municipio)"), campo("plazo", "Plazo (cuándo quiere empezar)"),
        h("div", { class: "field" }, h("label", { for: "cl-vivienda", text: "Vivienda" }), vivienda),
        h("div", { class: "field" }, h("label", { for: "cl-via", text: "Origen" }), via, canalSel)),
      h("div", { class: "field" }, h("label", { for: "cl-mensaje", text: "Comentario / alcance" }), mensaje),
      h("div", { class: "actions" }, h("button", { class: "btn btn-sm", type: "submit", text: "Dar de alta" })));
    cont.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver a la lista", onclick: function () { state.altaCanal = null; location.hash = "leads"; } }));
    cont.appendChild(h("div", { class: "card" }, h("h2", { text: "Nuevo cliente" }),
      h("p", { class: "meta", text: "Entra como «nuevo»: llámale para verificar que es real y quiere presupuesto antes de enviarlo a las empresas." }), form));
  }

  function textoParaEmpresa(l) {
    return [
      "Nuevo lead de Pimen Leads (#" + l.id + ")",
      "Reforma: " + (l.reforma || TIPOS[l.tipo]),
      "Zona: " + (l.zona || "—"),
      "Cuándo: " + (l.plazo || "—"),
      "Vivienda: " + (l.vivienda || "—"),
      l.mensaje ? "Comentario: " + l.mensaje : null,
      "",
      "Nombre: " + l.nombre,
      "Teléfono: " + l.telefono,
      l.email ? "Correo: " + l.email : null,
      "",
      "Este cliente lo reciben como máximo 3 empresas."
    ].filter(function (x) { return x !== null; }).join("\n");
  }

  function copiar(texto) {
    navigator.clipboard.writeText(texto).then(function () { toast("Texto copiado"); }, function () { toast("No se ha podido copiar", true); });
  }

  function detalleLead(cont, l) {
    var envios = l.envios || [];
    var reps = duplicados(l);
    var origen = l.origen || {};
    var canal = origen.via ? "Alta manual · " + (VIAS[origen.via] || origen.via) : [origen.utm_source, origen.utm_campaign].filter(Boolean).join(" / ") || (origen.gclid ? "Google Ads" : origen.fbclid ? "Meta" : origen.referrer ? "Enlace: " + origen.referrer : "Directo");

    // Cabecera y contacto
    var saludo = "Hola " + l.nombre.split(" ")[0] + ", te escribo de Pimen Reformas por tu solicitud de presupuesto. ¿Te va bien que te llame un momento?";
    cont.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver a la lista", onclick: function () { location.hash = "leads"; } }));
    cont.appendChild(h("div", { class: "card" },
      h("div", { class: "card-head" },
        h("h2", {}, l.nombre, " ", badge(l.estado, ESTADOS_LEAD)),
        h("span", { class: "meta", text: "#" + l.id + " · " + fecha(l.created_at) })),
      h("div", { class: "actions" },
        h("a", { class: "btn btn-sm", href: "tel:" + digitos(l.telefono), text: "Llamar " + l.telefono }),
        h("a", { class: "btn btn-sm btn-ghost", href: waUrl(l.telefono, saludo), target: "_blank", rel: "noopener", text: "WhatsApp" }),
        l.email ? h("a", { class: "btn btn-sm btn-ghost", href: "mailto:" + l.email, text: "Correo" }) : null),
      reps.length ? h("p", { class: "alert" }, "Este teléfono ya aparece en ",
        reps.map(function (r, i) { return [i ? ", " : "", h("a", { href: "#leads/" + r.id, text: "#" + r.id + " (" + ESTADOS_LEAD[r.estado].toLowerCase() + ")" })]; }), ".") : null,
      h("dl", { class: "kv" },
        kv("Tipo", TIPOS[l.tipo]), kv("Reforma", l.reforma), kv("Cuándo", l.plazo), kv("Vivienda", l.vivienda),
        kv("Zona", l.zona), kv("Teléfono", l.telefono), kv("Correo", l.email), kv("Comentario", l.mensaje),
        kv("Canal", canal), l.canal_id && contactoPorId(l.canal_id) ? [h("dt", { text: "Derivado por" }), h("dd", {}, h("a", { href: "#contactos/" + l.canal_id, text: contactoPorId(l.canal_id).nombre }))] : null,
        kv("Página", origen.pagina), kv("Consentimiento", l.consentimiento),
        l.estado === "descartado" ? kv("Motivo de descarte", l.motivo_descarte) : null)
    ));

    // Estado
    var motivo = h("select", { "aria-label": "Motivo de descarte" }, MOTIVOS.map(function (m) { return h("option", { text: m }); }));
    function cambiarEstado(estado, extra, texto) {
      return guardar(sb.from("leads").update(Object.assign({ estado: estado }, extra || {})).eq("id", l.id), texto);
    }
    var acciones = h("div", { class: "actions" });
    if (l.estado === "nuevo") {
      acciones.appendChild(h("button", { class: "btn btn-sm btn-ghost", type: "button", text: "Empiezo a verificar (llamando)", onclick: function () { cambiarEstado("por_verificar", null, "Lead por verificar"); } }));
    }
    if (l.estado === "nuevo" || l.estado === "por_verificar") {
      acciones.appendChild(h("button", { class: "btn btn-sm", type: "button", text: "Verificado: es real y quiere presupuesto", onclick: function () { cambiarEstado("verificado", { motivo_descarte: null }, "Lead verificado"); } }));
    }
    if (l.estado === "nuevo" || l.estado === "por_verificar" || l.estado === "verificado") {
      acciones.appendChild(motivo);
      acciones.appendChild(h("button", { class: "btn btn-sm btn-danger", type: "button", text: "Descartar", onclick: function () { cambiarEstado("descartado", { motivo_descarte: motivo.value }, "Lead descartado"); } }));
    }
    if (l.estado === "verificado" || l.estado === "por_verificar") {
      acciones.appendChild(h("button", { class: "linkbtn", type: "button", text: "Volver a nuevo", onclick: function () { cambiarEstado("nuevo"); } }));
    }
    if (l.estado === "enviado") {
      acciones.appendChild(h("button", { class: "btn btn-sm btn-ghost", type: "button", text: "Cerrar lead (ya no hay nada que hacer)", onclick: function () { cambiarEstado("cerrado", null, "Lead cerrado"); } }));
      // Teléfono que no existe, no pidió presupuesto u obra de otro tipo/zona: no se cobra, avisando en 7 días.
      acciones.appendChild(motivo);
      acciones.appendChild(h("button", {
        class: "btn btn-sm btn-danger", type: "button", text: "Inválido: no cobrar a las empresas",
        onclick: function () {
          if (!confirm("¿Marcar como inválido? Se anota la devolución aceptada en todas las empresas y no se les cobra.")) { return; }
          guardar(sb.from("leads").update({ estado: "descartado", motivo_descarte: motivo.value }).eq("id", l.id).then(function (res) {
            return res.error ? res : sb.from("envios").update({ devolucion: "aceptada" }).eq("lead_id", l.id);
          }), "Lead inválido: devolución anotada");
        }
      }));
    }
    if (l.estado === "cerrado" || l.estado === "descartado") {
      acciones.appendChild(h("button", { class: "btn btn-sm btn-ghost", type: "button", text: "Reabrir", onclick: function () { cambiarEstado(envios.length ? "enviado" : "nuevo", { motivo_descarte: null }, "Lead reabierto"); } }));
    }
    var notas = h("textarea", { "aria-label": "Notas internas", placeholder: "Notas internas: qué dijo al llamarle, cuándo volver a llamar…", value: l.notas || "" });
    cont.appendChild(h("div", { class: "card" },
      h("h3", { text: "Estado" }),
      l.estado === "nuevo" || l.estado === "por_verificar" ? h("p", { class: "meta", text: "Llama o escribe al cliente para confirmar que es real y que quiere presupuesto antes de enviarlo a las empresas." }) : null,
      avisoInvalido(l, envios),
      acciones,
      notas,
      h("div", { class: "actions" }, h("button", { class: "btn btn-sm btn-ghost", type: "button", text: "Guardar notas", onclick: function () { guardar(sb.from("leads").update({ notas: notas.value.trim() || null }).eq("id", l.id), "Notas guardadas"); } }))
    ));

    cont.appendChild(bloqueRegistro({ l: l }));
    cont.appendChild(bloqueHistorial({ l: l }));

    // Envíos
    var cardEnvios = h("div", { class: "card" }, h("h3", { text: "Empresas (" + envios.length + " de 3)" }));
    envios.slice().sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; }).forEach(function (e) {
      cardEnvios.appendChild(bloqueEnvio(e, l));
    });
    if (!envios.length) { cardEnvios.appendChild(h("p", { class: "meta", text: "Todavía no se ha enviado a ninguna empresa." })); }
    if (envios.length < 3 && (l.estado === "verificado" || l.estado === "enviado")) {
      cardEnvios.appendChild(candidatas(l));
    } else if (l.estado === "nuevo" || l.estado === "por_verificar") {
      cardEnvios.appendChild(h("p", { class: "meta", text: "Para enviarlo, primero márcalo como verificado." }));
    }
    cont.appendChild(cardEnvios);
  }

  // Un lead inválido ya enviado no se cobra: hay que avisar a las empresas en los 7 días siguientes al envío.
  function avisoInvalido(l, envios) {
    if (l.estado !== "descartado" || !envios.length) { return null; }
    var primero = envios.reduce(function (m, e) { return e.created_at < m ? e.created_at : m; }, envios[0].created_at);
    var limite = new Date(new Date(primero).getTime() + 7 * 864e5);
    var sinDevolver = envios.filter(function (e) { return e.devolucion !== "aceptada"; });
    var sinAvisar = envios.filter(function (e) { return !e.avisada; });
    return h("div", { class: "alert" },
      h("p", { text: "Lead inválido ya enviado a " + envios.length + " empresa(s): no se cobra. Avisa a las empresas antes del " + dia(limite) + " (7 días desde el primer envío)." +
        (sinDevolver.length ? " Quedan " + sinDevolver.length + " envío(s) sin marcar como devueltos." : " Devolución anotada en todos.") }),
      sinAvisar.length ? h("div", { class: "actions" }, h("button", {
        class: "btn btn-sm", type: "button", text: "Ya he avisado a las empresas",
        onclick: function () { guardar(sb.from("envios").update({ avisada: true }).eq("lead_id", l.id), "Anotado: empresas avisadas"); }
      })) : h("p", { class: "meta", text: "Empresas avisadas." }));
  }

  function kv(k, v) {
    if (v == null || v === "") { return null; }
    return [h("dt", { text: k }), h("dd", { text: v })];
  }

  function bloqueEnvio(e, l) {
    var emp = empresaPorId(e.empresa_id) || { nombre: "Empresa #" + e.empresa_id };
    function upd(campos, texto) { return guardar(sb.from("envios").update(campos).eq("id", e.id), texto); }
    var precio = h("input", { type: "number", min: "0", step: "1", value: e.precio, onchange: function () { upd({ precio: Number(precio.value) || 0 }, "Precio guardado"); } });
    var resultado = h("select", { onchange: function () { upd({ resultado: resultado.value }, "Resultado guardado"); } },
      Object.keys(RESULTADOS).map(function (k) { return h("option", { value: k, text: RESULTADOS[k], selected: e.resultado === k }); }));
    var devolucion = h("select", { onchange: function () { upd({ devolucion: devolucion.value }, "Devolución guardada"); } },
      Object.keys(DEVOLUCIONES).map(function (k) { return h("option", { value: k, text: DEVOLUCIONES[k], selected: e.devolucion === k }); }));
    var cobrado = h("input", { type: "checkbox", checked: e.cobrado, onchange: function () { upd({ cobrado: cobrado.checked }, cobrado.checked ? "Marcado como cobrado" : "Marcado como pendiente"); } });
    return h("div", { class: "envio" },
      h("div", { class: "card-head" },
        h("strong", {}, h("a", { href: "#empresas/" + e.empresa_id, text: emp.nombre })),
        h("span", { class: "meta", text: "Enviado el " + fecha(e.created_at) })),
      h("div", { class: "fields" },
        h("label", {}, "Precio (€)", precio),
        h("label", {}, "Resultado", resultado),
        h("label", {}, "Devolución", devolucion),
        h("label", { class: "inline" }, cobrado, "Cobrado")),
      h("div", { class: "actions" },
        emp.telefono ? h("a", { class: "btn btn-sm btn-ghost", href: waUrl(emp.telefono, textoParaEmpresa(l)), target: "_blank", rel: "noopener", text: "Enviar por WhatsApp" }) : null,
        h("button", { class: "btn btn-sm btn-ghost", type: "button", text: "Copiar texto del lead", onclick: function () { copiar(textoParaEmpresa(l)); } }),
        h("button", {
          class: "linkbtn", type: "button", text: "Quitar empresa",
          onclick: function () {
            if (confirm("¿Quitar " + emp.nombre + " de este lead? Úsalo solo si se asignó por error.")) {
              guardar(sb.from("envios").delete().eq("id", e.id), "Empresa quitada");
            }
          }
        }))
    );
  }

  // Empresas a las que se puede enviar el lead, las que mejor encajan primero.
  function candidatas(l) {
    var asignadas = (l.envios || []).map(function (e) { return e.empresa_id; });
    var hace30 = Date.now() - 30 * 864e5;
    var envios = todosLosEnvios();
    var zonaLead = norm(l.zona).split(/[\s,]+/).filter(function (w) { return w.length > 3 || /^\d{5}$/.test(w); });
    var lista = state.empresas.filter(function (e) {
      // Solo empresas activas o en prueba que hagan este tipo de reforma (la base de datos lo exige también).
      return (e.estado === "activa" || e.estado === "prueba") && asignadas.indexOf(e.id) === -1 && (l.tipo === "otro" || (e.tipos || []).indexOf(l.tipo) !== -1);
    }).map(function (e) {
      var suyos = envios.filter(function (x) { return x.empresa_id === e.id; });
      var zonas = norm(e.zonas);
      return {
        e: e,
        tipo: (e.tipos || []).indexOf(l.tipo) !== -1,
        zona: zonaLead.some(function (w) { return zonas.indexOf(w) !== -1; }),
        recientes: suyos.filter(function (x) { return new Date(x.created_at).getTime() > hace30; }).length,
        primero: !suyos.length
      };
    }).sort(function (a, b) {
      return (b.tipo - a.tipo) || (b.zona - a.zona) || (a.recientes - b.recientes);
    });

    var cont = h("div", {}, h("h3", { text: "Enviar a otra empresa" }));
    if (!lista.length) {
      cont.appendChild(h("p", { class: "meta" }, "No hay empresas activas o en prueba que hagan este tipo de reforma. Si una la hace, complétalo en su ficha. ", h("a", { href: "#empresas", text: "Ver empresas" })));
      return cont;
    }
    lista.forEach(function (c) {
      var precioTipo = c.e["precio_" + l.tipo];
      cont.appendChild(h("div", { class: "cand" },
        h("div", { class: "info" },
          h("strong", { text: c.e.nombre }),
          h("small", { text: [c.e.zonas, c.recientes + " leads en 30 días"].filter(Boolean).join(" · ") }),
          h("div", { class: "tags" },
            badge(c.e.estado, ESTADOS_EMPRESA),
            c.tipo ? h("span", { class: "badge", text: "Hace " + TIPOS[l.tipo].toLowerCase() + "s" }) : h("span", { class: "badge warn", text: "No hace este tipo" }),
            c.zona ? h("span", { class: "badge", text: "Trabaja en la zona" }) : null,
            c.primero ? h("span", { class: "badge", "data-v": "nuevo", text: "1.er lead: gratis" }) : null)),
        h("div", { class: "actions" },
          h("span", { class: "meta", text: c.primero ? "0 €" : (precioTipo != null ? euros(precioTipo) : "sin precio") }),
          h("button", {
            class: "btn btn-sm", type: "button", text: "Asignar",
            onclick: function () { guardar(sb.from("envios").insert({ lead_id: l.id, empresa_id: c.e.id }), "Asignado a " + c.e.nombre); }
          }))
      ));
    });
    return cont;
  }

  // ── Empresas ──────────────────────────────────────────────────────────

  function statsEmpresa(id) {
    var suyos = todosLosEnvios().filter(function (e) { return e.empresa_id === id; });
    return {
      envios: suyos,
      ganados: suyos.filter(function (e) { return e.resultado === "ganado"; }).length,
      pendiente: suyos.filter(function (e) { return !e.cobrado && cuenta(e); }).reduce(function (s, e) { return s + Number(e.precio); }, 0)
    };
  }

  function vistaEmpresas(main, id) {
    var nueva = id === "nueva";
    var sel = nueva ? {} : id ? empresaPorId(Number(id)) : null;
    var split = h("div", { class: "pn-split" + (sel ? " has-detail" : "") });
    if (sel) { main.classList.add("has-detail"); }
    var counts = {};
    state.empresas.forEach(function (e) { counts[e.estado] = (counts[e.estado] || 0) + 1; });
    function chip(valor, texto) {
      return h("button", {
        class: "chip", type: "button", "aria-pressed": state.filtroEmpresa === valor ? "true" : "false",
        onclick: function () { state.filtroEmpresa = valor; render(); }
      }, texto, h("b", { text: valor ? (counts[valor] || 0) : state.empresas.length }));
    }
    main.appendChild(h("div", { class: "pn-toolbar" },
      chip("", "Todas"), chip("interesada", "Interesadas"), chip("prueba", "En prueba"), chip("activa", "Activas"),
      chip("pausada", "Pausadas"), chip("baja", "Bajas"),
      h("span", { class: "spacer" }),
      h("a", { class: "btn btn-sm", href: "#empresas/nueva", text: "+ Nueva empresa" })));

    var lista = h("div", { class: "pn-list" });
    var filas = state.empresas.filter(function (e) { return !state.filtroEmpresa || e.estado === state.filtroEmpresa; });
    if (!filas.length) { lista.appendChild(h("p", { class: "pn-empty", text: "No hay empresas con este filtro." })); }
    filas.forEach(function (e) {
      var st = statsEmpresa(e.id);
      lista.appendChild(h("button", {
        class: "row", type: "button", "aria-current": sel && sel.id === e.id ? "true" : null,
        onclick: function () { location.hash = "empresas/" + e.id; }
      },
        h("span", { class: "l1" }, h("span", { class: "name", text: e.nombre }), badge(e.estado, ESTADOS_EMPRESA)),
        h("span", { class: "l2", text: [(e.tipos || []).map(function (t) { return TIPOS[t]; }).join(", "), e.zonas].filter(Boolean).join(" · ") || "Sin tipos ni zonas" }),
        h("span", { class: "l2", text: st.envios.length + " leads · " + st.ganados + " ganados" + (st.pendiente ? " · " + euros(st.pendiente) + " por cobrar" : "") })
      ));
    });

    var detalle = h("div", { class: "pn-detail" });
    if (sel) { detalleEmpresa(detalle, sel, nueva); }
    else if (id) { detalle.appendChild(h("p", { class: "pn-empty", text: "Esa empresa no existe." })); }
    else { detalle.appendChild(h("p", { class: "pn-empty", text: "Elige una empresa de la lista o crea una nueva." })); }
    split.appendChild(lista);
    split.appendChild(detalle);
    main.appendChild(split);
  }

  function detalleEmpresa(cont, e, nueva) {
    function campo(nombre, etiqueta, tipo, extra) {
      var input = h("input", Object.assign({ type: tipo || "text", id: "emp-" + nombre, name: nombre, value: e[nombre] == null ? "" : e[nombre] }, extra || {}));
      return h("div", { class: "field" }, h("label", { for: "emp-" + nombre, text: etiqueta }), input);
    }
    var estado = h("select", { id: "emp-estado", name: "estado" },
      Object.keys(ESTADOS_EMPRESA).map(function (k) { return h("option", { value: k, text: ESTADOS_EMPRESA[k], selected: (e.estado || (nueva ? "prueba" : "")) === k }); }));
    var tipos = h("div", { class: "checks-inline" }, ["bano", "cocina", "integral"].map(function (t) {
      return h("label", {}, h("input", { type: "checkbox", name: "tipos", value: t, checked: (e.tipos || []).indexOf(t) !== -1 }), TIPOS[t]);
    }));
    var notas = h("textarea", { id: "emp-notas", name: "notas", value: e.notas || "" });
    var form = h("form", {
      onsubmit: function (ev) {
        ev.preventDefault();
        var f = ev.target;
        var datos = {
          nombre: f.nombre.value.trim(),
          contacto: f.contacto.value.trim() || null,
          email: f.email.value.trim().toLowerCase() || null,
          telefono: f.telefono.value.trim() || null,
          zonas: f.zonas.value.trim() || null,
          capacidad: f.capacidad.value.trim() || null,
          estado: f.estado.value,
          tipos: Array.prototype.filter.call(f.querySelectorAll("input[name=tipos]"), function (c) { return c.checked; }).map(function (c) { return c.value; }),
          precio_bano: f.precio_bano.value === "" ? null : Number(f.precio_bano.value),
          precio_cocina: f.precio_cocina.value === "" ? null : Number(f.precio_cocina.value),
          precio_integral: f.precio_integral.value === "" ? null : Number(f.precio_integral.value),
          notas: f.notas.value.trim() || null
        };
        if (!datos.nombre) { toast("Pon el nombre de la empresa", true); f.nombre.focus(); return; }
        if (nueva) {
          sb.from("empresas").insert(datos).select("id").single().then(function (res) {
            if (res.error) { toast("No se ha podido guardar: " + res.error.message, true); return; }
            toast("Empresa creada");
            location.hash = "empresas/" + res.data.id;
            cargar();
          });
        } else {
          guardar(sb.from("empresas").update(datos).eq("id", e.id), "Empresa guardada");
        }
      }
    },
      h("div", { class: "grid2" },
        campo("nombre", "Nombre de la empresa", "text", { required: true }), campo("contacto", "Persona de contacto"),
        campo("telefono", "Teléfono", "tel"), campo("email", "Correo", "email"),
        campo("zonas", "Zonas donde trabaja"), campo("capacidad", "Leads al mes que puede atender"),
        h("div", { class: "field" }, h("label", { for: "emp-estado", text: "Estado" }), estado),
        h("fieldset", {}, h("legend", { text: "Tipos de reforma" }), tipos)),
      h("div", { class: "grid2" },
        campo("precio_bano", "Precio por lead de baño (€)", "number", { min: "0", step: "1" }),
        campo("precio_cocina", "Precio por lead de cocina (€)", "number", { min: "0", step: "1" }),
        campo("precio_integral", "Precio por lead de integral (€)", "number", { min: "0", step: "1" })),
      h("p", { class: "meta", text: "El primer lead que reciba cada empresa se pone a 0 € automáticamente." }),
      h("div", { class: "field" }, h("label", { for: "emp-notas", text: "Notas internas" }), notas),
      h("div", { class: "actions" }, h("button", { class: "btn btn-sm", type: "submit", text: nueva ? "Crear empresa" : "Guardar cambios" }))
    );

    cont.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver a la lista", onclick: function () { location.hash = "empresas"; } }));
    if (nueva) {
      cont.appendChild(h("div", { class: "card" }, h("h2", { text: "Nueva empresa" }), form));
      return;
    }

    var st = statsEmpresa(e.id);
    var origen = e.origen || {};
    var saludo = "Hola" + (e.contacto ? " " + e.contacto.split(" ")[0] : "") + ", te escribo de Pimen Leads por tu solicitud del primer lead gratis.";
    cont.appendChild(h("div", { class: "card" },
      h("div", { class: "card-head" },
        h("h2", {}, e.nombre, " ", badge(e.estado, ESTADOS_EMPRESA)),
        h("span", { class: "meta", text: "Alta: " + dia(e.created_at) })),
      h("div", { class: "actions" },
        e.telefono ? h("a", { class: "btn btn-sm", href: "tel:" + digitos(e.telefono), text: "Llamar " + e.telefono }) : null,
        e.telefono ? h("a", { class: "btn btn-sm btn-ghost", href: waUrl(e.telefono, saludo), target: "_blank", rel: "noopener", text: "WhatsApp" }) : null,
        e.email ? h("a", { class: "btn btn-sm btn-ghost", href: "mailto:" + e.email, text: "Correo" }) : null),
      e.mensaje || origen.pagina ? h("dl", { class: "kv" }, kv("Mensaje del formulario", e.mensaje), kv("Llegó desde", [origen.pagina, origen.utm_source].filter(Boolean).join(" · "))) : null,
      form
    ));

    var lista = h("div", { class: "card" },
      h("div", { class: "card-head" },
        h("h3", { text: "Leads enviados (" + st.envios.length + ")" }),
        h("span", { class: "meta", text: st.ganados + " ganados · " + euros(st.pendiente) + " por cobrar" })));
    if (st.pendiente) {
      lista.appendChild(h("div", { class: "actions" }, h("button", {
        class: "btn btn-sm", type: "button", text: "Descargar lo pendiente de cobro (CSV)",
        onclick: function () {
          var pendientes = st.envios.filter(function (x) { return !x.cobrado && cuenta(x) && Number(x.precio) > 0; });
          descargarCSV("pendiente-" + slug(e.nombre) + "-" + new Date().toISOString().slice(0, 10) + ".csv", CABECERA_ENVIOS, pendientes.map(filaEnvio));
        }
      }), h("button", {
        class: "btn btn-sm btn-ghost", type: "button", text: "Marcar todo como cobrado (" + euros(st.pendiente) + ")",
        onclick: function () {
          var ids = st.envios.filter(function (x) { return !x.cobrado && cuenta(x) && Number(x.precio) > 0; }).map(function (x) { return x.id; });
          if (confirm("¿Marcar " + ids.length + " leads como cobrados?")) { guardar(sb.from("envios").update({ cobrado: true }).in("id", ids), "Marcados como cobrados"); }
        }
      })));
    }
    if (!st.envios.length) {
      lista.appendChild(h("p", { class: "meta", text: "Todavía no ha recibido ningún lead." }));
    } else {
      lista.appendChild(h("div", { class: "tablewrap" }, h("table", {},
        h("thead", {}, h("tr", {}, ["Fecha", "Lead", "Precio", "Resultado", "Cobro"].map(function (t) { return h("th", { scope: "col", text: t }); }))),
        h("tbody", {}, st.envios.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).map(function (x) {
          return h("tr", {},
            h("td", { text: dia(x.created_at) }),
            h("td", {}, h("a", { href: "#leads/" + x.lead.id, text: "#" + x.lead.id + " " + TIPOS[x.lead.tipo] + (x.lead.zona ? " · " + x.lead.zona : "") })),
            h("td", { class: "num", text: euros(x.precio) }),
            h("td", {}, badge(x.resultado, RESULTADOS)),
            h("td", { text: x.devolucion === "aceptada" ? "Devuelto" : !Number(x.precio) ? "Gratis" : x.cobrado ? "Cobrado" : "Pendiente" }));
        })))));
    }
    cont.appendChild(lista);

    if (!st.envios.length) {
      cont.appendChild(h("div", { class: "actions" }, h("button", {
        class: "btn btn-sm btn-danger", type: "button", text: "Eliminar empresa",
        onclick: function () {
          if (confirm("¿Eliminar " + e.nombre + "? No se puede deshacer.")) {
            sb.from("empresas").delete().eq("id", e.id).then(function (res) {
              if (res.error) { toast("No se ha podido eliminar: " + res.error.message, true); return; }
              toast("Empresa eliminada");
              location.hash = "empresas";
              cargar();
            });
          }
        }
      })));
    }
  }

  // ── Resumen ───────────────────────────────────────────────────────────

  function desdePeriodo(p) {
    var d = new Date();
    if (p === "mes") { return new Date(d.getFullYear(), d.getMonth(), 1); }
    if (p === "mes-pasado") { return new Date(d.getFullYear(), d.getMonth() - 1, 1); }
    if (p === "30") { return new Date(Date.now() - 30 * 864e5); }
    if (p === "90") { return new Date(Date.now() - 90 * 864e5); }
    return new Date(0);
  }
  function hastaPeriodo(p) {
    var d = new Date();
    return p === "mes-pasado" ? new Date(d.getFullYear(), d.getMonth(), 1) : new Date(8.64e15);
  }
  function canalDe(l) {
    var o = l.origen || {};
    if (o.utm_source) { return o.utm_source; }
    if (o.gclid) { return "google (gclid)"; }
    if (o.fbclid) { return "facebook/instagram (fbclid)"; }
    if (o.referrer) { try { return new URL(o.referrer).hostname.replace(/^www\./, ""); } catch (err) { return "otro"; } }
    return "directo";
  }

  function vistaResumen(main) {
    var desde = desdePeriodo(state.periodo), hasta = hastaPeriodo(state.periodo);
    function enPeriodo(x) { var t = new Date(x.created_at); return t >= desde && t < hasta; }
    var leads = state.leads.filter(enPeriodo);
    var envios = todosLosEnvios().filter(enPeriodo);
    var validos = leads.filter(function (l) { return ["verificado", "enviado", "cerrado"].indexOf(l.estado) !== -1; });
    var descartados = leads.filter(function (l) { return l.estado === "descartado"; });
    var facturable = envios.filter(cuenta).reduce(function (s, e) { return s + Number(e.precio); }, 0);
    var pendienteTotal = todosLosEnvios().filter(function (e) { return !e.cobrado && cuenta(e); }).reduce(function (s, e) { return s + Number(e.precio); }, 0);
    var conResultado = envios.filter(function (e) { return e.resultado !== "pendiente"; });
    var ganados = envios.filter(function (e) { return e.resultado === "ganado"; });
    var enviadosLeads = leads.filter(function (l) { return (l.envios || []).length; });

    var periodo = h("select", { "aria-label": "Periodo", onchange: function () { state.periodo = periodo.value; render(); } },
      [["mes", "Este mes"], ["mes-pasado", "Mes pasado"], ["30", "Últimos 30 días"], ["90", "Últimos 90 días"], ["todo", "Todo"]].map(function (o) {
        return h("option", { value: o[0], text: o[1], selected: state.periodo === o[0] });
      }));
    main.appendChild(h("div", { class: "pn-toolbar" }, h("h2", { text: "Resumen" }), h("span", { class: "spacer" }), periodo,
      h("button", {
        class: "btn btn-sm btn-ghost", type: "button", text: "Exportar envíos del periodo (CSV)", disabled: !envios.length,
        onclick: function () {
          var orden = envios.slice().sort(function (a, b) {
            var ea = (empresaPorId(a.empresa_id) || {}).nombre || "", eb = (empresaPorId(b.empresa_id) || {}).nombre || "";
            return ea.localeCompare(eb) || (a.created_at < b.created_at ? -1 : 1);
          });
          descargarCSV("envios-" + state.periodo + "-" + new Date().toISOString().slice(0, 10) + ".csv", CABECERA_ENVIOS, orden.map(filaEnvio));
        }
      })));

    function kpi(titulo, valor, nota) { return h("div", { class: "kpi" }, h("span", { text: titulo }), h("strong", { text: valor }), nota ? h("small", { text: nota }) : null); }
    main.appendChild(h("div", { class: "kpis" },
      kpi("Leads recibidos", leads.length, leads.filter(function (l) { return l.estado === "nuevo"; }).length + " sin revisar"),
      kpi("Válidos", validos.length, pct(validos.length, validos.length + descartados.length) + " de los revisados"),
      kpi("Envíos a empresas", envios.length, enviadosLeads.length ? (envios.length / enviadosLeads.length).toFixed(1).replace(".", ",") + " empresas por lead" : null),
      kpi("Facturable", euros(facturable), "sin contar devoluciones"),
      kpi("Pendiente de cobro", euros(pendienteTotal), "total, de cualquier fecha"),
      kpi("Obras ganadas", ganados.length, pct(ganados.length, conResultado.length) + " de los envíos con resultado")
    ));

    function tabla(titulo, columnas, filas) {
      var max = Math.max.apply(null, filas.map(function (f) { return f[1]; }).concat([1]));
      return h("div", { class: "card" }, h("h3", { text: titulo }),
        filas.length ? h("div", { class: "tablewrap" }, h("table", {},
          h("thead", {}, h("tr", {}, columnas.map(function (c, i) { return h("th", { scope: "col", class: i ? "num" : null, text: c }); }))),
          h("tbody", {}, filas.map(function (f) {
            return h("tr", {}, f.map(function (v, i) {
              if (i === 0) { return h("td", {}, h("div", { text: v }), h("div", { class: "meter", style: "width:" + Math.round(f[1] / max * 100) + "%" })); }
              return h("td", { class: "num", text: v });
            }));
          })))) : h("p", { class: "meta", text: "Sin datos en este periodo." }));
    }
    function agrupar(lista, clave) {
      var g = {};
      lista.forEach(function (x) { var k = clave(x); (g[k] = g[k] || []).push(x); });
      return g;
    }

    var porCanal = agrupar(leads, canalDe);
    var porTipo = agrupar(leads, function (l) { return TIPOS[l.tipo]; });
    function filaLeads(nombre, ls) {
      var env = [];
      ls.forEach(function (l) { (l.envios || []).forEach(function (e) { env.push(e); }); });
      var val = ls.filter(function (l) { return ["verificado", "enviado", "cerrado"].indexOf(l.estado) !== -1; }).length;
      return [nombre, ls.length, val, pct(val, ls.length), euros(env.filter(cuenta).reduce(function (s, e) { return s + Number(e.precio); }, 0))];
    }
    var porEmpresa = agrupar(envios, function (e) { return e.empresa_id; });
    var motivos = agrupar(descartados, function (l) { return l.motivo_descarte || "Sin motivo"; });

    main.appendChild(h("div", { class: "reports" },
      tabla("Leads por canal", ["Canal", "Leads", "Válidos", "% válidos", "Facturable"],
        Object.keys(porCanal).map(function (k) { return filaLeads(k, porCanal[k]); }).sort(function (a, b) { return b[1] - a[1]; })),
      tabla("Leads por tipo de reforma", ["Tipo", "Leads", "Válidos", "% válidos", "Facturable"],
        Object.keys(porTipo).map(function (k) { return filaLeads(k, porTipo[k]); }).sort(function (a, b) { return b[1] - a[1]; })),
      tabla("Empresas", ["Empresa", "Leads", "Ganados", "Facturable"],
        Object.keys(porEmpresa).map(function (k) {
          var es = porEmpresa[k], emp = empresaPorId(Number(k));
          return [emp ? emp.nombre : "#" + k, es.length, es.filter(function (e) { return e.resultado === "ganado"; }).length, euros(es.filter(cuenta).reduce(function (s, e) { return s + Number(e.precio); }, 0))];
        }).sort(function (a, b) { return b[1] - a[1]; })),
      tabla("Motivos de descarte", ["Motivo", "Leads"],
        Object.keys(motivos).map(function (k) { return [k, motivos[k].length]; }).sort(function (a, b) { return b[1] - a[1]; }))
    ));
  }

  // ── Arranque ──────────────────────────────────────────────────────────

  window.addEventListener("hashchange", function () { state.registrando = null; window.scrollTo(0, 0); render(); });
  // Refresca cada minuto si nadie está escribiendo en el panel.
  setInterval(function () {
    var a = document.activeElement;
    var escribiendo = (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) || state.registrando;
    if (sb && state.session && !document.hidden && !escribiendo) { cargar(); }
  }, 60000);
  arrancar();
})();

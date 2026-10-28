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
    orden: {},
    dirTel: "",
    dirSeg: "",
    busquedaEmpresa: "",
    tipoEmpresa: "",
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

  function pintarLogin() {
    var email = h("input", { type: "email", id: "login-email", autocomplete: "username", required: true });
    var clave = h("input", { type: "password", id: "login-clave", autocomplete: "current-password", required: true });
    var msg = h("p", { class: "msg" });
    var boton = h("button", { class: "btn", type: "submit", text: "Entrar" });
    var form = h("form", {
      onsubmit: function (e) {
        e.preventDefault();
        var correo = email.value.trim();
        if (!/^\S+@\S+\.\S+$/.test(correo)) { msg.className = "msg err"; msg.textContent = "Escribe un correo válido."; return; }
        msg.className = "msg"; msg.textContent = "Entrando…"; boton.disabled = true;
        sb.auth.signInWithPassword({ email: correo, password: clave.value }).then(function (res) {
          boton.disabled = false;
          if (res.error) {
            msg.className = "msg err";
            msg.textContent = /invalid login/i.test(res.error.message) ? "Correo o contraseña incorrectos." : res.error.message;
            clave.value = "";
            clave.focus();
          }
          // Si entra bien, onAuthStateChange pinta el panel.
        });
      }
    },
      h("div", { class: "field" }, h("label", { for: "login-email", text: "Tu correo" }), email),
      h("div", { class: "field" }, h("label", { for: "login-clave", text: "Contraseña" }), clave),
      boton,
      msg
    );
    app.replaceChildren(h("div", { class: "pn-login" }, h("div", { class: "card" },
      h("a", { class: "brand", href: "../" }, h("span", { class: "mark", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i")), "Pimen Leads"),
      h("h2", { text: "Panel interno" }),
      h("p", { class: "meta", text: "Solo pueden entrar los correos autorizados. Si no tienes contraseña, pídesela a Alex." }),
      form
    )));
    email.focus();
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

  // ── Piezas de interfaz comunes: navegación, tablas, filtros y barras ──

  // Cambia de vista; si ya estamos en ella (hash igual), vuelve a pintar.
  function ir(hash) {
    if (location.hash === "#" + hash) { render(); } else { location.hash = hash; }
  }
  function irADirectorio(tipo, estado) {
    state.dirTipo = tipo || ""; state.dirSub = ""; state.dirReforma = ""; state.dirEstado = estado || "";
    state.dirBusqueda = ""; state.dirTel = ""; state.dirSeg = "";
    ir("contactos");
  }
  function irASeguimientos() { irADirectorio("", ""); state.dirSeg = "vencido"; ir("contactos"); }
  function irAClientes(estado) { state.filtroLead = estado; state.filtroTipo = ""; state.busqueda = ""; ir("leads"); }

  // Orden por columna: el estado se recuerda por vista y se cambia pulsando la cabecera.
  function ordenador(vista, defecto) {
    var o = state.orden[vista] || (state.orden[vista] = { k: defecto.k, dir: defecto.dir });
    o.alt = function (k) { if (o.k === k) { o.dir = -o.dir; } else { o.k = k; o.dir = 1; } render(); };
    return o;
  }
  // Los valores vacíos van siempre al final, sea cual sea el sentido.
  function ordenar(lista, o, claves) {
    var f = claves[o.k];
    function vacio(v) { return v === null || v === undefined || v === ""; }
    return lista.slice().sort(function (a, b) {
      var va = f(a), vb = f(b);
      if (vacio(va) && vacio(vb)) { return 0; }
      if (vacio(va)) { return 1; }
      if (vacio(vb)) { return -1; }
      return va === vb ? 0 : (va < vb ? -1 : 1) * o.dir;
    });
  }
  // cols: [{ t, k (ordenable), cls }]; filas: [{ href, celdas: [nodo|texto] }]. En móvil cada fila pasa a tarjeta.
  function tablaPn(cols, filas, orden) {
    var thead = h("thead", {}, h("tr", {}, cols.map(function (c) {
      var th = h("th", { scope: "col", class: c.cls || null });
      if (c.k && orden) {
        th.appendChild(h("button", { class: "th-sort", type: "button", onclick: function () { orden.alt(c.k); },
          text: c.t + (orden.k === c.k ? (orden.dir > 0 ? " ↑" : " ↓") : "") }));
        th.setAttribute("aria-sort", orden.k === c.k ? (orden.dir > 0 ? "ascending" : "descending") : "none");
      } else { th.textContent = c.t; }
      return th;
    })));
    var tbody = h("tbody", {}, filas.map(function (f) {
      var tr = h("tr", {
        class: "pn-tr" + (f.sel ? " sel" : ""), tabindex: "0",
        onclick: function (ev) { if (!ev.target.closest("a, button, select, input")) { location.hash = f.href; } },
        onkeydown: function (ev) { if (ev.key === "Enter" && ev.target === tr) { location.hash = f.href; } }
      });
      f.celdas.forEach(function (c, i) { tr.appendChild(h("td", { "data-label": cols[i].t, class: cols[i].cls || null }, c)); });
      return tr;
    }));
    return h("div", { class: "pn-tablewrap" }, h("table", { class: "pn-table" }, thead, tbody));
  }
  // Celda de dos líneas: texto principal y detalle apagado.
  function celda2(a, b, href) {
    return h("div", { class: "c2" }, href ? h("a", { class: "c2-main", href: href, text: a }) : h("span", { class: "c2-main", text: a }), b ? h("small", { text: b }) : null);
  }
  function chipN(texto, n, activo, onclick) {
    return h("button", { class: "chip", type: "button", "aria-pressed": activo ? "true" : "false", onclick: onclick }, texto, h("b", { text: n }));
  }
  function selFiltro(etiqueta, opciones, valor, onchange) {
    var sel = h("select", { "aria-label": etiqueta, onchange: function () { onchange(sel.value); } },
      opciones.map(function (o) { return h("option", { value: o[0], text: o[1], selected: valor === o[0] }); }));
    return h("label", { class: "f-sel" }, h("span", { text: etiqueta }), sel);
  }
  function nodoVacio(texto) { return h("p", { class: "pn-empty", text: texto }); }
  function barras(filas) {
    var max = Math.max.apply(null, filas.map(function (f) { return f.n; }).concat([1]));
    return h("div", { class: "bars" }, filas.map(function (f) {
      var fila = h(f.onclick ? "button" : "div", { class: "bar-row", type: f.onclick ? "button" : null, onclick: f.onclick || null },
        h("span", { class: "bar-l", text: f.label }),
        h("span", { class: "bar-t" }, h("span", { class: "bar-f" + (f.tono ? " " + f.tono : ""), style: "width:" + Math.round(f.n / max * 100) + "%" })),
        h("span", { class: "bar-n", text: f.n }));
      return fila;
    }));
  }

  // Lo que hay que hacer, con un clic al sitio donde se hace.
  function kpisPendientes() {
    var g = gruposPendientes();
    function n(i) { return g[i].items.length; }
    var porVerificar = state.leads.filter(function (l) { return l.estado === "nuevo" || l.estado === "por_verificar"; }).length;
    var lista = [
      { t: "Clientes por verificar", n: porVerificar, tono: "urg", f: function () { irAClientes("nuevo"); } },
      { t: "Llamada pendiente", n: n(0), tono: "urg", f: function () { irADirectorio("proveedor", "llamada_pendiente"); } },
      { t: "Respondieron: llamar", n: n(1), tono: "urg", f: function () { irADirectorio("proveedor", "respondio"); } },
      { t: "Acuerdo cerrado", n: n(2), tono: "ok", f: function () { irADirectorio("proveedor", "acuerdo_cerrado"); } },
      { t: "Canal a la espera", n: n(3), tono: "", f: function () { irADirectorio("canal", "llamada_hecha"); } },
      { t: "Seguimientos vencidos", n: n(4), tono: "urg", f: irASeguimientos },
      { t: "Inválidos por avisar", n: invalidosPorAvisar().length, tono: "urg", f: function () { irAClientes("descartado"); } }
    ];
    return h("div", { class: "kpis kpis-link" }, lista.map(function (k) {
      return h("button", { class: "kpi " + (k.n ? k.tono : "cero"), type: "button", onclick: k.f },
        h("span", { text: k.t }), h("strong", { text: k.n }), h("small", { text: k.n ? "Ver →" : "Nada pendiente" }));
    }));
  }

  // ── Pendientes ────────────────────────────────────────────────────────

  function tablaContactosCompacta(items) {
    return tablaPn([{ t: "Ficha" }, { t: "Estado" }, { t: "Toca" }], items.map(function (c) {
      return { href: "contactos/" + c.id, celdas: [celda2(c.nombre, tipoTexto(c), "#contactos/" + c.id), badge(c.estado, ESTADOS_CONTACTO),
        celda2(c.proxima_accion || "—", c.proxima_fecha ? dia(c.proxima_fecha) : lineaUltima(c))] };
    }));
  }

  function vistaPendientes(main) {
    main.appendChild(h("div", { class: "pn-cab" }, h("div", {}, h("h1", { text: "Pendientes" }), h("p", { class: "meta", text: "Lo que toca hoy, por prioridad. Pulsa una tarjeta para ver la lista." })),
      h("div", { class: "actions" },
        h("a", { class: "btn btn-sm btn-ghost", href: "#contactos", text: "Buscar antes de llamar" }),
        h("a", { class: "btn btn-sm", href: "#contactos/nuevo", text: "+ Nuevo contacto" }))));
    if (!state.sinProspeccion) { main.appendChild(kpisPendientes()); }
    var cards = [];
    var nuevos = state.leads.filter(function (l) { return l.estado === "nuevo" || l.estado === "por_verificar"; });
    if (nuevos.length) {
      cards.push(h("div", { class: "card" }, h("h3", { text: "Clientes por verificar (" + nuevos.length + ")" }),
        h("p", { class: "meta", text: "Solicitudes que han entrado y todavía no se han llamado." }),
        tablaPn([{ t: "Cliente" }, { t: "Estado" }, { t: "Recibido" }], nuevos.map(function (l) {
          return { href: "leads/" + l.id, celdas: [celda2(l.nombre, [TIPOS[l.tipo], l.zona, l.plazo].filter(Boolean).join(" · "), "#leads/" + l.id), badge(l.estado, ESTADOS_LEAD), fecha(l.created_at)] };
        }))));
    }
    var invalidos = invalidosPorAvisar();
    if (invalidos.length) {
      cards.push(h("div", { class: "card" }, h("h3", { text: "Leads inválidos: avisar a las empresas (" + invalidos.length + ")" }),
        h("p", { class: "meta", text: "No se cobran, pero hay que avisar en los 7 días siguientes al envío." }),
        tablaPn([{ t: "Cliente" }, { t: "Límite" }], invalidos.map(function (l) {
          var primero = l.envios.reduce(function (m, e) { return e.created_at < m ? e.created_at : m; }, l.envios[0].created_at);
          return { href: "leads/" + l.id, celdas: [celda2(l.nombre, [TIPOS[l.tipo], l.zona].filter(Boolean).join(" · "), "#leads/" + l.id), "Antes del " + dia(new Date(new Date(primero).getTime() + 7 * 864e5))] };
        }))));
    }
    if (state.sinProspeccion) {
      cards.push(avisoProspeccion());
    } else {
      gruposPendientes().forEach(function (g) {
        if (!g.items.length) { return; }
        cards.push(h("div", { class: "card" }, h("h3", { text: g.titulo + " (" + g.items.length + ")" }),
          g.nota ? h("p", { class: "meta", text: g.nota }) : null, tablaContactosCompacta(g.items)));
      });
    }
    if (!cards.length) { main.appendChild(nodoVacio("Nada pendiente ahora mismo.")); }
    else { main.appendChild(h("div", { class: "pn-grid2" }, cards)); }
    if (!state.sinProspeccion) {
      var sinRespuesta = state.contactos.filter(function (c) { return c.estado === "email_enviado"; }).length;
      if (sinRespuesta) {
        main.appendChild(h("p", { class: "meta pie" }, sinRespuesta + " fichas con el correo enviado y sin respuesta anotada. Se siguen desde el ",
          h("a", { href: "#contactos", text: "directorio" }), "; no ensucian los pendientes."));
      }
    }
  }

  // ── Directorio ────────────────────────────────────────────────────────

  function ultimoTs(c) {
    var i = internasDe(c.id).filter(function (x) { return x.ocurrio_at; })[0];
    return i ? new Date(i.ocurrio_at).getTime() : null;
  }

  function vistaContactos(main, id) {
    if (state.sinProspeccion) { main.appendChild(avisoProspeccion()); return; }
    if (id === "importar") { vistaImportar(main); return; }
    var nuevo = id === "nuevo";
    var sel = nuevo ? {} : id ? contactoPorId(Number(id)) : null;
    if (sel) {
      var detalle = h("div", { class: "pn-detail" });
      detalleContacto(detalle, sel, nuevo);
      main.appendChild(detalle);
      return;
    }
    if (id) { main.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver al directorio", onclick: function () { location.hash = "contactos"; } })); main.appendChild(nodoVacio("Esa ficha no existe.")); return; }

    var porTipo = { proveedor: 0, canal: 0 };
    state.contactos.forEach(function (c) { porTipo[c.tipo]++; });
    var orden = ordenador("contactos", { k: "nombre", dir: 1 });
    var res = h("div", {});

    function pintar() {
      var filas = ordenar(contactosFiltrados(), orden, {
        nombre: function (c) { return norm(c.nombre); }, tipo: function (c) { return norm(tipoTexto(c)); },
        estado: function (c) { return Object.keys(ESTADOS_CONTACTO).indexOf(c.estado); }, ultimo: ultimoTs,
        toca: function (c) { return c.proxima_fecha || null; }, telefono: function (c) { return c.telefono; }
      });
      res.replaceChildren(h("p", { class: "meta" }, filas.length + " de " + state.contactos.length + " fichas"));
      if (!filas.length) { res.appendChild(nodoVacio("Ninguna ficha con estos filtros. Si no aparece, es que aún no le hemos escrito.")); return; }
      res.appendChild(tablaPn([
        { t: "Nombre", k: "nombre" }, { t: "Tipo", k: "tipo" }, { t: "Estado", k: "estado", cls: "nw" },
        { t: "Último movimiento", k: "ultimo" }, { t: "Toca", k: "toca" }, { t: "Teléfono", k: "telefono", cls: "nw" }
      ], filas.map(function (c) {
        var its = internasDe(c.id), u = its[0];
        return { href: "contactos/" + c.id, celdas: [
          celda2(c.nombre, c.email, "#contactos/" + c.id),
          c.tipo === "canal" ? SUBTIPOS[c.subtipo] : celda2("Reformista", (c.reformas || []).length ? reformasTexto(c) : "Tipo por clasificar"), badge(c.estado, ESTADOS_CONTACTO),
          u ? celda2(CANALES[u.canal] + " " + (ESTADOS_INTER_TODOS[u.estado] || u.estado).toLowerCase(), fechaInter(u) + (u.canal === "email" && u.desde && u.desde !== CUENTA_COMERCIAL ? " · " + u.desde : "")) : h("span", { class: "muted", text: "Sin contacto aún" }),
          c.proxima_accion ? celda2(c.proxima_accion, c.proxima_fecha ? dia(c.proxima_fecha) : "") : h("span", { class: "muted", text: "—" }),
          c.telefono || h("span", { class: "muted", text: "Sin teléfono" })
        ] };
      }), orden));
    }

    var buscar = h("input", {
      type: "search", placeholder: "Buscar por nombre, correo o dominio (ej. finquesfalcon.com)", value: state.dirBusqueda, "aria-label": "Buscar contactos",
      oninput: function () { state.dirBusqueda = buscar.value; pintar(); }
    });
    function chipTipo(valor, texto, n) {
      return chipN(texto, n, state.dirTipo === valor, function () { state.dirTipo = valor; state.dirSub = ""; state.dirReforma = ""; state.dirEstado = ""; render(); });
    }
    var fila1 = h("div", { class: "f-fila" },
      h("div", { class: "chips" }, chipTipo("", "Todos", state.contactos.length), chipTipo("proveedor", "Reformistas", porTipo.proveedor), chipTipo("canal", "Canal", porTipo.canal)),
      buscar);
    var fila2 = h("div", { class: "f-fila" });
    if (state.dirTipo === "canal") {
      var cuenta = {};
      state.contactos.forEach(function (c) { if (c.tipo === "canal") { cuenta[c.subtipo] = (cuenta[c.subtipo] || 0) + 1; } });
      fila2.appendChild(selFiltro("Tipo de canal", [["", "Todos"]].concat(Object.keys(SUBTIPOS_PLURAL).map(function (k) { return [k, SUBTIPOS_PLURAL[k] + " (" + (cuenta[k] || 0) + ")"]; })),
        state.dirSub, function (v) { state.dirSub = v; pintar(); }));
    }
    if (state.dirTipo === "proveedor") {
      fila2.appendChild(selFiltro("Tipo de reforma", [["", "Todos"], ["bano", "Baños"], ["cocina", "Cocinas"], ["integral", "Integrales"], ["mixto", "Mixto"], ["sin", "Por clasificar"]],
        state.dirReforma, function (v) { state.dirReforma = v; pintar(); }));
    }
    var etiquetas = state.dirTipo ? (state.dirTipo === "canal" ? ESTADOS_CANAL : ESTADOS_PROV) : ESTADOS_CONTACTO;
    fila2.appendChild(selFiltro("Estado", [["", "Todos"]].concat(Object.keys(etiquetas).map(function (k) { return [k, etiquetas[k]]; })), state.dirEstado, function (v) { state.dirEstado = v; pintar(); }));
    fila2.appendChild(selFiltro("Teléfono", [["", "Todos"], ["con", "Con teléfono"], ["sin", "Sin teléfono"]], state.dirTel, function (v) { state.dirTel = v; pintar(); }));
    fila2.appendChild(selFiltro("Seguimiento", [["", "Todos"], ["vencido", "Vencido o de hoy"], ["con", "Con próxima acción"]], state.dirSeg, function (v) { state.dirSeg = v; pintar(); }));
    fila2.appendChild(h("button", {
      class: "linkbtn", type: "button", text: "Quitar filtros",
      onclick: function () { state.dirTipo = ""; state.dirSub = ""; state.dirReforma = ""; state.dirEstado = ""; state.dirBusqueda = ""; state.dirTel = ""; state.dirSeg = ""; render(); }
    }));

    main.appendChild(h("div", { class: "pn-cab" }, h("div", {}, h("h1", { text: "Directorio" }), h("p", { class: "meta", text: "Busca aquí antes de llamar o escribir a nadie." })),
      h("div", { class: "actions" },
        h("a", { class: "btn btn-sm btn-ghost", href: "#contactos/importar", text: "Importar lista" }),
        h("button", { class: "btn btn-sm btn-ghost", type: "button", text: "Exportar CSV", onclick: exportarContactos }),
        h("a", { class: "btn btn-sm", href: "#contactos/nuevo", text: "+ Nuevo contacto" }))));
    main.appendChild(h("div", { class: "pn-filtros" }, fila1, fila2));
    pintar();
    main.appendChild(res);
  }

  // ── Clientes (leads) ──────────────────────────────────────────────────

  function vistaLeads(main, id) {
    var nuevo = id === "nuevo";
    var sel = nuevo ? {} : id ? state.leads.filter(function (l) { return String(l.id) === id; })[0] : null;
    if (nuevo || sel) {
      var detalle = h("div", { class: "pn-detail" });
      if (nuevo) { detalleLeadNuevo(detalle); } else { detalleLead(detalle, sel); }
      main.appendChild(detalle);
      return;
    }
    if (id) { main.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver a clientes", onclick: function () { location.hash = "leads"; } })); main.appendChild(nodoVacio("Ese lead no existe o no está entre los cargados.")); return; }

    var orden = ordenador("leads", { k: "fecha", dir: -1 });
    var res = h("div", {});
    var counts = {};
    state.leads.forEach(function (l) { counts[l.estado] = (counts[l.estado] || 0) + 1; });
    function pintar() {
      var filas = ordenar(leadsFiltrados(), orden, {
        nombre: function (l) { return norm(l.nombre); }, tipo: function (l) { return l.tipo; }, zona: function (l) { return norm(l.zona); },
        plazo: function (l) { return norm(l.plazo); }, estado: function (l) { return Object.keys(ESTADOS_LEAD).indexOf(l.estado); },
        fecha: function (l) { return new Date(l.created_at).getTime(); }, envios: function (l) { return (l.envios || []).length; }
      });
      res.replaceChildren(h("p", { class: "meta", text: filas.length + " de " + state.leads.length + " clientes" }));
      if (!state.leads.length) { res.appendChild(nodoVacio("Aún no hay clientes de reforma en el panel. Cuando entre una solicitud, se verifica y se manda a 3 empresas como máximo.")); return; }
      if (!filas.length) { res.appendChild(nodoVacio("No hay clientes con estos filtros.")); return; }
      res.appendChild(tablaPn([
        { t: "Cliente", k: "nombre" }, { t: "Reforma", k: "tipo" }, { t: "Zona", k: "zona" }, { t: "Plazo", k: "plazo" },
        { t: "Estado", k: "estado" }, { t: "Recibido", k: "fecha" }, { t: "Empresas", k: "envios" }
      ], filas.map(function (l) {
        var n = (l.envios || []).length;
        return { href: "leads/" + l.id, celdas: [
          h("div", { class: "c2" }, h("a", { class: "c2-main", href: "#leads/" + l.id, text: l.nombre }), h("small", { text: l.telefono }), duplicados(l).length ? h("span", { class: "badge warn", text: "Repetido" }) : null),
          TIPOS[l.tipo], l.zona || h("span", { class: "muted", text: "—" }), l.plazo || h("span", { class: "muted", text: "—" }),
          badge(l.estado, ESTADOS_LEAD), fecha(l.created_at), n ? n + " de 3" : h("span", { class: "muted", text: "Ninguna" })
        ] };
      }), orden));
    }
    var buscar = h("input", {
      type: "search", placeholder: "Buscar nombre, teléfono, zona o #id", value: state.busqueda, "aria-label": "Buscar clientes",
      oninput: function () { state.busqueda = buscar.value; pintar(); }
    });
    var chips = h("div", { class: "chips" },
      [["nuevo", "Nuevos"], ["por_verificar", "Por verificar"], ["verificado", "Verificados"], ["enviado", "Enviados"], ["cerrado", "Cerrados"], ["descartado", "Inválidos"], ["", "Todos"]].map(function (o) {
        return chipN(o[1], o[0] ? (counts[o[0]] || 0) : state.leads.length, state.filtroLead === o[0], function () { state.filtroLead = o[0]; render(); });
      }));
    main.appendChild(h("div", { class: "pn-cab" }, h("div", {}, h("h1", { text: "Clientes" }), h("p", { class: "meta", text: "Personas que quieren reformar: se verifican y se mandan a 3 empresas como máximo." })),
      h("div", { class: "actions" }, h("a", { class: "btn btn-sm", href: "#leads/nuevo", text: "+ Nuevo cliente" }))));
    main.appendChild(h("div", { class: "pn-filtros" }, h("div", { class: "f-fila" }, chips),
      h("div", { class: "f-fila" }, buscar,
        selFiltro("Reforma", [["", "Todas"]].concat(Object.keys(TIPOS).map(function (k) { return [k, TIPOS[k]]; })), state.filtroTipo, function (v) { state.filtroTipo = v; pintar(); }))));
    pintar();
    main.appendChild(res);
  }

  // ── Empresas ──────────────────────────────────────────────────────────

  function vistaEmpresas(main, id) {
    var nueva = id === "nueva";
    var sel = nueva ? {} : id ? empresaPorId(Number(id)) : null;
    if (sel) {
      var detalle = h("div", { class: "pn-detail" });
      detalleEmpresa(detalle, sel, nueva);
      main.appendChild(detalle);
      return;
    }
    if (id) { main.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver a empresas", onclick: function () { location.hash = "empresas"; } })); main.appendChild(nodoVacio("Esa empresa no existe.")); return; }

    var counts = {};
    state.empresas.forEach(function (e) { counts[e.estado] = (counts[e.estado] || 0) + 1; });
    var orden = ordenador("empresas", { k: "nombre", dir: 1 });
    var envs = todosLosEnvios(), porEmpresa = {};
    envs.forEach(function (x) { (porEmpresa[x.empresa_id] = porEmpresa[x.empresa_id] || []).push(x); });
    function st(e) {
      var suyos = porEmpresa[e.id] || [];
      return { n: suyos.length, ganados: suyos.filter(function (x) { return x.resultado === "ganado"; }).length,
        pendiente: suyos.filter(function (x) { return !x.cobrado && cuenta(x); }).reduce(function (s, x) { return s + Number(x.precio); }, 0) };
    }
    var res = h("div", {});
    function pintar() {
      var q = norm(state.busquedaEmpresa);
      var lista = state.empresas.filter(function (e) {
        if (state.filtroEmpresa && e.estado !== state.filtroEmpresa) { return false; }
        if (state.tipoEmpresa && (e.tipos || []).indexOf(state.tipoEmpresa) === -1) { return false; }
        return !q || norm([e.nombre, e.email, e.zonas, e.contacto].join(" ")).indexOf(q) !== -1;
      });
      lista = ordenar(lista, orden, {
        nombre: function (e) { return norm(e.nombre); }, estado: function (e) { return Object.keys(ESTADOS_EMPRESA).indexOf(e.estado); },
        zonas: function (e) { return norm(e.zonas); }, leads: function (e) { return st(e).n; }, ganados: function (e) { return st(e).ganados; }, cobrar: function (e) { return st(e).pendiente; }
      });
      res.replaceChildren(h("p", { class: "meta", text: lista.length + " de " + state.empresas.length + " empresas" }));
      if (!lista.length) { res.appendChild(nodoVacio("No hay empresas con estos filtros.")); return; }
      res.appendChild(tablaPn([
        { t: "Empresa", k: "nombre" }, { t: "Estado", k: "estado" }, { t: "Reformas" }, { t: "Zonas", k: "zonas" },
        { t: "Leads", k: "leads", cls: "num" }, { t: "Ganados", k: "ganados", cls: "num" }, { t: "Por cobrar", k: "cobrar", cls: "num" }
      ], lista.map(function (e) {
        var s = st(e);
        return { href: "empresas/" + e.id, celdas: [
          celda2(e.nombre, e.email, "#empresas/" + e.id), badge(e.estado, ESTADOS_EMPRESA),
          (e.tipos || []).length ? e.tipos.map(function (t) { return TIPOS[t]; }).join(", ") : h("span", { class: "muted", text: "Sin tipos" }),
          e.zonas || h("span", { class: "muted", text: "—" }), String(s.n), String(s.ganados), s.pendiente ? euros(s.pendiente) : "—"
        ] };
      }), orden));
    }
    var buscar = h("input", {
      type: "search", placeholder: "Buscar empresa, correo o zona", value: state.busquedaEmpresa, "aria-label": "Buscar empresas",
      oninput: function () { state.busquedaEmpresa = buscar.value; pintar(); }
    });
    var chips = h("div", { class: "chips" }, [["", "Todas"], ["interesada", "Interesadas"], ["prueba", "En prueba"], ["activa", "Activas"], ["pausada", "Pausadas"], ["baja", "Bajas"]].map(function (o) {
      return chipN(o[1], o[0] ? (counts[o[0]] || 0) : state.empresas.length, state.filtroEmpresa === o[0], function () { state.filtroEmpresa = o[0]; render(); });
    }));
    main.appendChild(h("div", { class: "pn-cab" }, h("div", {}, h("h1", { text: "Empresas" }), h("p", { class: "meta", text: "Las que reciben leads: estado, tipos de reforma, precios y cobros." })),
      h("div", { class: "actions" }, h("a", { class: "btn btn-sm", href: "#empresas/nueva", text: "+ Nueva empresa" }))));
    main.appendChild(h("div", { class: "pn-filtros" }, h("div", { class: "f-fila" }, chips),
      h("div", { class: "f-fila" }, buscar,
        selFiltro("Reforma", [["", "Todas"], ["bano", "Baños"], ["cocina", "Cocinas"], ["integral", "Integrales"]], state.tipoEmpresa, function (v) { state.tipoEmpresa = v; pintar(); }))));
    pintar();
    main.appendChild(res);
  }

  // ── Resumen: prospección y pendientes ─────────────────────────────────

  function bloqueProspeccion() {
    var cont = h("div", { class: "pn-resumen-top" });
    cont.appendChild(h("h2", { text: "Pendiente ahora" }));
    cont.appendChild(kpisPendientes());
    if (state.sinProspeccion) { cont.appendChild(avisoProspeccion()); return cont; }

    function embudo(tipo, etiquetas) {
      var cs = state.contactos.filter(function (c) { return c.tipo === tipo; });
      return barras(Object.keys(etiquetas).map(function (k) {
        var n = cs.filter(function (c) { return c.estado === k; }).length;
        return { label: etiquetas[k], n: n, tono: ["respondio", "llamada_pendiente", "llamada_hecha"].indexOf(k) !== -1 ? "urg" : ["acuerdo_cerrado", "activo", "colabora"].indexOf(k) !== -1 ? "ok" : "", onclick: function () { irADirectorio(tipo, k); } };
      }));
    }
    var porEstadoLead = {};
    state.leads.forEach(function (l) { porEstadoLead[l.estado] = (porEstadoLead[l.estado] || 0) + 1; });

    // Actividad de los últimos 28 días (los registros importados no tienen fecha y no cuentan).
    var dias = [], hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    for (var i = 27; i >= 0; i--) { dias.push({ d: new Date(hoy.getTime() - i * 864e5), n: 0 }); }
    var fechados = state.interacciones.filter(function (x) { return x.ocurrio_at; });
    fechados.forEach(function (x) {
      var t = new Date(x.ocurrio_at); t.setHours(0, 0, 0, 0);
      var d = dias.filter(function (z) { return z.d.getTime() === t.getTime(); })[0];
      if (d) { d.n++; }
    });
    var max = Math.max.apply(null, dias.map(function (d) { return d.n; }).concat([1]));
    var totalVentana = dias.reduce(function (s, d) { return s + d.n; }, 0);
    var actividad = h("div", {},
      h("div", { class: "spark", role: "img", "aria-label": "Correos y llamadas registrados por día en los últimos 28 días" },
        dias.map(function (d) { return h("span", { class: "spark-b", title: fecha(d.d).split(",")[0] + ": " + d.n, style: "height:" + (d.n ? Math.max(8, Math.round(d.n / max * 100)) : 3) + "%" }); })),
      h("div", { class: "spark-ejes" }, h("span", { text: dia(dias[0].d) }), h("span", { text: "hoy" })),
      h("p", { class: "meta", text: totalVentana + " registros en 28 días · " + (state.interacciones.length - fechados.length) + " sin fecha (importados)" }));

    cont.appendChild(h("div", { class: "pn-grid3" },
      h("div", { class: "card" }, h("h3", { text: "Embudo de reformistas" }), h("p", { class: "meta", text: "Pulsa una barra para ver esas fichas." }), embudo("proveedor", ESTADOS_PROV)),
      h("div", { class: "card" }, h("h3", { text: "Embudo de canal" }), h("p", { class: "meta", text: "Administraciones, inmobiliarias y gestoras." }), embudo("canal", ESTADOS_CANAL)),
      h("div", { class: "card" }, h("h3", { text: "Clientes por estado" }), h("p", { class: "meta", text: "Personas que quieren reformar." }),
        barras(Object.keys(ESTADOS_LEAD).map(function (k) { return { label: ESTADOS_LEAD[k], n: porEstadoLead[k] || 0, tono: k === "nuevo" || k === "por_verificar" ? "urg" : k === "enviado" ? "ok" : "", onclick: function () { irAClientes(k); } }; }))),
      h("div", { class: "card pn-span" }, h("h3", { text: "Actividad: correos y llamadas por día" }), actividad)));
    return cont;
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
      if (state.dirTel === "con" ? !c.telefono : state.dirTel === "sin" ? c.telefono : false) { return false; }
      if (state.dirSeg === "con" ? !c.proxima_accion : state.dirSeg === "vencido" ? !(c.proxima_fecha && c.proxima_fecha <= hoyISO() && ["no_interesa", "pausado", "inactivo"].indexOf(c.estado) === -1) : false) { return false; }
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
    cont.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver al directorio", onclick: function () { state.registrando = null; location.hash = "contactos"; } }));

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
      h("div", { class: "actions" },
        h("button", { class: "btn btn-sm", type: "submit", text: nuevo ? "Crear ficha" : "Guardar cambios" }),
        nuevo ? null : h("button", {
          class: "btn btn-sm btn-danger", type: "button", text: "Eliminar ficha",
          onclick: function () {
            if (confirm("¿Eliminar " + c.nombre + " con todo su historial? No se puede deshacer.")) {
              sb.from("contactos").delete().eq("id", c.id).then(function (res) {
                if (res.error) { toast("No se ha podido eliminar: " + res.error.message, true); return; }
                toast("Ficha eliminada");
                location.hash = "contactos";
                cargar();
              });
            }
          }
        }))
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

    var cols = h("div", { class: "pn-cols" }), izq = h("div", { class: "pn-col" }), der = h("div", { class: "pn-col" });
    cols.appendChild(izq); cols.appendChild(der); cont.appendChild(cols);
    // Cabecera: quién es y si ya le hemos escrito
    var dup = avisoDuplicados(c.email, c.id);
    izq.appendChild(h("div", { class: "card" },
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

    izq.appendChild(bloqueRegistro({ c: c }));
    der.appendChild(bloqueHistorial({ c: c }));

    // Reformista: paso a empresa que recibe leads
    if (c.tipo === "proveedor") {
      var emp = c.empresa_id ? empresaPorId(c.empresa_id) : null;
      var puedeCrear = !emp && ["acuerdo_cerrado", "activo"].indexOf(c.estado) !== -1;
      if (emp || puedeCrear) {
        der.appendChild(h("div", { class: "card" }, h("h3", { text: "Recibir leads" }),
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
      der.appendChild(h("div", { class: "card" }, h("h3", { text: "Clientes derivados (" + derivados.length + ")" }),
        derivados.length ? derivados.map(function (l) { return h("p", {}, h("a", { href: "#leads/" + l.id, text: "#" + l.id + " " + l.nombre }), " · " + [TIPOS[l.tipo], l.zona].filter(Boolean).join(" · ")); })
          : h("p", { class: "meta", text: "Todavía no nos ha derivado a nadie. Cuando mande a alguien que quiera reformar, se da de alta como cliente con este canal de origen." }),
        h("div", { class: "actions" }, h("button", {
          class: "btn btn-sm btn-ghost", type: "button", text: "+ Cliente derivado por este canal",
          onclick: function () { state.altaCanal = c.id; location.hash = "leads/nuevo"; }
        }))));
    }

    izq.appendChild(h("details", { class: "card" }, h("summary", { text: "Editar ficha" }), form));
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
    cont.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver a clientes", onclick: function () { state.altaCanal = null; location.hash = "leads"; } }));
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

    var cols = h("div", { class: "pn-cols" }), izq = h("div", { class: "pn-col" }), der = h("div", { class: "pn-col" });
    cols.appendChild(izq); cols.appendChild(der);
    // Cabecera y contacto
    var saludo = "Hola " + l.nombre.split(" ")[0] + ", te escribo de Pimen Reformas por tu solicitud de presupuesto. ¿Te va bien que te llame un momento?";
    cont.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver a clientes", onclick: function () { location.hash = "leads"; } }));
    izq.appendChild(h("div", { class: "card" },
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
    izq.appendChild(h("div", { class: "card" },
      h("h3", { text: "Estado" }),
      l.estado === "nuevo" || l.estado === "por_verificar" ? h("p", { class: "meta", text: "Llama o escribe al cliente para confirmar que es real y que quiere presupuesto antes de enviarlo a las empresas." }) : null,
      avisoInvalido(l, envios),
      acciones,
      notas,
      h("div", { class: "actions" }, h("button", { class: "btn btn-sm btn-ghost", type: "button", text: "Guardar notas", onclick: function () { guardar(sb.from("leads").update({ notas: notas.value.trim() || null }).eq("id", l.id), "Notas guardadas"); } }))
    ));

    der.appendChild(bloqueRegistro({ l: l }));
    der.appendChild(bloqueHistorial({ l: l }));

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
    der.insertBefore(cardEnvios, der.firstChild);
    cont.appendChild(cols);
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

    cont.appendChild(h("button", { class: "linkbtn pn-back", type: "button", text: "← Volver a empresas", onclick: function () { location.hash = "empresas"; } }));
    if (nueva) {
      cont.appendChild(h("div", { class: "card" }, h("h2", { text: "Nueva empresa" }), form));
      return;
    }

    var cols = h("div", { class: "pn-cols" }), izq = h("div", { class: "pn-col" }), der = h("div", { class: "pn-col" });
    cols.appendChild(izq); cols.appendChild(der); cont.appendChild(cols);
    var st = statsEmpresa(e.id);
    var origen = e.origen || {};
    var saludo = "Hola" + (e.contacto ? " " + e.contacto.split(" ")[0] : "") + ", te escribo de Pimen Leads por tu solicitud del primer lead gratis.";
    izq.appendChild(h("div", { class: "card" },
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
    der.appendChild(lista);

    if (!st.envios.length) {
      der.appendChild(h("div", { class: "actions" }, h("button", {
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
    main.appendChild(h("div", { class: "pn-cab" }, h("div", {}, h("h1", { text: "Resumen" }), h("p", { class: "meta", text: "Pendientes, embudos y facturación." }))));
    main.appendChild(bloqueProspeccion());
    main.appendChild(h("div", { class: "pn-toolbar pn-sep" }, h("h2", { text: "Leads y facturación" }), h("span", { class: "spacer" }), periodo,
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

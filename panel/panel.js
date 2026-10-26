// Panel interno de Pimen Leads: leads, empresas, envíos y resumen.
// Los datos vienen de Supabase; el acceso lo controla la tabla admins (ver supabase/schema.sql).
// Todo el texto que viene de formularios se pinta con textContent: nunca como HTML.
(function () {
  "use strict";

  var cfg = window.PIMEN_CONFIG || {};
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");

  var TIPOS = { bano: "Baño", cocina: "Cocina", integral: "Integral", otro: "Otro" };
  var ESTADOS_LEAD = { nuevo: "Nuevo", verificado: "Verificado", enviado: "Enviado", cerrado: "Cerrado", descartado: "Descartado" };
  var ESTADOS_EMPRESA = { interesada: "Interesada", prueba: "En prueba", activa: "Activa", pausada: "Pausada", baja: "Baja" };
  var RESULTADOS = { pendiente: "Pendiente", contactado: "Contactado", presupuestado: "Presupuestado", ganado: "Ganado", perdido: "Perdido" };
  var DEVOLUCIONES = { no: "Sin devolución", solicitada: "Devolución pedida", aceptada: "Devuelto", rechazada: "Devolución rechazada" };
  var MOTIVOS = ["No contesta", "Datos falsos", "Solo quiere saber el precio", "Fuera de zona", "Duplicado", "Ya tiene empresa", "Otro"];

  var state = {
    session: null,
    leads: [],
    empresas: [],
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
      sb.from("empresas").select("*").order("nombre")
    ]).then(function (r) {
      if (r[0].error) { throw r[0].error; }
      if (r[1].error) { throw r[1].error; }
      state.leads = r[0].data;
      state.empresas = r[1].data;
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

  // ── Estructura y navegación (#leads, #leads/12, #empresas, #empresas/3, #empresas/nueva, #resumen) ──

  function ruta() {
    var partes = location.hash.replace(/^#/, "").split("/");
    return { vista: partes[0] || "leads", id: partes[1] || null };
  }

  function render() {
    if (!state.session) { return; }
    var r = ruta();
    var nuevos = state.leads.filter(function (l) { return l.estado === "nuevo"; }).length;
    var interesadas = state.empresas.filter(function (e) { return e.estado === "interesada"; }).length;
    function tab(vista, texto, n) {
      return h("a", { href: "#" + vista, "aria-current": r.vista === vista ? "page" : null }, texto, n ? h("span", { class: "count", text: n }) : null);
    }
    var top = h("header", { class: "pn-top" }, h("div", { class: "bar" },
      h("a", { class: "brand", href: "#leads" }, h("span", { class: "mark", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i")), "Pimen Leads ", h("small", { text: "panel" })),
      h("nav", { class: "pn-tabs", "aria-label": "Secciones del panel" },
        tab("leads", "Leads", nuevos), tab("empresas", "Empresas", interesadas), tab("resumen", "Resumen")),
      h("div", { class: "pn-user" },
        h("button", { class: "linkbtn", type: "button", text: "Actualizar", onclick: function () { cargar().then(function () { toast("Datos actualizados"); }); } }),
        h("span", { text: state.session.user.email }),
        h("button", { class: "linkbtn", type: "button", text: "Salir", onclick: function () { sb.auth.signOut(); } }))
    ));
    var main = h("main", { class: "pn-main" });
    if (r.vista === "empresas") { vistaEmpresas(main, r.id); }
    else if (r.vista === "resumen") { vistaResumen(main); }
    else { vistaLeads(main, r.id); }
    var scroll = window.scrollY;
    app.replaceChildren(top, main);
    window.scrollTo(0, scroll);
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
    var sel = id ? state.leads.filter(function (l) { return String(l.id) === id; })[0] : null;
    var split = h("div", { class: "pn-split" + (sel ? " has-detail" : "") });
    var lista = h("div", { class: "pn-list" });

    function pintarLista() {
      var filas = leadsFiltrados();
      lista.replaceChildren();
      if (!filas.length) { lista.appendChild(h("p", { class: "pn-empty", text: "No hay leads con este filtro." })); return; }
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
      chip("nuevo", "Nuevos"), chip("verificado", "Verificados"), chip("enviado", "Enviados"),
      chip("cerrado", "Cerrados"), chip("descartado", "Descartados"), chip("", "Todos"),
      tipoSel, buscar);

    pintarLista();
    var detalle = h("div", { class: "pn-detail" });
    if (sel) { detalleLead(detalle, sel); }
    else if (id) { detalle.appendChild(h("p", { class: "pn-empty", text: "Ese lead no existe o no está entre los cargados." })); }
    else { detalle.appendChild(h("p", { class: "pn-empty", text: "Elige un lead de la lista." })); }

    if (sel) { main.classList.add("has-detail"); }
    main.appendChild(toolbar);
    split.appendChild(lista);
    split.appendChild(detalle);
    main.appendChild(split);
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
    var canal = [origen.utm_source, origen.utm_campaign].filter(Boolean).join(" / ") || (origen.gclid ? "Google Ads" : origen.fbclid ? "Meta" : origen.referrer ? "Enlace: " + origen.referrer : "Directo");

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
        kv("Canal", canal), kv("Página", origen.pagina), kv("Consentimiento", l.consentimiento),
        l.estado === "descartado" ? kv("Motivo de descarte", l.motivo_descarte) : null)
    ));

    // Estado
    var motivo = h("select", { "aria-label": "Motivo de descarte" }, MOTIVOS.map(function (m) { return h("option", { text: m }); }));
    function cambiarEstado(estado, extra, texto) {
      return guardar(sb.from("leads").update(Object.assign({ estado: estado }, extra || {})).eq("id", l.id), texto);
    }
    var acciones = h("div", { class: "actions" });
    if (l.estado === "nuevo") {
      acciones.appendChild(h("button", { class: "btn btn-sm", type: "button", text: "Verificado: es real y quiere presupuesto", onclick: function () { cambiarEstado("verificado", { motivo_descarte: null }, "Lead verificado"); } }));
    }
    if (l.estado === "nuevo" || l.estado === "verificado") {
      acciones.appendChild(motivo);
      acciones.appendChild(h("button", { class: "btn btn-sm btn-danger", type: "button", text: "Descartar", onclick: function () { cambiarEstado("descartado", { motivo_descarte: motivo.value }, "Lead descartado"); } }));
    }
    if (l.estado === "verificado") {
      acciones.appendChild(h("button", { class: "linkbtn", type: "button", text: "Volver a nuevo", onclick: function () { cambiarEstado("nuevo"); } }));
    }
    if (l.estado === "enviado") {
      acciones.appendChild(h("button", { class: "btn btn-sm btn-ghost", type: "button", text: "Cerrar lead (ya no hay nada que hacer)", onclick: function () { cambiarEstado("cerrado", null, "Lead cerrado"); } }));
    }
    if (l.estado === "cerrado" || l.estado === "descartado") {
      acciones.appendChild(h("button", { class: "btn btn-sm btn-ghost", type: "button", text: "Reabrir", onclick: function () { cambiarEstado(envios.length ? "enviado" : "nuevo", { motivo_descarte: null }, "Lead reabierto"); } }));
    }
    var notas = h("textarea", { "aria-label": "Notas internas", placeholder: "Notas internas: qué dijo al llamarle, cuándo volver a llamar…", value: l.notas || "" });
    cont.appendChild(h("div", { class: "card" },
      h("h3", { text: "Estado" }),
      l.estado === "nuevo" ? h("p", { class: "meta", text: "Llama o escribe al cliente para confirmar que es real y que quiere presupuesto antes de enviarlo a las empresas." }) : null,
      acciones,
      notas,
      h("div", { class: "actions" }, h("button", { class: "btn btn-sm btn-ghost", type: "button", text: "Guardar notas", onclick: function () { guardar(sb.from("leads").update({ notas: notas.value.trim() || null }).eq("id", l.id), "Notas guardadas"); } }))
    ));

    // Envíos
    var cardEnvios = h("div", { class: "card" }, h("h3", { text: "Empresas (" + envios.length + " de 3)" }));
    envios.slice().sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; }).forEach(function (e) {
      cardEnvios.appendChild(bloqueEnvio(e, l));
    });
    if (!envios.length) { cardEnvios.appendChild(h("p", { class: "meta", text: "Todavía no se ha enviado a ninguna empresa." })); }
    if (envios.length < 3 && (l.estado === "verificado" || l.estado === "enviado")) {
      cardEnvios.appendChild(candidatas(l));
    } else if (l.estado === "nuevo") {
      cardEnvios.appendChild(h("p", { class: "meta", text: "Para enviarlo, primero márcalo como verificado." }));
    }
    cont.appendChild(cardEnvios);
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
      return (e.estado === "activa" || e.estado === "prueba") && asignadas.indexOf(e.id) === -1;
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
      cont.appendChild(h("p", { class: "meta" }, "No hay empresas activas o en prueba disponibles. ", h("a", { href: "#empresas", text: "Ver empresas" })));
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
    main.appendChild(h("div", { class: "pn-toolbar" }, h("h2", { text: "Resumen" }), h("span", { class: "spacer" }), periodo));

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

  window.addEventListener("hashchange", function () { window.scrollTo(0, 0); render(); });
  // Refresca cada minuto si nadie está escribiendo en el panel.
  setInterval(function () {
    var a = document.activeElement;
    var escribiendo = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
    if (sb && state.session && !document.hidden && !escribiendo) { cargar(); }
  }, 60000);
  arrancar();
})();

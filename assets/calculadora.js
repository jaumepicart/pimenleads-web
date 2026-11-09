// Calculadora de precio de las landings de baño: con las respuestas de los primeros pasos del formulario
// enseña un rango orientativo en el último paso, junto al teléfono. No guarda nada ni manda nada por su cuenta:
// el resumen viaja con la solicitud como comentario (campo oculto "mensaje"), para tenerlo en la llamada.
//
// PRECIOS SIN VALIDAR: son rangos de mercado (Barcelona, materiales y mano de obra), no tarifas de nuestras
// empresas. Hay que contrastarlos con 2-3 reformistas y cambiarlos aquí.
(function () {
  var PRECIOS = {
    completa: {
      pequeno: { basicos: [4000, 5500], medios: [5000, 7000], altos: [6500, 9500] },
      mediano: { basicos: [5000, 6500], medios: [6000, 8500], altos: [8000, 11500] },
      grande: { basicos: [6000, 8000], medios: [7500, 10500], altos: [10000, 14500] }
    },
    // Cambiar la bañera por un plato de ducha casi no depende del tamaño del baño.
    ducha: { basicos: [1200, 1800], medios: [1800, 2800], altos: [2800, 4200] },
    parte: { basicos: [1000, 2500], medios: [1500, 3500], altos: [2500, 5000] }
  };
  var REFORMA = {
    "Reforma completa del baño": "completa",
    "Cambiar la bañera por un plato de ducha": "ducha",
    "Reformar solo una parte del baño": "parte",
    "Todavía no lo sé": "completa"
  };
  // La bonificación por contratar (sección #bonificacion): 50 € en obras de 5.000 a 9.999 €, 100 € desde 10.000 €.
  var BONO_DESDE = 5000;
  var BONO_ALTO_DESDE = 10000;

  var form = document.querySelector("form[data-calculadora]");
  if (!form) { return; }
  var cifra = form.querySelector("[data-cifra]");
  var nota = form.querySelector("[data-nota]");
  var bono = form.querySelector("[data-bono]");
  var resumen = form.querySelector("[data-resumen]");

  function elegido(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }
  // Punto de miles a mano: toLocaleString("es-ES") no lo pone en cifras de 4 dígitos (4000 frente a 10.000).
  function miles(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function minusculas(t) { return t.charAt(0).toLowerCase() + t.slice(1); }

  function calcular() {
    var reforma = elegido("reforma");
    var tamano = form.querySelector('input[name="tamano"]:checked');
    var calidad = form.querySelector('input[name="calidad"]:checked');
    if (!reforma || !tamano || !calidad) { return; }
    var tipo = REFORMA[reforma] || "completa";
    var tabla = PRECIOS[tipo];
    var rango = (tipo === "completa" ? tabla[tamano.dataset.clave] : tabla)[calidad.dataset.clave];

    cifra.textContent = "Entre " + miles(rango[0]) + " y " + miles(rango[1]) + " €";
    var noSabe = reforma === "Todavía no lo sé";
    nota.textContent = (noSabe ? "Reforma completa del baño" : reforma) + " · " + minusculas(tamano.dataset.texto) + " · " + minusculas(calidad.dataset.texto) + ". " +
      (noSabe ? "Es lo que cuesta una reforma completa; si al final es solo una parte, costará menos. " : "") +
      "Precio orientativo en Barcelona, con materiales y mano de obra.";
    if (rango[1] >= BONO_DESDE) {
      bono.textContent = "Y si contratas con una de nuestras empresas, te regalamos " + (rango[0] >= BONO_ALTO_DESDE ? "100 €" : "50 €") + ".";
      bono.hidden = false;
    } else {
      bono.hidden = true;
    }
    resumen.value = "Calculadora: " + minusculas(reforma) + ", " + minusculas(tamano.dataset.texto) + ", " +
      minusculas(calidad.dataset.texto) + " → " + rango[0] + "-" + rango[1] + " €";
  }

  form.addEventListener("change", calcular);
  calcular();
})();

# Plan de captación de clientes y oferta (29 oct 2026)

Nota para quien lo lea (persona o Claude): este documento está en un repositorio público, así que **no incluye cifras de comisión ni importes acordados con las empresas**. Esos datos los tiene Alex y van en el acuerdo con cada empresa. Si hace falta hacer cuentas, pedídselas.

## Situación

- Hay empresas de reformas colaboradoras, pero solo **3 clientes** (particulares) que quieren reformar. El cuello de botella son los clientes, no las empresas.
- **Google Ads:** solo la campaña *Integral BCN* está activa desde el 27 oct, a 5 €/día. Acumulado a 29 oct: 27 impresiones, 3 clics, 6,34 €, 0 conversiones, CPC medio ≈ 2,11 €. Detalle en la bitácora local (`privado/google-ads/BITACORA.md`, que no está en Git).
- A ese ritmo salen unos 2,4 clics al día; para 40–60 clics hacen falta 3–4 semanas y saldrían 2–6 solicitudes. Se aprende despacio.

## Cómo se gana dinero

- A la **empresa reformista**: un precio por lead (el primero, gratis) y una **comisión sobre la obra cerrada**, que depende del importe de la obra.
- Al **particular** no se le cobra nada ("Gratis para ti").
- A los **prescriptores** (inmobiliarias, administradores de fincas, tiendas): una cantidad fija por contacto válido más una comisión si la obra se cierra (ver `_interno/plantilla-carta.html`).

Aún no se ha cerrado ninguna obra, así que todo esto es plan y la realidad puede ser distinta.

## Google Ads

- No tocar nada hasta 10 clics; entonces, revisar el informe de términos de búsqueda.
- Integral es la campaña más difícil para aprender (pocas búsquedas, CPC alto). Propuesta: **activar Baños con 5 €/día en paralelo**, unos 300 €/mes en total.
- Alarma: más de 40 € por solicitud. Con CPC de 2,11 €, la landing debe convertir por encima de ~5 %.

## Canales sin gasto en paralelo

1. **Prescriptores**: inmobiliarias y administradores de fincas, por barrios donde haya empresas colaboradoras. Cada uno con su propio enlace con seguimiento:
   `https://www.pimenleads.com/reforma-integral-barcelona.html?utm_source=prescriptores&utm_medium=referral&utm_campaign=NOMBRE-EN-MINUSCULAS`
   El panel lee `utm_source` y `utm_campaign` y los muestra como canal del lead. Las solicitudes por teléfono o WhatsApp se dan de alta a mano con vía "Canal (partner)".
2. **Arquitectos técnicos, interioristas y tiendas de baño y cocina.**
3. **Ficha de Google Business** y reseña de cada cliente que complete una obra.
4. **Las propias empresas colaboradoras**: que avisen a sus clientes pasados y conocidos.

Meta del primer mes: 15–20 prescriptores contactados, 3–5 que acepten y 5–10 solicitudes de este bloque.

Guion de llamada (1 minuto): "Ayudamos a quien compra o tiene un piso a conseguir presupuestos de reforma de empresas locales revisadas, sin coste para el cliente. Si un cliente vuestro quiere reformar, le pasáis este enlace; si contrata con una de nuestras empresas, os pagamos una comisión. Sin compromiso ni exclusividad."

## La oferta para el cliente que contrata

Idea de Alex: si el particular **contrata la obra** con una de las empresas que le pasamos, se le da un **descuento o una parte de la comisión** que se cobra a la reformista. No va dirigida a empresas ni a prescriptores.

**Recomendación: descuento en la factura de la obra**, aplicado por la empresa y compensado por nosotros en la comisión.

- Es más fácil de explicar y el cliente lo ve en el presupuesto, cuando decide.
- No hay pagos a particulares, que complican lo fiscal.
- Dar dinero tras la obra se controla mejor, pero pesa menos en la decisión y complica lo administrativo. Si se prefiere dinero, ligarlo a una reseña en Google.

Puntos a tener en cuenta:

- **Se financia sola**: solo se paga si la obra se cierra y sale de una comisión que ya se cobra.
- **Un descuento pequeño es un gancho débil**: sirve para que pidan presupuesto con nosotros y no directamente a la empresa, no para disparar los clientes.
- **No acumular todo**: descuento al cliente y pago al prescriptor salen de la misma comisión. Propuesta: descuento al cliente en las solicitudes de anuncios, y pago al prescriptor en las que traiga él.
- **Tope**: importe fijo por tramos de obra, siempre por debajo de un tercio de la comisión. Empezar prudente (subir es fácil, bajar no).
- **Por escrito con cada empresa**: comisión, cálculo sobre el importe previo al descuento y obligación de informar de las obras cerradas.
- **Transparencia**: decir al cliente que las empresas nos pagan una comisión si contrata.

## Problema pendiente en la web

`condiciones-empresas.html` solo habla del precio por lead ("solo se pagan los leads recibidos, sin cuotas") y **no menciona la comisión por obra cerrada**. Además, las empresas solo se comprometen a decirnos "cuando lo sepan" si han cerrado la obra. Propuesta: cláusula general de comisión (sin cifras) con obligación de informar de las obras cerradas, revisada por un gestor o abogado antes de lanzar la oferta.

## Preguntas abiertas para los socios

1. ¿Activamos Baños con 5 €/día ya, o esperamos a ver Integral?
2. ¿Descuento en factura o dinero?
3. ¿Qué tope: importe fijo por tramos o parte de la comisión?
4. Cuando haya que elegir, ¿priorizamos el pago al prescriptor o el descuento al cliente?
5. ¿Quién llama a los prescriptores y por qué barrios empezamos?

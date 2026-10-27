# Instrucciones de correo de Pimen Leads (para Alex y su Claude)

**Para Claude:** lee este archivo entero al empezar un chat nuevo. Te da el contexto para redactar los correos y las cartas de Pimen Leads. Los archivos que se mencionan están en este mismo repositorio. Escribe siempre en español.

## Contexto

- Pimen Leads (www.pimenleads.com) capta solicitudes de personas de Barcelona y alrededores que quieren reformar su baño, su cocina o su vivienda completa, y las pasa a empresas de reformas.
- Hay dos tipos de cliente: **empresas de reformas** (reciben los contactos) y **colaboradores** (administraciones de fincas, inmobiliarias…) que nos pasan clientes y cobran por ello.
- Los correos salen de comercial@pimenleads.com. Claude prepara el **borrador**; la persona lo revisa, le añade la firma, adjunta la carta y lo envía. Claude no envía correos.
- Las condiciones económicas de cada empresa las da Jaume. Si no las tienes, pregúntaselas a la persona antes de escribirlas.

## Qué hacer cuando se cierra un cliente

Vale para cualquier cliente que cierres: administración de fincas, inmobiliaria, empresa de reformas o un cliente directo.

## En cada correo hay que adjuntar 2 cosas

### 1. La carta de presentación, con el mismo formato que usa Jaume

- Usa la plantilla que corresponda (ábrela en tu ordenador, con el navegador):
  - Administración de fincas, inmobiliaria u otro colaborador que nos pasa clientes: `_interno/plantilla-carta.html`.
  - Empresa de reformas (proveedor que recibe los contactos): `_interno/plantilla-carta-proveedor.html`. Es el mismo modelo que usa Jaume con todos los proveedores, por ejemplo con Grupo SRZ.
- No cambies el formato: tiene que verse igual que las cartas de Jaume (mira "Estilo de la carta" más abajo).
- Rellena solo lo que está entre corchetes `[ ]`: fecha, nombre de la empresa, la frase inicial, las condiciones, la tabla de ejemplos y tu nombre.
- Adapta los textos al tipo de cliente:
  - Administración de fincas: dejar claro que es solo para reformas de viviendas particulares, no para obras de la comunidad.
  - Inmobiliaria: "cuando un cliente vuestro quiera reformar".
  - Empresa de reformas: indica el tipo de reforma que recibirá (integral, baño o cocina) y las condiciones acordadas por Jaume.
- Debe ocupar **una sola página**.
- Guárdala como PDF (en Chrome: Imprimir → Guardar como PDF, tamaño A4, sin encabezados ni pies de página) con el nombre `Carta-Pimen-Leads-NombreEmpresa.pdf`.

### 2. Tu propia firma

- La firma de Alex está en `firma-alex.html` y se ve en https://www.pimenleads.com/firma-alex.html
- Lleva tu nombre (Alex), el teléfono de Jaume (644 48 91 80) y comercial@pimenleads.com.
- Cópiala en Gmail desde Ajustes → Firma y añádela al final de cada correo.

## Estilo de la carta (obligatorio, igual en todas)

La carta siempre sigue este modelo. No la rediseñes ni cambies el orden: copia la plantilla y cambia solo el contenido.

- **Cabecera:** logo a la izquierda (cuatro cuadrados, tres verdes y uno amarillo) y "Pimen Leads" en verde `#0d5c58`, con una línea amarilla `#f0b429` debajo.
- **Datos:** debajo, en gris, la ciudad y la fecha, y "Para: nombre de la empresa".
- **Tipografía:** Helvetica o Arial, texto de 9,5 pt. Los títulos de cada apartado van en verde.
- **Orden de los apartados:** saludo y frase inicial → Quiénes somos → Cómo funciona o Cómo colaboraríamos → Qué os ofrecemos → Condiciones propuestas → Siguientes pasos → despedida → firma.
- **Condiciones propuestas:** dentro de un recuadro beis `#f7f4ec` con el borde izquierdo amarillo. Si hay ejemplos, en una tabla de dos columnas con borde fino y cabecera beis.
- **Pie:** firma (nombre, "Pimen Leads", correo y teléfono) y, debajo, "Pimen Leads · Barcelona" en gris.
- **Longitud:** una sola página A4.
- **Tono:** cordial, profesional y directo. Tutea o trata de "vosotros" igual que la plantilla.

## Reglas al escribir

- El correo termina solo con "Un saludo," y tu firma.
- No hablar de exclusividad.
- No decir que tenemos clientes ni que somos "los mejores" o "de confianza".
- No decir distancias en kilómetros: solo "Barcelona y alrededores".
- Las condiciones económicas las da Jaume. No las escribas en este repositorio, porque es público.
- Los correos los envía una persona: los borradores se revisan antes de enviar.
- El correo debe ser corto, cordial y profesional: se presenta, enlaza a https://www.pimenleads.com, resume el trato, remite a la carta adjunta y ofrece una llamada o una reunión.
- Pon el enlace de la web tal cual, sin enlaces largos.

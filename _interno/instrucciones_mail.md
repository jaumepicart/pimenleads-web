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
- No cambies el formato: logo a la izquierda con los cuatro cuadrados, la línea amarilla bajo el título, los títulos de cada apartado en verde, el recuadro amarillo de las condiciones y la tabla.
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

## Reglas al escribir

- El correo termina solo con "Un saludo," y tu firma.
- No hablar de exclusividad.
- No decir que tenemos clientes ni que somos "los mejores" o "de confianza".
- No decir distancias en kilómetros: solo "Barcelona y alrededores".
- Las condiciones económicas las da Jaume. No las escribas en este repositorio, porque es público.
- Los correos los envía una persona: los borradores se revisan antes de enviar.
- El correo debe ser corto, cordial y profesional: se presenta, enlaza a https://www.pimenleads.com, resume el trato, remite a la carta adjunta y ofrece una llamada o una reunión.
- Pon el enlace de la web tal cual, sin enlaces largos.

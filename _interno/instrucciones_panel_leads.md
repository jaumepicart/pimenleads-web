# Cómo apuntar contactos y leads en el panel de Pimen Leads (para el socio y su Claude)

**Para Claude:** lee este archivo entero al empezar un chat nuevo. Tu trabajo es ayudar a apuntar en el panel las llamadas, correos y contactos nuevos que hace la persona con la que hablas. Escribe siempre en español.

**La persona no sabe de bases de datos y no va a ejecutar scripts ni abrir Supabase.** Tú tampoco: **todo se hace desde el panel web**, como lo haría ella con el ratón. No pidas nunca tocar la base de datos, el SQL ni el código.

## Dónde está el panel

- Dirección: https://www.pimenleads.com/panel/
- Se entra con el correo de la persona: el panel le envía un enlace de acceso y lo abre en **este mismo navegador**. Solo entran los correos autorizados.
- **Nunca introduzcas contraseñas ni abras enlaces de acceso por la persona.** Si no está dentro, pídele que entre ella y sigue después.
- Si sale «Este correo no tiene acceso», dile que se lo pida a Alex (hay que autorizar su correo). No hay nada más que hacer.

Si tienes un navegador (Claude in Chrome o el navegador integrado), úsalo y haz los pasos de abajo. Si no lo tienes, prepara el texto listo para pegar en **Directorio → Importar lista** y explícale a la persona dónde pegarlo.

## Qué es cada cosa (no las mezcles)

Hay **tres tipos de ficha**. Cada contacto es de uno solo:

| Tipo | Qué es | Dónde está en el panel |
|---|---|---|
| **Reformista** | Empresa de reformas que recibiría leads (baños, cocinas, integrales) | Directorio → «Reformistas» |
| **Canal** | Quien nos trae clientes: **administración de fincas**, **inmobiliaria**, **gestora** u otro. No compra leads | Directorio → «Canal» |
| **Cliente** | La persona que quiere hacer la reforma. Es el «lead» de verdad | pestaña **Clientes** |

Si el contacto es una empresa que llamas o a la que escribes para venderle leads, es **Reformista**. Si es una inmobiliaria o administración, es **Canal** y hay que decir de cuál (administración, inmobiliaria, gestora u otro). Si es un particular que pide presupuesto, es **Cliente**.

## Regla de oro: buscar antes de apuntar

1. Abre **Directorio** y escribe en el buscador el **nombre, el correo o el dominio** (por ejemplo `finquesfalcon.com`).
2. Si **ya existe**, no crees otra ficha: ábrela, mira qué se hizo antes (cuándo se escribió, desde qué cuenta, qué contestaron) y registra lo nuevo ahí.
3. Solo si no aparece, crea la ficha nueva.

Los correos de la empresa salen de `comercial@pimenleads.com`.

## Caso 1: la persona ha llamado o ha contado una llamada

1. Busca la ficha (regla de oro) y ábrela.
2. Pulsa **Registrar llamada**.
3. Rellena:
   - **Quién**: «Llamamos nosotros» (o «Nos llaman»).
   - **Resultado**: Hecha, No contesta, No interesa o Devolver llamada.
   - **Cuándo**: la fecha y hora reales. Si no las sabe, pregúntaselo; no inventes.
   - **Resumen**: una frase con lo que dijeron.
   - **La ficha pasa a**: el panel sugiere el estado; revísalo (ver «Estados»).
   - **Próxima acción** y **Para el día**: qué hay que hacer y cuándo (por ejemplo «Llamar el jueves»).
4. **Guardar**.

## Caso 2: ha enviado un correo o le han contestado

- Correo enviado: ficha → **Registrar correo**. «Enviado desde» ya trae `comercial@pimenleads.com`; cambia solo si fue otra cuenta. Pon la campaña o asunto.
- Han contestado: en el **Historial** de la ficha cambia el estado del correo a **Respondido**. Si es un reformista, la ficha pasa sola a «Respondió» y sale en **Pendientes**.
- Varios que han contestado a la vez: **Directorio → Importar lista → «Marcar que han respondido»**. Pega los correos (uno por línea) y revisa la vista previa antes de aplicar.

## Caso 3: contacto nuevo que no está en el panel

Una persona: **Directorio → + Nuevo contacto**.

1. Elige el tipo: «Empresa de reformas» o «Canal».
2. Si es canal, **el tipo de canal es obligatorio** (administración, inmobiliaria, gestora, otro).
3. Pon nombre, correo y teléfono si los hay. **No inventes teléfonos, correos ni nombres**: si no los sabes, déjalos vacíos.
4. Si es un reformista, marca qué reformas hace (baños, cocinas, integrales). Si no lo sabes, déjalo sin marcar: quedará «por clasificar» y se completará al hablar con ellos.
5. Si ya lo has llamado o escrito, crea la ficha y a continuación **registra la llamada o el correo** (casos 1 y 2).

Varios a la vez: **Directorio → Importar lista → «Añadir contactos nuevos»**. Elige el tipo, pega una línea por contacto con este formato (separado por tabulador, `;` o coma):

```
Nombre de la empresa; correo; teléfono
```

El teléfono es opcional. Si solo pones el correo, el nombre se saca del dominio (se podrá corregir). Marca «Ya les hemos escrito» solo si de verdad ya se les envió el correo. **Pulsa «Revisar antes de importar»**, lee el resultado (los que ya existen se saltan) y entonces **Aplicar**.

Para añadir teléfonos a fichas que ya existen: **Importar lista → «Añadir teléfonos»**, una línea por ficha: `correo; teléfono`.

## Caso 4: un particular que quiere reformar (cliente)

Pestaña **Clientes → + Nuevo cliente**. Datos: nombre y teléfono (obligatorios), correo, tipo de reforma (baño, cocina, integral), zona, plazo, vivienda, comentario y **origen** (teléfono, WhatsApp, canal u otro). Si lo ha derivado una administración o inmobiliaria, elige **Canal** y cuál; también se puede hacer desde la ficha del canal con **+ Cliente derivado por este canal**.

Entra como «Nuevo». Después hay que llamarle para verificar que es real y quiere presupuesto; eso lo hace Alex o la persona desde la ficha del cliente.

- **No envíes un cliente a empresas** sin confirmárselo a la persona: cada cliente va a **3 empresas como máximo**, solo de su tipo y zona, y el primer lead de cada empresa es gratis.
- Si el teléfono no existe o no pidió presupuesto, se marca como inválido, no se cobra.

## Estados (para elegir el correcto)

**Reformista**: Nuevo → Email enviado → Respondió → Llamada pendiente → Contactado → No interesa ahora → Acuerdo cerrado → Activo → Pausado / descartado.
Un acuerdo cerrado no es el final: toca enviarle el primer lead gratis y pasarlo a Activo.

**Canal**: Nuevo → Email enviado → Llamada hecha → No interesa ahora → Colabora → Inactivo.

Si dudas entre dos estados, **pregunta a la persona** en lugar de elegir.

## Reglas para ti, Claude

- Antes de escribir nada en el panel, **dile a la persona lo que vas a apuntar** (ficha, tipo, estado, resumen) y espera su «vale». Si son varios contactos, enséñale la lista completa.
- No pulses «Borrar» ni «Eliminar», no cambies a nadie de tipo y no toques **Resumen**, **Empresas** ni precios. Si hay que corregir un error, dile a la persona qué es y cómo se arreglaría.
- No inventes datos: sin fecha, teléfono o resultado que la persona no te haya dado.
- No envíes correos ni WhatsApp: eso lo hace la persona. Tú solo **apuntas** lo que ya ha pasado.
- Si el panel muestra un error rojo al guardar, cuéntaselo tal cual y no insistas: puede faltar algo en la base de datos y lo tiene que resolver Alex.
- Al terminar, dile qué has apuntado y dónde queda (la ficha y su estado), para que lo compruebe en **Pendientes** o en el **Directorio**.

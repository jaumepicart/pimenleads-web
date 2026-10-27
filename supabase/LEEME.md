# Panel interno: puesta en marcha

El panel está en `/panel/` (por ejemplo, https://www.pimenleads.com/panel/). Guarda los leads en Supabase y
solo pueden entrar los correos que estén en la tabla `admins`.

## 1. Crear el proyecto en Supabase

En https://supabase.com/dashboard crea un proyecto nuevo:

- Nombre: `pimenleads`
- Región: una de la Unión Europea (por ejemplo *West EU (Paris)*), por el RGPD.

## 2. Crear las tablas

En **SQL Editor**, pega y ejecuta todo el contenido de [`schema.sql`](schema.sql).

## 3. Dar acceso a los socios

En **SQL Editor**, ejecuta lo mismo que hay en [`admins.example.sql`](admins.example.sql), pero con vuestros correos reales.
No guardéis los correos en este repositorio: es público.

```sql
insert into public.admins (email) values ('tu-correo@ejemplo.com'), ('correo-del-socio@ejemplo.com');
```

Los correos van en minúsculas.

## 4. Configurar el enlace de acceso

En **Authentication → URL Configuration**:

- **Site URL**: `https://www.pimenleads.com/panel/`
- **Redirect URLs**: añade `https://www.pimenleads.com/panel/` y, para probar en local, `http://localhost:8765/panel/`

Si no se configura, el enlace del correo os llevará a una dirección que no existe.

## 5. Conectar la web

En **Project Settings → API Keys** (o con el botón **Connect**) copia:

- la **Project URL** (`https://xxxx.supabase.co`)
- la **publishable key** (`sb_publishable_…`) o, si no aparece, la clave `anon`

y pégalas en [`assets/config.js`](../assets/config.js). Esta clave es pública por diseño: con ella solo se pueden
enviar solicitudes; leer los leads exige entrar en el panel con un correo autorizado.
**Nunca** pongas ahí la clave `service_role` ni la `secret`.

## 6. Avisos por Telegram (opcional, recomendado)

Cada lead nuevo, y cada empresa que pide su primer lead desde el formulario, manda al momento un mensaje
a Telegram con el tipo de reforma, zona, plazo, nombre y el enlace al panel. Las empresas que dais de alta
vosotros desde el panel no avisan.

1. En Telegram, habla con **@BotFather**, escribe `/newbot` y sigue los pasos. Te dará un **token** (`123456789:AA…`).
2. Escribe cualquier cosa al bot (o crea un grupo con los socios, añade el bot y escribe en el grupo).
3. En **SQL Editor**, guarda el token en Vault. **Nunca** lo pongas en este repositorio: es público.

   ```sql
   select vault.create_secret('TOKEN_DEL_BOT', 'telegram_bot_token');
   ```

4. Averigua el `chat_id`: ejecuta la primera consulta, espera un par de segundos y ejecuta la segunda.

   ```sql
   select net.http_get('https://api.telegram.org/bot' || (select decrypted_secret from vault.decrypted_secrets
     where name = 'telegram_bot_token') || '/getUpdates');
   ```

   ```sql
   select distinct u -> 'message' -> 'chat' ->> 'id' as chat_id, u -> 'message' -> 'chat' ->> 'title' as grupo
   from net._http_response r, jsonb_array_elements(r.content::jsonb -> 'result') u
   where r.id = (select max(id) from net._http_response);
   ```

   Si sale vacío, escribe otra vez al bot y repite. En un grupo el `chat_id` empieza por `-`.

5. Guarda el `chat_id` y ejecuta todo el contenido de [`avisos.sql`](avisos.sql):

   ```sql
   select vault.create_secret('CHAT_ID', 'telegram_chat_id');
   ```

Para cambiar de chat más adelante: `select vault.update_secret((select id from vault.secrets where name = 'telegram_chat_id'), 'NUEVO_CHAT_ID');`

Si el aviso falla (Telegram caído, token mal puesto…), el lead se guarda igual. Las respuestas de Telegram
quedan unas horas en `net._http_response` por si hay que revisar qué ha pasado.

## 7. Seguimiento de prospección (llamadas, correos, reformistas y canal)

Las pestañas **Pendientes** y **Directorio** del panel necesitan dos tablas más. En **SQL Editor**:

1. Ejecuta todo el contenido de [`prospeccion.sql`](prospeccion.sql).
2. Carga los contactos ya escritos con `privado/prospeccion-datos.sql` (112 fichas: 22 administraciones de fincas,
   9 inmobiliarias y 81 empresas de reformas). Ese archivo **no está en git** (lleva correos de terceros y el
   repositorio es público): pásalo entre vosotros por otro medio. Si la tabla ya tiene datos, se cancela sola.
3. Si ya tenías los avisos de Telegram, vuelve a ejecutar [`avisos.sql`](avisos.sql): ahora los clientes que
   dais de alta vosotros desde el panel tampoco avisan.

Hasta que no ejecutes el paso 1, el resto del panel funciona igual y esas pestañas avisan de que faltan las tablas.

Reglas del modelo: las fichas son de **dos tipos** (reformista y canal; el canal exige tipo: administración,
inmobiliaria, gestora u otro) y los **clientes finales** son los leads de siempre. Cada correo, llamada o WhatsApp
queda en el historial de la ficha. En los datos importados la fecha de envío no estaba en el documento, así que
aparece «sin fecha anotada».

## Cómo funciona

- Los formularios de la web envían cada solicitud a la base de datos **y** a Formspree (correo). Basta con que llegue a uno de los dos.
- Particulares → tabla `leads`. Empresas que piden el primer lead → tabla `empresas`, con estado *Interesada*.
- En el panel: verificas el lead (llamada), lo asignas a hasta 3 empresas, se lo mandas por WhatsApp con un clic
  y vas marcando resultado, devoluciones y cobros.
- El primer lead de cada empresa se pone a 0 € solo; los siguientes, al precio que tenga la empresa para ese tipo de reforma.

## Límites a tener en cuenta

- El correo de acceso que manda Supabase sin configurar nada está limitado a unos pocos envíos por hora.
  Para dos personas basta; si se queda corto, configura vuestro correo en **Authentication → Emails → SMTP Settings**.
- El plan gratuito de Supabase pausa el proyecto tras una semana sin actividad. Con leads entrando a diario no pasa,
  pero si se pausa hay que reactivarlo desde el panel de Supabase.

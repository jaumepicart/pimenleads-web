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

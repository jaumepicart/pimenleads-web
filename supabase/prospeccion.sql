-- Pimen Leads · seguimiento de prospección (llamadas, correos y fichas de reformistas y canal).
--
-- Tablas:
--   contactos      a quién escribimos o llamamos: proveedor (empresa de reformas) o canal (administración de fincas,
--                  inmobiliaria, gestora, otro). Los clientes finales siguen siendo la tabla leads.
--   interacciones  timeline de cada ficha: cada correo, llamada o WhatsApp, con su estado
--
-- Se puede ejecutar más de una vez sin problema.
-- La carga de los 112 contactos ya escritos va aparte (privado/prospeccion-datos.sql, no está en git).

create table if not exists public.contactos (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  tipo text not null check (tipo in ('proveedor', 'canal')),
  subtipo text check (subtipo in ('administracion', 'inmobiliaria', 'gestora', 'otro')),  -- solo canal
  reformas text[] not null default '{}'
    check (reformas <@ array['bano', 'cocina', 'integral']::text[]),                      -- solo proveedor; vacío = por clasificar
  nombre text not null,
  nombre_derivado boolean not null default false,       -- el nombre se sacó del dominio y hay que confirmarlo
  contacto text,
  email text,
  dominio text generated always as (nullif(split_part(lower(email), '@', 2), '')) stored,
  telefono text,
  estado text not null default 'nuevo',
  proxima_accion text,
  proxima_fecha date,
  notas text,
  empresa_id bigint references public.empresas (id) on delete set null,  -- ficha de empresa que recibe leads
  -- Canal exige subtipo; proveedor no lo lleva.
  check ((tipo = 'canal') = (subtipo is not null)),
  check (tipo = 'proveedor' or reformas = '{}'),
  -- Cada tipo tiene su propio embudo.
  check (case tipo
    when 'proveedor' then estado in ('nuevo', 'email_enviado', 'respondio', 'llamada_pendiente', 'contactado',
                                      'no_interesa', 'acuerdo_cerrado', 'activo', 'pausado')
    else estado in ('nuevo', 'email_enviado', 'llamada_hecha', 'no_interesa', 'colabora', 'inactivo')
  end)
);

create table if not exists public.interacciones (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  contacto_id bigint not null references public.contactos (id) on delete cascade,
  canal text not null check (canal in ('email', 'llamada', 'whatsapp')),
  direccion text not null default 'saliente' check (direccion in ('saliente', 'entrante')),
  ocurrio_at timestamptz default now(),                 -- null = fecha no anotada (datos importados)
  desde text,                                           -- cuenta desde la que salió el correo
  campana text,                                         -- campaña o asunto
  estado text not null,
  resumen text,
  check (case canal
    when 'email' then estado in ('enviado', 'respondido', 'sin_respuesta', 'rebotado')
    when 'llamada' then estado in ('pendiente', 'hecha', 'no_contesta', 'no_interesa', 'devolver_llamada')
    else estado in ('enviado', 'respondido', 'pendiente')
  end)
);

create index if not exists contactos_tipo_estado on public.contactos (tipo, estado);
create index if not exists contactos_email on public.contactos (lower(email));
create index if not exists contactos_dominio on public.contactos (dominio);
create index if not exists interacciones_contacto on public.interacciones (contacto_id, ocurrio_at desc);

drop trigger if exists contactos_actualizado on public.contactos;
create trigger contactos_actualizado before update on public.contactos
for each row execute function public.tocar_lead();

-- Cliente final derivado por un canal (administración, inmobiliaria…).
alter table public.leads add column if not exists canal_id bigint references public.contactos (id) on delete set null;
create index if not exists leads_canal on public.leads (canal_id);

-- ── Permisos ────────────────────────────────────────────────────────────

alter table public.contactos enable row level security;
alter table public.interacciones enable row level security;
revoke all on public.contactos, public.interacciones from anon;

drop policy if exists "admins gestionan contactos" on public.contactos;
create policy "admins gestionan contactos" on public.contactos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
drop policy if exists "admins gestionan interacciones" on public.interacciones;
create policy "admins gestionan interacciones" on public.interacciones
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

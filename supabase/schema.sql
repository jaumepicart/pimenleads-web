-- Pimen Leads · base de datos del panel interno (Supabase / Postgres).
--
-- Tablas:
--   leads     solicitudes de particulares que llegan desde las landings
--   empresas  empresas de reformas (las que piden el primer lead entran como "interesada")
--   envios    a qué empresas se ha enviado cada lead (máximo 3), con precio, resultado y cobro
--   admins    correos que pueden entrar al panel
--
-- La web pública solo puede llamar a recibir_solicitud(); no puede leer ni tocar las tablas.
-- Todo lo demás exige haber entrado en el panel con un correo de la tabla admins.

-- ── Acceso ──────────────────────────────────────────────────────────────

create table public.admins (
  email text primary key check (email = lower(email))
);

create function public.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where email = lower(auth.jwt() ->> 'email'));
$$;

-- ── Tablas ──────────────────────────────────────────────────────────────

create table public.empresas (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  nombre text not null,
  contacto text,
  email text,
  telefono text,
  tipos text[] not null default '{}',          -- 'bano', 'cocina', 'integral'
  zonas text,
  capacidad text,
  estado text not null default 'interesada'
    check (estado in ('interesada', 'prueba', 'activa', 'pausada', 'baja')),
  precio_bano numeric(8, 2),
  precio_cocina numeric(8, 2),
  precio_integral numeric(8, 2),
  mensaje text,                                 -- lo que escribieron en el formulario
  notas text,
  origen jsonb not null default '{}'
);

create table public.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  tipo text not null check (tipo in ('bano', 'cocina', 'integral', 'otro')),
  reforma text,
  plazo text,
  vivienda text,
  zona text,
  nombre text not null,
  telefono text not null,
  email text,
  mensaje text,
  consentimiento text,
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'verificado', 'descartado', 'enviado', 'cerrado')),
  motivo_descarte text,
  notas text,
  origen jsonb not null default '{}'            -- pagina, utm_*, gclid, fbclid, referrer
);

create table public.envios (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  lead_id bigint not null references public.leads (id) on delete cascade,
  empresa_id bigint not null references public.empresas (id) on delete restrict,
  precio numeric(8, 2) not null,                -- si no se indica, lo pone el trigger
  resultado text not null default 'pendiente'
    check (resultado in ('pendiente', 'contactado', 'presupuestado', 'ganado', 'perdido')),
  devolucion text not null default 'no'
    check (devolucion in ('no', 'solicitada', 'aceptada', 'rechazada')),
  cobrado boolean not null default false,
  notas text,
  unique (lead_id, empresa_id)
);

create index leads_estado_fecha on public.leads (estado, created_at desc);
create index leads_telefono on public.leads (telefono);
create index envios_empresa on public.envios (empresa_id);

-- ── Reglas de negocio ───────────────────────────────────────────────────

create function public.tocar_lead() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.actualizado_at := now();
  return new;
end $$;

create trigger leads_actualizado before update on public.leads
for each row execute function public.tocar_lead();

-- Antes de crear un envío: máximo 3 empresas por lead y precio por defecto
-- (0 € si es el primer lead de la empresa; si no, su precio para ese tipo de reforma).
create function public.preparar_envio() returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_tipo text;
  v_empresa public.empresas;
begin
  select tipo into v_tipo from public.leads where id = new.lead_id for update;
  if (select count(*) from public.envios where lead_id = new.lead_id) >= 3 then
    raise exception 'Este lead ya se ha enviado a 3 empresas';
  end if;
  if new.precio is null then
    select * into v_empresa from public.empresas where id = new.empresa_id;
    if not exists (select 1 from public.envios where empresa_id = new.empresa_id) then
      new.precio := 0;
    else
      new.precio := coalesce(case v_tipo
        when 'bano' then v_empresa.precio_bano
        when 'cocina' then v_empresa.precio_cocina
        when 'integral' then v_empresa.precio_integral
      end, 0);
    end if;
  end if;
  return new;
end $$;

create trigger envios_preparar before insert on public.envios
for each row execute function public.preparar_envio();

-- Mantiene el estado del lead: "enviado" al tener envíos, vuelve a "verificado" si se quitan todos.
create function public.sincronizar_estado_lead() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.leads set estado = 'enviado'
    where id = new.lead_id and estado in ('nuevo', 'verificado');
    return new;
  end if;
  update public.leads set estado = 'verificado'
  where id = old.lead_id and estado = 'enviado'
    and not exists (select 1 from public.envios where lead_id = old.lead_id);
  return old;
end $$;

create trigger envios_estado_lead after insert or delete on public.envios
for each row execute function public.sincronizar_estado_lead();

-- ── Entrada desde la web pública ────────────────────────────────────────

-- Recibe un formulario de la web. Particulares → leads; empresas → empresas (como "interesada").
create function public.recibir_solicitud(datos jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_origen jsonb;
  v_nombre text := left(nullif(trim(datos ->> 'nombre'), ''), 200);
  v_tel text := left(nullif(trim(datos ->> 'telefono'), ''), 40);
begin
  -- Campo trampa para bots: si viene relleno, se ignora sin dar error.
  if coalesce(datos ->> '_gotcha', '') <> '' then
    return;
  end if;
  v_origen := coalesce(datos -> 'origen', '{}'::jsonb);
  if jsonb_typeof(v_origen) <> 'object' or length(v_origen::text) > 2000 then
    v_origen := '{}'::jsonb;
  end if;

  if datos ->> 'tipo_solicitud' = 'empresa' then
    if nullif(trim(datos ->> 'empresa'), '') is null or nullif(trim(datos ->> 'email'), '') is null then
      raise exception 'Faltan datos obligatorios';
    end if;
    insert into public.empresas (nombre, contacto, email, telefono, tipos, zonas, capacidad, mensaje, origen)
    values (
      left(trim(datos ->> 'empresa'), 200),
      v_nombre,
      left(lower(trim(datos ->> 'email')), 200),
      v_tel,
      array(
        select case r when 'Baños' then 'bano' when 'Cocinas' then 'cocina' when 'Reformas integrales' then 'integral' end
        from jsonb_array_elements_text(coalesce(datos -> 'reformas', '[]'::jsonb)) as r
        where r in ('Baños', 'Cocinas', 'Reformas integrales')
      ),
      left(datos ->> 'zona_trabajo', 300),
      left(datos ->> 'capacidad', 50),
      left(datos ->> 'mensaje', 2000),
      v_origen
    );
  else
    if v_nombre is null or v_tel is null then
      raise exception 'Faltan datos obligatorios';
    end if;
    insert into public.leads (tipo, reforma, plazo, vivienda, zona, nombre, telefono, email, mensaje, consentimiento, origen)
    values (
      case when datos ->> 'tipo' in ('bano', 'cocina', 'integral') then datos ->> 'tipo' else 'otro' end,
      left(datos ->> 'reforma', 200),
      left(datos ->> 'plazo', 100),
      left(datos ->> 'vivienda', 100),
      left(datos ->> 'zona', 200),
      v_nombre,
      v_tel,
      left(lower(trim(datos ->> 'email')), 200),
      left(datos ->> 'mensaje', 2000),
      left(datos ->> 'consentimiento', 300),
      v_origen
    );
  end if;
end $$;

-- ── Permisos ────────────────────────────────────────────────────────────

alter table public.admins enable row level security;
alter table public.empresas enable row level security;
alter table public.leads enable row level security;
alter table public.envios enable row level security;

revoke all on public.admins, public.empresas, public.leads, public.envios from anon;
revoke all on function public.recibir_solicitud(jsonb) from public;
grant execute on function public.recibir_solicitud(jsonb) to anon, authenticated;
revoke all on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

create policy "admins se ven a sí mismos" on public.admins
  for select to authenticated using (public.es_admin());
create policy "admins gestionan empresas" on public.empresas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admins gestionan leads" on public.leads
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admins gestionan envios" on public.envios
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

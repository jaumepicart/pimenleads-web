-- Pimen Leads · ampliación del CRM. Ejecutar en el SQL Editor DESPUÉS de schema.sql y prospeccion.sql.
--
--   1. Asignación estricta: un lead solo se envía a empresas activas o en prueba que hagan ese tipo de reforma.
--   2. Reformista y empresa se mantienen sincronizados (estado y tipos de reforma).
--   3. Clientes: estado «por verificar» y historial de llamadas y mensajes también en los leads.

-- ── 1. Asignación estricta + máximo 3 empresas ─────────────────────────

create or replace function public.preparar_envio() returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_tipo text;
  v_empresa public.empresas;
begin
  select tipo into v_tipo from public.leads where id = new.lead_id for update;
  select * into v_empresa from public.empresas where id = new.empresa_id;
  if v_empresa.estado not in ('activa', 'prueba') then
    raise exception 'Solo se puede enviar a empresas activas o en prueba';
  end if;
  if v_tipo <> 'otro' and not (v_tipo = any (v_empresa.tipos)) then
    raise exception '% no hace este tipo de reforma. Complétalo en su ficha si es un error.', v_empresa.nombre;
  end if;
  if (select count(*) from public.envios where lead_id = new.lead_id) >= 3 then
    raise exception 'Este lead ya se ha enviado a 3 empresas';
  end if;
  if new.precio is null then
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

-- ── 2. Sincronía reformista ↔ empresa ──────────────────────────────────
-- Cada cambio solo se propaga si deja un valor distinto, para no entrar en bucle.

create function public.sync_contacto_a_empresa() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_estado text;
  v_tipos text[];
begin
  if new.empresa_id is null then
    return null;
  end if;
  select estado, tipos into v_estado, v_tipos from public.empresas where id = new.empresa_id;
  if new.estado = 'activo' then v_estado := 'activa';
  elsif new.estado = 'pausado' then v_estado := 'pausada';
  end if;
  if cardinality(new.reformas) > 0 then v_tipos := new.reformas; end if;
  update public.empresas set estado = v_estado, tipos = v_tipos
  where id = new.empresa_id and (estado is distinct from v_estado or tipos is distinct from v_tipos);
  return null;
end $$;

create function public.sync_empresa_a_contacto() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_estado text;
  v_reformas text[];
begin
  for r in select id, estado, reformas from public.contactos where empresa_id = new.id and tipo = 'proveedor' loop
    v_estado := case new.estado when 'activa' then 'activo' when 'pausada' then 'pausado' when 'baja' then 'pausado' else r.estado end;
    v_reformas := case when cardinality(new.tipos) > 0 then new.tipos else r.reformas end;
    if v_estado is distinct from r.estado or v_reformas is distinct from r.reformas then
      update public.contactos set estado = v_estado, reformas = v_reformas where id = r.id;
    end if;
  end loop;
  return null;
end $$;

revoke all on function public.sync_contacto_a_empresa(), public.sync_empresa_a_contacto() from public, anon, authenticated;

create trigger contactos_sync_empresa after update of estado, reformas, empresa_id on public.contactos
for each row execute function public.sync_contacto_a_empresa();
create trigger empresas_sync_contacto after update of estado, tipos on public.empresas
for each row execute function public.sync_empresa_a_contacto();

-- ── 3. Clientes: «por verificar» e historial ───────────────────────────

alter table public.leads drop constraint if exists leads_estado_check;
alter table public.leads add constraint leads_estado_check
  check (estado in ('nuevo', 'por_verificar', 'verificado', 'descartado', 'enviado', 'cerrado'));

create or replace function public.sincronizar_estado_lead() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.leads set estado = 'enviado'
    where id = new.lead_id and estado in ('nuevo', 'por_verificar', 'verificado');
    return new;
  end if;
  update public.leads set estado = 'verificado'
  where id = old.lead_id and estado = 'enviado'
    and not exists (select 1 from public.envios where lead_id = old.lead_id);
  return old;
end $$;

-- Una interacción pertenece a una ficha de contacto o a un cliente, nunca a las dos.
alter table public.interacciones alter column contacto_id drop not null;
alter table public.interacciones add column lead_id bigint references public.leads (id) on delete cascade;
alter table public.interacciones add constraint interacciones_un_dueno check ((contacto_id is null) <> (lead_id is null));
create index interacciones_lead on public.interacciones (lead_id, ocurrio_at desc);

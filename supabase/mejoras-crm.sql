-- Pimen Leads · mejoras del seguimiento: hora de llamada, avisos por persona y fusión de fichas.
--
-- · contactos.proxima_hora      hora de la próxima acción (opcional)
-- · admins.telegram_chat_id     chat de Telegram de cada persona; si lo tiene, recibe su resumen diario aparte
-- · fusionar_contactos()        junta dos fichas duplicadas (el historial pasa a la que se conserva)
--
-- Requiere asignacion.sql. Se puede ejecutar más de una vez.

alter table public.contactos add column if not exists proxima_hora time;
alter table public.admins add column if not exists telegram_chat_id text;

-- ── Telegram: ahora se puede indicar el chat de destino ─────────────────

drop function if exists public.avisar_telegram(text);
create or replace function public.avisar_telegram(texto text, chat text default null) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_token text;
  v_chat text;
begin
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'telegram_bot_token';
  v_chat := coalesce(nullif(chat, ''), (select decrypted_secret from vault.decrypted_secrets where name = 'telegram_chat_id'));
  if v_token is null or v_chat is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body := jsonb_build_object('chat_id', v_chat, 'text', left(texto, 4000), 'disable_web_page_preview', true),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
exception when others then
  raise warning 'Aviso de Telegram no enviado: %', sqlerrm;
end $$;

revoke all on function public.avisar_telegram(text, text) from public, anon, authenticated;

-- ── Resumen diario: cada persona con chat propio recibe lo suyo ─────────
-- El chat común recibe lo general, lo sin asignar y lo de quien no tenga chat propio.

create or replace function public.avisar_pendientes() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_leads int;
  v_invalidos int;
  v_comun text := '';
  v_compartido text := '';
  v_pers jsonb := '{}'::jsonb;
  v_con_resp boolean;
  v_chat text;
  k text;
  v_linea text;
  r record;
begin
  select count(*) into v_leads from public.leads where estado in ('nuevo', 'por_verificar');
  if v_leads > 0 then
    v_comun := v_comun || e'\n• Clientes por verificar: ' || v_leads;
  end if;

  select count(*) into v_invalidos from public.leads l
  where l.estado = 'descartado' and exists (select 1 from public.envios e where e.lead_id = l.id and not e.avisada);
  if v_invalidos > 0 then
    v_comun := v_comun || e'\n• Leads inválidos: avisar a las empresas (7 días): ' || v_invalidos;
  end if;

  select exists (select 1 from public.contactos where responsable is not null) into v_con_resp;

  for r in
    select responsable, titulo, string_agg(nombre, ', ' order by nombre) as nombres
    from (
      select 1 as orden, 'Llamada pendiente' as titulo, nombre, responsable from public.contactos where tipo = 'proveedor' and estado = 'llamada_pendiente'
      union all select 2, 'Respondieron, hay que llamar', nombre, responsable from public.contactos where tipo = 'proveedor' and estado = 'respondio'
      union all select 3, 'Acuerdo cerrado: mandar primer lead', nombre, responsable from public.contactos where tipo = 'proveedor' and estado = 'acuerdo_cerrado'
      union all select 4, 'Canal a la espera tras llamada', nombre, responsable from public.contactos where tipo = 'canal' and estado = 'llamada_hecha'
      union all select 5, 'Seguimiento de hoy o vencido',
        nombre || coalesce(' (' || proxima_accion || coalesce(' ' || to_char(proxima_hora, 'HH24:MI'), '') || ')', ''), responsable from public.contactos
        where proxima_fecha <= current_date and estado not in ('no_interesa', 'pausado', 'inactivo')
    ) t
    group by responsable, orden, titulo
    order by orden
  loop
    k := coalesce(r.responsable, '');
    v_linea := e'\n• ' || r.titulo || ': ' || r.nombres;
    v_pers := jsonb_set(v_pers, array[k], to_jsonb(coalesce(v_pers ->> k, '') || v_linea), true);
  end loop;

  for k in select key from jsonb_object_keys(v_pers) as key order by key = '', key loop
    select telegram_chat_id into v_chat from public.admins where email = k;
    if nullif(v_chat, '') is not null then
      perform public.avisar_telegram('📋 Pendientes de hoy' || v_comun || (v_pers ->> k) || e'\nhttps://www.pimenleads.com/panel/#pendientes', v_chat);
    else
      if v_con_resp then
        v_compartido := v_compartido || e'\n\n👤 ' || coalesce(initcap(nullif(split_part(k, '@', 1), '')), 'Sin asignar');
      end if;
      v_compartido := v_compartido || (v_pers ->> k);
    end if;
  end loop;

  if v_comun <> '' or v_compartido <> '' then
    perform public.avisar_telegram('📋 Pendientes de hoy' || v_comun || v_compartido || e'\nhttps://www.pimenleads.com/panel/#pendientes');
  end if;
exception when others then
  raise warning 'Resumen de pendientes no enviado: %', sqlerrm;
end $$;

revoke all on function public.avisar_pendientes() from public, anon, authenticated;

-- ── Fusionar dos fichas duplicadas ──────────────────────────────────────
-- La ficha «origen» desaparece: su historial, sus clientes derivados y sus datos pasan a «destino».
-- Los datos que destino ya tiene se respetan; si el correo o el teléfono difieren, se anotan en las notas.

create or replace function public.fusionar_contactos(origen bigint, destino bigint) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  o public.contactos;
  d public.contactos;
  v_notas text;
begin
  if not public.es_admin() then
    raise exception 'Solo los administradores pueden fusionar fichas';
  end if;
  if origen = destino then
    raise exception 'Elige dos fichas distintas';
  end if;
  select * into o from public.contactos where id = origen;
  select * into d from public.contactos where id = destino;
  if o.id is null or d.id is null then
    raise exception 'Alguna de las fichas ya no existe';
  end if;
  if o.tipo <> d.tipo then
    raise exception 'Solo se pueden fusionar fichas del mismo tipo';
  end if;

  v_notas := concat_ws(e'\n', nullif(d.notas, ''), nullif(o.notas, ''),
    case when o.email is not null and d.email is not null and lower(o.email) <> lower(d.email) then 'Otro correo: ' || o.email end,
    case when o.telefono is not null and d.telefono is not null and o.telefono <> d.telefono then 'Otro teléfono: ' || o.telefono end);

  update public.interacciones set contacto_id = destino where contacto_id = origen;
  update public.leads set canal_id = destino where canal_id = origen;
  delete from public.contactos where id = origen;

  update public.contactos set
    contacto = coalesce(d.contacto, o.contacto),
    email = coalesce(d.email, o.email),
    telefono = coalesce(d.telefono, o.telefono),
    notas = nullif(v_notas, ''),
    empresa_id = coalesce(d.empresa_id, o.empresa_id),
    responsable = coalesce(d.responsable, o.responsable),
    reformas = (select coalesce(array_agg(distinct x order by x), '{}') from unnest(d.reformas || o.reformas) as x),
    proxima_accion = coalesce(d.proxima_accion, o.proxima_accion),
    proxima_fecha = case when d.proxima_accion is null then coalesce(d.proxima_fecha, o.proxima_fecha) else d.proxima_fecha end,
    proxima_hora = case when d.proxima_accion is null then coalesce(d.proxima_hora, o.proxima_hora) else d.proxima_hora end,
    nombre_derivado = d.nombre_derivado and o.nombre_derivado
  where id = destino;
  return destino;
end $$;

revoke all on function public.fusionar_contactos(bigint, bigint) from public, anon;
grant execute on function public.fusionar_contactos(bigint, bigint) to authenticated;

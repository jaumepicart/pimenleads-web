-- Pimen Leads · asignación de fichas (a quién le toca llamar a cada contacto).
--
-- · contactos.responsable   correo del administrador al que le toca la ficha (null = sin asignar)
-- · repartir_contactos()    reparte las fichas sin asignar a partes iguales (por tipo), desde el botón del panel
-- · avisar_pendientes()     el resumen diario de Telegram pasa a agrupar los pendientes por responsable
--
-- Quién hizo cada llamada ya se guarda en interacciones.autor (crm-ampliacion.sql); no hace falta nada más.
-- Requiere haber ejecutado antes prospeccion.sql y recordatorios.sql. Se puede ejecutar más de una vez.

alter table public.contactos
  add column if not exists responsable text references public.admins (email) on update cascade on delete set null;
create index if not exists contactos_responsable on public.contactos (responsable);

-- Reparte las fichas sin responsable entre los correos dados, alternando dentro de cada tipo
-- (así cada persona recibe una parte de reformistas y otra de canal). Devuelve cuántas ha asignado.
create or replace function public.repartir_contactos(responsables text[]) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_n integer;
  v_total integer := coalesce(array_length(responsables, 1), 0);
begin
  if not public.es_admin() then
    raise exception 'Solo los administradores pueden repartir fichas';
  end if;
  if v_total = 0 then
    raise exception 'Indica al menos un responsable';
  end if;
  with sin as (
    select id, row_number() over (partition by tipo order by nombre, id) - 1 as k
    from public.contactos where responsable is null
  )
  update public.contactos c set responsable = lower(responsables[1 + (sin.k % v_total)::int])
  from sin where c.id = sin.id;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public.repartir_contactos(text[]) from public, anon;
grant execute on function public.repartir_contactos(text[]) to authenticated;

-- Resumen diario: lo mismo que antes, pero cada pendiente aparece bajo la persona a la que le toca.
-- Si ninguna ficha tiene responsable, el mensaje queda como siempre (sin encabezados).
create or replace function public.avisar_pendientes() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_leads int;
  v_invalidos int;
  v_texto text := '';
  v_con_resp boolean;
  v_ultimo text := '-';
  r record;
begin
  select count(*) into v_leads from public.leads where estado in ('nuevo', 'por_verificar');
  if v_leads > 0 then
    v_texto := v_texto || e'\n• Clientes por verificar: ' || v_leads;
  end if;

  select count(*) into v_invalidos from public.leads l
  where l.estado = 'descartado' and exists (select 1 from public.envios e where e.lead_id = l.id and not e.avisada);
  if v_invalidos > 0 then
    v_texto := v_texto || e'\n• Leads inválidos: avisar a las empresas (7 días): ' || v_invalidos;
  end if;

  select exists (select 1 from public.contactos where responsable is not null) into v_con_resp;

  for r in
    select responsable, titulo, string_agg(nombre, ', ' order by nombre) as nombres
    from (
      select 1 as orden, 'Llamada pendiente' as titulo, nombre, responsable from public.contactos where tipo = 'proveedor' and estado = 'llamada_pendiente'
      union all select 2, 'Respondieron, hay que llamar', nombre, responsable from public.contactos where tipo = 'proveedor' and estado = 'respondio'
      union all select 3, 'Acuerdo cerrado: mandar primer lead', nombre, responsable from public.contactos where tipo = 'proveedor' and estado = 'acuerdo_cerrado'
      union all select 4, 'Canal a la espera tras llamada', nombre, responsable from public.contactos where tipo = 'canal' and estado = 'llamada_hecha'
      union all select 5, 'Seguimiento de hoy o vencido', nombre || coalesce(' (' || proxima_accion || ')', ''), responsable from public.contactos
        where proxima_fecha <= current_date and estado not in ('no_interesa', 'pausado', 'inactivo')
    ) t
    group by responsable, orden, titulo
    order by responsable nulls last, orden
  loop
    if v_con_resp and coalesce(r.responsable, '') is distinct from v_ultimo then
      v_texto := v_texto || e'\n\n👤 ' || coalesce(initcap(split_part(r.responsable, '@', 1)), 'Sin asignar');
      v_ultimo := coalesce(r.responsable, '');
    end if;
    v_texto := v_texto || e'\n• ' || r.titulo || ': ' || r.nombres;
  end loop;

  if v_texto = '' then
    return;
  end if;
  perform public.avisar_telegram('📋 Pendientes de hoy' || v_texto || e'\nhttps://www.pimenleads.com/panel/#pendientes');
exception when others then
  raise warning 'Resumen de pendientes no enviado: %', sqlerrm;
end $$;

revoke all on function public.avisar_pendientes() from public, anon, authenticated;

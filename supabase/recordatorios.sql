-- Pimen Leads · resumen diario de pendientes por Telegram.
--
-- De lunes a viernes a las 07:00 UTC (08:00 en invierno, 09:00 en verano en Barcelona) manda un mensaje con lo que
-- hay que hacer hoy. Si no hay nada pendiente, no manda nada.
-- Requiere haber configurado antes los avisos (avisos.sql y el token de Telegram en Vault; ver LEEME.md).

create extension if not exists pg_cron;

create or replace function public.avisar_pendientes() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_leads int;
  v_texto text := '';
  r record;
  v_lineas text;
begin
  select count(*) into v_leads from public.leads where estado in ('nuevo', 'por_verificar');
  if v_leads > 0 then
    v_texto := v_texto || e'\n• Clientes por verificar: ' || v_leads;
  end if;

  for r in
    select titulo, string_agg(nombre, ', ' order by nombre) as nombres
    from (
      select 1 as orden, 'Llamada pendiente' as titulo, nombre from public.contactos where tipo = 'proveedor' and estado = 'llamada_pendiente'
      union all select 2, 'Respondieron, hay que llamar', nombre from public.contactos where tipo = 'proveedor' and estado = 'respondio'
      union all select 3, 'Acuerdo cerrado: mandar primer lead', nombre from public.contactos where tipo = 'proveedor' and estado = 'acuerdo_cerrado'
      union all select 4, 'Canal a la espera tras llamada', nombre from public.contactos where tipo = 'canal' and estado = 'llamada_hecha'
      union all select 5, 'Seguimiento de hoy o vencido', nombre || coalesce(' (' || proxima_accion || ')', '') from public.contactos
        where proxima_fecha <= current_date and estado not in ('no_interesa', 'pausado', 'inactivo')
    ) t
    group by orden, titulo order by orden
  loop
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

select cron.schedule('pendientes-diarios', '0 7 * * 1-5', 'select public.avisar_pendientes()');

-- Pimen Leads · medición propia de la web, anónima y sin cookies.
--
-- Guarda qué se hace en cada página (scroll, formulario, llamadas…) para ver dónde abandonan las visitas,
-- también las de quien rechaza las cookies de Google. No se guarda IP, navegador, gclid ni nada escrito en el
-- formulario. El identificador de cada visita lo crea la página al cargar y solo vive en memoria: no sirve para
-- reconocer a la misma persona entre páginas ni entre días.
--
-- La web pública solo puede llamar a registrar_visita(); no puede leer ni tocar la tabla.
-- El panel lee el embudo con embudo_web(), que exige haber entrado con un correo de la tabla admins.
--
-- Ejecutar una vez en SQL Editor (después de schema.sql). Es seguro repetirlo.
--
-- Limpieza opcional (borrar lo de hace más de 13 meses):
--   delete from public.visitas where created_at < now() - interval '13 months';

create table if not exists public.visitas (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visita text not null,            -- id aleatorio de esa carga de página
  pagina text not null,            -- ruta, p. ej. /reforma-bano-barcelona.html
  evento text not null,
  anuncio boolean not null default false,   -- llegó con gclid o utm_medium=cpc (el gclid no se guarda)
  dispositivo text check (dispositivo in ('movil', 'tablet', 'escritorio')),
  campana text,                    -- utm_campaign
  ms integer,                      -- milisegundos desde que cargó la página
  datos jsonb not null default '{}'::jsonb
);

create index if not exists visitas_created_at_idx on public.visitas (created_at desc);
create index if not exists visitas_visita_idx on public.visitas (visita);

-- Recibe un lote de eventos de una visita. Cualquier dato raro se ignora sin dar error, para no estorbar a la web.
create or replace function public.registrar_visita(datos jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_visita text := left(nullif(trim(datos ->> 'visita'), ''), 40);
  v_pagina text := left(nullif(trim(datos ->> 'pagina'), ''), 100);
  v_anuncio boolean := coalesce(datos ->> 'anuncio' = 'true', false);
  v_disp text := case when datos ->> 'dispositivo' in ('movil', 'tablet', 'escritorio') then datos ->> 'dispositivo' end;
  v_campana text := left(nullif(trim(datos ->> 'campana'), ''), 40);
  -- Solo se guardan estas claves y con texto corto: así nunca acaba aquí algo que escriba la persona.
  v_claves text[] := array['zona', 'texto', 'paso', 'porcentaje', 'seccion', 'destino', 'tipo', 'campo', 'segundos', 'referrer', 'ancho', 'alto'];
  v_eventos text[] := array['vista', 'salida', 'scroll_profundidad', 'seccion_vista', 'form_inicio', 'form_paso', 'form_enviar',
    'form_error', 'form_ok', 'clic_llamar', 'clic_whatsapp', 'clic_boton', 'cookies_aviso', 'cookies_si', 'cookies_no'];
  e jsonb;
  d jsonb;
begin
  if v_visita is null or v_pagina is null
     or coalesce(jsonb_typeof(datos -> 'eventos'), '') <> 'array'
     or length(datos::text) > 20000 then
    return;
  end if;

  for e in select x from jsonb_array_elements(datos -> 'eventos') as t(x) limit 30 loop
    if jsonb_typeof(e) <> 'object' or not coalesce((e ->> 'e') = any (v_eventos), false) then
      continue;
    end if;
    select coalesce(jsonb_object_agg(k, left(v, 60)), '{}'::jsonb) into d
    from jsonb_each_text(case when jsonb_typeof(e -> 'd') = 'object' then e -> 'd' else '{}'::jsonb end) as t(k, v)
    where k = any (v_claves);

    insert into public.visitas (visita, pagina, evento, anuncio, dispositivo, campana, ms, datos)
    values (
      v_visita, v_pagina, e ->> 'e', v_anuncio, v_disp, v_campana,
      case when (e ->> 'ms') ~ '^[0-9]{1,9}$' then (e ->> 'ms')::integer end,
      d
    );
  end loop;
end $$;

-- Embudo para el panel: cuántas visitas distintas hicieron cada cosa, por página, origen y dispositivo.
-- "clave" es el paso del formulario, el % de scroll, la sección, el campo con error o la zona del clic.
-- Las filas "salida" (mediana de segundos en la página) y "salida_rapida" (menos de 10 s) salen de la última medición de cada visita.
create or replace function public.embudo_web(desde timestamptz default '-infinity', hasta timestamptz default 'infinity')
returns table (pagina text, anuncio boolean, dispositivo text, campana text, evento text, clave text, visitas bigint, mediana_seg numeric)
language sql stable security definer set search_path = ''
as $$
  with ev as (
    select v.visita, v.pagina, v.anuncio, v.dispositivo, v.campana, v.evento, v.datos,
      case
        when v.evento in ('clic_llamar', 'clic_whatsapp', 'clic_boton') then coalesce(v.datos ->> 'zona', '')
        else coalesce(v.datos ->> 'paso', v.datos ->> 'porcentaje', v.datos ->> 'seccion', v.datos ->> 'campo', '')
      end as clave
    from public.visitas v
    where public.es_admin() and v.created_at >= desde and v.created_at < hasta
  ),
  salidas as (
    select s.visita, s.pagina, s.anuncio, s.dispositivo, s.campana, max((s.datos ->> 'segundos')::numeric) as seg
    from ev s
    where s.evento = 'salida' and s.datos ->> 'segundos' ~ '^[0-9]{1,5}$'
    group by s.visita, s.pagina, s.anuncio, s.dispositivo, s.campana
  )
  select a.pagina, a.anuncio, a.dispositivo, a.campana, a.evento, a.clave, count(distinct a.visita), null::numeric
  from ev a where a.evento <> 'salida'
  group by a.pagina, a.anuncio, a.dispositivo, a.campana, a.evento, a.clave
  union all
  select b.pagina, b.anuncio, b.dispositivo, b.campana, 'salida', '', count(*), percentile_cont(0.5) within group (order by b.seg)::numeric
  from salidas b group by b.pagina, b.anuncio, b.dispositivo, b.campana
  union all
  select c.pagina, c.anuncio, c.dispositivo, c.campana, 'salida_rapida', '', count(*), null::numeric
  from salidas c where c.seg < 10 group by c.pagina, c.anuncio, c.dispositivo, c.campana;
$$;

-- ── Permisos ────────────────────────────────────────────────────────────

alter table public.visitas enable row level security;
revoke all on public.visitas from anon;

drop policy if exists "admins gestionan visitas" on public.visitas;
create policy "admins gestionan visitas" on public.visitas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

revoke all on function public.registrar_visita(jsonb) from public;
grant execute on function public.registrar_visita(jsonb) to anon, authenticated;
revoke all on function public.embudo_web(timestamptz, timestamptz) from public, anon;
grant execute on function public.embudo_web(timestamptz, timestamptz) to authenticated;

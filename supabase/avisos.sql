-- Pimen Leads · avisos instantáneos por Telegram.
--
-- Cada vez que entra un lead nuevo (o una empresa pide su primer lead) se manda un mensaje
-- a Telegram con lo básico y el enlace al panel, para poder llamar en minutos.
--
-- El token del bot y el chat_id NO van aquí (el repositorio es público): se guardan en
-- Supabase Vault con los nombres 'telegram_bot_token' y 'telegram_chat_id'. Ver LEEME.md.
--
-- Si Telegram falla, no hay token o lo que sea, el lead se guarda igual: el aviso es
-- asíncrono (pg_net) y cualquier error se ignora con un warning en los logs.

create extension if not exists pg_net;

-- Manda un texto al chat configurado. Solo la usan los triggers de abajo.
create or replace function public.avisar_telegram(texto text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_token text;
  v_chat text;
begin
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'telegram_bot_token';
  select decrypted_secret into v_chat from vault.decrypted_secrets where name = 'telegram_chat_id';
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

revoke all on function public.avisar_telegram(text) from public, anon, authenticated;

create or replace function public.avisar_lead_nuevo() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  begin
    perform public.avisar_telegram(concat_ws(e'\n',
      '🔔 Lead nuevo #' || new.id || ': ' || case new.tipo
        when 'bano' then 'Baño' when 'cocina' then 'Cocina' when 'integral' then 'Integral' else 'Otro' end,
      'Zona: ' || coalesce(nullif(new.zona, ''), '—'),
      'Plazo: ' || coalesce(nullif(new.plazo, ''), '—'),
      'Nombre: ' || new.nombre,
      'https://www.pimenleads.com/panel/#leads/' || new.id
    ));
  exception when others then
    raise warning 'Aviso de lead no enviado: %', sqlerrm;
  end;
  return null;
end $$;

create or replace function public.avisar_empresa_nueva() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Las empresas que da de alta un socio desde el panel no avisan; solo las del formulario.
  begin
    if public.es_admin() then
      return null;
    end if;
    perform public.avisar_telegram(concat_ws(e'\n',
      '🏗️ Empresa pide su primer lead #' || new.id || ': ' || new.nombre,
      'Contacto: ' || coalesce(nullif(new.contacto, ''), '—'),
      'Zonas: ' || coalesce(nullif(new.zonas, ''), '—'),
      'https://www.pimenleads.com/panel/#empresas/' || new.id
    ));
  exception when others then
    raise warning 'Aviso de empresa no enviado: %', sqlerrm;
  end;
  return null;
end $$;

revoke all on function public.avisar_lead_nuevo(), public.avisar_empresa_nueva() from public, anon, authenticated;

drop trigger if exists leads_aviso on public.leads;
create trigger leads_aviso after insert on public.leads
for each row execute function public.avisar_lead_nuevo();

drop trigger if exists empresas_aviso on public.empresas;
create trigger empresas_aviso after insert on public.empresas
for each row execute function public.avisar_empresa_nueva();

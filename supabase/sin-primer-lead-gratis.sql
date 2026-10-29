-- Pimen Leads · quitar el primer lead gratis. Ejecutar en el SQL Editor.
--
-- Antes, el primer envío de cada empresa se ponía a 0 €. Ahora todos los envíos
-- usan el precio de la empresa para ese tipo de reforma. Los envíos ya creados
-- no cambian: si alguno quedó a 0 €, se corrige a mano en el panel.

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
    new.precio := coalesce(case v_tipo
      when 'bano' then v_empresa.precio_bano
      when 'cocina' then v_empresa.precio_cocina
      when 'integral' then v_empresa.precio_integral
    end, 0);
  end if;
  return new;
end $$;

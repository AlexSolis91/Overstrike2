-- Overstrike 2 · Paso 15: TIENDA DE LA HORDA — precios nuevos y límite de 1 Épica por semana.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 011.
-- Precios en Trofeos de Orco: Común 15 · Rara 60 · Especial 300 · Épica 1,500 (antes 10 / 30 / 120 / 500).
-- Épicas: máximo 1 por semana (la semana empieza el lunes, hora de México).

alter table public.inventario add column if not exists horda_epica_semana date;   -- lunes de la semana en que compró su Épica

create or replace function public._precio_trofeos(p_rareza text)
returns integer language sql immutable set search_path = '' as $$
  select case p_rareza when 'Común' then 15 when 'Raro' then 60 when 'Especial' then 300 when 'Épico' then 1500 else null end
$$;

create or replace function public.tienda_horda_comprar(p_reliquia text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_c public.reliquias_catalogo; v_precio int;
        v_semana date := date_trunc('week', now() at time zone 'America/Mexico_City')::date;
begin
  select * into v_c from public.reliquias_catalogo where id = p_reliquia and activo and not solo_receta and lote = 'orcos';
  if not found then raise exception 'Esa reliquia no está en la tienda de la Horda'; end if;
  v_precio := public._precio_trofeos(v_c.rareza);
  if v_precio is null then raise exception 'Esa reliquia no está en la tienda de la Horda'; end if;
  if v_c.rareza = 'Épico' and exists (select 1 from public.inventario where jugador = v_yo and horda_epica_semana = v_semana) then
    raise exception 'Ya compraste tu Épica de esta semana: vuelve el lunes';
  end if;
  update public.inventario set trofeos_orco = trofeos_orco - v_precio,
    horda_epica_semana = case when v_c.rareza = 'Épico' then v_semana else horda_epica_semana end
    where jugador = v_yo and trofeos_orco >= v_precio;
  if not found then raise exception 'No tienes suficientes Trofeos de Orco'; end if;
  return public._crear_reliquia(v_yo, p_reliquia, 'tienda_horda');
end $$;

revoke all on function public.tienda_horda_comprar(text), public._precio_trofeos(text) from public, anon;
grant execute on function public.tienda_horda_comprar(text) to authenticated;

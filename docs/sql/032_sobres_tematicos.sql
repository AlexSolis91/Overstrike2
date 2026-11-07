-- 032 · Sobres temáticos puros + 3 sobres nuevos (2026-11-07)
-- Ejecutar completo en el SQL Editor de Supabase y DESPUÉS ejecutar docs/sql/catalogo.sql (trae los sobres nuevos de cada campeón).
-- Se puede ejecutar más de una vez.
--
-- 1. Un sobre temático da sus 3 campeones SOLO de su tema (antes: 1 o 2 de su tema y el resto de todos).
--    Así quien busca a un campeón va a su sobre. Unbreakable Force da 3 de TODOS los campeones (más barato y más variado).
--    El nivel de cada campeón (probabilidad según su fuerza) sigue pesando; nunca se repite dentro del mismo sobre.
-- 2. Sobres nuevos: Lords of the Flames (Quemadura), Winter Storm (Congelación) y Toxic Nightmare (Veneno).
--    Llevan a los mismos campeones que los Starter Packs Blazing Legion, Frostborn Vanguard y Noxious Alliance.
--    Empiezan activos y con el precio que hoy tenga Bloodline Awakening (se cambia en el panel de Administrador).

-- ============================================================ SORTEO DE UN SOBRE (lo usan abrir_sobre y abrir_sobre_vale)
create or replace function public._sortear_sobre(p_sobre text)
returns text[] language sql volatile security definer set search_path = '' as $$
  select coalesce(array_agg(id), '{}') from (
    select id from public.campeones
    where activo and (p_sobre = 'unbreakable' or p_sobre = any (sobres))
    order by -ln(1 - random()) / public._peso(nivel)
    limit 3) t
$$;

create or replace function public.abrir_sobre(p_sobre text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_cfg public.sobres_config; v_todo text[]; c text;
begin
  select * into v_cfg from public.sobres_config where id = p_sobre;
  if not found or not v_cfg.activo or (v_cfg.desde is not null and now() < v_cfg.desde) or (v_cfg.hasta is not null and now() > v_cfg.hasta)
    then raise exception 'Ese sobre no está disponible'; end if;
  if v_cfg.precio > 0 then
    update public.inventario set oro = oro - v_cfg.precio where jugador = v_yo and oro >= v_cfg.precio;
    if not found then raise exception 'No tienes suficiente oro'; end if;
  end if;
  v_todo := public._sortear_sobre(p_sobre);
  if cardinality(v_todo) < 1 then raise exception 'Ese sobre no tiene campeones todavía'; end if;
  foreach c in array v_todo loop perform public._dar_campeon(v_yo, c); end loop;
  insert into public.aperturas (jugador, tipo, origen, campeones) values (v_yo, 'sobre', p_sobre, v_todo);
  return v_todo;
end $$;

create or replace function public.abrir_sobre_vale(p_sobre text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_cfg public.sobres_config; v_todo text[]; c text;
begin
  select * into v_cfg from public.sobres_config where id = p_sobre;
  if not found or not v_cfg.activo then raise exception 'Ese sobre no está disponible'; end if;
  update public.inventario set vales_sobre = vales_sobre - 1 where jugador = v_yo and vales_sobre >= 1;
  if not found then raise exception 'No tienes vales de sobre'; end if;
  v_todo := public._sortear_sobre(p_sobre);
  if cardinality(v_todo) < 1 then raise exception 'Ese sobre no tiene campeones todavía'; end if;
  foreach c in array v_todo loop perform public._dar_campeon(v_yo, c); end loop;
  insert into public.aperturas (jugador, tipo, origen, campeones) values (v_yo, 'vale', p_sobre, v_todo);
  return v_todo;
end $$;

-- ============================================================ SOBRES NUEVOS
insert into public.sobres_config (id, activo, precio)
select x.id, true, coalesce((select precio from public.sobres_config where id = 'bloodline'), 0)
from (values ('flames'), ('winter'), ('toxic')) as x(id)
on conflict (id) do nothing;

-- ============================================================ PERMISOS
revoke all on function public._sortear_sobre(text) from public, anon, authenticated;
revoke all on function public.abrir_sobre(text), public.abrir_sobre_vale(text) from public, anon;
grant execute on function public.abrir_sobre(text), public.abrir_sobre_vale(text) to authenticated;

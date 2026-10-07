-- Overstrike 2 · Paso 3: probabilidad de salida por campeón (según su fuerza) y "solo en su sobre".
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar.
--
-- Nivel de salida (invisible para el jugador; lo cambia el administrador desde el juego):
--   normal = peso 1    (menos de 60% de victorias en la simulación)
--   baja = 0.75        (60% a 69%)
--   muy_baja = 0.5     (70% a 79%)
--   minima = 0.25      (80% o más)
-- El peso se usa en TODOS los sorteos: sobres (tema y relleno), Unbreakable Force y Starter Pack.
-- "solo_su_sobre": no sale de relleno en sobres temáticos ajenos (sí en el suyo, en Unbreakable Force y en el Portal).

-- ============================================================ COLUMNAS NUEVAS
alter table public.campeones add column if not exists nivel text not null default 'normal';
alter table public.campeones add column if not exists solo_su_sobre boolean not null default false;
alter table public.campeones drop constraint if exists campeones_nivel_valido;
alter table public.campeones add constraint campeones_nivel_valido check (nivel in ('normal', 'baja', 'muy_baja', 'minima'));

-- Clasificación inicial (simulación del 2026-10-07)
update public.campeones set nivel = 'muy_baja' where id = 'thor';          -- 76.5%
update public.campeones set nivel = 'baja' where id = 'doctor-doom';       -- 65.7%
update public.campeones set solo_su_sobre = true where id = 'lich-king';   -- solo en Phantom of Chaos (y Unbreakable Force)

-- ============================================================ PESO
create or replace function public._peso(p_nivel text)
returns numeric language sql immutable set search_path = '' as $$
  select case p_nivel when 'baja' then 0.75 when 'muy_baja' then 0.5 when 'minima' then 0.25 else 1 end::numeric;
$$;
-- Sorteo con pesos y sin repetir (método Efraimidis–Spirakis): ordenar por -ln(azar) / peso y tomar los primeros.
-- 1 - random() está en (0, 1], así que el logaritmo siempre existe.

-- ============================================================ STARTER PACK (con pesos)
create or replace function public.abrir_starter(p_starter text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_tema text[]; v_extra text[]; v_todo text[]; c text;
begin
  if not exists (select 1 from public.campeones where starter = p_starter) then raise exception 'Starter Pack desconocido'; end if;
  perform 1 from public.jugadores where id = v_yo and starter_elegido is null for update;
  if not found then raise exception 'Ya elegiste tu Starter Pack'; end if;
  select coalesce(array_agg(id), '{}') into v_tema
    from (select id from public.campeones where activo and starter = p_starter
          order by -ln(1 - random()) / public._peso(nivel) limit 3) t;
  select coalesce(array_agg(id), '{}') into v_extra
    from (select id from public.campeones
          where activo and (starter is null or starter = p_starter) and not (id = any (v_tema))
            and (not solo_su_sobre or starter = p_starter)
          order by -ln(1 - random()) / public._peso(nivel) limit 5 - cardinality(v_tema)) t;
  v_todo := v_tema || v_extra;
  foreach c in array v_todo loop perform public._dar_campeon(v_yo, c); end loop;
  update public.jugadores set starter_elegido = p_starter where id = v_yo;
  insert into public.aperturas (jugador, tipo, origen, campeones) values (v_yo, 'starter', p_starter, v_todo);
  return v_todo;
end $$;

-- ============================================================ SOBRES DE LA TIENDA (con pesos y "solo en su sobre")
create or replace function public.abrir_sobre(p_sobre text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_cfg public.sobres_config; v_n int := case when random() < .5 then 1 else 2 end;
        v_tematico boolean; v_tema text[]; v_resto text[]; v_todo text[]; c text;
begin
  select * into v_cfg from public.sobres_config where id = p_sobre;
  if not found or not v_cfg.activo or (v_cfg.desde is not null and now() < v_cfg.desde) or (v_cfg.hasta is not null and now() > v_cfg.hasta)
    then raise exception 'Ese sobre no está disponible'; end if;
  if v_cfg.precio > 0 then
    update public.inventario set oro = oro - v_cfg.precio where jugador = v_yo and oro >= v_cfg.precio;
    if not found then raise exception 'No tienes suficiente oro'; end if;
  end if;
  v_tematico := exists (select 1 from public.campeones where activo and p_sobre = any (sobres));   -- Unbreakable Force: sin tema
  select coalesce(array_agg(id), '{}') into v_tema
    from (select id from public.campeones where activo and p_sobre = any (sobres)
          order by -ln(1 - random()) / public._peso(nivel) limit v_n) t;
  select coalesce(array_agg(id), '{}') into v_resto
    from (select id from public.campeones
          where activo and not (id = any (v_tema))
            and (not solo_su_sobre or not v_tematico or p_sobre = any (sobres))
          order by -ln(1 - random()) / public._peso(nivel) limit 3 - cardinality(v_tema)) t;
  v_todo := v_tema || v_resto;
  foreach c in array v_todo loop perform public._dar_campeon(v_yo, c); end loop;
  insert into public.aperturas (jugador, tipo, origen, campeones) values (v_yo, 'sobre', p_sobre, v_todo);
  return v_todo;
end $$;

-- ============================================================ ADMINISTRADOR: nivel y "solo en su sobre" de un campeón
create or replace function public.admin_probabilidad_campeon(p_campeon text, p_nivel text, p_solo boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede hacer esto'; end if;
  if p_nivel not in ('normal', 'baja', 'muy_baja', 'minima') then raise exception 'Nivel desconocido'; end if;
  update public.campeones set nivel = p_nivel, solo_su_sobre = p_solo where id = p_campeon;
  if not found then raise exception 'Ese campeón no está en el catálogo'; end if;
end $$;

revoke all on function public.admin_probabilidad_campeon(text, text, boolean) from public, anon;
grant execute on function public.admin_probabilidad_campeon(text, text, boolean) to authenticated;
revoke all on function public._peso(text) from public, anon, authenticated;

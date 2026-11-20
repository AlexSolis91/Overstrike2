-- Overstrike 2 · Paso 48: ESTADÍSTICAS DE BALANCE (solo administradores).
--   · Horda: cada partida guarda su equipo (sale de los datos que el juego ya guarda para continuarla).
--   · Jefe de Raid: cada ataque guarda daño, daño recibido, curación y escudos de cada campeón, y contra qué jefe fue.
--   · Tres consultas para el panel de administrador: Arena (victorias atacando y defendiendo), Horda (oleada promedio)
--     y Jefe de Raid (promedios por ataque). Las tres rechazan a quien no sea administrador.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 022, 026 y 029.

-- ============================================================ HORDA: el equipo de cada partida
alter table public.horda_partidas add column if not exists equipo text[];

create or replace function public.horda_guardar(p_partida uuid, p_datos jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if pg_column_size(p_datos) > 2097152 then raise exception 'Partida demasiado grande'; end if;
  update public.horda_partidas set guardado = p_datos,
      equipo = coalesce(equipo, case when jsonb_typeof(p_datos -> 'equipo') = 'array'
        then array(select jsonb_array_elements_text(p_datos -> 'equipo')) end)
    where id = p_partida and jugador = public._yo() and not terminada;
end $$;
-- Partidas en curso que ya tienen sus datos guardados
update public.horda_partidas set equipo = array(select jsonb_array_elements_text(guardado -> 'equipo'))
  where equipo is null and jsonb_typeof(guardado -> 'equipo') = 'array';

-- ============================================================ JEFE DE RAID: estadísticas de cada campeón por ataque
create table if not exists public.raid_estadisticas (
  ataque     uuid not null references public.raid_ataques (id) on delete cascade,
  campeon    text not null,
  jefe       text not null,
  dificultad text not null,
  dano       bigint not null default 0,
  recibido   bigint not null default 0,
  curacion   bigint not null default 0,
  escudo     bigint not null default 0,
  primary key (ataque, campeon)
);
alter table public.raid_estadisticas enable row level security;
revoke all on public.raid_estadisticas from anon, authenticated;

-- El juego la llama al terminar un ataque: p_stats = [{ id, dano, recibido, curacion, escudo }] de sus campeones.
-- Solo una vez por ataque, solo del dueño y solo con campeones de ese equipo.
create or replace function public.raid_estadisticas_guardar(p_ataque uuid, p_stats jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.raid_ataques; v_jefe text;
begin
  select * into a from public.raid_ataques where id = p_ataque and jugador = public._yo();
  if not found or a.estado = 'jugando' then return; end if;
  if exists (select 1 from public.raid_estadisticas where ataque = p_ataque) then return; end if;
  select jefe into v_jefe from public.raid_config limit 1;
  insert into public.raid_estadisticas (ataque, campeon, jefe, dificultad, dano, recibido, curacion, escudo)
    select p_ataque, s ->> 'id', coalesce(v_jefe, 'lich-king'), a.dificultad,
      greatest(0, coalesce((s ->> 'dano')::numeric, 0))::bigint, greatest(0, coalesce((s ->> 'recibido')::numeric, 0))::bigint,
      greatest(0, coalesce((s ->> 'curacion')::numeric, 0))::bigint, greatest(0, coalesce((s ->> 'escudo')::numeric, 0))::bigint
    from jsonb_array_elements(case when jsonb_typeof(p_stats) = 'array' then p_stats else '[]'::jsonb end) s
    where (s ->> 'id') = any (a.equipo)
    on conflict do nothing;
end $$;
revoke all on function public.raid_estadisticas_guardar(uuid, jsonb) from public, anon;
grant execute on function public.raid_estadisticas_guardar(uuid, jsonb) to authenticated;

-- ============================================================ PANEL DE ADMINISTRADOR
-- Arena. p_periodo: 'temporada' (la actual), '30' (últimos 30 días) o 'todo'. Atacando y defendiendo por separado;
-- los combates contra la Defensa de práctica no cuentan; la Arena en vivo cuenta como ataque de los dos lados.
create or replace function public.admin_estadisticas_arena(p_periodo text default 'temporada')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_desde timestamptz;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede ver esto'; end if;
  v_desde := case p_periodo
    when 'todo' then '-infinity'::timestamptz
    when '30' then now() - interval '30 days'
    else ((date '2026-10-19' + (public._arena_temporada() - 1) * 28)::timestamp at time zone 'America/Mexico_City') end;
  return (with
    c as (select ataque, defensa, gano from public.arena_combates
          where terminado and gano is not null and defensor is not null and iniciado >= v_desde
            and coalesce(verificado, '') <> 'falla'),
    v as (select ataque_a, ataque_b, ganador from public.arena_vivo
          where terminado and ganador in ('a', 'b', 'empate') and creado >= v_desde),
    lados as (
      select unnest(ataque) campeon, 'atk' lado, gano gano from c
      union all select unnest(defensa), 'def', not gano from c
      union all select unnest(ataque_a), 'atk', ganador = 'a' from v
      union all select unnest(ataque_b), 'atk', ganador = 'b' from v),
    equipos as (select (select count(*) from c) * 2 + (select count(*) from v) * 2 as n),
    t as (select campeon,
            count(*) filter (where lado = 'atk') atk, count(*) filter (where lado = 'atk' and gano) atk_v,
            count(*) filter (where lado = 'def') def, count(*) filter (where lado = 'def' and gano) def_v,
            count(*) usos, count(*) filter (where gano) victorias
          from lados group by campeon)
    select jsonb_build_object('equipos', (select n from equipos), 'filas', coalesce(jsonb_agg(to_jsonb(t) order by t.campeon), '[]'::jsonb))
    from t);
end $$;

-- Horda (solo partidas terminadas que tengan su equipo guardado)
create or replace function public.admin_estadisticas_horda(p_horda text default 'orcos')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede ver esto'; end if;
  return (with
    p as (select equipo, oleada from public.horda_partidas where horda = p_horda and terminada and equipo is not null),
    u as (select unnest(equipo) campeon, oleada from p),
    t as (select campeon, count(*) usos, round(avg(oleada), 1) promedio, max(oleada) mejor,
            round(percentile_cont(.5) within group (order by oleada)::numeric, 1) mediana
          from u group by campeon)
    select jsonb_build_object('partidas', (select count(*) from p), 'filas', coalesce(jsonb_agg(to_jsonb(t) order by t.campeon), '[]'::jsonb))
    from t);
end $$;

-- Jefe de Raid (solo ataques terminados y verificados). p_dificultad: id de la dificultad o null = todas.
-- "mejor_jefe": el jefe contra el que ese campeón promedia más daño.
create or replace function public.admin_estadisticas_raid(p_dificultad text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede ver esto'; end if;
  return (with
    s as (select e.* from public.raid_estadisticas e join public.raid_ataques a on a.id = e.ataque
          where a.estado = 'hecho' and (p_dificultad is null or e.dificultad = p_dificultad)),
    pj as (select campeon, jefe, avg(dano) d from s group by campeon, jefe),
    mj as (select distinct on (campeon) campeon, jefe from pj order by campeon, d desc),
    t as (select s.campeon, count(*) usos, round(avg(dano)) dano, round(avg(recibido)) recibido,
            round(avg(curacion)) curacion, round(avg(escudo)) escudo, min(mj.jefe) mejor_jefe
          from s join mj using (campeon) group by s.campeon)
    select jsonb_build_object('ataques', (select count(distinct ataque) from s), 'filas', coalesce(jsonb_agg(to_jsonb(t) order by t.campeon), '[]'::jsonb))
    from t);
end $$;

revoke all on function public.admin_estadisticas_arena(text), public.admin_estadisticas_horda(text), public.admin_estadisticas_raid(text) from public, anon;
grant execute on function public.admin_estadisticas_arena(text), public.admin_estadisticas_horda(text), public.admin_estadisticas_raid(text) to authenticated;

-- Overstrike 2 · Paso 9: ARENA EN VIVO (Fase 2). Cola de búsqueda: si dos jugadores de puntos parecidos buscan a la vez,
-- se emparejan y juegan en vivo (Ataque contra Ataque). La batalla corre igual en las dos pantallas (misma semilla) y solo
-- viajan las decisiones por Supabase Realtime. Cada jugador reporta el resultado; si coinciden, se pagan puntos y oro.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 008.

create table if not exists public.arena_cola (
  jugador uuid primary key references public.jugadores (id) on delete cascade,
  puntos  integer not null,
  ataque  text[] not null,
  version text not null,
  desde   timestamptz not null default now(),
  partida uuid
);
create table if not exists public.arena_vivo (
  id        uuid primary key default gen_random_uuid(),
  a         uuid not null references public.jugadores (id) on delete cascade,   -- el que llegó primero a la cola
  b         uuid not null references public.jugadores (id) on delete cascade,
  ataque_a  text[] not null,
  ataque_b  text[] not null,
  diario_a  boolean not null,
  diario_b  boolean not null,
  semilla   integer not null,
  creado    timestamptz not null default now(),
  rep_a     text, rep_a_at timestamptz,                -- 'a' | 'b' | 'empate'
  rep_b     text, rep_b_at timestamptz,
  terminado boolean not null default false,
  ganador   text
);
alter table public.arena_cola enable row level security;
alter table public.arena_vivo enable row level security;
drop policy if exists "jugador ve sus partidas en vivo" on public.arena_vivo;
create policy "jugador ve sus partidas en vivo" on public.arena_vivo for select to authenticated using (a = auth.uid() or b = auth.uid());
revoke all on public.arena_cola, public.arena_vivo from anon, authenticated;
grant select on public.arena_vivo to authenticated;

-- Datos de la partida para un jugador (soy 'a' o 'b'; equipos de ambos con estrellas y reliquias)
create or replace function public._arena_vivo_json(p_id uuid, p_yo uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.arena_vivo; v_rival uuid; v_nombre text; v_puntos int;
begin
  select * into v from public.arena_vivo where id = p_id;
  v_rival := case when v.a = p_yo then v.b else v.a end;
  select nombre into v_nombre from public.jugadores where id = v_rival;
  select puntos into v_puntos from public.arena_jugadores where jugador = v_rival;
  return jsonb_build_object('partida', v.id, 'semilla', v.semilla, 'soy', case when v.a = p_yo then 'a' else 'b' end,
    'mio', case when v.a = p_yo then v.ataque_a else v.ataque_b end, 'suyo', case when v.a = p_yo then v.ataque_b else v.ataque_a end,
    'diario', case when v.a = p_yo then v.diario_a else v.diario_b end,
    'equipo_mio', public._arena_equipo_json(p_yo, case when v.a = p_yo then v.ataque_a else v.ataque_b end),
    'equipo_suyo', public._arena_equipo_json(v_rival, case when v.a = p_yo then v.ataque_b else v.ataque_a end),
    'rival', jsonb_build_object('nombre', v_nombre, 'puntos', v_puntos, 'liga', public._arena_liga(v_puntos, public._arena_puesto(v_rival))));
end $$;

-- Buscar (se llama cada segundo durante la cuenta regresiva). Devuelve { emparejado: false } o los datos de la partida.
-- Empareja con quien lleve menos de 12 s buscando, con la misma versión del juego y ±400 puntos.
create or replace function public.arena_vivo_buscar(p_ataque text[], p_version text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); a public.arena_jugadores; c public.arena_cola; o public.arena_cola; v_id uuid; v_da boolean; v_db boolean;
begin
  select * into c from public.arena_cola where jugador = v_yo;
  if found and c.partida is not null then return public._arena_vivo_json(c.partida, v_yo); end if;
  perform public.arena_guardar_equipo('ataque', p_ataque);
  a := public._arena_al_dia(v_yo);
  if cardinality(a.defensa) <> 5 then raise exception 'Primero publica tu equipo de Defensa'; end if;
  insert into public.arena_cola (jugador, puntos, ataque, version) values (v_yo, a.puntos, p_ataque, p_version)
    on conflict (jugador) do update set puntos = excluded.puntos, ataque = excluded.ataque, version = excluded.version,
      desde = case when public.arena_cola.partida is null and public.arena_cola.desde > now() - interval '12 seconds' then public.arena_cola.desde else now() end,
      partida = null;
  select * into o from public.arena_cola x
    where x.jugador <> v_yo and x.partida is null and x.version = p_version and x.desde > now() - interval '12 seconds'
      and abs(x.puntos - a.puntos) <= 400
    order by x.desde limit 1 for update skip locked;
  if not found then return jsonb_build_object('emparejado', false); end if;
  -- cada uno gasta un ataque diario si le quedan
  update public.arena_jugadores set diarios = diarios + 1 where jugador = o.jugador and diarios < 5 returning true into v_da;
  update public.arena_jugadores set diarios = diarios + 1 where jugador = v_yo and diarios < 5 returning true into v_db;
  insert into public.arena_vivo (a, b, ataque_a, ataque_b, diario_a, diario_b, semilla)
    values (o.jugador, v_yo, o.ataque, p_ataque, coalesce(v_da, false), coalesce(v_db, false), floor(random() * 2000000000)::int) returning id into v_id;
  update public.arena_cola set partida = v_id where jugador in (o.jugador, v_yo);
  return public._arena_vivo_json(v_id, v_yo);
end $$;

-- Dejar de buscar. Si justo me emparejaron, devuelve la partida (hay que jugarla); si no, null.
create or replace function public.arena_vivo_cancelar() returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); c public.arena_cola;
begin
  delete from public.arena_cola where jugador = v_yo and partida is null;
  select * into c from public.arena_cola where jugador = v_yo;
  if found then delete from public.arena_cola where jugador = v_yo; return public._arena_vivo_json(c.partida, v_yo); end if;
  return null;
end $$;

-- Puntos de una partida en vivo (los dos atacan: el ganador sube y el perdedor baja, cada uno según su ataque diario/extra)
create or replace function public._arena_vivo_pagar(p_id uuid, p_ganador text) returns void language plpgsql security definer set search_path = '' as $$
declare v public.arena_vivo; ja public.arena_jugadores; jb public.arena_jugadores; v_e numeric; g uuid; p uuid; v_dg int; v_dp int; v_gd boolean; v_pd boolean; v_oro int;
begin
  select * into v from public.arena_vivo where id = p_id for update;
  if v.terminado then return; end if;
  update public.arena_vivo set terminado = true, ganador = p_ganador where id = p_id;
  if p_ganador not in ('a', 'b') then return; end if;
  g := case p_ganador when 'a' then v.a else v.b end; p := case p_ganador when 'a' then v.b else v.a end;
  v_gd := case p_ganador when 'a' then v.diario_a else v.diario_b end; v_pd := case p_ganador when 'a' then v.diario_b else v.diario_a end;
  ja := public._arena_al_dia(g); jb := public._arena_al_dia(p);
  v_e := 1 / (1 + power(10, (jb.puntos - ja.puntos) / 400.0));
  v_dg := round(least(30, greatest(15, 32 * (1 - v_e))) * case when v_gd then 1 else .25 end);
  if not v_gd then v_dg := least(v_dg, greatest(0, 60 - ja.extra_puntos)); end if;
  v_dp := round(least(25, greatest(10, 32 * (1 - v_e))) * case when v_pd then 1 else .25 end);
  v_oro := round(public._arena_oro_victoria(public._arena_liga(ja.puntos, public._arena_puesto(g))) * case when v_gd then 1 else .10 end);
  update public.arena_jugadores set puntos = puntos + v_dg, victorias = victorias + 1, extra_puntos = extra_puntos + case when v_gd then 0 else v_dg end where jugador = g;
  update public.arena_jugadores set puntos = greatest(0, puntos - v_dp), derrotas = derrotas + 1 where jugador = p;
  update public.inventario set oro = oro + v_oro where jugador = g;
end $$;

-- Reportar el resultado (p_ganador: 'a', 'b' o 'empate'). Si los dos coinciden, se paga; si no coinciden, se anula.
-- Si el otro no reporta (se desconectó), el reporte se acepta al volver a llamar pasados 60 s.
create or replace function public.arena_vivo_resultado(p_partida uuid, p_ganador text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v public.arena_vivo; v_soy text; v_otro text; v_otro_at timestamptz; v_mio_at timestamptz; a public.arena_jugadores;
begin
  if p_ganador not in ('a', 'b', 'empate') then raise exception 'Resultado no válido'; end if;
  select * into v from public.arena_vivo where id = p_partida and (a = v_yo or b = v_yo) for update;
  if not found then raise exception 'No existe esa partida'; end if;
  v_soy := case when v.a = v_yo then 'a' else 'b' end;
  delete from public.arena_cola where jugador = v_yo;
  if not v.terminado then
    if v_soy = 'a' then update public.arena_vivo set rep_a = p_ganador, rep_a_at = coalesce(rep_a_at, now()) where id = p_partida;
    else update public.arena_vivo set rep_b = p_ganador, rep_b_at = coalesce(rep_b_at, now()) where id = p_partida; end if;
    select * into v from public.arena_vivo where id = p_partida;
    v_otro := case v_soy when 'a' then v.rep_b else v.rep_a end;
    v_mio_at := case v_soy when 'a' then v.rep_a_at else v.rep_b_at end;
    if v_otro is not null then
      if v_otro = p_ganador then perform public._arena_vivo_pagar(p_partida, p_ganador);
      else update public.arena_vivo set terminado = true, ganador = 'anulada' where id = p_partida; end if;
    elsif v_mio_at < now() - interval '60 seconds' then perform public._arena_vivo_pagar(p_partida, p_ganador);
    end if;
    select * into v from public.arena_vivo where id = p_partida;
  end if;
  a := public._arena_al_dia(v_yo);
  return jsonb_build_object('terminado', v.terminado, 'ganador', v.ganador, 'soy', v_soy, 'puntos', a.puntos,
    'liga', public._arena_liga(a.puntos, public._arena_puesto(v_yo)), 'diario', case v_soy when 'a' then v.diario_a else v.diario_b end);
end $$;

revoke all on function public._arena_vivo_json(uuid, uuid), public._arena_vivo_pagar(uuid, text) from public, anon, authenticated;
revoke all on function public.arena_vivo_buscar(text[], text), public.arena_vivo_cancelar(), public.arena_vivo_resultado(uuid, text) from public, anon;
grant execute on function public.arena_vivo_buscar(text[], text), public.arena_vivo_cancelar(), public.arena_vivo_resultado(uuid, text) to authenticated;

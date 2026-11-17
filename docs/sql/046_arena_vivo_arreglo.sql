-- Overstrike 2 · Paso 46: ARREGLO DE LA ARENA EN VIVO.
--   1. arena_vivo_resultado fallaba siempre con «column reference "a" is ambiguous» (una variable se llamaba igual que la
--      columna arena_vivo.a). Ningún resultado en vivo se guardaba: no se pagaban puntos y la cola no se limpiaba.
--   2. Por la cola sin limpiar, al buscar rival el servidor devolvía la partida vieja (con el rival ya desconectado), así que
--      los mismos dos jugadores se volvían a "emparejar" y la partida terminaba por abandono.
--   Ahora: el resultado se guarda; buscar y cancelar solo devuelven una partida recién creada (2 min) y sin terminar; las
--   partidas viejas sin terminar se cierran solas (con el único reporte que haya, o anuladas si nadie reportó).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 009 y 016.

-- ============================================================ CERRAR PARTIDAS VIEJAS (más de 10 minutos sin terminar)
create or replace function public._arena_vivo_cerrar_viejas() returns void language plpgsql security definer set search_path = '' as $$
declare v public.arena_vivo;
begin
  for v in select * from public.arena_vivo where not terminado and creado < now() - interval '10 minutes' for update skip locked loop
    if v.rep_a is not null and v.rep_b is null then perform public._arena_vivo_pagar(v.id, v.rep_a);
    elsif v.rep_b is not null and v.rep_a is null then perform public._arena_vivo_pagar(v.id, v.rep_b);
    elsif v.rep_a is not null and v.rep_a = v.rep_b then perform public._arena_vivo_pagar(v.id, v.rep_a);
    else update public.arena_vivo set terminado = true, ganador = 'anulada' where id = v.id; end if;
  end loop;
  delete from public.arena_cola q where q.partida is not null
    and not exists (select 1 from public.arena_vivo x where x.id = q.partida and not x.terminado and x.creado > now() - interval '2 minutes');
end $$;

-- ¿Esa partida sigue recién creada y sin terminar? (la única que buscar/cancelar pueden devolver)
create or replace function public._arena_vivo_vigente(p_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.arena_vivo x where x.id = p_id and not x.terminado and x.creado > now() - interval '2 minutes') $$;

-- ============================================================ BUSCAR (igual que 009, sin devolver partidas viejas)
create or replace function public.arena_vivo_buscar(p_ataque text[], p_version text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_aj public.arena_jugadores; c public.arena_cola; o public.arena_cola; v_id uuid; v_da boolean; v_db boolean;
begin
  perform public._arena_vivo_cerrar_viejas();
  select * into c from public.arena_cola where jugador = v_yo;
  if found and c.partida is not null then
    if public._arena_vivo_vigente(c.partida) then return public._arena_vivo_json(c.partida, v_yo); end if;
    delete from public.arena_cola where jugador = v_yo;            -- partida vieja: se olvida y se busca de nuevo
  end if;
  perform public.arena_guardar_equipo('ataque', p_ataque);
  v_aj := public._arena_al_dia(v_yo);
  if cardinality(v_aj.defensa) <> 5 then raise exception 'Primero publica tu equipo de Defensa'; end if;
  insert into public.arena_cola (jugador, puntos, ataque, version) values (v_yo, v_aj.puntos, p_ataque, p_version)
    on conflict (jugador) do update set puntos = excluded.puntos, ataque = excluded.ataque, version = excluded.version,
      desde = case when public.arena_cola.partida is null and public.arena_cola.desde > now() - interval '12 seconds' then public.arena_cola.desde else now() end,
      partida = null;
  select * into o from public.arena_cola x
    where x.jugador <> v_yo and x.partida is null and x.version = p_version and x.desde > now() - interval '12 seconds'
      and abs(x.puntos - v_aj.puntos) <= 400
    order by x.desde limit 1 for update skip locked;
  if not found then return jsonb_build_object('emparejado', false); end if;
  update public.arena_jugadores set diarios = diarios + 1 where jugador = o.jugador and diarios < 5 returning true into v_da;
  update public.arena_jugadores set diarios = diarios + 1 where jugador = v_yo and diarios < 5 returning true into v_db;
  insert into public.arena_vivo (a, b, ataque_a, ataque_b, diario_a, diario_b, semilla)
    values (o.jugador, v_yo, o.ataque, p_ataque, coalesce(v_da, false), coalesce(v_db, false), floor(random() * 2000000000)::int) returning id into v_id;
  update public.arena_cola set partida = v_id where jugador in (o.jugador, v_yo);
  return public._arena_vivo_json(v_id, v_yo);
end $$;

-- ============================================================ CANCELAR (solo devuelve una partida vigente)
create or replace function public.arena_vivo_cancelar() returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); c public.arena_cola;
begin
  delete from public.arena_cola where jugador = v_yo and partida is null;
  select * into c from public.arena_cola where jugador = v_yo;
  if found then
    delete from public.arena_cola where jugador = v_yo;
    if public._arena_vivo_vigente(c.partida) then return public._arena_vivo_json(c.partida, v_yo); end if;
  end if;
  return null;
end $$;

-- ============================================================ RESULTADO (igual que 009, sin la variable ambigua)
create or replace function public.arena_vivo_resultado(p_partida uuid, p_ganador text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v public.arena_vivo; v_soy text; v_otro text; v_mio_at timestamptz; v_aj public.arena_jugadores;
begin
  if p_ganador not in ('a', 'b', 'empate') then raise exception 'Resultado no válido'; end if;
  select * into v from public.arena_vivo x where x.id = p_partida and (x.a = v_yo or x.b = v_yo) for update;
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
    elsif v_mio_at < now() - interval '60 seconds' then perform public._arena_vivo_pagar(p_partida, p_ganador);   -- el otro no reportó (se fue)
    end if;
    select * into v from public.arena_vivo where id = p_partida;
  end if;
  v_aj := public._arena_al_dia(v_yo);
  return jsonb_build_object('terminado', v.terminado, 'ganador', v.ganador, 'soy', v_soy, 'puntos', v_aj.puntos,
    'liga', public._arena_liga(v_aj.puntos, public._arena_puesto(v_yo)), 'diario', case v_soy when 'a' then v.diario_a else v.diario_b end);
end $$;

-- ============================================================ PERMISOS Y LIMPIEZA DE LO QUE QUEDÓ ATORADO
revoke all on function public._arena_vivo_cerrar_viejas(), public._arena_vivo_vigente(uuid) from public, anon, authenticated;
revoke all on function public.arena_vivo_buscar(text[], text), public.arena_vivo_cancelar(), public.arena_vivo_resultado(uuid, text) from public, anon;
grant execute on function public.arena_vivo_buscar(text[], text), public.arena_vivo_cancelar(), public.arena_vivo_resultado(uuid, text) to authenticated;
select public._arena_vivo_cerrar_viejas();

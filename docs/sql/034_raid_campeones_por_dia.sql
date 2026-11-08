-- Overstrike 2 · Paso 34: Jefe de Raid. Cada campeón ataca al jefe una sola vez por día (2026-11-08).
-- Si hoy ya usaste a Madara en un ataque (en cualquier dificultad), no puedes volver a usarlo hasta que cierre el día
-- (medianoche de la Ciudad de México, igual que el resto del Raid). Cuenta desde que entras a la batalla.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001–033.

-- Campeones que el jugador ya usó hoy contra el jefe
create or replace function public.raid_usados_hoy()
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct c), '{}') from public.raid_ataques a, unnest(a.equipo) c
  where a.jugador = public._yo() and a.dia = public._raid_hoy()
$$;

-- Igual que en 027; además rechaza campeones que ya atacaron hoy
create or replace function public.raid_entrar(p_dif text, p_equipo text[], p_version text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_c public.raid_config; v_d public.raid_dias; v_ll public.raid_jugadores; v_id uuid; v_sem bigint := floor(random() * 2147483647); v_eq jsonb; v_orden int;
        v_rep text;
begin
  select * into v_c from public.raid_config where id = 1;
  select orden into v_orden from public.raid_dificultades where id = p_dif;
  if not found then raise exception 'Esa dificultad no existe'; end if;
  if v_orden > 1 and not exists (select 1 from public.raid_desbloqueos u where u.jefe = v_c.jefe and u.dificultad = p_dif) then raise exception 'Esa dificultad sigue bloqueada'; end if;
  if cardinality(p_equipo) <> 5 or (select count(distinct x) from unnest(p_equipo) x) <> 5 then raise exception 'El equipo debe tener 5 campeones distintos'; end if;
  if (select count(*) from public.coleccion where jugador = v_yo and campeon = any (p_equipo)) <> 5 then raise exception 'Solo puedes usar tus campeones'; end if;
  perform pg_advisory_xact_lock(hashtext('raid_entrar:' || v_yo::text));   -- dos ataques a la vez no se saltan la regla
  select string_agg(distinct c, ', ') into v_rep from public.raid_ataques a, unnest(a.equipo) c
    where a.jugador = v_yo and a.dia = public._raid_hoy() and c = any (p_equipo);
  if v_rep is not null then raise exception 'Cada campeón ataca al jefe una vez por día. Ya usaste hoy: %', v_rep; end if;
  v_d := public._raid_dia(p_dif);
  if v_d.derrotado is not null then raise exception 'Este jefe ya fue derrotado hoy'; end if;
  v_ll := public._raid_llaves(v_yo);
  if v_ll.llaves < 1 then raise exception 'No tienes llaves: recibes 1 cada 6 horas'; end if;
  update public.raid_jugadores set llaves = llaves - 1, desde = case when llaves = 2 then now() else desde end where jugador = v_yo;
  v_eq := public._arena_equipo_json(v_yo, p_equipo);
  insert into public.raid_ataques (jugador, dia, dificultad, semilla, hp_inicio, hp_total, equipo, equipo_datos, version)
    values (v_yo, v_d.dia, p_dif, v_sem, v_d.hp_restante, v_d.hp_total, p_equipo, v_eq, p_version) returning id into v_id;
  return jsonb_build_object('ataque', v_id, 'semilla', v_sem, 'hp_inicio', v_d.hp_restante, 'hp_total', v_d.hp_total, 'equipo', v_eq);
end $$;

revoke all on function public.raid_usados_hoy(), public.raid_entrar(text, text[], text) from public, anon;
grant execute on function public.raid_usados_hoy(), public.raid_entrar(text, text[], text) to authenticated;

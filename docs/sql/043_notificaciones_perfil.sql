-- Overstrike 2 · Paso 43: NOTIFICACIONES, PERFIL DE ARENA, MEJOR RÉCORD Y REPETICIONES.
--   · Notificaciones (tabla + Realtime): ataques a tu Defensa, recompensas semanales/de temporada y cambios de liga.
--   · Mejor récord (los puntos más altos que alcanzaste en cualquier temporada) y victorias/derrotas de toda la vida.
--   · Perfil público de Arena de cualquier jugador (por nombre) con sus dos equipos (para calcular su Poder).
--   · Repetición de un combate de Arena (atacante o defensor).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 008–042.

-- ============================================================ COLUMNAS NUEVAS (mejor récord y totales históricos)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'arena_jugadores' and column_name = 'total_v') then
    alter table public.arena_jugadores add column mejor integer not null default 0;
    alter table public.arena_jugadores add column total_v integer not null default 0;     -- victorias (ataque + defensa) de toda la vida
    alter table public.arena_jugadores add column total_d integer not null default 0;     -- derrotas (ataque + defensa) de toda la vida
    -- Primera vez: el récord sale de la temporada actual y las cerradas; los totales empiezan con la temporada actual
    update public.arena_jugadores a set
      mejor = greatest(a.puntos, coalesce((select max(h.puntos) from public.arena_historial h where h.jugador = a.jugador), 0)),
      total_v = a.victorias + a.def_victorias, total_d = a.derrotas + a.def_derrotas;
  end if;
end $$;

-- ============================================================ NOTIFICACIONES
create table if not exists public.notificaciones (
  id      bigint generated always as identity primary key,
  jugador uuid not null references public.jugadores (id) on delete cascade,
  tipo    text not null,                       -- 'defensa' · 'semana' · 'temporada' · 'liga'
  datos   jsonb not null default '{}',
  leida   boolean not null default false,
  creada  timestamptz not null default now()
);
create index if not exists notificaciones_jugador on public.notificaciones (jugador, id desc);
alter table public.notificaciones enable row level security;
drop policy if exists "jugador ve sus notificaciones" on public.notificaciones;
create policy "jugador ve sus notificaciones" on public.notificaciones for select to authenticated using (jugador = auth.uid());
revoke all on public.notificaciones from anon, authenticated;
grant select on public.notificaciones to authenticated;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones') then
    alter publication supabase_realtime add table public.notificaciones; end if;
end $$;

-- Cada vez que cambia la fila de Arena de un jugador: mejor récord, totales, recompensas nuevas y cambio de liga
create or replace function public._arena_trg_registro() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_antes text; v_ahora text; x jsonb;
begin
  new.mejor := greatest(new.mejor, old.mejor, new.puntos);
  new.total_v := new.total_v + greatest(0, new.victorias - old.victorias) + greatest(0, new.def_victorias - old.def_victorias);
  new.total_d := new.total_d + greatest(0, new.derrotas - old.derrotas) + greatest(0, new.def_derrotas - old.def_derrotas);
  if jsonb_array_length(new.avisos) > jsonb_array_length(old.avisos) then       -- recompensas recién cobradas (semana / temporada)
    for x in select e from jsonb_array_elements(new.avisos) with ordinality t(e, n) where n > jsonb_array_length(old.avisos) loop
      insert into public.notificaciones (jugador, tipo, datos) values (new.jugador, coalesce(x->>'tipo', 'semana'), x);
    end loop;
  end if;
  if new.temporada = old.temporada and new.puntos <> old.puntos then            -- subió o bajó de liga (no cuenta el reinicio de temporada)
    v_antes := public._arena_liga(old.puntos); v_ahora := public._arena_liga(new.puntos);
    if v_antes <> v_ahora then
      insert into public.notificaciones (jugador, tipo, datos)
        values (new.jugador, 'liga', jsonb_build_object('de', v_antes, 'a', v_ahora, 'sube', new.puntos > old.puntos, 'puntos', new.puntos));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists arena_registro on public.arena_jugadores;
create trigger arena_registro before update on public.arena_jugadores for each row execute function public._arena_trg_registro();

-- Al terminar un combate contra la Defensa de un jugador: le avisa al defensor (resistió o cayó, y ante quién)
create or replace function public._arena_trg_defensa() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.terminado and not old.terminado and new.defensor is not null then
    insert into public.notificaciones (jugador, tipo, datos) values (new.defensor, 'defensa', jsonb_build_object(
      'combate', new.id, 'atacante', (select nombre from public.jugadores where id = new.atacante),
      'cayo', coalesce(new.gano, false), 'delta', coalesce(new.delta_def, 0), 'venganza', new.venganza));
  end if;
  return null;
end $$;
drop trigger if exists arena_defensa_aviso on public.arena_combates;
create trigger arena_defensa_aviso after update of terminado on public.arena_combates for each row execute function public._arena_trg_defensa();

-- Mis notificaciones (últimas 50, se guardan 30 días). Antes, pone al día mi Arena para cobrar recompensas pendientes.
create or replace function public.notificaciones_lista() returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo();
begin
  if exists (select 1 from public.arena_jugadores where jugador = v_yo) then perform public._arena_al_dia(v_yo); end if;
  delete from public.notificaciones where jugador = v_yo and creada < now() - interval '30 days';
  return jsonb_build_object(
    'no_leidas', (select count(*) from public.notificaciones where jugador = v_yo and not leida),
    'lista', coalesce((select jsonb_agg(t order by t.id desc) from (
      select n.id, n.tipo, n.datos, n.leida, n.creada,
             (c.id is not null and c.gano and not c.vengado and c.iniciado > now() - interval '7 days') as puede_vengar,
             (c.id is not null and c.decisiones is not null) as repeticion
      from public.notificaciones n
      left join public.arena_combates c on n.tipo = 'defensa' and c.id = (n.datos->>'combate')::uuid
      where n.jugador = v_yo order by n.id desc limit 50) t), '[]'));
end $$;

-- Marcar como leídas (null = todas)
create or replace function public.notificaciones_leer(p_ids bigint[] default null) returns void language sql security definer set search_path = '' as $$
  update public.notificaciones set leida = true where jugador = auth.uid() and not leida and (p_ids is null or id = any (p_ids)) $$;

-- ============================================================ PERFIL DE ARENA (de cualquier jugador, por nombre)
create or replace function public.arena_perfil(p_nombre text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_id uuid; v_nombre text; a public.arena_jugadores; v_puesto int;
begin
  select id, nombre into v_id, v_nombre from public.jugadores where lower(nombre) = lower(trim(p_nombre));
  if v_id is null then raise exception 'Ese jugador no existe'; end if;
  if not exists (select 1 from public.arena_jugadores where jugador = v_id) then raise exception 'Ese jugador todavía no juega la Arena'; end if;
  a := public._arena_al_dia(v_id);
  v_puesto := public._arena_puesto(v_id);
  return jsonb_build_object('nombre', v_nombre, 'yo', v_id = v_yo, 'puntos', a.puntos, 'liga', public._arena_liga(a.puntos, v_puesto), 'puesto', v_puesto,
    'temporada', a.temporada, 'victorias', a.victorias + a.def_victorias, 'derrotas', a.derrotas + a.def_derrotas,
    'total_v', a.total_v, 'total_d', a.total_d, 'mejor', greatest(a.mejor, a.puntos),
    'titulos', coalesce((select jsonb_agg(jsonb_build_object('temporada', t.temporada, 'puesto', t.puesto) order by t.puesto, t.temporada desc)
                 from public.arena_titulos t where t.jugador = v_id and t.puesto <= 2), '[]'),
    'ataque', a.ataque, 'defensa', a.defensa,
    'equipo_atk', public._arena_equipo_json(v_id, a.ataque), 'equipo_def', public._arena_equipo_json(v_id, a.defensa));
end $$;

-- ============================================================ REPETICIÓN DE UN COMBATE (solo quien atacó o defendió)
create or replace function public.arena_repeticion(p_combate uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); c public.arena_combates;
begin
  select * into c from public.arena_combates where id = p_combate and (atacante = v_yo or defensor = v_yo);
  if not found or not c.terminado then raise exception 'Ese combate no se puede ver'; end if;
  if c.decisiones is null then raise exception 'Ese combate no tiene repetición'; end if;
  return jsonb_build_object('combate', c.id, 'ataque', c.ataque, 'defensa', c.defensa, 'semilla', c.semilla, 'equipo_atk', c.equipo_atk,
    'equipo_def', c.equipo_def, 'decisiones', c.decisiones, 'gano', c.gano, 'version', c.version, 'iniciado', c.iniciado,
    'soy', case when c.atacante = v_yo then 'atacante' else 'defensor' end,
    'atacante', (select nombre from public.jugadores where id = c.atacante),
    'defensor', coalesce((select nombre from public.jugadores where id = c.defensor), 'Defensa de práctica'));
end $$;

-- Historial de mi Defensa: igual que 010 + si tiene repetición
create or replace function public.arena_historial_defensa() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(t), '[]') from (
    select c.id as combate, j.nombre as atacante, c.ataque, not c.gano as defendida, c.delta_def, c.iniciado,
           (c.gano and not c.vengado and c.iniciado > now() - interval '7 days') as puede_vengar, c.vengado,
           (c.decisiones is not null) as repeticion
    from public.arena_combates c join public.jugadores j on j.id = c.atacante
    where c.defensor = auth.uid() and c.terminado order by c.iniciado desc limit 20) t $$;

-- ============================================================ PERMISOS
revoke all on function public._arena_trg_registro(), public._arena_trg_defensa() from public, anon, authenticated;
revoke all on function public.notificaciones_lista(), public.notificaciones_leer(bigint[]), public.arena_perfil(text),
  public.arena_repeticion(uuid), public.arena_historial_defensa() from public, anon;
grant execute on function public.notificaciones_lista(), public.notificaciones_leer(bigint[]), public.arena_perfil(text),
  public.arena_repeticion(uuid), public.arena_historial_defensa() to authenticated;

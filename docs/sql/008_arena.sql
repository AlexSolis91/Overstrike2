-- Overstrike 2 · Paso 8: ARENA (Fase 1). Equipos de Ataque y Defensa, ataques contra Defensas controladas por la IA,
-- puntos tipo Elo, 5 ataques diarios, 8 ligas, recompensas por victoria, semanales y de fin de temporada (temporadas de
-- 4 semanas que reinician a 0), clasificación de liga y ranking global.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001–006.

-- ============================================================ TABLAS
create table if not exists public.arena_jugadores (
  jugador        uuid primary key references public.jugadores (id) on delete cascade,
  puntos         integer not null default 0 check (puntos >= 0),
  defensa        text[] not null default '{}',           -- 5 campeones (el primero es el líder)
  ataque         text[] not null default '{}',           -- último equipo de ataque (se recuerda)
  temporada      integer not null default 0,
  semana         integer not null default 0,
  dia            date,                                   -- día de los contadores diarios (hora de México)
  diarios        integer not null default 0,             -- ataques diarios usados hoy (5)
  extra_puntos   integer not null default 0,             -- puntos ganados hoy con ataques extra (tope 60)
  def_puntos     integer not null default 0,             -- puntos ganados hoy por defensas exitosas (tope 100)
  victorias      integer not null default 0,
  derrotas       integer not null default 0,
  def_victorias  integer not null default 0,
  def_derrotas   integer not null default 0,
  avisos         jsonb not null default '[]'             -- recompensas semanales/de temporada cobradas (se muestran una vez)
);
create table if not exists public.arena_historial (      -- puntos finales de cada temporada (para Leyenda y la historia)
  jugador   uuid not null references public.jugadores (id) on delete cascade,
  temporada integer not null,
  puntos    integer not null,
  liga      text not null,
  primary key (jugador, temporada)
);
create table if not exists public.arena_combates (
  id         uuid primary key default gen_random_uuid(),
  atacante   uuid not null references public.jugadores (id) on delete cascade,
  defensor   uuid references public.jugadores (id) on delete set null,   -- null = Defensa de práctica (bot)
  ataque     text[] not null,
  defensa    text[] not null,
  diario     boolean not null,
  semilla    integer not null,
  iniciado   timestamptz not null default now(),
  terminado  boolean not null default false,
  gano       boolean,
  delta      integer,
  delta_def  integer
);
create index if not exists arena_combates_def on public.arena_combates (defensor, iniciado desc);
create index if not exists arena_combates_atk on public.arena_combates (atacante, iniciado desc);
alter table public.arena_jugadores enable row level security;
alter table public.arena_historial enable row level security;
alter table public.arena_combates enable row level security;
drop policy if exists "jugador ve su arena" on public.arena_jugadores;
create policy "jugador ve su arena" on public.arena_jugadores for select to authenticated using (jugador = auth.uid());
drop policy if exists "jugador ve su historial de arena" on public.arena_historial;
create policy "jugador ve su historial de arena" on public.arena_historial for select to authenticated using (jugador = auth.uid());
drop policy if exists "jugador ve sus combates de arena" on public.arena_combates;
create policy "jugador ve sus combates de arena" on public.arena_combates for select to authenticated using (atacante = auth.uid() or defensor = auth.uid());
revoke all on public.arena_jugadores, public.arena_historial, public.arena_combates from anon, authenticated;
grant select on public.arena_jugadores, public.arena_historial, public.arena_combates to authenticated;

-- ============================================================ TIEMPO: día, semana y temporada (hora de México)
-- La temporada 1 empieza el lunes 2026-10-19; cada temporada dura 4 semanas.
create or replace function public._arena_dia() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Mexico_City')::date $$;
create or replace function public._arena_semana() returns integer language sql stable set search_path = '' as $$
  select greatest(1, floor((public._arena_dia() - date '2026-10-19') / 7.0)::int + 1) $$;
create or replace function public._arena_temporada() returns integer language sql stable set search_path = '' as $$
  select (public._arena_semana() - 1) / 4 + 1 $$;

-- Liga según los puntos (Leyenda: top 100 de la temporada con más de 2,800; p_puesto = puesto en el ranking)
create or replace function public._arena_liga(p_puntos int, p_puesto int default null) returns text language sql immutable set search_path = '' as $$
  select case when p_puntos > 2800 and p_puesto is not null and p_puesto <= 100 then 'Leyenda'
              when p_puntos >= 2400 then 'Master' when p_puntos >= 2000 then 'Campeones' when p_puntos >= 1600 then 'Diamante'
              when p_puntos >= 1200 then 'Platino' when p_puntos >= 800 then 'Oro' when p_puntos >= 400 then 'Plata' else 'Bronce' end $$;
create or replace function public._arena_puesto(p_jugador uuid) returns integer language sql stable security definer set search_path = '' as $$
  select 1 + count(*)::int from public.arena_jugadores a, public.arena_jugadores yo
    where yo.jugador = p_jugador and a.temporada = yo.temporada and a.puntos > yo.puntos $$;

-- Oro por victoria, recompensa semanal y de fin de temporada por liga
create or replace function public._arena_oro_victoria(p_liga text) returns integer language sql immutable set search_path = '' as $$
  select case p_liga when 'Bronce' then 1000 when 'Plata' then 1250 when 'Oro' then 1500 when 'Platino' then 1750 when 'Diamante' then 2000
    when 'Campeones' then 2250 when 'Master' then 2500 else 3000 end $$;

-- Pone al día la fila del jugador: la crea, reinicia los contadores del día, cobra la semana y cierra la temporada (reinicio a 0)
create or replace function public._arena_al_dia(p_yo uuid) returns public.arena_jugadores language plpgsql security definer set search_path = '' as $$
declare a public.arena_jugadores; v_sem int := public._arena_semana(); v_tem int := public._arena_temporada(); v_liga text; v_puesto int;
        v_oro int; v_runas int; v_frag int; v_vales int;
begin
  insert into public.arena_jugadores (jugador, temporada, semana, dia) values (p_yo, v_tem, v_sem, public._arena_dia()) on conflict do nothing;
  select * into a from public.arena_jugadores where jugador = p_yo for update;
  if a.dia is distinct from public._arena_dia() then
    update public.arena_jugadores set dia = public._arena_dia(), diarios = 0, extra_puntos = 0, def_puntos = 0 where jugador = p_yo;
  end if;
  -- semana nueva: recompensa semanal según la liga con la que terminó la semana
  if a.semana < v_sem and (a.victorias + a.derrotas + a.def_victorias + a.def_derrotas) > 0 then
    v_puesto := public._arena_puesto(p_yo); v_liga := public._arena_liga(a.puntos, v_puesto);
    select x.r, x.o, x.f, x.v into v_runas, v_oro, v_frag, v_vales from (values
      ('Bronce', 1, 10000, 0, 0), ('Plata', 1, 20000, 0, 0), ('Oro', 2, 30000, 5, 0), ('Platino', 2, 40000, 10, 0),
      ('Diamante', 3, 60000, 10, 1), ('Campeones', 3, 80000, 15, 1), ('Master', 4, 100000, 20, 2), ('Leyenda', 4, 150000, 20, 2)) x(l, r, o, f, v)
      where x.l = v_liga;
    update public.inventario set runas_portal = runas_portal + v_runas, oro = oro + v_oro, frag_runa = frag_runa + v_frag,
      vales_sobre = vales_sobre + v_vales where jugador = p_yo;
    update public.arena_jugadores set avisos = avisos || jsonb_build_object('tipo', 'semana', 'liga', v_liga, 'runas', v_runas,
      'oro', v_oro, 'fragmentos', v_frag, 'vales', v_vales) where jugador = p_yo;
  end if;
  update public.arena_jugadores set semana = v_sem where jugador = p_yo;
  -- temporada nueva: oro de fin de temporada según la liga final y todos vuelven a 0
  if a.temporada < v_tem then
    v_puesto := public._arena_puesto(p_yo); v_liga := public._arena_liga(a.puntos, v_puesto);
    if (a.victorias + a.derrotas + a.def_victorias + a.def_derrotas) > 0 then
      v_oro := case v_liga when 'Bronce' then 50000 when 'Plata' then 100000 when 'Oro' then 200000 when 'Platino' then 350000
        when 'Diamante' then 500000 when 'Campeones' then 800000 when 'Master' then 1200000 else 2000000 end;
      update public.inventario set oro = oro + v_oro where jugador = p_yo;
      insert into public.arena_historial (jugador, temporada, puntos, liga) values (p_yo, a.temporada, a.puntos, v_liga) on conflict do nothing;
      update public.arena_jugadores set avisos = avisos || jsonb_build_object('tipo', 'temporada', 'temporada', a.temporada, 'liga', v_liga, 'oro', v_oro)
        where jugador = p_yo;
    end if;
    update public.arena_jugadores set temporada = v_tem, puntos = 0, victorias = 0, derrotas = 0, def_victorias = 0, def_derrotas = 0
      where jugador = p_yo;
  end if;
  select * into a from public.arena_jugadores where jugador = p_yo;
  return a;
end $$;

-- ============================================================ ESTADO Y EQUIPOS
-- Estado de mi Arena (y los avisos de recompensas, que se vacían al leerlos)
create or replace function public.arena_estado() returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); a public.arena_jugadores; v_puesto int; v_campeones int; v_avisos jsonb;
begin
  a := public._arena_al_dia(v_yo);
  v_avisos := a.avisos;
  update public.arena_jugadores set avisos = '[]' where jugador = v_yo;
  v_puesto := public._arena_puesto(v_yo);
  select count(*) into v_campeones from public.coleccion where jugador = v_yo;
  return jsonb_build_object('puntos', a.puntos, 'liga', public._arena_liga(a.puntos, v_puesto), 'puesto', v_puesto,
    'temporada', a.temporada, 'semana', public._arena_semana(), 'diarios', 5 - a.diarios, 'extra_puntos', a.extra_puntos,
    'def_puntos', a.def_puntos, 'defensa', a.defensa, 'ataque', a.ataque, 'victorias', a.victorias, 'derrotas', a.derrotas,
    'def_victorias', a.def_victorias, 'def_derrotas', a.def_derrotas, 'campeones', v_campeones, 'avisos', v_avisos,
    'fin_temporada', (date '2026-10-19' + (a.temporada * 28)));
end $$;

-- Guardar equipo (p_tipo 'defensa' o 'ataque'): 5 campeones propios, distintos, sin repetir con el otro equipo
create or replace function public.arena_guardar_equipo(p_tipo text, p_equipo text[]) returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); a public.arena_jugadores;
begin
  if p_tipo not in ('defensa', 'ataque') then raise exception 'Equipo desconocido'; end if;
  if cardinality(p_equipo) <> 5 or (select count(distinct x) from unnest(p_equipo) x) <> 5 then raise exception 'El equipo debe tener 5 campeones distintos'; end if;
  if (select count(*) from public.coleccion where jugador = v_yo and campeon = any (p_equipo)) <> 5 then raise exception 'Solo puedes usar tus campeones'; end if;
  if (select count(*) from public.coleccion where jugador = v_yo) < 10 then raise exception 'La Arena se desbloquea con 10 campeones'; end if;
  a := public._arena_al_dia(v_yo);
  if (case p_tipo when 'defensa' then a.ataque else a.defensa end) && p_equipo then
    raise exception 'Un campeón no puede estar en tu equipo de Ataque y en el de Defensa'; end if;
  if p_tipo = 'defensa' then update public.arena_jugadores set defensa = p_equipo where jugador = v_yo;
  else update public.arena_jugadores set ataque = p_equipo where jugador = v_yo; end if;
end $$;

-- Datos de batalla de un equipo de un jugador: estrellas, espacios abiertos y reliquias equipadas de cada campeón
create or replace function public._arena_equipo_json(p_jugador uuid, p_equipo text[]) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'col', coalesce((select jsonb_agg(jsonb_build_object('campeon', c.campeon, 'estrellas', c.estrellas, 'espacios', c.espacios, 'espacios_abiertos', c.espacios_abiertos))
            from public.coleccion c where c.jugador = p_jugador and c.campeon = any (p_equipo)), '[]'),
    'reliquias', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'reliquia', r.reliquia, 'plana_stat', r.plana_stat, 'plana_valor', r.plana_valor,
            'tiradas', r.tiradas, 'campeon', r.campeon, 'espacio', r.espacio))
            from public.reliquias r where r.jugador = p_jugador and r.campeon = any (p_equipo)), '[]')) $$;

-- ============================================================ ATACAR (Fase 1: contra la Defensa de otro jugador, jugada por la IA)
-- Busca una Defensa de puntos parecidos (±150, ampliando), que no sea la mía ni la última que ataqué. Si no hay, una Defensa
-- de práctica (bot) que arma el juego. Registra el combate (con su semilla) y gasta un ataque diario si quedan.
create or replace function public.arena_atacar(p_ataque text[]) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); a public.arena_jugadores; r public.arena_jugadores; v_rango int; v_ultimo uuid; v_id uuid; v_semilla int;
        v_diario boolean; v_nombre text;
begin
  perform public.arena_guardar_equipo('ataque', p_ataque);
  a := public._arena_al_dia(v_yo);
  if cardinality(a.defensa) <> 5 then raise exception 'Primero publica tu equipo de Defensa'; end if;
  select defensor into v_ultimo from public.arena_combates where atacante = v_yo order by iniciado desc limit 1;
  foreach v_rango in array array[150, 400, 1000, 100000] loop
    select * into r from public.arena_jugadores x
      where x.jugador <> v_yo and cardinality(x.defensa) = 5 and x.temporada = a.temporada and abs(x.puntos - a.puntos) <= v_rango
        and x.jugador is distinct from v_ultimo
      order by random() limit 1;
    exit when found;
  end loop;
  v_diario := a.diarios < 5;
  if v_diario then update public.arena_jugadores set diarios = diarios + 1 where jugador = v_yo; end if;
  v_semilla := floor(random() * 2000000000)::int;
  if r.jugador is null then                                    -- nadie más tiene Defensa: práctica contra un bot
    insert into public.arena_combates (atacante, defensor, ataque, defensa, diario, semilla) values (v_yo, null, p_ataque, '{}', v_diario, v_semilla) returning id into v_id;
    return jsonb_build_object('combate', v_id, 'semilla', v_semilla, 'diario', v_diario, 'bot', true, 'rival', jsonb_build_object('nombre', 'Defensa de práctica', 'puntos', a.puntos),
      'ataque', public._arena_equipo_json(v_yo, p_ataque));
  end if;
  select nombre into v_nombre from public.jugadores where id = r.jugador;
  insert into public.arena_combates (atacante, defensor, ataque, defensa, diario, semilla) values (v_yo, r.jugador, p_ataque, r.defensa, v_diario, v_semilla) returning id into v_id;
  return jsonb_build_object('combate', v_id, 'semilla', v_semilla, 'diario', v_diario, 'bot', false,
    'rival', jsonb_build_object('nombre', v_nombre, 'puntos', r.puntos, 'liga', public._arena_liga(r.puntos, public._arena_puesto(r.jugador)), 'defensa', r.defensa),
    'equipo_rival', public._arena_equipo_json(r.jugador, r.defensa), 'ataque', public._arena_equipo_json(v_yo, p_ataque));
end $$;

-- Resultado: puntos tipo Elo (K 32; ganar 15–30, perder 10–25). Ataque extra: 25% (tope +60 al día). Defensa: si gana +10
-- (diario) o +3 (extra), tope +100 al día; si pierde, la mitad (diario) o el 25% (extra) de lo que ganó el atacante.
-- Contra una Defensa de práctica: la mitad de puntos. Oro por victoria según la liga (10% en ataques extra).
create or replace function public.arena_resultado(p_combate uuid, p_gano boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); c public.arena_combates; a public.arena_jugadores; d public.arena_jugadores; v_e numeric; v_delta int; v_ddef int := 0;
        v_oro int := 0; v_mult numeric; v_liga text; v_rival int;
begin
  select * into c from public.arena_combates where id = p_combate and atacante = v_yo for update;
  if not found or c.terminado then raise exception 'Ese combate ya terminó'; end if;
  if c.iniciado > now() - interval '15 seconds' then raise exception 'Combate demasiado corto'; end if;
  a := public._arena_al_dia(v_yo);
  if c.defensor is not null then d := public._arena_al_dia(c.defensor); v_rival := d.puntos; else v_rival := a.puntos; end if;
  v_e := 1 / (1 + power(10, (v_rival - a.puntos) / 400.0));
  v_mult := case when c.diario then 1 else .25 end * case when c.defensor is null then .5 else 1 end;
  if p_gano then
    v_delta := round(least(30, greatest(15, 32 * (1 - v_e))) * v_mult);
    if not c.diario then v_delta := least(v_delta, greatest(0, 60 - a.extra_puntos)); end if;
    v_liga := public._arena_liga(a.puntos, public._arena_puesto(v_yo));
    v_oro := round(public._arena_oro_victoria(v_liga) * case when c.diario then 1 else .10 end);
    update public.arena_jugadores set puntos = puntos + v_delta, victorias = victorias + 1,
      extra_puntos = extra_puntos + case when c.diario then 0 else v_delta end where jugador = v_yo;
    update public.inventario set oro = oro + v_oro where jugador = v_yo;
    if c.defensor is not null then
      v_ddef := -round(v_delta * case when c.diario then .5 else 1 end);
      update public.arena_jugadores set puntos = greatest(0, puntos + v_ddef), def_derrotas = def_derrotas + 1 where jugador = c.defensor;
    end if;
  else
    v_delta := -round(least(25, greatest(10, 32 * v_e)) * v_mult);
    update public.arena_jugadores set puntos = greatest(0, puntos + v_delta), derrotas = derrotas + 1 where jugador = v_yo;
    if c.defensor is not null then
      v_ddef := least(case when c.diario then 10 else 3 end, greatest(0, 100 - d.def_puntos));
      update public.arena_jugadores set puntos = puntos + v_ddef, def_puntos = def_puntos + v_ddef, def_victorias = def_victorias + 1 where jugador = c.defensor;
    end if;
  end if;
  update public.arena_combates set terminado = true, gano = p_gano, delta = v_delta, delta_def = v_ddef where id = p_combate;
  select * into a from public.arena_jugadores where jugador = v_yo;
  return jsonb_build_object('delta', v_delta, 'puntos', a.puntos, 'oro', v_oro, 'liga', public._arena_liga(a.puntos, public._arena_puesto(v_yo)), 'diario', c.diario);
end $$;

-- ============================================================ CLASIFICACIÓN
-- p_liga null = ranking global (top 100); con liga = los mejores 100 de esa liga. Incluye mi puesto.
create or replace function public.arena_ranking(p_liga text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_tem int := public._arena_temporada(); v_lista jsonb;
begin
  perform public._arena_al_dia(v_yo);
  select coalesce(jsonb_agg(t order by t.puesto), '[]') into v_lista from (
    select row_number() over (order by a.puntos desc, a.victorias desc) as puesto, j.nombre, a.puntos,
           public._arena_liga(a.puntos, (row_number() over (order by a.puntos desc, a.victorias desc))::int) as liga,
           a.defensa[1] as lider, a.victorias, a.derrotas, (a.jugador = v_yo) as yo
    from public.arena_jugadores a join public.jugadores j on j.id = a.jugador
    where a.temporada = v_tem and (a.victorias + a.derrotas + a.def_victorias + a.def_derrotas) > 0
    order by a.puntos desc limit 1000) t
    where p_liga is null or t.liga = p_liga;
  return jsonb_build_object('lista', (select coalesce(jsonb_agg(x), '[]') from (select * from jsonb_array_elements(v_lista) limit 100) s(x)),
    'puesto', public._arena_puesto(v_yo));
end $$;

-- Historial de mi Defensa (últimos 20 ataques recibidos)
create or replace function public.arena_historial_defensa() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(t), '[]') from (
    select j.nombre as atacante, c.ataque, not c.gano as defendida, c.delta_def, c.iniciado
    from public.arena_combates c join public.jugadores j on j.id = c.atacante
    where c.defensor = auth.uid() and c.terminado order by c.iniciado desc limit 20) t $$;

-- ============================================================ PERMISOS
revoke all on function public._arena_dia(), public._arena_semana(), public._arena_temporada(), public._arena_liga(int, int),
  public._arena_puesto(uuid), public._arena_oro_victoria(text), public._arena_al_dia(uuid), public._arena_equipo_json(uuid, text[]) from public, anon, authenticated;
revoke all on function public.arena_estado(), public.arena_guardar_equipo(text, text[]), public.arena_atacar(text[]), public.arena_resultado(uuid, boolean),
  public.arena_ranking(text), public.arena_historial_defensa() from public, anon;
grant execute on function public.arena_estado(), public.arena_guardar_equipo(text, text[]), public.arena_atacar(text[]), public.arena_resultado(uuid, boolean),
  public.arena_ranking(text), public.arena_historial_defensa() to authenticated;

-- Overstrike 2 · Paso 10: ARENA Fase 3. Venganza, títulos del top 3 de cada temporada, foto de los equipos al empezar cada
-- combate (para poder repetirlo) y VERIFICACIÓN opcional en el servidor (Edge Function "verificar-arena").
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 008 y 009.
-- La verificación empieza APAGADA. Para encenderla (después de publicar la Edge Function):
--   update public.arena_config set verificar = true;

-- ============================================================ COLUMNAS Y TABLAS
alter table public.arena_combates add column if not exists equipo_atk jsonb;
alter table public.arena_combates add column if not exists equipo_def jsonb;
alter table public.arena_combates add column if not exists decisiones jsonb;
alter table public.arena_combates add column if not exists version text;
alter table public.arena_combates add column if not exists verificado text;          -- null · 'pendiente' · 'ok' · 'falla' · 'sin_verificar'
alter table public.arena_combates add column if not exists vengado boolean not null default false;
alter table public.arena_combates add column if not exists venganza boolean not null default false;

create table if not exists public.arena_config (id int primary key default 1 check (id = 1), verificar boolean not null default false);
insert into public.arena_config (id) values (1) on conflict do nothing;
alter table public.arena_config enable row level security;
drop policy if exists "todos ven la config de arena" on public.arena_config;
create policy "todos ven la config de arena" on public.arena_config for select to anon, authenticated using (true);
revoke all on public.arena_config from anon, authenticated;
grant select on public.arena_config to anon, authenticated;

create table if not exists public.arena_titulos (
  jugador   uuid not null references public.jugadores (id) on delete cascade,
  temporada integer not null,
  puesto    integer not null check (puesto between 1 and 3),
  primary key (jugador, temporada)
);
alter table public.arena_titulos enable row level security;
drop policy if exists "todos ven los titulos" on public.arena_titulos;
create policy "todos ven los titulos" on public.arena_titulos for select to anon, authenticated using (true);
revoke all on public.arena_titulos from anon, authenticated;
grant select on public.arena_titulos to anon, authenticated;

-- ============================================================ PUESTO DENTRO DE UNA TEMPORADA (cuenta a quienes ya la cerraron)
create or replace function public._arena_puesto_temp(p_temporada int, p_puntos int) returns integer language sql stable security definer set search_path = '' as $$
  select 1 + (select count(*)::int from public.arena_jugadores where temporada = p_temporada and puntos > p_puntos)
           + (select count(*)::int from public.arena_historial where temporada = p_temporada and puntos > p_puntos) $$;

-- Igual que en 008, pero el puesto de la semana/temporada que se cierra cuenta también a quienes ya la cerraron,
-- y el top 3 de la temporada recibe su título.
create or replace function public._arena_al_dia(p_yo uuid) returns public.arena_jugadores language plpgsql security definer set search_path = '' as $$
declare a public.arena_jugadores; v_sem int := public._arena_semana(); v_tem int := public._arena_temporada(); v_liga text; v_puesto int;
        v_oro int; v_runas int; v_frag int; v_vales int;
begin
  insert into public.arena_jugadores (jugador, temporada, semana, dia) values (p_yo, v_tem, v_sem, public._arena_dia()) on conflict do nothing;
  select * into a from public.arena_jugadores where jugador = p_yo for update;
  if a.dia is distinct from public._arena_dia() then
    update public.arena_jugadores set dia = public._arena_dia(), diarios = 0, extra_puntos = 0, def_puntos = 0 where jugador = p_yo;
  end if;
  v_puesto := public._arena_puesto_temp(a.temporada, a.puntos);
  v_liga := public._arena_liga(a.puntos, v_puesto);
  if a.semana < v_sem and (a.victorias + a.derrotas + a.def_victorias + a.def_derrotas) > 0 then
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
  if a.temporada < v_tem then
    if (a.victorias + a.derrotas + a.def_victorias + a.def_derrotas) > 0 then
      v_oro := case v_liga when 'Bronce' then 50000 when 'Plata' then 100000 when 'Oro' then 200000 when 'Platino' then 350000
        when 'Diamante' then 500000 when 'Campeones' then 800000 when 'Master' then 1200000 else 2000000 end;
      update public.inventario set oro = oro + v_oro where jugador = p_yo;
      insert into public.arena_historial (jugador, temporada, puntos, liga) values (p_yo, a.temporada, a.puntos, v_liga) on conflict do nothing;
      if v_puesto <= 3 then insert into public.arena_titulos (jugador, temporada, puesto) values (p_yo, a.temporada, v_puesto) on conflict do nothing; end if;
      update public.arena_jugadores set avisos = avisos || jsonb_build_object('tipo', 'temporada', 'temporada', a.temporada, 'liga', v_liga, 'oro', v_oro,
        'puesto', case when v_puesto <= 3 then v_puesto end) where jugador = p_yo;
    end if;
    update public.arena_jugadores set temporada = v_tem, puntos = 0, victorias = 0, derrotas = 0, def_victorias = 0, def_derrotas = 0
      where jugador = p_yo;
  end if;
  select * into a from public.arena_jugadores where jugador = p_yo;
  return a;
end $$;

-- ============================================================ ATACAR (con foto de los equipos; Defensa de práctica elegida por el servidor)
drop function if exists public.arena_atacar(text[]);
create or replace function public._arena_crear_combate(p_yo uuid, p_ataque text[], p_rival uuid, p_version text, p_venganza boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.arena_jugadores; r public.arena_jugadores; v_id uuid; v_semilla int := floor(random() * 2000000000)::int; v_diario boolean; v_nombre text; v_def text[];
begin
  a := public._arena_al_dia(p_yo);
  v_diario := a.diarios < 5;
  if v_diario then update public.arena_jugadores set diarios = diarios + 1 where jugador = p_yo; end if;
  if p_rival is null then                                       -- Defensa de práctica: 5 campeones al azar con el equipo de su ficha
    select array_agg(id) into v_def from (select id from public.campeones where activo order by random() limit 5) t;
    insert into public.arena_combates (atacante, defensor, ataque, defensa, diario, semilla, equipo_atk, version)
      values (p_yo, null, p_ataque, v_def, v_diario, v_semilla, public._arena_equipo_json(p_yo, p_ataque), p_version) returning id into v_id;
    return jsonb_build_object('combate', v_id, 'semilla', v_semilla, 'diario', v_diario, 'bot', true,
      'rival', jsonb_build_object('nombre', 'Defensa de práctica', 'puntos', a.puntos, 'defensa', v_def), 'ataque', public._arena_equipo_json(p_yo, p_ataque));
  end if;
  select * into r from public.arena_jugadores where jugador = p_rival;
  select nombre into v_nombre from public.jugadores where id = p_rival;
  insert into public.arena_combates (atacante, defensor, ataque, defensa, diario, semilla, equipo_atk, equipo_def, version, venganza)
    values (p_yo, p_rival, p_ataque, r.defensa, v_diario, v_semilla, public._arena_equipo_json(p_yo, p_ataque), public._arena_equipo_json(p_rival, r.defensa), p_version, p_venganza)
    returning id into v_id;
  return jsonb_build_object('combate', v_id, 'semilla', v_semilla, 'diario', v_diario, 'bot', false, 'venganza', p_venganza,
    'rival', jsonb_build_object('nombre', v_nombre, 'puntos', r.puntos, 'liga', public._arena_liga(r.puntos, public._arena_puesto(p_rival)), 'defensa', r.defensa),
    'equipo_rival', public._arena_equipo_json(p_rival, r.defensa), 'ataque', public._arena_equipo_json(p_yo, p_ataque));
end $$;

create or replace function public.arena_atacar(p_ataque text[], p_version text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); a public.arena_jugadores; r public.arena_jugadores; v_rango int; v_ultimo uuid;
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
  return public._arena_crear_combate(v_yo, p_ataque, r.jugador, p_version, false);
end $$;

-- Venganza: atacar a quien venció tu Defensa (una vez por derrota, dentro de 7 días; cuenta como ataque normal)
create or replace function public.arena_venganza(p_combate uuid, p_ataque text[], p_version text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); c public.arena_combates; r public.arena_jugadores;
begin
  select * into c from public.arena_combates where id = p_combate and defensor = v_yo for update;
  if not found or not c.terminado or not c.gano then raise exception 'No puedes vengar ese combate'; end if;
  if c.vengado then raise exception 'Ya te vengaste de ese ataque'; end if;
  if c.iniciado < now() - interval '7 days' then raise exception 'La venganza expiró (7 días)'; end if;
  perform public.arena_guardar_equipo('ataque', p_ataque);
  select * into r from public.arena_jugadores where jugador = c.atacante;
  if r.jugador is null or cardinality(r.defensa) <> 5 then raise exception 'Ese jugador no tiene Defensa publicada'; end if;
  update public.arena_combates set vengado = true where id = p_combate;
  return public._arena_crear_combate(v_yo, p_ataque, c.atacante, p_version, true);
end $$;

-- ============================================================ RESULTADO (pago separado para poder verificarlo antes)
create or replace function public._arena_pagar(p_combate uuid, p_gano boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.arena_combates; a public.arena_jugadores; d public.arena_jugadores; v_e numeric; v_delta int; v_ddef int := 0;
        v_oro int := 0; v_mult numeric; v_liga text; v_rival int;
begin
  select * into c from public.arena_combates where id = p_combate for update;
  a := public._arena_al_dia(c.atacante);
  if c.defensor is not null then d := public._arena_al_dia(c.defensor); v_rival := d.puntos; else v_rival := a.puntos; end if;
  v_e := 1 / (1 + power(10, (v_rival - a.puntos) / 400.0));
  v_mult := case when c.diario then 1 else .25 end * case when c.defensor is null then .5 else 1 end;
  if p_gano then
    v_delta := round(least(30, greatest(15, 32 * (1 - v_e))) * v_mult);
    if not c.diario then v_delta := least(v_delta, greatest(0, 60 - a.extra_puntos)); end if;
    v_liga := public._arena_liga(a.puntos, public._arena_puesto(c.atacante));
    v_oro := round(public._arena_oro_victoria(v_liga) * case when c.diario then 1 else .10 end);
    update public.arena_jugadores set puntos = puntos + v_delta, victorias = victorias + 1,
      extra_puntos = extra_puntos + case when c.diario then 0 else v_delta end where jugador = c.atacante;
    update public.inventario set oro = oro + v_oro where jugador = c.atacante;
    if c.defensor is not null then
      v_ddef := -round(v_delta * case when c.diario then .5 else 1 end);
      update public.arena_jugadores set puntos = greatest(0, puntos + v_ddef), def_derrotas = def_derrotas + 1 where jugador = c.defensor;
    end if;
  else
    v_delta := -round(least(25, greatest(10, 32 * v_e)) * v_mult);
    update public.arena_jugadores set puntos = greatest(0, puntos + v_delta), derrotas = derrotas + 1 where jugador = c.atacante;
    if c.defensor is not null then
      v_ddef := least(case when c.diario then 10 else 3 end, greatest(0, 100 - d.def_puntos));
      update public.arena_jugadores set puntos = puntos + v_ddef, def_puntos = def_puntos + v_ddef, def_victorias = def_victorias + 1 where jugador = c.defensor;
    end if;
  end if;
  update public.arena_combates set terminado = true, gano = p_gano, delta = v_delta, delta_def = v_ddef where id = p_combate;
  select * into a from public.arena_jugadores where jugador = c.atacante;
  return jsonb_build_object('delta', v_delta, 'puntos', a.puntos, 'oro', v_oro, 'liga', public._arena_liga(a.puntos, public._arena_puesto(c.atacante)), 'diario', c.diario);
end $$;

-- El jugador reporta (con sus decisiones). Si la verificación está encendida, queda pendiente hasta que la Edge Function la repita.
drop function if exists public.arena_resultado(uuid, boolean);
create or replace function public.arena_resultado(p_combate uuid, p_gano boolean, p_decisiones jsonb default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); c public.arena_combates; v_ver boolean;
begin
  select * into c from public.arena_combates where id = p_combate and atacante = v_yo for update;
  if not found or c.terminado then raise exception 'Ese combate ya terminó'; end if;
  if c.iniciado > now() - interval '15 seconds' then raise exception 'Combate demasiado corto'; end if;
  select verificar into v_ver from public.arena_config where id = 1;
  update public.arena_combates set decisiones = p_decisiones, gano = p_gano where id = p_combate;
  if coalesce(v_ver, false) and p_decisiones is not null then
    update public.arena_combates set verificado = 'pendiente' where id = p_combate;
    return jsonb_build_object('pendiente', true);
  end if;
  update public.arena_combates set verificado = case when coalesce(v_ver, false) then 'sin_verificar' else null end where id = p_combate;
  return public._arena_pagar(p_combate, p_gano);
end $$;

-- Lo llama SOLO la Edge Function (llave de servicio) después de repetir la batalla. p_ok = false: el resultado no cuadra
-- con la repetición → cuenta como derrota del atacante.
create or replace function public.arena_resultado_verificado(p_combate uuid, p_ok boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.arena_combates;
begin
  select * into c from public.arena_combates where id = p_combate for update;
  if not found or c.terminado then raise exception 'Ese combate ya terminó'; end if;
  update public.arena_combates set verificado = case when p_ok then 'ok' else 'falla' end where id = p_combate;
  return public._arena_pagar(p_combate, p_ok and c.gano) || jsonb_build_object('verificado', p_ok);
end $$;

-- ============================================================ HISTORIAL (con Venganza) Y RANKING (con títulos)
create or replace function public.arena_historial_defensa() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(t), '[]') from (
    select c.id as combate, j.nombre as atacante, c.ataque, not c.gano as defendida, c.delta_def, c.iniciado,
           (c.gano and not c.vengado and c.iniciado > now() - interval '7 days') as puede_vengar, c.vengado
    from public.arena_combates c join public.jugadores j on j.id = c.atacante
    where c.defensor = auth.uid() and c.terminado order by c.iniciado desc limit 20) t $$;

create or replace function public.arena_ranking(p_liga text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_tem int := public._arena_temporada(); v_lista jsonb;
begin
  perform public._arena_al_dia(v_yo);
  select coalesce(jsonb_agg(t order by t.puesto), '[]') into v_lista from (
    select row_number() over (order by a.puntos desc, a.victorias desc) as puesto, j.nombre, a.puntos,
           public._arena_liga(a.puntos, (row_number() over (order by a.puntos desc, a.victorias desc))::int) as liga,
           a.defensa[1] as lider, a.victorias, a.derrotas, (a.jugador = v_yo) as yo,
           (select jsonb_build_object('temporada', ti.temporada, 'puesto', ti.puesto) from public.arena_titulos ti
              where ti.jugador = a.jugador order by ti.puesto, ti.temporada desc limit 1) as titulo
    from public.arena_jugadores a join public.jugadores j on j.id = a.jugador
    where a.temporada = v_tem and (a.victorias + a.derrotas + a.def_victorias + a.def_derrotas) > 0
    order by a.puntos desc limit 1000) t
    where p_liga is null or t.liga = p_liga;
  return jsonb_build_object('lista', (select coalesce(jsonb_agg(x), '[]') from (select * from jsonb_array_elements(v_lista) limit 100) s(x)),
    'puesto', public._arena_puesto(v_yo));
end $$;

-- Mis títulos (para la pantalla de la Arena)
create or replace function public.arena_mis_titulos() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('temporada', temporada, 'puesto', puesto) order by temporada desc), '[]')
  from public.arena_titulos where jugador = auth.uid() $$;

-- ============================================================ PERMISOS
revoke all on function public._arena_puesto_temp(int, int), public._arena_crear_combate(uuid, text[], uuid, text, boolean),
  public._arena_pagar(uuid, boolean), public.arena_resultado_verificado(uuid, boolean) from public, anon, authenticated;
grant execute on function public.arena_resultado_verificado(uuid, boolean) to service_role;
revoke all on function public.arena_atacar(text[], text), public.arena_venganza(uuid, text[], text), public.arena_resultado(uuid, boolean, jsonb),
  public.arena_historial_defensa(), public.arena_ranking(text), public.arena_mis_titulos() from public, anon;
grant execute on function public.arena_atacar(text[], text), public.arena_venganza(uuid, text[], text), public.arena_resultado(uuid, boolean, jsonb),
  public.arena_historial_defensa(), public.arena_ranking(text), public.arena_mis_titulos() to authenticated;

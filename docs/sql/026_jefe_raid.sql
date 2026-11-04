-- Overstrike 2 · Paso 26: JEFE DE RAID. Todos los jugadores atacan al mismo jefe; no hay clanes.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001–025.
-- · 5 dificultades, cada una con su barra de HP compartida. Se reinicia a medianoche, hora de México. Derrotar una abre la siguiente.
-- · Llaves: 1 cada 6 horas, máximo 4. Cada ataque gasta 1.
-- · Cofre por dificultad y día, según 4 rangos de daño. Se reclama al derrotar al jefe o al cerrar el día.
-- · Jefe derrotado: duplica oro, polvo y runas (no las reliquias ni la receta).
-- · Receta: 1 tirada por jugador y día, en la dificultad más alta donde alcanzó cofre. Se hace al cerrar el día.
-- · Administrador: un solo porcentaje escala el HP y los rangos de todas las dificultades.

-- ============================================================ CONFIGURACIÓN
create table if not exists public.raid_config (
  id integer primary key default 1 check (id = 1),
  jefe text not null default 'lich-king',
  legendaria text not null default 'frostmourne',
  escala numeric not null default 1 check (escala > 0),
  verificar boolean not null default false              -- encender al publicar la Edge Function verificar-raid
);
insert into public.raid_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.raid_dificultades (
  id text primary key, orden integer not null unique, nombre text not null,
  hp_base bigint not null, rango1 bigint not null, rango2 bigint not null, rango3 bigint not null, rango4 bigint not null,
  oro integer not null, polvo integer not null, runas integer not null,     -- del cofre 4, sin duplicar
  p_rara numeric not null, p_especial numeric not null, p_epica numeric not null, p_receta numeric not null
);
insert into public.raid_dificultades values
  ('facil',     1, 'Fácil',      500000, 5000, 20000, 40000, 80000,  47500,  20, 0, .30, .05, 0,    .015),
  ('normal',    2, 'Normal',    1000000, 4000, 16000, 32000, 64000,  95000,  40, 1, .40, .10, .005, .03),
  ('dificil',   3, 'Difícil',   1670000, 3000, 12000, 24000, 48000, 165000,  70, 1, .50, .15, .01,  .045),
  ('brutal',    4, 'Brutal',    2500000, 2000,  7000, 14000, 28000, 257500, 110, 2, .60, .25, .02,  .06),
  ('pesadilla', 5, 'Pesadilla', 3330000, 1500,  5000, 10000, 20000, 375000, 160, 3, .70, .35, .03,  .075)
on conflict (id) do update set orden = excluded.orden, nombre = excluded.nombre, hp_base = excluded.hp_base,
  rango1 = excluded.rango1, rango2 = excluded.rango2, rango3 = excluded.rango3, rango4 = excluded.rango4,
  oro = excluded.oro, polvo = excluded.polvo, runas = excluded.runas,
  p_rara = excluded.p_rara, p_especial = excluded.p_especial, p_epica = excluded.p_epica, p_receta = excluded.p_receta;

-- ============================================================ ESTADO
create table if not exists public.raid_desbloqueos (jefe text not null, dificultad text not null references public.raid_dificultades (id), primary key (jefe, dificultad));
create table if not exists public.raid_dias (
  dia date not null, dificultad text not null references public.raid_dificultades (id),
  hp_total bigint not null, hp_restante bigint not null, derrotado timestamptz,
  primary key (dia, dificultad)
);
create table if not exists public.raid_jugadores (
  jugador uuid primary key references public.jugadores (id) on delete cascade,
  llaves integer not null default 4 check (llaves between 0 and 4), desde timestamptz not null default now()
);
create table if not exists public.raid_ataques (
  id uuid primary key default gen_random_uuid(),
  jugador uuid not null references public.jugadores (id) on delete cascade,
  dia date not null, dificultad text not null references public.raid_dificultades (id),
  semilla bigint not null, hp_inicio bigint not null, hp_total bigint not null,
  equipo text[] not null, equipo_datos jsonb not null,
  version text, decisiones jsonb, dano bigint,
  estado text not null default 'jugando' check (estado in ('jugando', 'pendiente', 'hecho')),
  iniciado timestamptz not null default now()
);
create index if not exists raid_ataques_jugador on public.raid_ataques (jugador, estado);
create table if not exists public.raid_danos (
  dia date not null, dificultad text not null references public.raid_dificultades (id),
  jugador uuid not null references public.jugadores (id) on delete cascade,
  dano bigint not null default 0, reclamado boolean not null default false,
  primary key (dia, dificultad, jugador)
);
create table if not exists public.raid_tiradas (
  dia date not null, jugador uuid not null references public.jugadores (id) on delete cascade,
  dificultad text, gano boolean not null default false, legendaria text, visto boolean not null default false,
  primary key (dia, jugador)
);
alter table public.raid_config enable row level security;
alter table public.raid_dificultades enable row level security;
alter table public.raid_desbloqueos enable row level security;
alter table public.raid_dias enable row level security;
alter table public.raid_jugadores enable row level security;
alter table public.raid_ataques enable row level security;
alter table public.raid_danos enable row level security;
alter table public.raid_tiradas enable row level security;
revoke all on public.raid_config, public.raid_dificultades, public.raid_desbloqueos, public.raid_dias, public.raid_jugadores,
  public.raid_ataques, public.raid_danos, public.raid_tiradas from anon, authenticated;

-- ============================================================ AUXILIARES
create or replace function public._raid_hoy() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Mexico_City')::date
$$;

-- La fila de hoy de una dificultad (se crea la primera vez que alguien la pide)
create or replace function public._raid_dia(p_dif text) returns public.raid_dias
language plpgsql security definer set search_path = '' as $$
declare v_fila public.raid_dias; v_hoy date := public._raid_hoy();
begin
  insert into public.raid_dias (dia, dificultad, hp_total, hp_restante)
    select v_hoy, d.id, greatest(1, round(d.hp_base * c.escala)), greatest(1, round(d.hp_base * c.escala))
    from public.raid_dificultades d, public.raid_config c where d.id = p_dif
    on conflict (dia, dificultad) do nothing;
  select * into v_fila from public.raid_dias where dia = v_hoy and dificultad = p_dif;
  if not found then raise exception 'Esa dificultad no existe'; end if;
  return v_fila;
end $$;

-- Cofre alcanzado (0 = ninguno, 1–4) con la escala actual
create or replace function public._raid_cofre(p_dano bigint, p_dif public.raid_dificultades, p_escala numeric)
returns integer language sql immutable set search_path = '' as $$
  select case when p_dano >= p_dif.rango4 * p_escala then 4 when p_dano >= p_dif.rango3 * p_escala then 3
    when p_dano >= p_dif.rango2 * p_escala then 2 when p_dano >= p_dif.rango1 * p_escala then 1 else 0 end
$$;

-- Repone las llaves de un jugador y devuelve su fila
create or replace function public._raid_llaves(p_jugador uuid) returns public.raid_jugadores
language plpgsql security definer set search_path = '' as $$
declare v public.raid_jugadores; v_n int;
begin
  insert into public.raid_jugadores (jugador) values (p_jugador) on conflict (jugador) do nothing;
  select * into v from public.raid_jugadores where jugador = p_jugador for update;
  if v.llaves < 4 then
    v_n := floor(extract(epoch from now() - v.desde) / 21600);
    if v_n > 0 then
      v.desde := case when v.llaves + v_n >= 4 then now() else v.desde + v_n * interval '6 hours' end;
      v.llaves := least(4, v.llaves + v_n);
      update public.raid_jugadores set llaves = v.llaves, desde = v.desde where jugador = p_jugador;
    end if;
  end if;
  return v;
end $$;

-- Aplica el daño de un ataque: lo suma al jugador y baja la barra. Si llega a 0, derrota al jefe y abre la siguiente dificultad.
create or replace function public._raid_aplicar(p_ataque uuid, p_dano bigint, p_decisiones jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_a public.raid_ataques; v_d public.raid_dias; v_c public.raid_config; v_dif public.raid_dificultades; v_total bigint; v_sig text; v_dano bigint;
begin
  select * into v_a from public.raid_ataques where id = p_ataque for update;
  if not found or v_a.estado = 'hecho' then raise exception 'Ese ataque ya se contó'; end if;
  v_dano := least(greatest(coalesce(p_dano, 0), 0), v_a.hp_inicio);
  update public.raid_ataques set dano = v_dano, decisiones = coalesce(p_decisiones, decisiones), estado = 'hecho' where id = p_ataque;
  insert into public.raid_danos (dia, dificultad, jugador, dano) values (v_a.dia, v_a.dificultad, v_a.jugador, v_dano)
    on conflict (dia, dificultad, jugador) do update set dano = public.raid_danos.dano + excluded.dano returning dano into v_total;
  update public.raid_dias set hp_restante = greatest(0, hp_restante - v_dano) where dia = v_a.dia and dificultad = v_a.dificultad returning * into v_d;
  select * into v_c from public.raid_config where id = 1;
  select * into v_dif from public.raid_dificultades where id = v_a.dificultad;
  if v_d.hp_restante = 0 and v_d.derrotado is null then
    update public.raid_dias set derrotado = now() where dia = v_a.dia and dificultad = v_a.dificultad returning * into v_d;
    select id into v_sig from public.raid_dificultades where orden = v_dif.orden + 1;
    if v_sig is not null then insert into public.raid_desbloqueos values (v_c.jefe, v_sig) on conflict do nothing; end if;
  end if;
  return jsonb_build_object('dano', v_dano, 'total', v_total, 'hp_restante', v_d.hp_restante, 'hp_total', v_d.hp_total,
    'derrotado', v_d.derrotado is not null, 'cofre', public._raid_cofre(v_total, v_dif, v_c.escala));
end $$;

-- Tirada de receta de los días ya cerrados: una por jugador y día, en la dificultad más alta donde alcanzó cofre
create or replace function public._raid_tirar_recetas(p_jugador uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_c public.raid_config; v_dia date; v_dif public.raid_dificultades; v_gano boolean;
begin
  select * into v_c from public.raid_config where id = 1;
  for v_dia in
    select distinct d.dia from public.raid_danos d
    where d.jugador = p_jugador and d.dia < public._raid_hoy()
      and not exists (select 1 from public.raid_tiradas t where t.dia = d.dia and t.jugador = p_jugador)
  loop
    select f.* into v_dif from public.raid_danos d join public.raid_dificultades f on f.id = d.dificultad
      where d.dia = v_dia and d.jugador = p_jugador and public._raid_cofre(d.dano, f, v_c.escala) >= 1
      order by f.orden desc limit 1;
    if v_dif.id is null then
      insert into public.raid_tiradas (dia, jugador, visto) values (v_dia, p_jugador, true);
    else
      v_gano := random() < v_dif.p_receta;
      insert into public.raid_tiradas (dia, jugador, dificultad, gano, legendaria, visto)
        values (v_dia, p_jugador, v_dif.id, v_gano, case when v_gano then v_c.legendaria end, not v_gano);
      if v_gano then perform public._dar_receta(p_jugador, v_c.legendaria, 'Jefe de Raid: ' || v_dif.nombre); end if;
    end if;
    v_dif := null;
  end loop;
end $$;

-- ============================================================ LO QUE LLAMA EL JUEGO
-- Todo lo que muestra la pantalla
create or replace function public.raid_estado()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_c public.raid_config; v_ll public.raid_jugadores; v_hoy date := public._raid_hoy(); v_dif public.raid_dificultades;
        v_d public.raid_dias; v_lista jsonb := '[]'; v_mi bigint; v_ab boolean; v_rec jsonb;
begin
  select * into v_c from public.raid_config where id = 1;
  perform public._raid_tirar_recetas(v_yo);
  v_ll := public._raid_llaves(v_yo);
  for v_dif in select * from public.raid_dificultades order by orden loop
    v_d := public._raid_dia(v_dif.id);
    select dano into v_mi from public.raid_danos where dia = v_hoy and dificultad = v_dif.id and jugador = v_yo;
    v_ab := v_dif.orden = 1 or exists (select 1 from public.raid_desbloqueos u where u.jefe = v_c.jefe and u.dificultad = v_dif.id);
    v_lista := v_lista || jsonb_build_object('id', v_dif.id, 'nombre', v_dif.nombre, 'abierta', v_ab, 'hp_total', v_d.hp_total, 'hp_restante', v_d.hp_restante,
      'derrotado', v_d.derrotado is not null, 'mi_dano', coalesce(v_mi, 0), 'cofre', public._raid_cofre(coalesce(v_mi, 0), v_dif, v_c.escala),
      'rangos', jsonb_build_array(round(v_dif.rango1 * v_c.escala), round(v_dif.rango2 * v_c.escala), round(v_dif.rango3 * v_c.escala), round(v_dif.rango4 * v_c.escala)),
      'oro', v_dif.oro, 'polvo', v_dif.polvo, 'runas', v_dif.runas, 'p_rara', v_dif.p_rara, 'p_especial', v_dif.p_especial, 'p_epica', v_dif.p_epica, 'p_receta', v_dif.p_receta,
      'ranking', coalesce((select jsonb_agg(x order by x.dano desc) from (select j.nombre, r.dano from public.raid_danos r join public.jugadores j on j.id = r.jugador
        where r.dia = v_hoy and r.dificultad = v_dif.id order by r.dano desc limit 10) x), '[]'));
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('legendaria', t.legendaria, 'dificultad', t.dificultad, 'dia', t.dia)), '[]') into v_rec
    from public.raid_tiradas t where t.jugador = v_yo and t.gano and not t.visto;
  update public.raid_tiradas set visto = true where jugador = v_yo and gano and not visto;
  return jsonb_build_object('jefe', v_c.jefe, 'legendaria', v_c.legendaria, 'escala', v_c.escala,
    'cierra', ((v_hoy + 1)::timestamp at time zone 'America/Mexico_City'),
    'llaves', v_ll.llaves, 'proxima_llave', case when v_ll.llaves < 4 then v_ll.desde + interval '6 hours' end,
    'dificultades', v_lista, 'recetas', v_rec,
    'cofres', coalesce((select jsonb_agg(jsonb_build_object('dia', r.dia, 'dificultad', r.dificultad, 'nombre', f.nombre, 'dano', r.dano,
        'cofre', public._raid_cofre(r.dano, f, v_c.escala), 'derrotado', d.derrotado is not null,
        'listo', r.dia < v_hoy or d.derrotado is not null) order by r.dia, f.orden)
      from public.raid_danos r join public.raid_dificultades f on f.id = r.dificultad join public.raid_dias d on d.dia = r.dia and d.dificultad = r.dificultad
      where r.jugador = v_yo and not r.reclamado and public._raid_cofre(r.dano, f, v_c.escala) >= 1), '[]'),
    'pendientes', coalesce((select jsonb_agg(a.id) from public.raid_ataques a where a.jugador = v_yo and a.estado = 'pendiente'), '[]'));
end $$;

-- Empezar un ataque: gasta 1 llave y congela el equipo, la semilla y el HP con los que se pelea
create or replace function public.raid_entrar(p_dif text, p_equipo text[], p_version text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_c public.raid_config; v_d public.raid_dias; v_ll public.raid_jugadores; v_id uuid; v_sem bigint := floor(random() * 2147483647); v_eq jsonb; v_orden int;
begin
  select * into v_c from public.raid_config where id = 1;
  select orden into v_orden from public.raid_dificultades where id = p_dif;
  if not found then raise exception 'Esa dificultad no existe'; end if;
  if v_orden > 1 and not exists (select 1 from public.raid_desbloqueos u where u.jefe = v_c.jefe and u.dificultad = p_dif) then raise exception 'Esa dificultad sigue bloqueada'; end if;
  if cardinality(p_equipo) <> 5 or (select count(distinct x) from unnest(p_equipo) x) <> 5 then raise exception 'El equipo debe tener 5 campeones distintos'; end if;
  if (select count(*) from public.coleccion where jugador = v_yo and campeon = any (p_equipo)) <> 5 then raise exception 'Solo puedes usar tus campeones'; end if;
  v_d := public._raid_dia(p_dif);
  if v_d.derrotado is not null then raise exception 'Este jefe ya fue derrotado hoy'; end if;
  v_ll := public._raid_llaves(v_yo);
  if v_ll.llaves < 1 then raise exception 'No tienes llaves: recibes 1 cada 6 horas'; end if;
  update public.raid_jugadores set llaves = llaves - 1, desde = case when llaves = 4 then now() else desde end where jugador = v_yo;
  v_eq := public._arena_equipo_json(v_yo, p_equipo);
  insert into public.raid_ataques (jugador, dia, dificultad, semilla, hp_inicio, hp_total, equipo, equipo_datos, version)
    values (v_yo, v_d.dia, p_dif, v_sem, v_d.hp_restante, v_d.hp_total, p_equipo, v_eq, p_version) returning id into v_id;
  return jsonb_build_object('ataque', v_id, 'semilla', v_sem, 'hp_inicio', v_d.hp_restante, 'hp_total', v_d.hp_total, 'equipo', v_eq);
end $$;

-- Terminar un ataque. Con la verificación encendida queda pendiente y la Edge Function calcula el daño repitiendo la batalla.
create or replace function public.raid_terminar(p_ataque uuid, p_dano bigint, p_decisiones jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_a public.raid_ataques; v_ver boolean;
begin
  select * into v_a from public.raid_ataques where id = p_ataque and jugador = public._yo() for update;
  if not found then raise exception 'No existe ese ataque'; end if;
  if v_a.estado <> 'jugando' then raise exception 'Ese ataque ya terminó'; end if;
  if pg_column_size(p_decisiones) > 2097152 then raise exception 'Ataque demasiado grande'; end if;
  select verificar into v_ver from public.raid_config where id = 1;
  if v_ver then
    update public.raid_ataques set decisiones = p_decisiones, dano = p_dano, estado = 'pendiente' where id = p_ataque;
    return jsonb_build_object('pendiente', true);
  end if;
  return public._raid_aplicar(p_ataque, p_dano, p_decisiones);
end $$;

-- Solo la Edge Function verificar-raid (con la llave de servicio que pone Supabase)
create or replace function public.raid_resultado_verificado(p_ataque uuid, p_dano bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.raid_ataques where id = p_ataque and estado = 'pendiente') then raise exception 'Ese ataque no espera verificación'; end if;
  return public._raid_aplicar(p_ataque, p_dano, null);
end $$;

-- Reclamar un cofre: al derrotar al jefe o al cerrar el día
create or replace function public.raid_reclamar(p_dia date, p_dif text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_r public.raid_danos; v_f public.raid_dificultades; v_d public.raid_dias; v_c public.raid_config; v_n int; v_pct numeric; v_x int;
        v_oro int; v_polvo int; v_runas int; v_rel jsonb := '[]'; v_rz record; v_id text;
begin
  select * into v_r from public.raid_danos where dia = p_dia and dificultad = p_dif and jugador = v_yo for update;
  if not found or v_r.reclamado then raise exception 'No tienes ese cofre'; end if;
  select * into v_d from public.raid_dias where dia = p_dia and dificultad = p_dif;
  if p_dia >= public._raid_hoy() and v_d.derrotado is null then raise exception 'El cofre se abre al derrotar al jefe o al cerrar el día'; end if;
  select * into v_f from public.raid_dificultades where id = p_dif;
  select * into v_c from public.raid_config where id = 1;
  v_n := public._raid_cofre(v_r.dano, v_f, v_c.escala);
  if v_n < 1 then raise exception 'No alcanzaste el daño mínimo de este cofre'; end if;
  v_pct := v_n * .25;
  v_x := case when v_d.derrotado is not null then 2 else 1 end;     -- derrotado: se duplican oro, polvo y runas
  v_oro := round(v_f.oro * v_pct) * v_x; v_polvo := round(v_f.polvo * v_pct) * v_x; v_runas := round(v_f.runas * v_pct) * v_x;
  update public.inventario set oro = oro + v_oro, polvo_arcano = polvo_arcano + v_polvo, runas_portal = runas_portal + v_runas where jugador = v_yo;
  for v_rz in select * from (values ('Raro', v_f.p_rara), ('Especial', v_f.p_especial), ('Épico', v_f.p_epica)) as t(rareza, prob) loop
    if random() < v_rz.prob then
      select id into v_id from public.reliquias_catalogo where activo and not solo_receta and lote = 'orcos' and rareza = v_rz.rareza order by random() limit 1;
      if v_id is not null then v_rel := v_rel || public._crear_reliquia(v_yo, v_id, 'raid'); end if;
    end if;
  end loop;
  update public.raid_danos set reclamado = true where dia = p_dia and dificultad = p_dif and jugador = v_yo;
  return jsonb_build_object('cofre', v_n, 'duplicado', v_x = 2, 'oro', v_oro, 'polvo', v_polvo, 'runas', v_runas, 'reliquias', v_rel);
end $$;

-- Administrador: un solo porcentaje para todas las dificultades (100 = valores base). Mueve también la barra de hoy, proporcional.
create or replace function public.admin_raid_escala(p_pct numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_antes numeric; v_nueva numeric := p_pct / 100; v_f numeric;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede hacer esto'; end if;
  if p_pct is null or p_pct < 1 or p_pct > 100000 then raise exception 'El porcentaje debe estar entre 1 y 100,000'; end if;
  select escala into v_antes from public.raid_config where id = 1 for update;
  v_f := v_nueva / v_antes;
  update public.raid_config set escala = v_nueva where id = 1;
  update public.raid_dias set hp_total = greatest(1, round(hp_total * v_f)), hp_restante = greatest(1, round(hp_restante * v_f))
    where dia = public._raid_hoy() and derrotado is null;
  return jsonb_build_object('escala', v_nueva);
end $$;

-- ============================================================ PERMISOS
revoke all on function public._raid_hoy(), public._raid_dia(text), public._raid_cofre(bigint, public.raid_dificultades, numeric), public._raid_llaves(uuid),
  public._raid_aplicar(uuid, bigint, jsonb), public._raid_tirar_recetas(uuid), public.raid_resultado_verificado(uuid, bigint) from public, anon, authenticated;
grant execute on function public.raid_resultado_verificado(uuid, bigint) to service_role;
revoke all on function public.raid_estado(), public.raid_entrar(text, text[], text), public.raid_terminar(uuid, bigint, jsonb),
  public.raid_reclamar(date, text), public.admin_raid_escala(numeric) from public, anon;
grant execute on function public.raid_estado(), public.raid_entrar(text, text[], text), public.raid_terminar(uuid, bigint, jsonb),
  public.raid_reclamar(date, text), public.admin_raid_escala(numeric) to authenticated;

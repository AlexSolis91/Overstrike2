-- 031 · Estrellas moradas y Polvo Estelar (2026-11-06)
-- Ejecutar completo en el SQL Editor de Supabase. Se puede ejecutar más de una vez.
--
-- 1. Estrellas de 0 a 10: de la 6 a la 10 son las 5 estrellas moradas (segunda vuelta).
-- 2. Polvo Estelar = la columna inventario.frag_otros (los "otros fragmentos" que ya tenía cada jugador se quedan 1 a 1).
-- 3. Ascender a estrella morada: 10/15/20/25/30 copias + 300/500/750/1000/1500 de Polvo Estelar.
-- 4. Desfragmentar da SOLO fragmentos de Runa (1 o 2 por copia). Nuevo: desfragmentar varios campeones elegidos a la vez.
-- 5. Polvo Estelar en cofres del Jefe de Raid, oleadas de jefe de la Horda y fin de temporada de la Arena.

-- ============================================================ 1-2. ESTRELLAS 0..10 Y POLVO ESTELAR
alter table public.coleccion drop constraint if exists coleccion_estrellas_check;
alter table public.coleccion add constraint coleccion_estrellas_check check (estrellas between 0 and 10);
comment on column public.inventario.frag_otros is 'Polvo Estelar (antes "otros fragmentos"): sirve para las estrellas moradas';

create or replace function public._estrellas_maximas() returns integer language sql immutable set search_path = '' as $$ select 10 $$;

-- ============================================================ 3. ASCENDER
create or replace function public.ascender(p_campeon text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); r public.coleccion; v_copias int; v_polvo int := 0;
begin
  select * into r from public.coleccion where jugador = v_yo and campeon = p_campeon for update;
  if not found then raise exception 'No tienes a ese campeón'; end if;
  if r.estrellas >= 10 then raise exception 'Ya tiene las 5 estrellas moradas'; end if;
  if r.estrellas < 5 then v_copias := r.estrellas + 1;
  else
    v_copias := (array[10, 15, 20, 25, 30])[r.estrellas - 4];
    v_polvo := (array[300, 500, 750, 1000, 1500])[r.estrellas - 4];
  end if;
  if r.copias < v_copias then raise exception 'Necesitas % copia(s) para la siguiente estrella', v_copias; end if;
  if v_polvo > 0 then
    update public.inventario set frag_otros = frag_otros - v_polvo where jugador = v_yo and frag_otros >= v_polvo;
    if not found then raise exception 'Necesitas % de Polvo Estelar', v_polvo; end if;
  end if;
  update public.coleccion set copias = copias - v_copias, estrellas = estrellas + 1 where jugador = v_yo and campeon = p_campeon;
  return r.estrellas + 1;
end $$;

-- ============================================================ 4. DESFRAGMENTAR (solo Runa)
create or replace function public.desfragmentar(p_campeon text, p_cantidad integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); r public.coleccion; v_runa int := 0;
begin
  if p_cantidad < 1 then raise exception 'Cantidad inválida'; end if;
  select * into r from public.coleccion where jugador = v_yo and campeon = p_campeon for update;
  if not found then raise exception 'No tienes a ese campeón'; end if;
  if r.copias < p_cantidad then raise exception 'Solo tienes % copia(s) para desfragmentar', r.copias; end if;
  select coalesce(sum(case when random() < .5 then 1 else 2 end), 0) into v_runa from generate_series(1, p_cantidad);
  update public.coleccion set copias = copias - p_cantidad where jugador = v_yo and campeon = p_campeon;
  update public.inventario set frag_runa = frag_runa + v_runa where jugador = v_yo;
  return jsonb_build_object('frag_runa', v_runa);
end $$;

-- Varios campeones a la vez: p_lista = [{"campeon": "goku", "cantidad": 3}, ...] (lo elige el jugador en la Colección)
create or replace function public.desfragmentar_varios(p_lista jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_it jsonb; v_c text; v_n int; r public.coleccion; v_copias int := 0; v_campeones int := 0; v_runa int := 0;
begin
  if jsonb_typeof(p_lista) <> 'array' or jsonb_array_length(p_lista) = 0 then raise exception 'No elegiste campeones'; end if;
  for v_it in select * from jsonb_array_elements(p_lista) loop
    v_c := v_it->>'campeon'; v_n := (v_it->>'cantidad')::int;
    if v_n is null or v_n < 1 then raise exception 'Cantidad inválida'; end if;
    select * into r from public.coleccion where jugador = v_yo and campeon = v_c for update;
    if not found then raise exception 'No tienes a ese campeón'; end if;
    if r.copias < v_n then raise exception 'Solo tienes % copia(s) de %', r.copias, v_c; end if;
    update public.coleccion set copias = copias - v_n where jugador = v_yo and campeon = v_c;
    v_copias := v_copias + v_n; v_campeones := v_campeones + 1;
  end loop;
  select coalesce(sum(case when random() < .5 then 1 else 2 end), 0) into v_runa from generate_series(1, v_copias);
  update public.inventario set frag_runa = frag_runa + v_runa where jugador = v_yo;
  return jsonb_build_object('copias', v_copias, 'campeones', v_campeones, 'frag_runa', v_runa);
end $$;

drop function if exists public.desfragmentar_maximos();   -- lo reemplaza desfragmentar_varios

-- ============================================================ 5. POLVO ESTELAR: JEFE DE RAID
create or replace function public.raid_reclamar(p_dia date, p_dif text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_r public.raid_danos; v_f public.raid_dificultades; v_d public.raid_dias; v_c public.raid_config; v_n int; v_pct numeric; v_x int;
        v_oro int; v_polvo int; v_runas int; v_estelar int := 0; v_rel jsonb := '[]'; v_rz record; v_id text;
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
  if random() < (array[.15, .25, .40, .60])[v_n] then                  -- Polvo Estelar: Madera 15%, Plata 25%, Oro 40%, Arcano 60%
    v_estelar := (case p_dif when 'facil' then 5 when 'normal' then 8 when 'dificil' then 12 when 'brutal' then 18 else 25 end) * v_x;
  end if;
  update public.inventario set oro = oro + v_oro, polvo_arcano = polvo_arcano + v_polvo, runas_portal = runas_portal + v_runas,
    frag_otros = frag_otros + v_estelar where jugador = v_yo;
  for v_rz in select * from (values ('Raro', v_f.p_rara), ('Especial', v_f.p_especial), ('Épico', v_f.p_epica)) as t(rareza, prob) loop
    if random() < v_rz.prob * v_pct then                            -- la probabilidad también depende del cofre
      select id into v_id from public.reliquias_catalogo where activo and not solo_receta and lote = 'orcos' and rareza = v_rz.rareza order by random() limit 1;
      if v_id is not null then v_rel := v_rel || public._crear_reliquia(v_yo, v_id, 'raid'); end if;
    end if;
  end loop;
  update public.raid_danos set reclamado = true where dia = p_dia and dificultad = p_dif and jugador = v_yo;
  return jsonb_build_object('cofre', v_n, 'duplicado', v_x = 2, 'oro', v_oro, 'polvo', v_polvo, 'runas', v_runas, 'polvo_estelar', v_estelar, 'reliquias', v_rel);
end $$;

-- ============================================================ 5. POLVO ESTELAR: HORDA (oleadas de jefe)
create or replace function public.horda_oleada(p_partida uuid, p_oleada int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p public.horda_partidas; v_oro int; v_frag int := 0; v_rel jsonb := null; v_id text; v_rz text;
        v_trof int; v_hito jsonb := null; v_hito_oro int := 0; v_vales int := 0; v_extra int := 0; v_epica jsonb := null; v_res jsonb; v_estelar int := 0;
begin
  select * into v_p from public.horda_partidas where id = p_partida and jugador = v_yo for update;
  if not found or v_p.terminada then raise exception 'Esa partida ya terminó'; end if;
  if p_oleada = v_p.oleada and v_p.premio is not null then return v_p.premio; end if;   -- ya cobrada: mismo premio, sin pagar otra vez
  if p_oleada <> v_p.oleada + 1 then raise exception 'Oleada fuera de orden'; end if;
  if v_p.ultima > now() - interval '10 seconds' then raise exception 'Demasiado rápido'; end if;
  v_oro := (600 + 90 * (p_oleada - 1)) * case when p_oleada % 10 = 0 then 5 when p_oleada % 5 = 0 then 3 else 1 end;
  v_trof := case when p_oleada % 10 = 0 then 5 when p_oleada % 5 = 0 then 3 else 1 end;
  if random() < .30 then
    v_rz := public._rareza_horda(p_oleada);
    select id into v_id from public.reliquias_catalogo where activo and not solo_receta and lote = v_p.horda and rareza = v_rz order by random() limit 1;
    if v_id is not null then v_rel := public._crear_reliquia(v_yo, v_id, 'horda'); end if;
  end if;
  if random() < .02 then v_frag := public._entero(1, 3); end if;
  if p_oleada % 10 = 0 and random() < .30 then                       -- jefe (no mini jefe): Polvo Estelar
    v_estelar := case when p_oleada >= 40 then 15 when p_oleada >= 30 then 12 when p_oleada >= 20 then 8 else 5 end;
  end if;
  -- premio de primera vez
  if p_oleada in (10, 20, 30) then
    insert into public.horda_hitos (jugador, horda, oleada) values (v_yo, v_p.horda, p_oleada) on conflict do nothing;
    if found then
      if p_oleada = 10 then v_hito_oro := 10000; v_vales := 1; v_extra := 25;
      elsif p_oleada = 20 then v_hito_oro := 20000; v_vales := 2; v_extra := 75;
      else
        v_hito_oro := 40000; v_extra := 150;
        select id into v_id from public.reliquias_catalogo where activo and not solo_receta and lote = v_p.horda and rareza = 'Épico' order by random() limit 1;
        if v_id is not null then v_epica := public._crear_reliquia(v_yo, v_id, 'horda_hito'); end if;
      end if;
      v_hito := jsonb_build_object('oleada', p_oleada, 'oro', v_hito_oro, 'vales', v_vales, 'trofeos', v_extra, 'epica', v_epica, 'hazana', p_oleada = 30);
    end if;
  end if;
  update public.inventario set oro = oro + v_oro + v_hito_oro, frag_runa = frag_runa + v_frag, trofeos_orco = trofeos_orco + v_trof + v_extra,
    vales_sobre = vales_sobre + v_vales, frag_otros = frag_otros + v_estelar where jugador = v_yo;
  v_res := jsonb_build_object('oleada', p_oleada, 'oro', v_oro, 'reliquia', v_rel, 'fragmentos', v_frag, 'trofeos', v_trof, 'hito', v_hito, 'polvo_estelar', v_estelar);
  update public.horda_partidas set oleada = p_oleada, oro = oro + v_oro + v_hito_oro, reliquias = reliquias + (v_rel is not null)::int + (v_epica is not null)::int,
    fragmentos = fragmentos + v_frag, ultima = now(), premio = v_res where id = p_partida;
  return v_res;
end $$;

-- ============================================================ 5. POLVO ESTELAR: ARENA (fin de temporada)
create or replace function public._arena_al_dia(p_yo uuid) returns public.arena_jugadores language plpgsql security definer set search_path = '' as $$
declare a public.arena_jugadores; v_sem int := public._arena_semana(); v_tem int := public._arena_temporada(); v_liga text; v_puesto int;
        v_oro int; v_runas int; v_frag int; v_vales int; v_estelar int;
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
      v_estelar := case v_liga when 'Bronce' then 0 when 'Plata' then 20 when 'Oro' then 40 when 'Platino' then 70
        when 'Diamante' then 100 when 'Campeones' then 150 when 'Master' then 200 else 300 end;
      update public.inventario set oro = oro + v_oro, frag_otros = frag_otros + v_estelar where jugador = p_yo;
      insert into public.arena_historial (jugador, temporada, puntos, liga) values (p_yo, a.temporada, a.puntos, v_liga) on conflict do nothing;
      if v_puesto <= 3 then insert into public.arena_titulos (jugador, temporada, puesto) values (p_yo, a.temporada, v_puesto) on conflict do nothing; end if;
      update public.arena_jugadores set avisos = avisos || jsonb_build_object('tipo', 'temporada', 'temporada', a.temporada, 'liga', v_liga, 'oro', v_oro, 'polvo_estelar', v_estelar,
        'puesto', case when v_puesto <= 3 then v_puesto end) where jugador = p_yo;
    end if;
    update public.arena_jugadores set temporada = v_tem, puntos = 0, victorias = 0, derrotas = 0, def_victorias = 0, def_derrotas = 0
      where jugador = p_yo;
  end if;
  select * into a from public.arena_jugadores where jugador = p_yo;
  return a;
end $$;

-- ============================================================ PERMISOS
revoke all on function public.desfragmentar_varios(jsonb) from public, anon;
grant execute on function public.desfragmentar_varios(jsonb) to authenticated;
revoke all on function public._estrellas_maximas() from public, anon, authenticated;

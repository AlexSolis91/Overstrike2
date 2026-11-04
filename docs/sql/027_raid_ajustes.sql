-- Overstrike 2 · Paso 27: ajustes del Jefe de Raid y desfragmentar en lote.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001–026.
-- · Máximo 2 llaves (siguen llegando 1 cada 6 horas). Quien tenía más se queda con 2.
-- · La probabilidad de cada reliquia depende de la dificultad y del cofre: el cofre 1 da 25% de lo que da el cofre 4.
--   Cofre 4 (Rara / Especial / Épica): Fácil 30/5/0 · Normal 45/12/3 · Difícil 60/20/8 · Brutal 75/30/16 · Pesadilla 90/45/30.
-- · desfragmentar_maximos: desfragmenta todas las copias de los campeones que ya tienen las estrellas máximas.

-- ============================================================ LLAVES: MÁXIMO 2
alter table public.raid_jugadores drop constraint if exists raid_jugadores_llaves_check;
update public.raid_jugadores set llaves = least(llaves, 2);
alter table public.raid_jugadores alter column llaves set default 2;
alter table public.raid_jugadores add constraint raid_jugadores_llaves_check check (llaves between 0 and 2);

create or replace function public._raid_llaves(p_jugador uuid) returns public.raid_jugadores
language plpgsql security definer set search_path = '' as $$
declare v public.raid_jugadores; v_n int;
begin
  insert into public.raid_jugadores (jugador) values (p_jugador) on conflict (jugador) do nothing;
  select * into v from public.raid_jugadores where jugador = p_jugador for update;
  if v.llaves < 2 then
    v_n := floor(extract(epoch from now() - v.desde) / 21600);
    if v_n > 0 then
      v.desde := case when v.llaves + v_n >= 2 then now() else v.desde + v_n * interval '6 hours' end;
      v.llaves := least(2, v.llaves + v_n);
      update public.raid_jugadores set llaves = v.llaves, desde = v.desde where jugador = p_jugador;
    end if;
  end if;
  return v;
end $$;

-- Igual que en 026; cambia cuándo empieza a contar la siguiente llave
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
  update public.raid_jugadores set llaves = llaves - 1, desde = case when llaves = 2 then now() else desde end where jugador = v_yo;
  v_eq := public._arena_equipo_json(v_yo, p_equipo);
  insert into public.raid_ataques (jugador, dia, dificultad, semilla, hp_inicio, hp_total, equipo, equipo_datos, version)
    values (v_yo, v_d.dia, p_dif, v_sem, v_d.hp_restante, v_d.hp_total, p_equipo, v_eq, p_version) returning id into v_id;
  return jsonb_build_object('ataque', v_id, 'semilla', v_sem, 'hp_inicio', v_d.hp_restante, 'hp_total', v_d.hp_total, 'equipo', v_eq);
end $$;

-- raid_estado muestra la próxima llave si tiene menos de 2 (el resto, igual que en 026)
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
    'llaves', v_ll.llaves, 'proxima_llave', case when v_ll.llaves < 2 then v_ll.desde + interval '6 hours' end,
    'dificultades', v_lista, 'recetas', v_rec,
    'cofres', coalesce((select jsonb_agg(jsonb_build_object('dia', r.dia, 'dificultad', r.dificultad, 'nombre', f.nombre, 'dano', r.dano,
        'cofre', public._raid_cofre(r.dano, f, v_c.escala), 'derrotado', d.derrotado is not null,
        'listo', r.dia < v_hoy or d.derrotado is not null) order by r.dia, f.orden)
      from public.raid_danos r join public.raid_dificultades f on f.id = r.dificultad join public.raid_dias d on d.dia = r.dia and d.dificultad = r.dificultad
      where r.jugador = v_yo and not r.reclamado and public._raid_cofre(r.dano, f, v_c.escala) >= 1), '[]'),
    'pendientes', coalesce((select jsonb_agg(a.id) from public.raid_ataques a where a.jugador = v_yo and a.estado = 'pendiente'), '[]'));
end $$;

-- ============================================================ RELIQUIAS SEGÚN DIFICULTAD Y COFRE
update public.raid_dificultades set p_rara = .30, p_especial = .05, p_epica = 0   where id = 'facil';
update public.raid_dificultades set p_rara = .45, p_especial = .12, p_epica = .03 where id = 'normal';
update public.raid_dificultades set p_rara = .60, p_especial = .20, p_epica = .08 where id = 'dificil';
update public.raid_dificultades set p_rara = .75, p_especial = .30, p_epica = .16 where id = 'brutal';
update public.raid_dificultades set p_rara = .90, p_especial = .45, p_epica = .30 where id = 'pesadilla';

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
    if random() < v_rz.prob * v_pct then                            -- la probabilidad también depende del cofre
      select id into v_id from public.reliquias_catalogo where activo and not solo_receta and lote = 'orcos' and rareza = v_rz.rareza order by random() limit 1;
      if v_id is not null then v_rel := v_rel || public._crear_reliquia(v_yo, v_id, 'raid'); end if;
    end if;
  end loop;
  update public.raid_danos set reclamado = true where dia = p_dia and dificultad = p_dif and jugador = v_yo;
  return jsonb_build_object('cofre', v_n, 'duplicado', v_x = 2, 'oro', v_oro, 'polvo', v_polvo, 'runas', v_runas, 'reliquias', v_rel);
end $$;

-- ============================================================ DESFRAGMENTAR EN LOTE
-- Las estrellas máximas viven aquí y en MAX_ESTRELLAS (js/ui/coleccion.js). Si suben (estrellas moradas), cambiar los dos.
create or replace function public._estrellas_maximas() returns integer language sql immutable set search_path = '' as $$ select 5 $$;

create or replace function public.desfragmentar_maximos()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_copias int; v_campeones int; v_runa int := 0;
begin
  -- misma regla que desfragmentar: cada copia da 3 fragmentos, de los que 1 o 2 son de Runa
  select coalesce(sum(copias), 0), count(*) into v_copias, v_campeones from public.coleccion
    where jugador = v_yo and estrellas >= public._estrellas_maximas() and copias > 0;
  if v_copias < 1 then raise exception 'No tienes copias de campeones con las estrellas máximas'; end if;
  select coalesce(sum(case when random() < .5 then 1 else 2 end), 0) into v_runa from generate_series(1, v_copias);
  update public.coleccion set copias = 0 where jugador = v_yo and estrellas >= public._estrellas_maximas() and copias > 0;
  update public.inventario set frag_runa = frag_runa + v_runa, frag_otros = frag_otros + (3 * v_copias - v_runa) where jugador = v_yo;
  return jsonb_build_object('copias', v_copias, 'campeones', v_campeones, 'frag_runa', v_runa, 'frag_otros', 3 * v_copias - v_runa);
end $$;

-- ============================================================ PERMISOS
revoke all on function public._raid_llaves(uuid), public._estrellas_maximas() from public, anon, authenticated;
revoke all on function public.raid_estado(), public.raid_entrar(text, text[], text), public.raid_reclamar(date, text), public.desfragmentar_maximos() from public, anon;
grant execute on function public.raid_estado(), public.raid_entrar(text, text[], text), public.raid_reclamar(date, text), public.desfragmentar_maximos() to authenticated;

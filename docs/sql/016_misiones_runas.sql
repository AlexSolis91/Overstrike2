-- Overstrike 2 · Paso 16: MISIONES DIARIAS, RUNAS DE PORTAL Y DEFENSAS DE ARENA (2026-10-26).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001–015.
--
-- · Misiones diarias (10; se renuevan a medianoche, hora de México). El servidor cuenta el progreso solo:
--     1 Gana 2 batallas de Campaña ................ 3,000 oro                     (Fácil)
--     2 Juega 3 combates de Arena .................. 3,000 oro                     (Fácil)
--     3 Equipa o cambia 1 reliquia ................. 10 Polvo Arcano               (Fácil)
--     4 Gana 5 combates de Arena ................... 1 Runa de Portal              (Fácil)
--     5 Abre 1 sobre ............................... 20 Polvo Arcano               (Media)
--     6 Gana 3 etapas de Campaña con 3★ ............ 10 Fragmentos                 (Media)
--     7 Supera la oleada 20 de la Horda ............ 20 Trofeos de Orco           (Media)
--     8 Gana 10 combates de Arena .................. 20,000 oro + 10 Fragmentos    (Difícil)
--     9 Supera la oleada 40 de la Horda ............ 60 Trofeos + 20 Fragmentos    (Difícil)
--    10 Completa todas las misiones diarias ........ 1 Vale de sobre               (Final)
-- · Campaña: ya no da Runas de Portal (ni el 15% al repetir); las primeras 3★ de cada etapa dan 5 Fragmentos (×2 en el Abismo).
-- · Arena: 3.3% por combate (ganes o pierdas; ataques y Arena en vivo) de 1 Runa de Portal.
-- · Arena: las defensas ganadas ya no tienen tope diario (+10 por ataque diario, +3 por ataque extra).

-- ============================================================ PROGRESO DEL DÍA
create table if not exists public.misiones_diarias (
  jugador  uuid not null references public.jugadores (id) on delete cascade,
  dia      date not null,
  progreso jsonb not null default '{}',        -- { clave: número }
  cobradas int[] not null default '{}',
  primary key (jugador, dia)
);
alter table public.misiones_diarias enable row level security;
drop policy if exists "jugador ve sus misiones" on public.misiones_diarias;
create policy "jugador ve sus misiones" on public.misiones_diarias for select to authenticated using (jugador = auth.uid());
revoke all on public.misiones_diarias from anon, authenticated;
grant select on public.misiones_diarias to authenticated;

-- Suma n a un contador del día del jugador
create or replace function public._mision_sumar(p_jugador uuid, p_clave text, p_n int) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_jugador is null then return; end if;
  insert into public.misiones_diarias as m (jugador, dia, progreso) values (p_jugador, public._arena_dia(), jsonb_build_object(p_clave, p_n))
  on conflict (jugador, dia) do update set progreso = m.progreso || jsonb_build_object(p_clave, coalesce((m.progreso ->> p_clave)::int, 0) + p_n);
end $$;
-- Lleva un contador del día al máximo alcanzado (la oleada de la Horda)
create or replace function public._mision_max(p_jugador uuid, p_clave text, p_valor int) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_jugador is null then return; end if;
  insert into public.misiones_diarias as m (jugador, dia, progreso) values (p_jugador, public._arena_dia(), jsonb_build_object(p_clave, p_valor))
  on conflict (jugador, dia) do update set progreso = m.progreso || jsonb_build_object(p_clave, greatest(coalesce((m.progreso ->> p_clave)::int, 0), p_valor));
end $$;

-- Las 10 misiones: contador, meta y premio (el cliente muestra los textos de js/datos/misiones.js)
create or replace function public._misiones() returns jsonb language sql immutable set search_path = '' as $$
  select '[
    {"id": 1,  "clave": "campana_victorias",  "meta": 2,  "premio": {"oro": 3000}},
    {"id": 2,  "clave": "arena_jugados",      "meta": 3,  "premio": {"oro": 3000}},
    {"id": 3,  "clave": "equipar",            "meta": 1,  "premio": {"polvo": 10}},
    {"id": 4,  "clave": "arena_victorias",    "meta": 5,  "premio": {"runas_portal": 1}},
    {"id": 5,  "clave": "sobres",             "meta": 1,  "premio": {"polvo": 20}},
    {"id": 6,  "clave": "campana_3estrellas", "meta": 3,  "premio": {"frag_runa": 10}},
    {"id": 7,  "clave": "horda_oleada",       "meta": 20, "premio": {"trofeos": 20}},
    {"id": 8,  "clave": "arena_victorias",    "meta": 10, "premio": {"oro": 20000, "frag_runa": 10}},
    {"id": 9,  "clave": "horda_oleada",       "meta": 40, "premio": {"trofeos": 60, "frag_runa": 20}},
    {"id": 10, "clave": "todas",              "meta": 9,  "premio": {"vales": 1}}
  ]'::jsonb $$;

-- Estado de hoy: contadores y misiones ya cobradas
create or replace function public.misiones_estado() returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); m public.misiones_diarias;
begin
  select * into m from public.misiones_diarias where jugador = v_yo and dia = public._arena_dia();
  return jsonb_build_object('dia', public._arena_dia(), 'progreso', coalesce(m.progreso, '{}'::jsonb), 'cobradas', to_jsonb(coalesce(m.cobradas, '{}'::int[])));
end $$;

-- Cobra el premio de una misión completada (una vez por día)
create or replace function public.misiones_cobrar(p_id int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); m public.misiones_diarias; d jsonb; x jsonb; v_n int := 0; pr jsonb;
begin
  select value into d from jsonb_array_elements(public._misiones()) where (value ->> 'id')::int = p_id;
  if d is null then raise exception 'Esa misión no existe'; end if;
  insert into public.misiones_diarias (jugador, dia) values (v_yo, public._arena_dia()) on conflict do nothing;
  select * into m from public.misiones_diarias where jugador = v_yo and dia = public._arena_dia() for update;
  if p_id = any (m.cobradas) then raise exception 'Ya cobraste esa misión hoy'; end if;
  if d ->> 'clave' = 'todas' then
    -- la misión final cuenta las otras 9 completadas (no hace falta haberlas cobrado)
    for x in select value from jsonb_array_elements(public._misiones()) where (value ->> 'id')::int < 10 loop
      if coalesce((m.progreso ->> (x ->> 'clave'))::int, 0) >= (x ->> 'meta')::int then v_n := v_n + 1; end if;
    end loop;
  else v_n := coalesce((m.progreso ->> (d ->> 'clave'))::int, 0); end if;
  if v_n < (d ->> 'meta')::int then raise exception 'Todavía no completas esa misión'; end if;
  pr := d -> 'premio';
  update public.inventario set
    oro = oro + coalesce((pr ->> 'oro')::int, 0),
    polvo_arcano = polvo_arcano + coalesce((pr ->> 'polvo')::int, 0),
    runas_portal = runas_portal + coalesce((pr ->> 'runas_portal')::int, 0),
    frag_runa = frag_runa + coalesce((pr ->> 'frag_runa')::int, 0),
    trofeos_orco = trofeos_orco + coalesce((pr ->> 'trofeos')::int, 0),
    vales_sobre = vales_sobre + coalesce((pr ->> 'vales')::int, 0)
    where jugador = v_yo;
  update public.misiones_diarias set cobradas = array_append(cobradas, p_id) where jugador = v_yo and dia = m.dia;
  return jsonb_build_object('id', p_id, 'premio', pr);
end $$;

-- ============================================================ CONTADORES (disparadores)
-- Abrir sobres (de campeones, con vale o de reliquias)
create or replace function public._mision_trg_aperturas() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tipo in ('sobre', 'vale', 'reliquias') then perform public._mision_sumar(new.jugador, 'sobres', 1); end if;
  return null;
end $$;
drop trigger if exists mision_aperturas on public.aperturas;
create trigger mision_aperturas after insert on public.aperturas for each row execute function public._mision_trg_aperturas();

-- Equipar o cambiar una reliquia
create or replace function public._mision_trg_reliquias() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.campeon is not null and (old.campeon is distinct from new.campeon or old.espacio is distinct from new.espacio) then
    perform public._mision_sumar(new.jugador, 'equipar', 1);
  end if;
  return null;
end $$;
drop trigger if exists mision_reliquias on public.reliquias;
create trigger mision_reliquias after update on public.reliquias for each row execute function public._mision_trg_reliquias();

-- Oleada más alta de la Horda en el día
create or replace function public._mision_trg_horda() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.oleada > old.oleada then perform public._mision_max(new.jugador, 'horda_oleada', new.oleada); end if;
  return null;
end $$;
drop trigger if exists mision_horda on public.horda_partidas;
create trigger mision_horda after update on public.horda_partidas for each row execute function public._mision_trg_horda();

-- Ataques de Arena terminados
create or replace function public._mision_trg_arena() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.terminado and not old.terminado then
    perform public._mision_sumar(new.atacante, 'arena_jugados', 1);
    if new.gano then perform public._mision_sumar(new.atacante, 'arena_victorias', 1); end if;
  end if;
  return null;
end $$;
drop trigger if exists mision_arena on public.arena_combates;
create trigger mision_arena after update on public.arena_combates for each row execute function public._mision_trg_arena();

-- Arena en vivo: cuenta para las misiones de ambos y cada uno tiene 3.3% de Runa de Portal
create or replace function public._mision_trg_vivo() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.terminado and not old.terminado and new.ganador in ('a', 'b', 'empate') then
    perform public._mision_sumar(new.a, 'arena_jugados', 1);
    perform public._mision_sumar(new.b, 'arena_jugados', 1);
    if new.ganador = 'a' then perform public._mision_sumar(new.a, 'arena_victorias', 1); end if;
    if new.ganador = 'b' then perform public._mision_sumar(new.b, 'arena_victorias', 1); end if;
    if random() < .033 then update public.inventario set runas_portal = runas_portal + 1 where jugador = new.a; end if;
    if random() < .033 then update public.inventario set runas_portal = runas_portal + 1 where jugador = new.b; end if;
  end if;
  return null;
end $$;
drop trigger if exists mision_vivo on public.arena_vivo;
create trigger mision_vivo after update on public.arena_vivo for each row execute function public._mision_trg_vivo();

-- ============================================================ CAMPAÑA (igual que 012, sin Runas de Portal y contando misiones)
create or replace function public.campana_completar(p_area text, p_dificultad text, p_etapa int, p_estrellas int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := public._yo();
  v_m int := case p_dificultad when 'normal' then 1 when 'dificil' then 2 when 'brutal' then 3 end;
  v_a int := case p_area when 'portal' then 1 when 'abismo' then 2 end;          -- el Abismo paga el doble
  v_prev text := case p_dificultad when 'dificil' then 'normal' when 'brutal' then 'dificil' end;
  v_fila public.campana_progreso; v_primera boolean; v_ultima timestamptz; v_total int;
  v_premios jsonb := '[]'::jsonb; v_oro int := 0; v_frag int := 0; v_runas int := 0; v_vales int := 0; v_portal int := 0; u int;
begin
  if v_a is null or v_m is null or p_etapa not between 1 and 20 or p_estrellas not between 1 and 3 then
    raise exception 'Etapa no válida'; end if;
  -- Área 2 (el Abismo): cada dificultad se abre al completar la etapa 20 del Portal en esa misma dificultad
  if p_area = 'abismo' and not exists (select 1 from public.campana_progreso
      where jugador = v_yo and area = 'portal' and dificultad = p_dificultad and etapa = 20) then
    raise exception 'Completa el Portal en esta dificultad para entrar al Abismo'; end if;
  if v_prev is not null and not exists (select 1 from public.campana_progreso
      where jugador = v_yo and area = p_area and dificultad = v_prev and etapa = 20) then
    raise exception 'Esta dificultad todavía está bloqueada'; end if;
  if p_etapa > 1 and not exists (select 1 from public.campana_progreso
      where jugador = v_yo and area = p_area and dificultad = p_dificultad and etapa = p_etapa - 1) then
    raise exception 'Esta etapa todavía está bloqueada'; end if;

  select * into v_fila from public.campana_progreso where jugador = v_yo and area = p_area and dificultad = p_dificultad and etapa = p_etapa;
  v_primera := not found;
  if not v_primera then
    select max(ultima) into v_ultima from public.campana_progreso where jugador = v_yo;
    if v_ultima > now() - interval '90 seconds' then
      raise exception 'Espera % s para cobrar otra repetición', ceil(extract(epoch from v_ultima + interval '90 seconds' - now()));
    end if;
  end if;

  insert into public.campana_progreso as c (jugador, area, dificultad, etapa, estrellas, victorias)
    values (v_yo, p_area, p_dificultad, p_etapa, p_estrellas, 1)
    on conflict (jugador, area, dificultad, etapa) do update
      set estrellas = greatest(c.estrellas, excluded.estrellas), victorias = c.victorias + 1, ultima = now();

  v_oro := case when v_primera then 5000 else 1000 end * v_m * v_a;
  if v_primera and p_etapa = 10 then v_frag := v_frag + 5 * v_m * v_a; end if;
  if v_primera and p_etapa = 20 then
    v_vales := v_vales + case v_m when 3 then 2 else 1 end * v_a;
    v_runas := v_runas + case v_m when 1 then 0 when 2 then 1 else 2 end * v_a;
  end if;
  -- (2026-10-26) La Campaña ya no da Runas de Portal: las primeras 3 estrellas de la etapa dan 5 Fragmentos (×2 en el Abismo)
  if p_estrellas = 3 and (v_primera or v_fila.estrellas < 3) then v_frag := v_frag + 5 * v_a; end if;
  -- misiones diarias
  perform public._mision_sumar(v_yo, 'campana_victorias', 1);
  if p_estrellas = 3 then perform public._mision_sumar(v_yo, 'campana_3estrellas', 1); end if;

  select coalesce(sum(estrellas), 0) into v_total from public.campana_progreso where jugador = v_yo and area = p_area and dificultad = p_dificultad;
  foreach u in array array[20, 40, 60] loop
    if v_total >= u and not exists (select 1 from public.campana_cofres where jugador = v_yo and area = p_area and dificultad = p_dificultad and umbral = u) then
      insert into public.campana_cofres (jugador, area, dificultad, umbral) values (v_yo, p_area, p_dificultad, u);
      if u = 20 then v_oro := v_oro + 10000 * v_m * v_a;
      elsif u = 40 then v_frag := v_frag + 5 * v_m * v_a;
      else
        if v_m = 1 then v_vales := v_vales + v_a; elsif v_m = 2 then v_runas := v_runas + v_a; else v_runas := v_runas + 4 * v_a; end if;
      end if;
      v_premios := v_premios || jsonb_build_object('tipo', 'cofre', 'cantidad', u);
    end if;
  end loop;

  update public.inventario set oro = oro + v_oro, frag_runa = frag_runa + v_frag, runas = runas + v_runas, vales_sobre = vales_sobre + v_vales,
    runas_portal = runas_portal + v_portal where jugador = v_yo;
  if v_oro > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'oro', 'cantidad', v_oro); end if;
  if v_frag > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'fragmento', 'cantidad', v_frag, 'nombre', 'Fragmentos de Runa'); end if;
  if v_runas > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'runa', 'cantidad', v_runas, 'nombre', 'Runas de Invocación'); end if;
  if v_vales > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'vale', 'cantidad', v_vales, 'nombre', 'Vale de sobre'); end if;
  if v_portal > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'portal', 'cantidad', v_portal, 'nombre', 'Runa de Portal'); end if;
  return jsonb_build_object('primera', v_primera, 'estrellas', p_estrellas, 'total', v_total, 'recompensas', v_premios);
end $$;

-- ============================================================ ARENA (igual que 010, defensas sin tope y 3.3% de Runa de Portal)
create or replace function public._arena_pagar(p_combate uuid, p_gano boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.arena_combates; a public.arena_jugadores; d public.arena_jugadores; v_e numeric; v_delta int; v_ddef int := 0;
        v_oro int := 0; v_mult numeric; v_liga text; v_rival int; v_runa int := 0;
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
      v_ddef := case when c.diario then 10 else 3 end;   -- (2026-10-26) sin tope diario
      update public.arena_jugadores set puntos = puntos + v_ddef, def_puntos = def_puntos + v_ddef, def_victorias = def_victorias + 1 where jugador = c.defensor;
    end if;
  end if;
  -- (2026-10-26) 3.3% por combate, ganes o pierdas, de 1 Runa de Portal (~1 cada 30 combates)
  if random() < .033 then v_runa := 1; update public.inventario set runas_portal = runas_portal + 1 where jugador = c.atacante; end if;
  update public.arena_combates set terminado = true, gano = p_gano, delta = v_delta, delta_def = v_ddef where id = p_combate;
  select * into a from public.arena_jugadores where jugador = c.atacante;
  return jsonb_build_object('delta', v_delta, 'puntos', a.puntos, 'oro', v_oro, 'liga', public._arena_liga(a.puntos, public._arena_puesto(c.atacante)), 'diario', c.diario, 'runa_portal', v_runa);
end $$;

-- ============================================================ PERMISOS
revoke all on function public._mision_sumar(uuid, text, int), public._mision_max(uuid, text, int), public._misiones(),
  public._mision_trg_aperturas(), public._mision_trg_reliquias(), public._mision_trg_horda(), public._mision_trg_arena(),
  public._mision_trg_vivo(), public._arena_pagar(uuid, boolean) from public, anon, authenticated;
revoke all on function public.misiones_estado(), public.misiones_cobrar(int), public.campana_completar(text, text, int, int) from public, anon;
grant execute on function public.misiones_estado(), public.misiones_cobrar(int), public.campana_completar(text, text, int, int) to authenticated;

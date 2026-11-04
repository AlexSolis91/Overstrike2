-- Overstrike 2 · Paso 29: misiones del Jefe de Raid. La misión final pide completar 10 misiones.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001–028.
-- · 5 misiones nuevas (id 11–15). Valen para cualquier jefe.
-- · Un ataque cuenta si termina con daño mayor a 0.
-- · «Con dos llaves» suma tus 2 mejores ataques del día, en cualquier dificultad.
-- · «Supera la ronda 30» se cumple al llegar a la ronda 31.

-- ============================================================ LA RONDA DE CADA ATAQUE
alter table public.raid_ataques add column if not exists ronda integer not null default 0;

-- El juego manda también la ronda alcanzada. La versión anterior sigue existiendo para quien aún no recarga la página.
create or replace function public.raid_terminar(p_ataque uuid, p_dano bigint, p_decisiones jsonb, p_ronda integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_a public.raid_ataques;
begin
  select * into v_a from public.raid_ataques where id = p_ataque and jugador = public._yo();
  if not found then raise exception 'No existe ese ataque'; end if;
  if v_a.estado = 'jugando' then update public.raid_ataques set ronda = greatest(coalesce(p_ronda, 0), 0) where id = p_ataque; end if;
  return public.raid_terminar(p_ataque, p_dano, p_decisiones);
end $$;

-- La función verificar-raid manda la ronda que salió al repetir la batalla (esa es la que vale)
create or replace function public.raid_resultado_verificado(p_ataque uuid, p_dano bigint, p_ronda integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.raid_ataques where id = p_ataque and estado = 'pendiente') then raise exception 'Ese ataque no espera verificación'; end if;
  update public.raid_ataques set ronda = greatest(coalesce(p_ronda, 0), 0) where id = p_ataque;
  return public._raid_aplicar(p_ataque, p_dano, null);
end $$;

-- ============================================================ CONTADORES
create or replace function public._mision_trg_raid_ataque() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_dos bigint;
begin
  if new.estado = 'hecho' and old.estado <> 'hecho' and coalesce(new.dano, 0) > 0 then
    perform public._mision_sumar(new.jugador, 'raid_ataques', 1);
    perform public._mision_max(new.jugador, 'raid_dano_1', least(new.dano, 2000000000)::int);
    select coalesce(sum(x.dano), 0) into v_dos from (select a.dano from public.raid_ataques a
      where a.jugador = new.jugador and a.dia = new.dia and a.estado = 'hecho' and a.dano > 0 order by a.dano desc limit 2) x;
    perform public._mision_max(new.jugador, 'raid_dano_2', least(v_dos, 2000000000)::int);
    perform public._mision_max(new.jugador, 'raid_ronda', new.ronda);
  end if;
  return null;
end $$;
drop trigger if exists mision_raid_ataque on public.raid_ataques;
create trigger mision_raid_ataque after update on public.raid_ataques for each row execute function public._mision_trg_raid_ataque();

create or replace function public._mision_trg_raid_cofre() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.reclamado and not old.reclamado then perform public._mision_sumar(new.jugador, 'raid_cofres', 1); end if;
  return null;
end $$;
drop trigger if exists mision_raid_cofre on public.raid_danos;
create trigger mision_raid_cofre after update on public.raid_danos for each row execute function public._mision_trg_raid_cofre();

-- ============================================================ LAS MISIONES
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
    {"id": 11, "clave": "raid_ataques",       "meta": 1,  "premio": {"oro": 3000}},
    {"id": 12, "clave": "raid_cofres",        "meta": 1,  "premio": {"polvo": 10}},
    {"id": 13, "clave": "raid_dano_1",        "meta": 25000,  "premio": {"vales": 1}},
    {"id": 14, "clave": "raid_dano_2",        "meta": 250000, "premio": {"runas_portal": 1, "oro": 35000}},
    {"id": 15, "clave": "raid_ronda",         "meta": 31, "premio": {"rel_sobres": 1, "oro": 25000}},
    {"id": 10, "clave": "todas",              "meta": 10, "premio": {"vales": 1}}
  ]'::jsonb $$;

-- Igual que en 016; la misión final cuenta 10 de las otras, y ahora también se puede ganar un sobre de Relics of Power
create or replace function public.misiones_cobrar(p_id int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); m public.misiones_diarias; d jsonb; x jsonb; v_n int := 0; pr jsonb;
begin
  select value into d from jsonb_array_elements(public._misiones()) where (value ->> 'id')::int = p_id;
  if d is null then raise exception 'Esa misión no existe'; end if;
  insert into public.misiones_diarias (jugador, dia) values (v_yo, public._arena_dia()) on conflict do nothing;
  select * into m from public.misiones_diarias where jugador = v_yo and dia = public._arena_dia() for update;
  if p_id = any (m.cobradas) then raise exception 'Ya cobraste esa misión hoy'; end if;
  if d ->> 'clave' = 'todas' then
    for x in select value from jsonb_array_elements(public._misiones()) where value ->> 'clave' <> 'todas' loop
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
    vales_sobre = vales_sobre + coalesce((pr ->> 'vales')::int, 0),
    rel_sobres = rel_sobres + coalesce((pr ->> 'rel_sobres')::int, 0)
    where jugador = v_yo;
  update public.misiones_diarias set cobradas = array_append(cobradas, p_id) where jugador = v_yo and dia = m.dia;
  return jsonb_build_object('id', p_id, 'premio', pr);
end $$;

-- ============================================================ PERMISOS
revoke all on function public._mision_trg_raid_ataque(), public._mision_trg_raid_cofre(), public.raid_resultado_verificado(uuid, bigint, integer) from public, anon, authenticated;
grant execute on function public.raid_resultado_verificado(uuid, bigint, integer) to service_role;
revoke all on function public.raid_terminar(uuid, bigint, jsonb, integer) from public, anon;
grant execute on function public.raid_terminar(uuid, bigint, jsonb, integer) to authenticated;

-- Overstrike 2 · Paso 35: Horda por temporadas y Ticket Dorado (2026-11-08).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Requiere 001–034.
-- ⚠️ El punto 3 (reinicio de récords) solo se hace la PRIMERA vez que se ejecuta; volver a ejecutar el archivo no borra nada más.
--
-- 1. Ticket Dorado: abre gratis un sobre Relics of Power (cuenta para sus garantías igual que uno comprado).
--    La misión 15 ("Supera la ronda 30 contra el Jefe de Raid") ahora da 1 Ticket Dorado (antes solo adelantaba las garantías).
-- 2. Récords de la Horda: de TEMPORADA (las mismas de la Arena: 4 semanas, desde el lunes 2026-10-19) e HISTÓRICO (el más alto de siempre).
--    Una partida pertenece a la temporada en la que se abrió el portal; al cambiar de temporada ya no avanza (se cierra con su botín).
--    Al cerrar la temporada, cada jugador con récord recibe Tickets Dorados según su puesto (se cobran al entrar al juego):
--    1º 10 · 2º 8 · 3º 6 · 4º–10º 4 · 11º–25º 3 · 26º–50º 2 · resto con récord 1.
-- 3. Reinicio: todos los récords anteriores dejan de contar (temporada e histórico empiezan en 0) y se cierran las partidas en curso
--    (se devuelve su Runa de Portal). Los premios de "Primera vez" (hitos) NO se reinician.

-- ============================================================ 1. TICKET DORADO
alter table public.inventario add column if not exists tickets_dorados integer not null default 0 check (tickets_dorados >= 0);

-- Lo que hace el sobre una vez cobrado (igual que en 005): garantías por calendario con el contador rel_sobres
create or replace function public._sobre_reliquias(p_yo uuid, p_n int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_rarezas text[] := '{}'; r text; v_id text; v_lista jsonb := '[]'; v_ids text[] := '{}';
begin
  if p_n % 50 = 0 then v_rarezas := v_rarezas || 'Épico'::text; end if;
  if p_n % 6 = 0 then v_rarezas := v_rarezas || 'Especial'::text; end if;
  if p_n % 2 = 0 then v_rarezas := v_rarezas || 'Raro'::text; end if;
  while cardinality(v_rarezas) < 3 loop v_rarezas := v_rarezas || public._rareza_sobre_reliquias(); end loop;
  foreach r in array v_rarezas loop
    v_id := public._reliquia_del_sobre(r);
    if v_id is null then raise exception 'No hay reliquias % en el sobre', r; end if;
    v_lista := v_lista || public._crear_reliquia(p_yo, v_id, 'sobre');
    v_ids := v_ids || v_id;
  end loop;
  insert into public.aperturas (jugador, tipo, origen, campeones) values (p_yo, 'reliquias', 'reliquias', v_ids);
  return jsonb_build_object('contador', p_n, 'reliquias', v_lista);
end $$;

create or replace function public.abrir_sobre_reliquias()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_cfg public.sobres_config; v_n int;
begin
  select * into v_cfg from public.sobres_config where id = 'reliquias';
  if not found or not v_cfg.activo or (v_cfg.desde is not null and v_cfg.desde > now()) or (v_cfg.hasta is not null and v_cfg.hasta < now()) then
    raise exception 'El sobre de reliquias no está disponible'; end if;
  update public.inventario set oro = oro - v_cfg.precio, rel_sobres = rel_sobres + 1
    where jugador = v_yo and oro >= v_cfg.precio returning rel_sobres into v_n;
  if not found then raise exception 'Necesitas % de oro', v_cfg.precio; end if;
  return public._sobre_reliquias(v_yo, v_n);
end $$;

create or replace function public.abrir_sobre_reliquias_ticket()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_n int;
begin
  update public.inventario set tickets_dorados = tickets_dorados - 1, rel_sobres = rel_sobres + 1
    where jugador = v_yo and tickets_dorados >= 1 returning rel_sobres into v_n;
  if not found then raise exception 'No tienes Tickets Dorados'; end if;
  return public._sobre_reliquias(v_yo, v_n);
end $$;

-- Misión 15: 1 Ticket Dorado + 25,000 de oro (el resto, igual que en 029)
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
    {"id": 15, "clave": "raid_ronda",         "meta": 31, "premio": {"tickets_dorados": 1, "oro": 25000}},
    {"id": 10, "clave": "todas",              "meta": 10, "premio": {"vales": 1}}
  ]'::jsonb $$;

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
    tickets_dorados = tickets_dorados + coalesce((pr ->> 'tickets_dorados')::int, 0)
    where jugador = v_yo;
  update public.misiones_diarias set cobradas = array_append(cobradas, p_id) where jugador = v_yo and dia = m.dia;
  return jsonb_build_object('id', p_id, 'premio', pr);
end $$;

-- ============================================================ 2. HORDA POR TEMPORADAS
alter table public.horda_partidas add column if not exists temporada integer;
alter table public.horda_partidas add column if not exists cuenta boolean not null default true;   -- false = récord anterior al reinicio
create index if not exists horda_partidas_ranking on public.horda_partidas (horda, temporada) where cuenta and oleada > 0;

create table if not exists public.horda_premios (          -- premio de fin de temporada de cada jugador (uno por Horda y temporada)
  jugador   uuid not null references public.jugadores (id) on delete cascade,
  horda     text not null,
  temporada integer not null,
  puesto    integer not null,
  oleada    integer not null,
  tickets   integer not null,
  visto     boolean not null default false,
  creado    timestamptz not null default now(),
  primary key (jugador, horda, temporada)
);
alter table public.horda_premios enable row level security;
drop policy if exists "jugador ve sus premios de horda" on public.horda_premios;
create policy "jugador ve sus premios de horda" on public.horda_premios for select to authenticated using (jugador = auth.uid());

create or replace function public._horda_tickets(p_puesto int) returns integer language sql immutable set search_path = '' as $$
  select case when p_puesto = 1 then 10 when p_puesto = 2 then 8 when p_puesto = 3 then 6 when p_puesto <= 10 then 4
              when p_puesto <= 25 then 3 when p_puesto <= 50 then 2 else 1 end $$;

-- Puesto de cada jugador en una temporada (null = histórico). Empate: quien llegó antes.
create or replace function public._horda_puestos(p_horda text, p_temporada int)
returns table (jugador uuid, puesto bigint, oleada int, fecha timestamptz) language sql stable security definer set search_path = '' as $$
  with mejores as (
    select distinct on (p.jugador) p.jugador, p.oleada, p.ultima
    from public.horda_partidas p
    where p.horda = p_horda and p.cuenta and p.oleada > 0 and (p_temporada is null or p.temporada = p_temporada)
    order by p.jugador, p.oleada desc, p.ultima asc)
  select m.jugador, row_number() over (order by m.oleada desc, m.ultima asc), m.oleada, m.ultima from mejores m $$;

-- Ranking público. p_tipo: 'temporada' (la actual) o 'historico'
drop function if exists public.horda_ranking(text);
create or replace function public.horda_ranking(p_horda text default 'orcos', p_tipo text default 'temporada')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := auth.uid(); v_tem int := public._arena_temporada(); v_lista jsonb; v_mio jsonb;
begin
  with r as (
    select x.puesto, j.nombre, x.oleada, x.fecha, (x.jugador is not distinct from v_yo) as yo
    from public._horda_puestos(p_horda, case when p_tipo = 'historico' then null else v_tem end) x join public.jugadores j on j.id = x.jugador)
  select coalesce((select jsonb_agg(to_jsonb(a) order by a.puesto) from r a where a.puesto <= 50), '[]'::jsonb),
         (select to_jsonb(b) from r b where b.yo)
  into v_lista, v_mio;
  return jsonb_build_object('lista', v_lista, 'yo', v_mio, 'temporada', v_tem,
    'fin_temporada', (date '2026-10-19' + (v_tem * 28)));
end $$;

-- Mis récords: de la temporada actual e histórico
create or replace function public.horda_mis_records(p_horda text default 'orcos')
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'temporada', coalesce((select max(oleada) from public.horda_partidas where jugador = public._yo() and horda = p_horda and cuenta and temporada = public._arena_temporada()), 0),
    'historico', coalesce((select max(oleada) from public.horda_partidas where jugador = public._yo() and horda = p_horda and cuenta), 0)) $$;

-- Cobra los premios de las temporadas ya cerradas (Tickets Dorados según el puesto) y devuelve los que no ha visto
create or replace function public.horda_premios_temporada()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_tem int := public._arena_temporada(); t record; v_p record; v_res jsonb;
begin
  for t in select distinct p.horda, p.temporada from public.horda_partidas p
           where p.jugador = v_yo and p.cuenta and p.oleada > 0 and p.temporada < v_tem
             and not exists (select 1 from public.horda_premios h where h.jugador = v_yo and h.horda = p.horda and h.temporada = p.temporada) loop
    select * into v_p from public._horda_puestos(t.horda, t.temporada) x where x.jugador = v_yo;
    insert into public.horda_premios (jugador, horda, temporada, puesto, oleada, tickets)
      values (v_yo, t.horda, t.temporada, v_p.puesto, v_p.oleada, public._horda_tickets(v_p.puesto::int)) on conflict do nothing;
    if found then update public.inventario set tickets_dorados = tickets_dorados + public._horda_tickets(v_p.puesto::int) where jugador = v_yo; end if;
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('horda', horda, 'temporada', temporada, 'puesto', puesto, 'oleada', oleada, 'tickets', tickets) order by temporada), '[]')
    into v_res from public.horda_premios where jugador = v_yo and not visto;
  update public.horda_premios set visto = true where jugador = v_yo and not visto;
  return v_res;
end $$;

-- Entrar: la partida queda en la temporada actual (el resto, igual que en 022)
create or replace function public.horda_entrar(p_horda text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_id uuid;
begin
  if p_horda not in ('orcos') then raise exception 'Esa Horda todavía no está disponible'; end if;
  update public.inventario set runas_portal = runas_portal - 1 where jugador = v_yo and runas_portal >= 1;
  if not found then raise exception 'Necesitas una Runa de Portal'; end if;
  update public.horda_partidas set terminada = true, guardado = null, premio = null where jugador = v_yo and not terminada;
  insert into public.horda_partidas (jugador, horda, temporada) values (v_yo, p_horda, public._arena_temporada()) returning id into v_id;
  return v_id;
end $$;

-- Oleada: igual que en 031, pero una partida de una temporada ya cerrada no avanza
create or replace function public.horda_oleada(p_partida uuid, p_oleada int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p public.horda_partidas; v_oro int; v_frag int := 0; v_rel jsonb := null; v_id text; v_rz text;
        v_trof int; v_hito jsonb := null; v_hito_oro int := 0; v_vales int := 0; v_extra int := 0; v_epica jsonb := null; v_res jsonb; v_estelar int := 0;
begin
  select * into v_p from public.horda_partidas where id = p_partida and jugador = v_yo for update;
  if not found or v_p.terminada then raise exception 'Esa partida ya terminó'; end if;
  if p_oleada = v_p.oleada and v_p.premio is not null then return v_p.premio; end if;   -- ya cobrada: mismo premio, sin pagar otra vez
  if v_p.temporada is distinct from public._arena_temporada() then
    update public.horda_partidas set terminada = true, guardado = null, premio = null where id = p_partida;
    raise exception 'La temporada de la Horda terminó: esta partida se cerró con su botín. ¡Abre un portal para la temporada nueva!';
  end if;
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

-- Terminar: devuelve el récord de temporada (el resto, igual que en 022)
create or replace function public.horda_terminar(p_partida uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p public.horda_partidas; v_rec int;
begin
  update public.horda_partidas set terminada = true, guardado = null, premio = null where id = p_partida and jugador = v_yo returning * into v_p;
  if not found then raise exception 'No existe esa partida'; end if;
  select coalesce(max(oleada), 0) into v_rec from public.horda_partidas
    where jugador = v_yo and horda = v_p.horda and cuenta and temporada = public._arena_temporada();
  return jsonb_build_object('oleada', v_p.oleada, 'oro', v_p.oro, 'reliquias', v_p.reliquias, 'fragmentos', v_p.fragmentos, 'record', v_rec);
end $$;

-- ============================================================ 3. REINICIO (solo la primera vez)
do $$
begin
  if not exists (select 1 from public.horda_partidas where temporada is not null) and exists (select 1 from public.horda_partidas where cuenta) then
    -- partidas en curso: se cierran y se devuelve su Runa de Portal
    update public.inventario i set runas_portal = runas_portal + 1
      where exists (select 1 from public.horda_partidas p where p.jugador = i.jugador and not p.terminada);
    update public.horda_partidas set terminada = true, guardado = null, premio = null where not terminada;
    update public.horda_partidas set cuenta = false;
  end if;
end $$;

-- ============================================================ PERMISOS
revoke all on function public._sobre_reliquias(uuid, int), public._horda_tickets(int), public._horda_puestos(text, int) from public, anon, authenticated;
revoke all on function public.abrir_sobre_reliquias(), public.abrir_sobre_reliquias_ticket(), public.misiones_cobrar(int),
  public.horda_mis_records(text), public.horda_premios_temporada(), public.horda_entrar(text), public.horda_oleada(uuid, int), public.horda_terminar(uuid) from public, anon;
grant execute on function public.abrir_sobre_reliquias(), public.abrir_sobre_reliquias_ticket(), public.misiones_cobrar(int),
  public.horda_mis_records(text), public.horda_premios_temporada(), public.horda_entrar(text), public.horda_oleada(uuid, int), public.horda_terminar(uuid) to authenticated;
revoke all on function public.horda_ranking(text, text) from public;
grant execute on function public.horda_ranking(text, text) to anon, authenticated;

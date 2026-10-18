-- Overstrike 2 · Paso 6: MODO HORDA (Runas de Portal, partidas, recompensas por oleada), POLVO ARCANO (descomponer y
-- mejorar valores), FUSIÓN de reliquias y Runas de Portal en la campaña.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar.
-- Requiere 001–005. DESPUÉS ejecutar docs/sql/catalogo.sql (ahora también guarda el lote de cada reliquia).

-- ============================================================ COLUMNAS NUEVAS
alter table public.inventario add column if not exists runas_portal  integer not null default 3 check (runas_portal >= 0);   -- regalo inicial: 3
alter table public.inventario add column if not exists polvo_arcano  integer not null default 0 check (polvo_arcano >= 0);
alter table public.inventario add column if not exists portal_dia    date;                                                  -- compras de Runas hoy
alter table public.inventario add column if not exists portal_compras integer not null default 0;
alter table public.reliquias add column if not exists bloqueada boolean not null default false;                            -- candado
alter table public.reliquias_catalogo add column if not exists lote text not null default 'orcos';                         -- Horda a la que pertenece

-- ============================================================ PARTIDAS DE HORDA
create table if not exists public.horda_partidas (
  id         uuid primary key default gen_random_uuid(),
  jugador    uuid not null references public.jugadores (id) on delete cascade,
  horda      text not null,
  oleada     integer not null default 0,            -- última oleada superada
  oro        bigint not null default 0,
  reliquias  integer not null default 0,
  fragmentos integer not null default 0,
  iniciada   timestamptz not null default now(),
  ultima     timestamptz not null default now(),    -- última oleada cobrada
  terminada  boolean not null default false
);
create index if not exists horda_partidas_jugador on public.horda_partidas (jugador, horda);
alter table public.horda_partidas enable row level security;
drop policy if exists "jugador ve sus partidas de horda" on public.horda_partidas;
create policy "jugador ve sus partidas de horda" on public.horda_partidas for select to authenticated using (jugador = auth.uid());
revoke all on public.horda_partidas from anon, authenticated;
grant select on public.horda_partidas to authenticated;

-- Entrar: consume 1 Runa de Portal y cierra cualquier partida anterior abierta. Devuelve el id de la partida.
create or replace function public.horda_entrar(p_horda text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_id uuid;
begin
  if p_horda not in ('orcos') then raise exception 'Esa Horda todavía no está disponible'; end if;
  update public.inventario set runas_portal = runas_portal - 1 where jugador = v_yo and runas_portal >= 1;
  if not found then raise exception 'Necesitas una Runa de Portal'; end if;
  update public.horda_partidas set terminada = true where jugador = v_yo and not terminada;
  insert into public.horda_partidas (jugador, horda) values (v_yo, p_horda) returning id into v_id;
  return v_id;
end $$;

-- Rareza de la reliquia según el tramo de la oleada (la Épica nunca pasa de 3%)
create or replace function public._rareza_horda(p_n int)
returns text language plpgsql volatile set search_path = '' as $$
declare r numeric := random() * 100;
begin
  if p_n >= 40 then return case when r < 20 then 'Común' when r < 65 then 'Raro' when r < 97 then 'Especial' else 'Épico' end; end if;
  if p_n >= 30 then return case when r < 30 then 'Común' when r < 75 then 'Raro' when r < 98 then 'Especial' else 'Épico' end; end if;
  if p_n >= 20 then return case when r < 50 then 'Común' when r < 88 then 'Raro' when r < 99.5 then 'Especial' else 'Épico' end; end if;
  if p_n >= 10 then return case when r < 75 then 'Común' when r < 97 then 'Raro' else 'Especial' end; end if;
  return case when r < 95 then 'Común' else 'Raro' end;
end $$;

-- Cobrar una oleada superada (la siguiente a la última; mínimo 10 s entre oleadas). El botín se acredita al momento:
-- retirarse o caer no quita nada. Oro 1,000 + 150 × (oleada − 1) (×3 mini-jefe cada 5, ×5 jefe cada 10); 30% de una
-- reliquia del lote de esa Horda; 2% de 1–3 Fragmentos de Runa.
create or replace function public.horda_oleada(p_partida uuid, p_oleada int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p public.horda_partidas; v_oro int; v_frag int := 0; v_rel jsonb := null; v_id text; v_rz text;
begin
  select * into v_p from public.horda_partidas where id = p_partida and jugador = v_yo for update;
  if not found or v_p.terminada then raise exception 'Esa partida ya terminó'; end if;
  if p_oleada <> v_p.oleada + 1 then raise exception 'Oleada fuera de orden'; end if;
  if v_p.ultima > now() - interval '10 seconds' then raise exception 'Demasiado rápido'; end if;
  v_oro := (1000 + 150 * (p_oleada - 1)) * case when p_oleada % 10 = 0 then 5 when p_oleada % 5 = 0 then 3 else 1 end;
  if random() < .30 then
    v_rz := public._rareza_horda(p_oleada);
    select id into v_id from public.reliquias_catalogo where activo and not solo_receta and lote = v_p.horda and rareza = v_rz order by random() limit 1;
    if v_id is not null then v_rel := public._crear_reliquia(v_yo, v_id, 'horda'); end if;
  end if;
  if random() < .02 then v_frag := public._entero(1, 3); end if;
  update public.inventario set oro = oro + v_oro, frag_runa = frag_runa + v_frag where jugador = v_yo;
  update public.horda_partidas set oleada = p_oleada, oro = oro + v_oro, reliquias = reliquias + (v_rel is not null)::int,
    fragmentos = fragmentos + v_frag, ultima = now() where id = p_partida;
  return jsonb_build_object('oleada', p_oleada, 'oro', v_oro, 'reliquia', v_rel, 'fragmentos', v_frag);
end $$;

-- Terminar (retirarse o caer): cierra la partida y devuelve el resumen del botín y el récord
create or replace function public.horda_terminar(p_partida uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p public.horda_partidas; v_rec int;
begin
  update public.horda_partidas set terminada = true where id = p_partida and jugador = v_yo returning * into v_p;
  if not found then raise exception 'No existe esa partida'; end if;
  select coalesce(max(oleada), 0) into v_rec from public.horda_partidas where jugador = v_yo and horda = v_p.horda;
  return jsonb_build_object('oleada', v_p.oleada, 'oro', v_p.oro, 'reliquias', v_p.reliquias, 'fragmentos', v_p.fragmentos, 'record', v_rec);
end $$;

-- ============================================================ RUNAS DE PORTAL EN LA TIENDA
-- Precio que sube con cada compra del día (hora de México): 10,000 · 20,000 · 40,000 en adelante.
create or replace function public.comprar_runa_portal()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_hoy date := (now() at time zone 'America/Mexico_City')::date; v_n int; v_precio int; v_runas int;
begin
  select case when portal_dia = v_hoy then portal_compras else 0 end into v_n from public.inventario where jugador = v_yo for update;
  v_precio := case v_n when 0 then 10000 when 1 then 20000 else 40000 end;
  update public.inventario set oro = oro - v_precio, runas_portal = runas_portal + 1, portal_dia = v_hoy, portal_compras = v_n + 1
    where jugador = v_yo and oro >= v_precio returning runas_portal into v_runas;
  if not found then raise exception 'Necesitas % de oro', v_precio; end if;
  return jsonb_build_object('precio', v_precio, 'runas', v_runas,
    'siguiente', case v_n + 1 when 1 then 20000 else 40000 end);
end $$;

-- ============================================================ POLVO ARCANO
-- Candado: una reliquia bloqueada no se puede descomponer ni fusionar
create or replace function public.bloquear_reliquia(p_reliquia uuid, p_bloquear boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.reliquias set bloqueada = p_bloquear where id = p_reliquia and jugador = public._yo();
  if not found then raise exception 'No tienes esa reliquia'; end if;
end $$;

-- Descomponer: Común 1 · Rara 5 · Especial 20 · Épica 100 de Polvo Arcano. No se descomponen Legendarias, equipadas ni bloqueadas.
create or replace function public.descomponer_reliquias(p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_polvo int; v_n int;
begin
  select count(*), coalesce(sum(case c.rareza when 'Común' then 1 when 'Raro' then 5 when 'Especial' then 20 when 'Épico' then 100 else 0 end), 0)
    into v_n, v_polvo
    from public.reliquias r join public.reliquias_catalogo c on c.id = r.reliquia
    where r.id = any (p_ids) and r.jugador = v_yo and r.campeon is null and not r.bloqueada and c.rareza <> 'Legendario';
  if v_n <> cardinality(p_ids) then raise exception 'Alguna reliquia no se puede descomponer (equipada, bloqueada o Legendaria)'; end if;
  delete from public.reliquias where id = any (p_ids) and jugador = v_yo;
  update public.inventario set polvo_arcano = polvo_arcano + v_polvo where jugador = v_yo;
  return v_polvo;
end $$;

-- Mejorar valores: vuelve a sortear UNA línea (p_linea = 'plana' o el nombre de la estadística porcentual). En una línea de
-- 2 o 3 tiradas se sortean todas por el precio de una. El nuevo valor reemplaza al anterior (puede bajar).
-- Costo: Común 2 · Rara 8 · Especial 25 · Épica 80 · Legendaria 200 de Polvo Arcano. Devuelve la reliquia actualizada.
create or replace function public.mejorar_reliquia(p_reliquia uuid, p_linea text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_rel public.reliquias; v_rz text; v_costo int; v_rango public.reliquia_rangos; v_t jsonb := '[]'; e jsonb;
begin
  select * into v_rel from public.reliquias where id = p_reliquia and jugador = v_yo for update;
  if not found then raise exception 'No tienes esa reliquia'; end if;
  select rareza into v_rz from public.reliquias_catalogo where id = v_rel.reliquia;
  v_costo := case v_rz when 'Común' then 2 when 'Raro' then 8 when 'Especial' then 25 when 'Épico' then 80 else 200 end;
  update public.inventario set polvo_arcano = polvo_arcano - v_costo where jugador = v_yo and polvo_arcano >= v_costo;
  if not found then raise exception 'Necesitas % de Polvo Arcano', v_costo; end if;
  if p_linea = 'plana' then
    select * into v_rango from public.reliquia_rangos where rareza = v_rz and stat = v_rel.plana_stat;
    update public.reliquias set plana_valor = public._entero(v_rango.minimo, v_rango.maximo) where id = p_reliquia;
  else
    if not exists (select 1 from jsonb_array_elements(v_rel.tiradas) x where x ->> 0 = p_linea) then raise exception 'Esa línea no existe'; end if;
    select * into v_rango from public.reliquia_rangos where rareza = v_rz and stat = p_linea;
    for e in select * from jsonb_array_elements(v_rel.tiradas) loop
      v_t := v_t || case when e ->> 0 = p_linea then jsonb_build_array(jsonb_build_array(p_linea, public._entero(v_rango.minimo, v_rango.maximo))) else jsonb_build_array(e) end;
    end loop;
    update public.reliquias set tiradas = v_t where id = p_reliquia;
  end if;
  select * into v_rel from public.reliquias where id = p_reliquia;
  return to_jsonb(v_rel);
end $$;

-- ============================================================ FUSIÓN
-- 10 reliquias de la MISMA rareza (Común, Rara o Especial; cualquier nombre) → 1 reliquia al azar de la rareza siguiente,
-- de cualquier lote. Cuesta oro: Común 1,000 · Rara 5,000 · Especial 20,000. No entran equipadas ni bloqueadas.
create or replace function public.fusionar_reliquias(p_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_n int; v_rz text[]; v_sig text; v_oro int; v_id text;
begin
  if cardinality(p_ids) <> 10 then raise exception 'La fusión necesita 10 reliquias'; end if;
  select count(*), array_agg(distinct c.rareza) into v_n, v_rz
    from public.reliquias r join public.reliquias_catalogo c on c.id = r.reliquia
    where r.id = any (p_ids) and r.jugador = v_yo and r.campeon is null and not r.bloqueada;
  if v_n <> 10 then raise exception 'Alguna reliquia no se puede fusionar (equipada o bloqueada)'; end if;
  if cardinality(v_rz) <> 1 then raise exception 'Las 10 reliquias deben ser de la misma rareza'; end if;
  v_sig := case v_rz[1] when 'Común' then 'Raro' when 'Raro' then 'Especial' when 'Especial' then 'Épico' end;
  if v_sig is null then raise exception 'Esa rareza no se puede fusionar'; end if;
  v_oro := case v_rz[1] when 'Común' then 1000 when 'Raro' then 5000 else 20000 end;
  update public.inventario set oro = oro - v_oro where jugador = v_yo and oro >= v_oro;
  if not found then raise exception 'Necesitas % de oro', v_oro; end if;
  delete from public.reliquias where id = any (p_ids) and jugador = v_yo;
  select id into v_id from public.reliquias_catalogo where activo and not solo_receta and rareza = v_sig order by random() limit 1;
  return public._crear_reliquia(v_yo, v_id, 'fusion');
end $$;

-- ============================================================ CAMPAÑA: RUNAS DE PORTAL
-- Igual que en 004, más: 1 Runa de Portal la primera vez que una etapa se completa con 3 estrellas y 15% al repetir.
create or replace function public.campana_completar(p_area text, p_dificultad text, p_etapa int, p_estrellas int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := public._yo();
  v_m int := case p_dificultad when 'normal' then 1 when 'dificil' then 2 when 'brutal' then 3 end;
  v_prev text := case p_dificultad when 'dificil' then 'normal' when 'brutal' then 'dificil' end;
  v_fila public.campana_progreso; v_primera boolean; v_ultima timestamptz; v_total int;
  v_premios jsonb := '[]'::jsonb; v_oro int := 0; v_frag int := 0; v_runas int := 0; v_vales int := 0; v_portal int := 0; u int;
begin
  if p_area <> 'portal' or v_m is null or p_etapa not between 1 and 20 or p_estrellas not between 1 and 3 then
    raise exception 'Etapa no válida'; end if;
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

  v_oro := case when v_primera then 5000 else 1000 end * v_m;
  if v_primera and p_etapa = 10 then v_frag := v_frag + 5 * v_m; end if;
  if v_primera and p_etapa = 20 then
    v_vales := v_vales + case v_m when 3 then 2 else 1 end;
    v_runas := v_runas + case v_m when 1 then 0 when 2 then 1 else 2 end;
  end if;
  -- Runa de Portal: primeras 3 estrellas de la etapa, o 15% al repetirla
  if p_estrellas = 3 and (v_primera or v_fila.estrellas < 3) then v_portal := 1;
  elsif not v_primera and random() < .15 then v_portal := 1; end if;

  select coalesce(sum(estrellas), 0) into v_total from public.campana_progreso where jugador = v_yo and area = p_area and dificultad = p_dificultad;
  foreach u in array array[20, 40, 60] loop
    if v_total >= u and not exists (select 1 from public.campana_cofres where jugador = v_yo and area = p_area and dificultad = p_dificultad and umbral = u) then
      insert into public.campana_cofres (jugador, area, dificultad, umbral) values (v_yo, p_area, p_dificultad, u);
      if u = 20 then v_oro := v_oro + 10000 * v_m;
      elsif u = 40 then v_frag := v_frag + 5 * v_m;
      else
        if v_m = 1 then v_vales := v_vales + 1; elsif v_m = 2 then v_runas := v_runas + 1; else v_runas := v_runas + 4; end if;
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

-- ============================================================ PERMISOS
revoke all on function public._rareza_horda(int) from public, anon, authenticated;
revoke all on function public.horda_entrar(text), public.horda_oleada(uuid, int), public.horda_terminar(uuid), public.comprar_runa_portal(),
  public.bloquear_reliquia(uuid, boolean), public.descomponer_reliquias(uuid[]), public.mejorar_reliquia(uuid, text),
  public.fusionar_reliquias(uuid[]), public.campana_completar(text, text, int, int) from public, anon;
grant execute on function public.horda_entrar(text), public.horda_oleada(uuid, int), public.horda_terminar(uuid), public.comprar_runa_portal(),
  public.bloquear_reliquia(uuid, boolean), public.descomponer_reliquias(uuid[]), public.mejorar_reliquia(uuid, text),
  public.fusionar_reliquias(uuid[]), public.campana_completar(text, text, int, int) to authenticated;

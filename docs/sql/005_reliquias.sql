-- Overstrike 2 · Paso 5: SISTEMA DE RELIQUIAS (catálogo, inventario, sorteo de valores, sobre "Relics of Power",
-- garantías por calendario, equipar/desequipar y espacios de reliquias a elección).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar.
-- DESPUÉS ejecutar docs/sql/catalogo.sql (llena el catálogo de reliquias, sus tipos y sus rangos).
-- Los jugadores solo LEEN sus reliquias: sortear, abrir sobres y equipar pasa por estas funciones (evita trampas).

-- ============================================================ CATÁLOGO (lo llena docs/sql/catalogo.sql)
create table if not exists public.reliquia_tipos (
  tipo      text primary key,
  categoria text not null check (categoria in ('Arma', 'Equipación', 'Accesorio')),
  planas    text[] not null,                      -- estadística plana posible (si hay dos, se sortea una)
  pcts      text[] not null                       -- porcentuales permitidas
);
create table if not exists public.reliquia_rangos (
  rareza text not null,
  stat   text not null,
  minimo integer not null,
  maximo integer not null check (maximo >= minimo),
  primary key (rareza, stat)
);
create table if not exists public.reliquias_catalogo (
  id          text primary key,
  nombre      text not null,
  rareza      text not null check (rareza in ('Común', 'Raro', 'Especial', 'Épico', 'Legendario')),
  tipo        text not null references public.reliquia_tipos (tipo),
  en_sobre    boolean not null default true,      -- sale en el sobre de reliquias
  solo_receta boolean not null default false,     -- solo se consigue crafteando
  activo      boolean not null default true
);
alter table public.reliquia_tipos     enable row level security;
alter table public.reliquia_rangos    enable row level security;
alter table public.reliquias_catalogo enable row level security;
drop policy if exists "todos ven los tipos de reliquia" on public.reliquia_tipos;
create policy "todos ven los tipos de reliquia" on public.reliquia_tipos for select to anon, authenticated using (true);
drop policy if exists "todos ven los rangos de reliquia" on public.reliquia_rangos;
create policy "todos ven los rangos de reliquia" on public.reliquia_rangos for select to anon, authenticated using (true);
drop policy if exists "todos ven el catalogo de reliquias" on public.reliquias_catalogo;
create policy "todos ven el catalogo de reliquias" on public.reliquias_catalogo for select to anon, authenticated using (true);
revoke all on public.reliquia_tipos, public.reliquia_rangos, public.reliquias_catalogo from anon, authenticated;
grant select on public.reliquia_tipos, public.reliquia_rangos, public.reliquias_catalogo to anon, authenticated;

-- ============================================================ INVENTARIO DE RELIQUIAS (cada fila = una copia con sus valores)
create table if not exists public.reliquias (
  id          uuid primary key default gen_random_uuid(),
  jugador     uuid not null references public.jugadores (id) on delete cascade,
  reliquia    text not null references public.reliquias_catalogo (id),
  plana_stat  text not null,
  plana_valor integer not null,
  tiradas     jsonb not null default '[]',        -- [["critDmg", 8], ["res", 5]] (porcentuales en puntos enteros)
  campeon     text,                               -- equipada en este campeón (null = en el inventario)
  espacio     text check (espacio in ('arma1', 'equip1', 'acc1', 'arma2', 'equip2', 'acc2')),
  origen      text,                               -- sobre / recompensa / receta / fusión…
  obtenida    timestamptz not null default now(),
  check ((campeon is null) = (espacio is null))
);
create unique index if not exists reliquias_un_espacio on public.reliquias (jugador, campeon, espacio) where campeon is not null;
create index if not exists reliquias_jugador on public.reliquias (jugador);
alter table public.reliquias enable row level security;
drop policy if exists "jugador ve sus reliquias" on public.reliquias;
create policy "jugador ve sus reliquias" on public.reliquias for select to authenticated using (jugador = auth.uid());
revoke all on public.reliquias from anon, authenticated;
grant select on public.reliquias to authenticated;

-- Contador del sobre de reliquias (garantías por calendario: Rara cada 2, Especial cada 6, Épica cada 50; nunca se reinicia)
alter table public.inventario add column if not exists rel_sobres integer not null default 0 check (rel_sobres >= 0);

-- Espacios extra a elección: qué espacios abrió el jugador (antes solo se guardaba cuántos)
alter table public.coleccion add column if not exists espacios_abiertos text[] not null default '{}';
update public.coleccion set espacios_abiertos = (array['arma2', 'equip2', 'acc2'])[1:espacios]
  where espacios > 0 and cardinality(espacios_abiertos) = 0;

-- El sobre en la tienda (el administrador cambia precio y activo desde el juego)
insert into public.sobres_config (id, activo, precio) values ('reliquias', true, 50000) on conflict (id) do nothing;

-- ============================================================ SORTEO
-- Rareza al azar del sobre: Común 70 · Rara 20 · Especial 9 · Épica 1 · Legendaria 0
create or replace function public._rareza_sobre_reliquias()
returns text language plpgsql volatile set search_path = '' as $$
declare r numeric := random() * 100;
begin
  return case when r < 70 then 'Común' when r < 90 then 'Raro' when r < 99 then 'Especial' else 'Épico' end;
end $$;

create or replace function public._entero(p_min int, p_max int)
returns integer language sql volatile set search_path = '' as $$
  select p_min + floor(random() * (p_max - p_min + 1))::int;
$$;

-- Crea una copia de la reliquia p_reliquia para p_jugador con sus valores sorteados (plana + tiradas, máx. 2 por estadística)
create or replace function public._crear_reliquia(p_jugador uuid, p_reliquia text, p_origen text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cat public.reliquias_catalogo; v_tipo public.reliquia_tipos; v_rango public.reliquia_rangos;
        v_n int; v_plana text; v_valor int; v_tiradas jsonb := '[]'; v_stat text; i int; v_fila public.reliquias;
begin
  select * into v_cat from public.reliquias_catalogo where id = p_reliquia;
  if not found then raise exception 'Reliquia desconocida: %', p_reliquia; end if;
  select * into v_tipo from public.reliquia_tipos where tipo = v_cat.tipo;
  v_n := case v_cat.rareza when 'Común' then 0 when 'Raro' then 1 when 'Especial' then 2 else 3 end;
  v_plana := v_tipo.planas[1 + floor(random() * cardinality(v_tipo.planas))::int];
  select * into v_rango from public.reliquia_rangos where rareza = v_cat.rareza and stat = v_plana;
  if not found then raise exception 'Falta el rango de % (%)', v_plana, v_cat.rareza; end if;
  v_valor := public._entero(v_rango.minimo, v_rango.maximo);
  for i in 1 .. v_n loop
    select s into v_stat from unnest(v_tipo.pcts) s
      where (select count(*) from jsonb_array_elements(v_tiradas) t where t ->> 0 = s) < 2
      order by random() limit 1;
    select * into v_rango from public.reliquia_rangos where rareza = v_cat.rareza and stat = v_stat;
    if not found then raise exception 'Falta el rango de % (%)', v_stat, v_cat.rareza; end if;
    v_tiradas := v_tiradas || jsonb_build_array(jsonb_build_array(v_stat, public._entero(v_rango.minimo, v_rango.maximo)));
  end loop;
  insert into public.reliquias (jugador, reliquia, plana_stat, plana_valor, tiradas, origen)
    values (p_jugador, p_reliquia, v_plana, v_valor, v_tiradas, p_origen) returning * into v_fila;
  return to_jsonb(v_fila);
end $$;

-- Una reliquia al azar de esa rareza entre las que salen en el sobre
create or replace function public._reliquia_del_sobre(p_rareza text)
returns text language sql volatile security definer set search_path = '' as $$
  select id from public.reliquias_catalogo
    where activo and en_sobre and not solo_receta and rareza = p_rareza order by random() limit 1;
$$;

-- ============================================================ SOBRE "RELICS OF POWER"
-- 3 reliquias. Garantías por calendario según el número de sobre abierto (n): n múltiplo de 2 → 1 Rara, de 6 → 1 Especial,
-- de 50 → 1 Épica. Cada garantía ocupa un espacio y, si coinciden, salen todas. Los espacios restantes se sortean normal.
-- Devuelve { contador, reliquias: [filas] }
create or replace function public.abrir_sobre_reliquias()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_cfg public.sobres_config; v_n int; v_rarezas text[] := '{}'; r text; v_id text;
        v_lista jsonb := '[]'; v_ids text[] := '{}';
begin
  select * into v_cfg from public.sobres_config where id = 'reliquias';
  if not found or not v_cfg.activo or (v_cfg.desde is not null and v_cfg.desde > now()) or (v_cfg.hasta is not null and v_cfg.hasta < now()) then
    raise exception 'El sobre de reliquias no está disponible'; end if;
  update public.inventario set oro = oro - v_cfg.precio, rel_sobres = rel_sobres + 1
    where jugador = v_yo and oro >= v_cfg.precio returning rel_sobres into v_n;
  if not found then raise exception 'Necesitas % de oro', v_cfg.precio; end if;
  if v_n % 50 = 0 then v_rarezas := v_rarezas || 'Épico'::text; end if;
  if v_n % 6 = 0 then v_rarezas := v_rarezas || 'Especial'::text; end if;
  if v_n % 2 = 0 then v_rarezas := v_rarezas || 'Raro'::text; end if;
  while cardinality(v_rarezas) < 3 loop v_rarezas := v_rarezas || public._rareza_sobre_reliquias(); end loop;
  foreach r in array v_rarezas loop
    v_id := public._reliquia_del_sobre(r);
    if v_id is null then raise exception 'No hay reliquias % en el sobre', r; end if;
    v_lista := v_lista || public._crear_reliquia(v_yo, v_id, 'sobre');
    v_ids := v_ids || v_id;
  end loop;
  insert into public.aperturas (jugador, tipo, origen, campeones) values (v_yo, 'reliquias', 'reliquias', v_ids);
  return jsonb_build_object('contador', v_n, 'reliquias', v_lista);
end $$;

-- ============================================================ EQUIPAR / DESEQUIPAR
-- Reglas: espacio abierto · estrellas del campeón (Común 0★, Rara 1★, Especial 2★, Épica 3★, Legendaria 4★) · categoría del espacio ·
-- el Arco solo va en Arma 1 y convierte Arma 2 en Equipación 3 · nunca dos Escudos · Equipación: una de cada tipo · armas y
-- accesorios se pueden repetir. Si el espacio estaba ocupado, la anterior vuelve al inventario. Si la reliquia estaba en otro
-- campeón, se le quita.
create or replace function public.equipar_reliquia(p_reliquia uuid, p_campeon text, p_espacio text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_rel public.reliquias; v_cat public.reliquias_catalogo; v_tipo public.reliquia_tipos;
        v_col public.coleccion; v_req int; v_arco_a1 boolean; v_cat_espacio text; v_otro text;
begin
  select * into v_rel from public.reliquias where id = p_reliquia and jugador = v_yo for update;
  if not found then raise exception 'No tienes esa reliquia'; end if;
  select * into v_col from public.coleccion where jugador = v_yo and campeon = p_campeon;
  if not found then raise exception 'No tienes a ese campeón'; end if;
  if p_espacio not in ('arma1', 'equip1', 'acc1', 'arma2', 'equip2', 'acc2') then raise exception 'Espacio desconocido'; end if;
  if p_espacio in ('arma2', 'equip2', 'acc2') and not (p_espacio = any (v_col.espacios_abiertos)) then
    raise exception 'Ese espacio está bloqueado'; end if;
  select * into v_cat from public.reliquias_catalogo where id = v_rel.reliquia;
  select * into v_tipo from public.reliquia_tipos where tipo = v_cat.tipo;
  v_req := case v_cat.rareza when 'Común' then 0 when 'Raro' then 1 when 'Especial' then 2 when 'Épico' then 3 else 4 end;
  if v_col.estrellas < v_req then raise exception 'Este campeón necesita % estrellas para usar reliquias %', v_req, v_cat.rareza; end if;

  -- ¿hay un Arco en Arma 1 (contando la que se va a equipar)?
  if p_espacio = 'arma1' then v_arco_a1 := v_cat.tipo = 'Arco';
  else v_arco_a1 := exists (select 1 from public.reliquias r join public.reliquias_catalogo c on c.id = r.reliquia
      where r.jugador = v_yo and r.campeon = p_campeon and r.espacio = 'arma1' and c.tipo = 'Arco' and r.id <> p_reliquia); end if;
  v_cat_espacio := case when p_espacio like 'arma%' then (case when p_espacio = 'arma2' and v_arco_a1 then 'Equipación' else 'Arma' end)
                        when p_espacio like 'equip%' then 'Equipación' else 'Accesorio' end;
  if v_tipo.categoria <> v_cat_espacio then
    raise exception '%', case when p_espacio = 'arma2' and v_arco_a1 then 'Con un Arco, Arma 2 se vuelve Equipación 3'
                              else 'Ese espacio es de ' || v_cat_espacio end; end if;
  if v_cat.tipo = 'Arco' and p_espacio <> 'arma1' then raise exception 'El Arco solo va en Arma 1'; end if;
  if v_cat.tipo = 'Escudo' and exists (select 1 from public.reliquias r join public.reliquias_catalogo c on c.id = r.reliquia
      where r.jugador = v_yo and r.campeon = p_campeon and r.espacio = (case when p_espacio = 'arma1' then 'arma2' else 'arma1' end)
        and c.tipo = 'Escudo' and r.id <> p_reliquia) then raise exception 'No puede llevar dos Escudos'; end if;
  if v_tipo.categoria = 'Equipación' and exists (select 1 from public.reliquias r join public.reliquias_catalogo c on c.id = r.reliquia
      where r.jugador = v_yo and r.campeon = p_campeon and r.id <> p_reliquia and r.espacio <> p_espacio and c.tipo = v_cat.tipo
        and (r.espacio in ('equip1', 'equip2') or (r.espacio = 'arma2' and v_arco_a1))) then
    raise exception 'Ya lleva otra reliquia de tipo %', v_cat.tipo; end if;

  -- libera el espacio, quita la reliquia de donde estaba y la equipa
  update public.reliquias set campeon = null, espacio = null
    where jugador = v_yo and campeon = p_campeon and espacio = p_espacio and id <> p_reliquia;
  update public.reliquias set campeon = null, espacio = null where id = p_reliquia;
  -- un Arco en Arma 1 manda al inventario el arma que hubiera en Arma 2; quitar el Arco devuelve la Equipación 3
  if p_espacio = 'arma1' then
    select c.categoria into v_otro from public.reliquias r join public.reliquias_catalogo c2 on c2.id = r.reliquia
      join public.reliquia_tipos c on c.tipo = c2.tipo
      where r.jugador = v_yo and r.campeon = p_campeon and r.espacio = 'arma2';
    if v_otro is not null and ((v_arco_a1 and v_otro = 'Arma') or (not v_arco_a1 and v_otro = 'Equipación')) then
      update public.reliquias set campeon = null, espacio = null where jugador = v_yo and campeon = p_campeon and espacio = 'arma2';
    end if;
  end if;
  update public.reliquias set campeon = p_campeon, espacio = p_espacio where id = p_reliquia;
end $$;

create or replace function public.desequipar_reliquia(p_reliquia uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_rel public.reliquias; v_tipo text;
begin
  select * into v_rel from public.reliquias where id = p_reliquia and jugador = v_yo for update;
  if not found then raise exception 'No tienes esa reliquia'; end if;
  select tipo into v_tipo from public.reliquias_catalogo where id = v_rel.reliquia;
  update public.reliquias set campeon = null, espacio = null where id = p_reliquia;
  -- sin el Arco, la Equipación 3 (en Arma 2) vuelve al inventario
  if v_rel.espacio = 'arma1' and v_tipo = 'Arco' then
    update public.reliquias r set campeon = null, espacio = null from public.reliquias_catalogo c, public.reliquia_tipos t
      where c.id = r.reliquia and t.tipo = c.tipo and t.categoria = 'Equipación'
        and r.jugador = v_yo and r.campeon = v_rel.campeon and r.espacio = 'arma2';
  end if;
end $$;

-- ============================================================ ESPACIOS EXTRA A ELECCIÓN
-- Abre Arma 2, Equipación 2 o Accesorio 2 (el que elija el jugador; sin elegir, el primero cerrado). El costo sube según
-- cuántos tenga abiertos: copias 1 / 3 / 5 u oro 100,000 / 500,000 / 1,000,000.
drop function if exists public.desbloquear_espacio(text, text);
create or replace function public.desbloquear_espacio(p_campeon text, p_con text, p_espacio text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); r public.coleccion; v_copias int[] := array[1, 3, 5]; v_oro bigint[] := array[100000, 500000, 1000000];
        v_esp text := p_espacio;
begin
  select * into r from public.coleccion where jugador = v_yo and campeon = p_campeon for update;
  if not found then raise exception 'No tienes a ese campeón'; end if;
  if r.espacios >= 3 then raise exception 'Ya tiene todos sus espacios desbloqueados'; end if;
  if v_esp is null then
    select e into v_esp from unnest(array['arma2', 'equip2', 'acc2']) e where not (e = any (r.espacios_abiertos)) limit 1;
  end if;
  if v_esp not in ('arma2', 'equip2', 'acc2') then raise exception 'Espacio desconocido'; end if;
  if v_esp = any (r.espacios_abiertos) then raise exception 'Ese espacio ya está abierto'; end if;
  if p_con = 'copias' then
    if r.copias < v_copias[r.espacios + 1] then raise exception 'Necesitas % copia(s)', v_copias[r.espacios + 1]; end if;
    update public.coleccion set copias = copias - v_copias[r.espacios + 1] where jugador = v_yo and campeon = p_campeon;
  elsif p_con = 'oro' then
    update public.inventario set oro = oro - v_oro[r.espacios + 1] where jugador = v_yo and oro >= v_oro[r.espacios + 1];
    if not found then raise exception 'Necesitas % de oro', v_oro[r.espacios + 1]; end if;
  else raise exception 'Forma de pago desconocida'; end if;
  update public.coleccion set espacios = espacios + 1, espacios_abiertos = espacios_abiertos || v_esp
    where jugador = v_yo and campeon = p_campeon;
  return r.espacios + 1;
end $$;

-- ============================================================ PERMISOS
revoke all on function public._rareza_sobre_reliquias(), public._entero(int, int), public._crear_reliquia(uuid, text, text),
  public._reliquia_del_sobre(text) from public, anon, authenticated;
revoke all on function public.abrir_sobre_reliquias(), public.equipar_reliquia(uuid, text, text), public.desequipar_reliquia(uuid),
  public.desbloquear_espacio(text, text, text) from public, anon;
grant execute on function public.abrir_sobre_reliquias(), public.equipar_reliquia(uuid, text, text), public.desequipar_reliquia(uuid),
  public.desbloquear_espacio(text, text, text) to authenticated;

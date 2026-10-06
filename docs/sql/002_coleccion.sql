-- Overstrike 2 · Paso 2: catálogo de campeones, colección, inventario y funciones del servidor
-- (Starter Pack, sobres, ascensión, espacios de reliquias, desfragmentar, runas y Portal de Invocación).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar.
-- Los jugadores solo pueden LEER su colección e inventario: todo cambio pasa por estas funciones (evita trampas).

-- ============================================================ CATÁLOGO (lo llena docs/sql/catalogo.sql)
create table if not exists public.campeones (
  id      text primary key,
  nombre  text not null,
  starter text,                                   -- Starter Pack exclusivo (blazing / frostborn / noxious) o null
  sobres  text[] not null default '{}',           -- sobres temáticos donde aparece
  activo  boolean not null default true           -- false = no sale en ningún lado
);
alter table public.campeones enable row level security;
drop policy if exists "todos ven el catalogo" on public.campeones;
create policy "todos ven el catalogo" on public.campeones for select to anon, authenticated using (true);
revoke all on public.campeones from anon, authenticated;
grant select on public.campeones to anon, authenticated;

-- ============================================================ COLECCIÓN E INVENTARIO
create table if not exists public.coleccion (
  jugador   uuid not null references public.jugadores (id) on delete cascade,
  campeon   text not null references public.campeones (id),
  copias    integer not null default 0 check (copias >= 0),          -- copias repetidas disponibles para gastar
  estrellas integer not null default 0 check (estrellas between 0 and 5),
  espacios  integer not null default 0 check (espacios between 0 and 3),   -- espacios de reliquias desbloqueados
  obtenido  timestamptz not null default now(),
  primary key (jugador, campeon)
);
create table if not exists public.inventario (
  jugador    uuid primary key references public.jugadores (id) on delete cascade,
  oro        bigint  not null default 0 check (oro >= 0),
  frag_runa  integer not null default 0 check (frag_runa >= 0),   -- Fragmentos de Runa de Invocación
  frag_otros integer not null default 0 check (frag_otros >= 0),  -- otros fragmentos (tipos por definir)
  runas      integer not null default 0 check (runas >= 0)        -- Runas de Invocación
);
create table if not exists public.aperturas (
  id        bigserial primary key,
  jugador   uuid not null references public.jugadores (id) on delete cascade,
  tipo      text not null,                       -- starter / sobre / portal
  origen    text,
  campeones text[] not null,
  fecha     timestamptz not null default now()
);
alter table public.coleccion  enable row level security;
alter table public.inventario enable row level security;
alter table public.aperturas  enable row level security;
drop policy if exists "jugador ve su coleccion" on public.coleccion;
create policy "jugador ve su coleccion" on public.coleccion for select to authenticated using (jugador = auth.uid());
drop policy if exists "jugador ve su inventario" on public.inventario;
create policy "jugador ve su inventario" on public.inventario for select to authenticated using (jugador = auth.uid());
drop policy if exists "jugador ve sus aperturas" on public.aperturas;
create policy "jugador ve sus aperturas" on public.aperturas for select to authenticated using (jugador = auth.uid());
revoke all on public.coleccion, public.inventario, public.aperturas from anon, authenticated;
grant select on public.coleccion, public.inventario, public.aperturas to authenticated;

-- Al registrarse: perfil + inventario vacío
create or replace function public.crear_perfil_jugador()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.jugadores (id, nombre)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), 'Jugador_' || left(new.id::text, 8)));
  insert into public.inventario (jugador) values (new.id) on conflict do nothing;
  return new;
end $$;
-- Cuentas que ya existían (p. ej. Kael): su inventario
insert into public.inventario (jugador) select id from public.jugadores on conflict do nothing;

-- ============================================================ FUNCIONES INTERNAS
-- Da un campeón: si no lo tenía, lo agrega; si ya lo tenía, suma una copia
create or replace function public._dar_campeon(p_jugador uuid, p_campeon text)
returns void language sql security definer set search_path = '' as $$
  insert into public.coleccion as c (jugador, campeon) values (p_jugador, p_campeon)
  on conflict (jugador, campeon) do update set copias = c.copias + 1;
$$;
revoke all on function public._dar_campeon(uuid, text) from public, anon, authenticated;

create or replace function public._yo()
returns uuid language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  return auth.uid();
end $$;

-- ============================================================ STARTER PACK (una sola vez por cuenta)
-- 3 al azar de sus exclusivos + 2 al azar entre los libres o de su tema (nunca exclusivos de otro pack)
create or replace function public.abrir_starter(p_starter text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_tema text[]; v_extra text[]; v_todo text[]; c text;
begin
  if not exists (select 1 from public.campeones where starter = p_starter) then raise exception 'Starter Pack desconocido'; end if;
  perform 1 from public.jugadores where id = v_yo and starter_elegido is null for update;
  if not found then raise exception 'Ya elegiste tu Starter Pack'; end if;
  select coalesce(array_agg(id), '{}') into v_tema
    from (select id from public.campeones where activo and starter = p_starter order by random() limit 3) t;
  select coalesce(array_agg(id), '{}') into v_extra
    from (select id from public.campeones where activo and (starter is null or starter = p_starter) and not (id = any (v_tema))
          order by random() limit 5 - cardinality(v_tema)) t;
  v_todo := v_tema || v_extra;
  foreach c in array v_todo loop perform public._dar_campeon(v_yo, c); end loop;
  update public.jugadores set starter_elegido = p_starter where id = v_yo;
  insert into public.aperturas (jugador, tipo, origen, campeones) values (v_yo, 'starter', p_starter, v_todo);
  return v_todo;
end $$;

-- ============================================================ SOBRES DE LA TIENDA
-- 3 campeones: 1 o 2 (50/50) de su tema y el resto al azar entre todos. Cobra su precio en oro.
create or replace function public.abrir_sobre(p_sobre text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_cfg public.sobres_config; v_n int := case when random() < .5 then 1 else 2 end; v_tema text[]; v_resto text[]; v_todo text[]; c text;
begin
  select * into v_cfg from public.sobres_config where id = p_sobre;
  if not found or not v_cfg.activo or (v_cfg.desde is not null and now() < v_cfg.desde) or (v_cfg.hasta is not null and now() > v_cfg.hasta)
    then raise exception 'Ese sobre no está disponible'; end if;
  if v_cfg.precio > 0 then
    update public.inventario set oro = oro - v_cfg.precio where jugador = v_yo and oro >= v_cfg.precio;
    if not found then raise exception 'No tienes suficiente oro'; end if;
  end if;
  select coalesce(array_agg(id), '{}') into v_tema
    from (select id from public.campeones where activo and p_sobre = any (sobres)
          order by random() limit v_n) t;
  select coalesce(array_agg(id), '{}') into v_resto
    from (select id from public.campeones where activo and not (id = any (v_tema)) order by random() limit 3 - cardinality(v_tema)) t;
  v_todo := v_tema || v_resto;
  foreach c in array v_todo loop perform public._dar_campeon(v_yo, c); end loop;
  insert into public.aperturas (jugador, tipo, origen, campeones) values (v_yo, 'sobre', p_sobre, v_todo);
  return v_todo;
end $$;

-- ============================================================ COPIAS: ascender y espacios
-- Ascender: la estrella N cuesta N copias (1★=1, 2★=2 … 5★=5)
create or replace function public.ascender(p_campeon text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); r public.coleccion;
begin
  select * into r from public.coleccion where jugador = v_yo and campeon = p_campeon for update;
  if not found then raise exception 'No tienes a ese campeón'; end if;
  if r.estrellas >= 5 then raise exception 'Ya tiene 5 estrellas'; end if;
  if r.copias < r.estrellas + 1 then raise exception 'Necesitas % copia(s) para la siguiente estrella', r.estrellas + 1; end if;
  update public.coleccion set copias = copias - (r.estrellas + 1), estrellas = estrellas + 1
    where jugador = v_yo and campeon = p_campeon;
  return r.estrellas + 1;
end $$;

-- Desbloquear el siguiente espacio de reliquias: con copias (1 / 3 / 5) o con oro (100,000 / 500,000 / 1,000,000)
create or replace function public.desbloquear_espacio(p_campeon text, p_con text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); r public.coleccion; v_copias int[] := array[1, 3, 5]; v_oro bigint[] := array[100000, 500000, 1000000];
begin
  select * into r from public.coleccion where jugador = v_yo and campeon = p_campeon for update;
  if not found then raise exception 'No tienes a ese campeón'; end if;
  if r.espacios >= 3 then raise exception 'Ya tiene todos sus espacios desbloqueados'; end if;
  if p_con = 'copias' then
    if r.copias < v_copias[r.espacios + 1] then raise exception 'Necesitas % copia(s)', v_copias[r.espacios + 1]; end if;
    update public.coleccion set copias = copias - v_copias[r.espacios + 1] where jugador = v_yo and campeon = p_campeon;
  elsif p_con = 'oro' then
    update public.inventario set oro = oro - v_oro[r.espacios + 1] where jugador = v_yo and oro >= v_oro[r.espacios + 1];
    if not found then raise exception 'Necesitas % de oro', v_oro[r.espacios + 1]; end if;
  else raise exception 'Forma de pago desconocida'; end if;
  update public.coleccion set espacios = espacios + 1 where jugador = v_yo and campeon = p_campeon;
  return r.espacios + 1;
end $$;

-- ============================================================ DESFRAGMENTAR, RUNAS Y PORTAL
-- Cada copia da 3 fragmentos: 1 o 2 (50/50) de Runa de Invocación y el resto de otros tipos
create or replace function public.desfragmentar(p_campeon text, p_cantidad integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); r public.coleccion; v_runa int := 0; i int;
begin
  if p_cantidad < 1 then raise exception 'Cantidad inválida'; end if;
  select * into r from public.coleccion where jugador = v_yo and campeon = p_campeon for update;
  if not found then raise exception 'No tienes a ese campeón'; end if;
  if r.copias < p_cantidad then raise exception 'Solo tienes % copia(s) para desfragmentar', r.copias; end if;
  for i in 1 .. p_cantidad loop v_runa := v_runa + (case when random() < .5 then 1 else 2 end); end loop;
  update public.coleccion set copias = copias - p_cantidad where jugador = v_yo and campeon = p_campeon;
  update public.inventario set frag_runa = frag_runa + v_runa, frag_otros = frag_otros + (3 * p_cantidad - v_runa) where jugador = v_yo;
  return jsonb_build_object('frag_runa', v_runa, 'frag_otros', 3 * p_cantidad - v_runa);
end $$;

-- 20 Fragmentos de Runa de Invocación = 1 Runa de Invocación
create or replace function public.combinar_runa()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_runas int;
begin
  update public.inventario set frag_runa = frag_runa - 20, runas = runas + 1 where jugador = v_yo and frag_runa >= 20
    returning runas into v_runas;
  if not found then raise exception 'Necesitas 20 Fragmentos de Runa de Invocación'; end if;
  return v_runas;
end $$;

-- Portal de Invocación: 1 Runa = el campeón que elijas
create or replace function public.invocar_portal(p_campeon text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo();
begin
  if not exists (select 1 from public.campeones where id = p_campeon and activo) then raise exception 'Ese campeón no existe'; end if;
  update public.inventario set runas = runas - 1 where jugador = v_yo and runas >= 1;
  if not found then raise exception 'Necesitas 1 Runa de Invocación'; end if;
  perform public._dar_campeon(v_yo, p_campeon);
  insert into public.aperturas (jugador, tipo, origen, campeones) values (v_yo, 'portal', null, array[p_campeon]);
  return p_campeon;
end $$;

-- ============================================================ ADMINISTRADOR
-- Dar oro a un jugador (para pruebas o premios)
create or replace function public.admin_dar_oro(p_nombre text, p_oro bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_oro bigint;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede hacer esto'; end if;
  update public.inventario i set oro = greatest(0, i.oro + p_oro)
    from public.jugadores j where j.id = i.jugador and lower(j.nombre) = lower(p_nombre)
    returning i.oro into v_oro;
  if not found then raise exception 'No existe el jugador %', p_nombre; end if;
  return v_oro;
end $$;

-- Permisos de las funciones públicas
revoke all on function public.abrir_starter(text), public.abrir_sobre(text), public.ascender(text),
  public.desbloquear_espacio(text, text), public.desfragmentar(text, integer), public.combinar_runa(),
  public.invocar_portal(text), public.admin_dar_oro(text, bigint) from public, anon;
grant execute on function public.abrir_starter(text), public.abrir_sobre(text), public.ascender(text),
  public.desbloquear_espacio(text, text), public.desfragmentar(text, integer), public.combinar_runa(),
  public.invocar_portal(text), public.admin_dar_oro(text, bigint) to authenticated;

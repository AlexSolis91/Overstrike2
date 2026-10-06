-- Overstrike 2 · Paso 1: cuentas de jugador y configuración de sobres.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
-- Se puede volver a ejecutar sin romper nada.

-- ============================================================ JUGADORES (perfil de cada cuenta)
create table if not exists public.jugadores (
  id              uuid primary key references auth.users (id) on delete cascade,
  nombre          text not null unique check (char_length(nombre) between 3 and 20 and nombre ~ '^[A-Za-z0-9_ ÁÉÍÓÚÜÑáéíóúüñ]+$'),
  rol             text not null default 'jugador' check (rol in ('jugador', 'admin')),
  starter_elegido text,                       -- se llenará al abrir el Starter Pack (una sola vez)
  creado          timestamptz not null default now()
);
alter table public.jugadores enable row level security;

-- Cada jugador solo puede LEER su propio perfil
drop policy if exists "jugador lee su perfil" on public.jugadores;
create policy "jugador lee su perfil" on public.jugadores
  for select to authenticated using (id = auth.uid());

-- Cada jugador solo puede cambiar el NOMBRE de su propio perfil (el rol y el starter no se pueden tocar desde el juego)
drop policy if exists "jugador edita su perfil" on public.jugadores;
create policy "jugador edita su perfil" on public.jugadores
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke all on public.jugadores from anon, authenticated;
grant select on public.jugadores to authenticated;
grant update (nombre) on public.jugadores to authenticated;

-- El perfil se crea solo al registrarse, con el nombre que el jugador eligió (rol siempre 'jugador')
create or replace function public.crear_perfil_jugador()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.jugadores (id, nombre)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), 'Jugador_' || left(new.id::text, 8)));
  return new;
end $$;
drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil_jugador();

-- ¿Está libre un nombre? (para avisar antes de registrarse; no revela nada más)
create or replace function public.nombre_disponible(p_nombre text)
returns boolean language sql security definer set search_path = '' stable as $$
  select not exists (select 1 from public.jugadores where lower(nombre) = lower(trim(p_nombre)));
$$;
revoke all on function public.nombre_disponible(text) from public;
grant execute on function public.nombre_disponible(text) to anon, authenticated;

-- ¿El usuario actual es administrador?
create or replace function public.es_admin()
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.jugadores where id = auth.uid() and rol = 'admin');
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

-- ============================================================ SOBRES DE LA TIENDA (activos por temporada)
create table if not exists public.sobres_config (
  id      text primary key,
  activo  boolean not null default true,
  precio  integer not null default 0 check (precio >= 0),
  desde   timestamptz,                       -- temporada (opcional)
  hasta   timestamptz
);
alter table public.sobres_config enable row level security;

-- Todos (incluso sin cuenta) pueden VER qué sobres hay; solo un administrador puede cambiarlos
drop policy if exists "todos ven los sobres" on public.sobres_config;
create policy "todos ven los sobres" on public.sobres_config for select to anon, authenticated using (true);
drop policy if exists "admin edita los sobres" on public.sobres_config;
create policy "admin edita los sobres" on public.sobres_config for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
revoke all on public.sobres_config from anon, authenticated;
grant select on public.sobres_config to anon, authenticated;
grant update (activo, precio, desde, hasta) on public.sobres_config to authenticated;

insert into public.sobres_config (id, activo) values
  ('bloodline', true), ('phantom', true), ('sacred', true), ('unbreakable', true)
on conflict (id) do nothing;

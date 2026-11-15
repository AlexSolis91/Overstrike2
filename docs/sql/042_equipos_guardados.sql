-- Overstrike 2 · Paso 42: CONSTRUCCIÓN DE EQUIPOS (equipos guardados con nombre).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001 y 002.
-- · equipos_guardados: hasta 20 equipos por jugador, cada uno con nombre (1–24 letras) y 5 campeones distintos que tenga.
--   El primero de la lista es el líder. El jugador solo LEE la tabla; guardar y borrar pasa por las funciones de abajo.
-- · equipo_guardar(p_id, p_nombre, p_campeones): crea (p_id null) o actualiza un equipo. Devuelve la fila.
-- · equipo_borrar(p_id): borra uno de sus equipos.

create table if not exists public.equipos_guardados (
  id         uuid primary key default gen_random_uuid(),
  jugador    uuid not null references public.jugadores (id) on delete cascade,
  nombre     text not null check (char_length(nombre) between 1 and 24),
  campeones  text[] not null check (cardinality(campeones) = 5),
  creado     timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists equipos_guardados_jugador on public.equipos_guardados (jugador, creado);
alter table public.equipos_guardados enable row level security;
drop policy if exists "jugador ve sus equipos" on public.equipos_guardados;
create policy "jugador ve sus equipos" on public.equipos_guardados for select to authenticated using (jugador = auth.uid());

create or replace function public.equipo_guardar(p_id uuid, p_nombre text, p_campeones text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_nombre text := btrim(coalesce(p_nombre, '')); v_fila public.equipos_guardados; v_falta text;
begin
  if char_length(v_nombre) < 1 then raise exception 'Ponle un nombre a tu equipo'; end if;
  if char_length(v_nombre) > 24 then raise exception 'El nombre puede tener hasta 24 letras'; end if;
  if p_campeones is null or cardinality(p_campeones) <> 5 then raise exception 'El equipo debe tener 5 campeones'; end if;
  if (select count(distinct c) from unnest(p_campeones) c) <> 5 then raise exception 'Un campeón no puede repetirse en el equipo'; end if;
  select c into v_falta from unnest(p_campeones) c
    where not exists (select 1 from public.coleccion k where k.jugador = v_yo and k.campeon = c) limit 1;
  if v_falta is not null then raise exception 'No tienes a ese campeón (%)', v_falta; end if;

  if p_id is null then
    perform pg_advisory_xact_lock(hashtext('equipos_guardados:' || v_yo::text));
    if (select count(*) from public.equipos_guardados where jugador = v_yo) >= 20 then
      raise exception 'Ya tienes 20 equipos guardados: borra uno para guardar otro';
    end if;
    insert into public.equipos_guardados (jugador, nombre, campeones) values (v_yo, v_nombre, p_campeones) returning * into v_fila;
  else
    update public.equipos_guardados set nombre = v_nombre, campeones = p_campeones, actualizado = now()
      where id = p_id and jugador = v_yo returning * into v_fila;
    if not found then raise exception 'Ese equipo ya no existe'; end if;
  end if;
  return jsonb_build_object('id', v_fila.id, 'nombre', v_fila.nombre, 'campeones', to_jsonb(v_fila.campeones), 'creado', v_fila.creado);
end $$;

create or replace function public.equipo_borrar(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo();
begin
  delete from public.equipos_guardados where id = p_id and jugador = v_yo;
end $$;

revoke all on function public.equipo_guardar(uuid, text, text[]), public.equipo_borrar(uuid) from public, anon;
grant execute on function public.equipo_guardar(uuid, text, text[]), public.equipo_borrar(uuid) to authenticated;

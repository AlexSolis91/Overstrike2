-- Overstrike 2 · Paso 25: FORJA DE LOS DIOSES. Reemplaza las recetas fijas de 10 Épicas.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001–024.
-- · Cada receta es una fila ligada a un jugador, con 5 Épicas sorteadas (se pueden repetir, siempre del lote de la Legendaria).
--   Solo sirve en esa cuenta y se gasta al forjar. Las sueltan los jefes de clan; mientras llegan, las da el administrador.
-- · Forjar cuesta 1,000,000 de oro y cada Épica debe tener 80% de calidad o más. Pueden estar equipadas (se quitan solas);
--   las que tienen candado no entran. Ya no se pide la Hazaña de la oleada 30.
-- · Las Legendarias salen en el sobre de reliquias: 0.01% por cada espacio sorteado (sale de la probabilidad de Épica).

-- ============================================================ LAS RECETAS FIJAS SE RETIRAN
drop function if exists public.forjar_legendaria(text, uuid[]);
drop table if exists public.recetas;

-- ============================================================ RECETAS DE CADA JUGADOR
create table if not exists public.recetas_jugador (
  id           uuid primary key default gen_random_uuid(),
  jugador      uuid not null references public.jugadores (id) on delete cascade,
  legendaria   text not null references public.reliquias_catalogo (id),
  ingredientes text[] not null check (cardinality(ingredientes) = 5),   -- ids de Épicas; un id repetido se pide varias veces
  origen       text,                                                    -- jefe de clan / admin
  obtenida     timestamptz not null default now()
);
create index if not exists recetas_jugador_jugador on public.recetas_jugador (jugador);
alter table public.recetas_jugador enable row level security;
drop policy if exists "jugador ve sus recetas" on public.recetas_jugador;
create policy "jugador ve sus recetas" on public.recetas_jugador for select to authenticated using (jugador = auth.uid());
revoke all on public.recetas_jugador from anon, authenticated;
grant select on public.recetas_jugador to authenticated;

-- Crea una receta para un jugador. La usarán las recompensas del jefe de clan. Devuelve la fila.
create or replace function public._dar_receta(p_jugador uuid, p_legendaria text, p_origen text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_lote text; v_id text; v_ing text[] := '{}'; v_fila public.recetas_jugador;
begin
  select lote into v_lote from public.reliquias_catalogo where id = p_legendaria and rareza = 'Legendario' and activo;
  if not found then raise exception 'Esa Legendaria no existe'; end if;
  for i in 1 .. 5 loop
    select id into v_id from public.reliquias_catalogo where activo and rareza = 'Épico' and lote = v_lote order by random() limit 1;
    if v_id is null then raise exception 'No hay Épicas en el lote %', v_lote; end if;
    v_ing := v_ing || v_id;
  end loop;
  insert into public.recetas_jugador (jugador, legendaria, ingredientes, origen)
    values (p_jugador, p_legendaria, v_ing, p_origen) returning * into v_fila;
  return to_jsonb(v_fila);
end $$;

-- Administrador: dar una receta a un jugador por su nombre
create or replace function public.admin_dar_receta(p_nombre text, p_legendaria text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_jugador uuid;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede hacer esto'; end if;
  select id into v_jugador from public.jugadores where lower(nombre) = lower(p_nombre);
  if not found then raise exception 'No existe el jugador %', p_nombre; end if;
  return public._dar_receta(v_jugador, p_legendaria, 'admin');
end $$;

-- Calidad 0–100 de una copia: promedio de qué tan cerca del máximo quedó cada línea (igual que calidad() en js/datos/reliquias.js)
create or replace function public._calidad_reliquia(p_rel public.reliquias)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare v_rz text; v_rango public.reliquia_rangos; v_suma numeric; v_n int; e jsonb;
begin
  select rareza into v_rz from public.reliquias_catalogo where id = p_rel.reliquia;
  select * into v_rango from public.reliquia_rangos where rareza = v_rz and stat = p_rel.plana_stat;
  v_suma := case when v_rango.maximo = v_rango.minimo then 1
    else least(1, greatest(0, (p_rel.plana_valor - v_rango.minimo)::numeric / (v_rango.maximo - v_rango.minimo))) end;
  v_n := 1;
  for e in select * from jsonb_array_elements(p_rel.tiradas) loop
    select * into v_rango from public.reliquia_rangos where rareza = v_rz and stat = e ->> 0;
    v_suma := v_suma + case when v_rango.maximo = v_rango.minimo then 1
      else least(1, greatest(0, ((e ->> 1)::int - v_rango.minimo)::numeric / (v_rango.maximo - v_rango.minimo))) end;
    v_n := v_n + 1;
  end loop;
  return round(v_suma / v_n * 100 + 0.000000001);
end $$;

-- ============================================================ FORJAR
-- p_ids: las 5 copias que entrega el jugador. Si algo no cumple, no se cobra ni se consume nada.
create or replace function public.forjar_legendaria(p_receta uuid, p_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_r public.recetas_jugador; v_rel public.reliquias; v_usadas text[] := '{}'; v_id uuid;
begin
  select * into v_r from public.recetas_jugador where id = p_receta and jugador = v_yo for update;
  if not found then raise exception 'Esa receta no es tuya o ya se usó'; end if;
  if cardinality(p_ids) <> 5 or (select count(distinct x) from unnest(p_ids) x) <> 5 then raise exception 'La receta necesita 5 Épicas distintas'; end if;
  for v_rel in select * from public.reliquias where id = any (p_ids) and jugador = v_yo for update loop
    if v_rel.bloqueada then raise exception 'Una de las Épicas tiene candado'; end if;
    if public._calidad_reliquia(v_rel) < 80 then raise exception 'Todas las Épicas deben tener 80%% de calidad o más'; end if;
    v_usadas := v_usadas || v_rel.reliquia;
  end loop;
  if (select array_agg(x order by x) from unnest(v_usadas) x) is distinct from (select array_agg(x order by x) from unnest(v_r.ingredientes) x) then
    raise exception 'Esas Épicas no son las que pide la receta'; end if;
  update public.inventario set oro = oro - 1000000 where jugador = v_yo and oro >= 1000000;
  if not found then raise exception 'Necesitas 1,000,000 de oro para forjar'; end if;
  -- desequipar primero: si una es un Arco, su Equipación 3 vuelve al inventario
  foreach v_id in array p_ids loop perform public.desequipar_reliquia(v_id); end loop;
  delete from public.reliquias where id = any (p_ids) and jugador = v_yo;
  delete from public.recetas_jugador where id = p_receta;
  return public._crear_reliquia(v_yo, v_r.legendaria, 'receta');
end $$;

-- ============================================================ LEGENDARIAS EN EL SOBRE DE RELIQUIAS
update public.reliquias_catalogo set en_sobre = true, solo_receta = false where rareza = 'Legendario';
create or replace function public._rareza_sobre_reliquias()
returns text language plpgsql volatile set search_path = '' as $$
declare r numeric := random() * 100;
begin
  return case when r < 70 then 'Común' when r < 90 then 'Raro' when r < 99 then 'Especial' when r < 99.99 then 'Épico' else 'Legendario' end;
end $$;

-- ============================================================ PERMISOS
revoke all on function public._dar_receta(uuid, text, text), public._calidad_reliquia(public.reliquias) from public, anon, authenticated;
revoke all on function public.admin_dar_receta(text, text), public.forjar_legendaria(uuid, uuid[]) from public, anon;
grant execute on function public.admin_dar_receta(text, text), public.forjar_legendaria(uuid, uuid[]) to authenticated;

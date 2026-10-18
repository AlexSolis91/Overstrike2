-- Overstrike 2 · Paso 7: RECETAS DE LEGENDARIAS. Cada receta pide 10 Épicas: definidas (×2 o ×3) + 2 o 3 comodines.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar.
-- Requiere 001–006. DESPUÉS ejecutar docs/sql/catalogo.sql (sube las recetas).

create table if not exists public.recetas (
  legendaria text primary key references public.reliquias_catalogo (id),
  definidas  jsonb not null,                 -- { "bestiari": 3, "guanteletesColoso": 2, ... }
  comodines  integer not null check (comodines between 0 and 10),
  activo     boolean not null default true
);
alter table public.recetas enable row level security;
drop policy if exists "todos ven las recetas" on public.recetas;
create policy "todos ven las recetas" on public.recetas for select to anon, authenticated using (true);
revoke all on public.recetas from anon, authenticated;
grant select on public.recetas to anon, authenticated;

-- Forjar: p_ids son las 10 Épicas que entrega el jugador (suyas, sin equipar y sin candado). Cada Épica definida debe estar
-- al menos las veces que pide la receta; el resto son comodines. Se consumen y se crea la Legendaria con valores sorteados.
create or replace function public.forjar_legendaria(p_legendaria text, p_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_r public.recetas; v_n int; k text; v_req int; v_tiene int;
begin
  select * into v_r from public.recetas where legendaria = p_legendaria and activo;
  if not found then raise exception 'Esa receta no existe'; end if;
  if cardinality(p_ids) <> 10 or (select count(distinct x) from unnest(p_ids) x) <> 10 then raise exception 'La receta necesita 10 Épicas distintas'; end if;
  select count(*) into v_n from public.reliquias r join public.reliquias_catalogo c on c.id = r.reliquia
    where r.id = any (p_ids) and r.jugador = v_yo and r.campeon is null and not r.bloqueada and c.rareza = 'Épico';
  if v_n <> 10 then raise exception 'Todas deben ser Épicas tuyas, sin equipar y sin candado'; end if;
  for k, v_req in select key, value::int from jsonb_each_text(v_r.definidas) loop
    select count(*) into v_tiene from public.reliquias where id = any (p_ids) and reliquia = k;
    if v_tiene < v_req then raise exception 'Faltan Épicas de la receta (%)', k; end if;
  end loop;
  delete from public.reliquias where id = any (p_ids) and jugador = v_yo;
  return public._crear_reliquia(v_yo, p_legendaria, 'receta');
end $$;

revoke all on function public.forjar_legendaria(text, uuid[]) from public, anon;
grant execute on function public.forjar_legendaria(text, uuid[]) to authenticated;

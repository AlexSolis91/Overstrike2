-- Overstrike 2 · Paso 11: EXTRAS DE LA HORDA (Trofeos de Orco, tienda de la Horda, premios de primera vez y la Hazaña
-- de la oleada 30 que piden las recetas de Legendarias).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001–010.
--
-- · Trofeos de Orco: 1 por oleada superada (×3 mini-jefe cada 5, ×5 jefe cada 10).
-- · Tienda de la Horda: eliges EXACTAMENTE la reliquia del lote que quieres. Común 10 · Rara 30 · Especial 120 · Épica 500.
-- · Primera vez (una sola vez por cuenta y Horda):
--     oleada 10 → 2 Runas de Portal + 1 vale de sobre + 25 Trofeos
--     oleada 20 → 3 Runas de Portal + 2 vales de sobre + 75 Trofeos
--     oleada 30 → 1 Épica al azar del lote + 5 Runas de Portal + 150 Trofeos + la HAZAÑA
-- · Hazaña: las recetas de Legendarias del lote de una Horda piden haber superado su oleada 30 al menos una vez.

alter table public.inventario add column if not exists trofeos_orco integer not null default 0 check (trofeos_orco >= 0);

create table if not exists public.horda_hitos (
  jugador uuid not null references public.jugadores (id) on delete cascade,
  horda   text not null,
  oleada  integer not null,
  fecha   timestamptz not null default now(),
  primary key (jugador, horda, oleada)
);
alter table public.horda_hitos enable row level security;
drop policy if exists "jugador ve sus hitos de horda" on public.horda_hitos;
create policy "jugador ve sus hitos de horda" on public.horda_hitos for select to authenticated using (jugador = auth.uid());
revoke all on public.horda_hitos from anon, authenticated;
grant select on public.horda_hitos to authenticated;

-- Cuentas que ya habían superado oleadas antes de este paso: reciben sus hitos (sin premio retroactivo)
insert into public.horda_hitos (jugador, horda, oleada)
  select distinct p.jugador, p.horda, h from public.horda_partidas p, unnest(array[10, 20, 30]) h where p.oleada >= h
on conflict do nothing;

-- Precio en Trofeos de cada rareza en la tienda de la Horda
create or replace function public._precio_trofeos(p_rareza text)
returns integer language sql immutable set search_path = '' as $$
  select case p_rareza when 'Común' then 10 when 'Raro' then 30 when 'Especial' then 120 when 'Épico' then 500 else null end
$$;

-- Cobrar una oleada (igual que 006 + Trofeos y premios de primera vez)
create or replace function public.horda_oleada(p_partida uuid, p_oleada int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p public.horda_partidas; v_oro int; v_frag int := 0; v_rel jsonb := null; v_id text; v_rz text;
        v_trof int; v_hito jsonb := null; v_runas int := 0; v_vales int := 0; v_extra int := 0; v_epica jsonb := null;
begin
  select * into v_p from public.horda_partidas where id = p_partida and jugador = v_yo for update;
  if not found or v_p.terminada then raise exception 'Esa partida ya terminó'; end if;
  if p_oleada <> v_p.oleada + 1 then raise exception 'Oleada fuera de orden'; end if;
  if v_p.ultima > now() - interval '10 seconds' then raise exception 'Demasiado rápido'; end if;
  v_oro := (1000 + 150 * (p_oleada - 1)) * case when p_oleada % 10 = 0 then 5 when p_oleada % 5 = 0 then 3 else 1 end;
  v_trof := case when p_oleada % 10 = 0 then 5 when p_oleada % 5 = 0 then 3 else 1 end;
  if random() < .30 then
    v_rz := public._rareza_horda(p_oleada);
    select id into v_id from public.reliquias_catalogo where activo and not solo_receta and lote = v_p.horda and rareza = v_rz order by random() limit 1;
    if v_id is not null then v_rel := public._crear_reliquia(v_yo, v_id, 'horda'); end if;
  end if;
  if random() < .02 then v_frag := public._entero(1, 3); end if;
  -- premio de primera vez
  if p_oleada in (10, 20, 30) then
    insert into public.horda_hitos (jugador, horda, oleada) values (v_yo, v_p.horda, p_oleada) on conflict do nothing;
    if found then
      if p_oleada = 10 then v_runas := 2; v_vales := 1; v_extra := 25;
      elsif p_oleada = 20 then v_runas := 3; v_vales := 2; v_extra := 75;
      else
        v_runas := 5; v_extra := 150;
        select id into v_id from public.reliquias_catalogo where activo and not solo_receta and lote = v_p.horda and rareza = 'Épico' order by random() limit 1;
        if v_id is not null then v_epica := public._crear_reliquia(v_yo, v_id, 'horda_hito'); end if;
      end if;
      v_hito := jsonb_build_object('oleada', p_oleada, 'runas_portal', v_runas, 'vales', v_vales, 'trofeos', v_extra, 'epica', v_epica, 'hazana', p_oleada = 30);
    end if;
  end if;
  update public.inventario set oro = oro + v_oro, frag_runa = frag_runa + v_frag, trofeos_orco = trofeos_orco + v_trof + v_extra,
    runas_portal = runas_portal + v_runas, vales_sobre = vales_sobre + v_vales where jugador = v_yo;
  update public.horda_partidas set oleada = p_oleada, oro = oro + v_oro, reliquias = reliquias + (v_rel is not null)::int + (v_epica is not null)::int,
    fragmentos = fragmentos + v_frag, ultima = now() where id = p_partida;
  return jsonb_build_object('oleada', p_oleada, 'oro', v_oro, 'reliquia', v_rel, 'fragmentos', v_frag, 'trofeos', v_trof, 'hito', v_hito);
end $$;

-- Tienda de la Horda: compra la reliquia elegida del lote (no Legendarias)
create or replace function public.tienda_horda_comprar(p_reliquia text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_c public.reliquias_catalogo; v_precio int;
begin
  select * into v_c from public.reliquias_catalogo where id = p_reliquia and activo and not solo_receta and lote = 'orcos';
  if not found then raise exception 'Esa reliquia no está en la tienda de la Horda'; end if;
  v_precio := public._precio_trofeos(v_c.rareza);
  if v_precio is null then raise exception 'Esa reliquia no está en la tienda de la Horda'; end if;
  update public.inventario set trofeos_orco = trofeos_orco - v_precio where jugador = v_yo and trofeos_orco >= v_precio;
  if not found then raise exception 'No tienes suficientes Trofeos de Orco'; end if;
  return public._crear_reliquia(v_yo, p_reliquia, 'tienda_horda');
end $$;

-- Recetas: piden la Hazaña de la oleada 30 de la Horda del lote de la Legendaria (resto igual que 007)
create or replace function public.forjar_legendaria(p_legendaria text, p_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_r public.recetas; v_n int; k text; v_req int; v_tiene int; v_lote text;
begin
  select * into v_r from public.recetas where legendaria = p_legendaria and activo;
  if not found then raise exception 'Esa receta no existe'; end if;
  select lote into v_lote from public.reliquias_catalogo where id = p_legendaria;
  if not exists (select 1 from public.horda_hitos where jugador = v_yo and horda = coalesce(v_lote, 'orcos') and oleada = 30) then
    raise exception 'Necesitas la Hazaña: supera la oleada 30 de la Horda para forjar esta Legendaria';
  end if;
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

revoke all on function public.horda_oleada(uuid, int), public.tienda_horda_comprar(text), public.forjar_legendaria(text, uuid[]), public._precio_trofeos(text) from public, anon;
grant execute on function public.horda_oleada(uuid, int), public.tienda_horda_comprar(text), public.forjar_legendaria(text, uuid[]) to authenticated;

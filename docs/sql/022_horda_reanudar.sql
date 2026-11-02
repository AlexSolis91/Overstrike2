-- Overstrike 2 · Paso 22: HORDA — cobro seguro y "Continuar partida" (2026-11-01).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 011, 016 y 019.
-- Incluye el oro de 021 (600 + 90 por oleada).
-- · horda_oleada guarda el premio: si la respuesta se perdió y el juego vuelve a pedir la misma oleada, devuelve ese premio sin pagarlo otra vez.
-- · horda_guardar guarda lo necesario para reconstruir la partida (semilla, equipo, oleadas y decisiones).
-- · horda_no_reanudable cierra una partida que ya no se puede reconstruir (por una actualización del juego) y devuelve la Runa, máximo 1 por día.

alter table public.horda_partidas add column if not exists premio jsonb;                  -- premio de la última oleada cobrada
alter table public.horda_partidas add column if not exists guardado jsonb;                -- datos para continuar la partida
alter table public.horda_partidas add column if not exists runa_devuelta timestamptz;     -- cuándo se devolvió su Runa

create or replace function public.horda_entrar(p_horda text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_id uuid;
begin
  if p_horda not in ('orcos') then raise exception 'Esa Horda todavía no está disponible'; end if;
  update public.inventario set runas_portal = runas_portal - 1 where jugador = v_yo and runas_portal >= 1;
  if not found then raise exception 'Necesitas una Runa de Portal'; end if;
  update public.horda_partidas set terminada = true, guardado = null, premio = null where jugador = v_yo and not terminada;
  insert into public.horda_partidas (jugador, horda) values (v_yo, p_horda) returning id into v_id;
  return v_id;
end $$;

create or replace function public.horda_oleada(p_partida uuid, p_oleada int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p public.horda_partidas; v_oro int; v_frag int := 0; v_rel jsonb := null; v_id text; v_rz text;
        v_trof int; v_hito jsonb := null; v_hito_oro int := 0; v_vales int := 0; v_extra int := 0; v_epica jsonb := null; v_res jsonb;
begin
  select * into v_p from public.horda_partidas where id = p_partida and jugador = v_yo for update;
  if not found or v_p.terminada then raise exception 'Esa partida ya terminó'; end if;
  if p_oleada = v_p.oleada and v_p.premio is not null then return v_p.premio; end if;   -- ya cobrada: mismo premio, sin pagar otra vez
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
    vales_sobre = vales_sobre + v_vales where jugador = v_yo;
  v_res := jsonb_build_object('oleada', p_oleada, 'oro', v_oro, 'reliquia', v_rel, 'fragmentos', v_frag, 'trofeos', v_trof, 'hito', v_hito);
  update public.horda_partidas set oleada = p_oleada, oro = oro + v_oro + v_hito_oro, reliquias = reliquias + (v_rel is not null)::int + (v_epica is not null)::int,
    fragmentos = fragmentos + v_frag, ultima = now(), premio = v_res where id = p_partida;
  return v_res;
end $$;

create or replace function public.horda_terminar(p_partida uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p public.horda_partidas; v_rec int;
begin
  update public.horda_partidas set terminada = true, guardado = null, premio = null where id = p_partida and jugador = v_yo returning * into v_p;
  if not found then raise exception 'No existe esa partida'; end if;
  select coalesce(max(oleada), 0) into v_rec from public.horda_partidas where jugador = v_yo and horda = v_p.horda;
  return jsonb_build_object('oleada', v_p.oleada, 'oro', v_p.oro, 'reliquias', v_p.reliquias, 'fragmentos', v_p.fragmentos, 'record', v_rec);
end $$;

create or replace function public.horda_guardar(p_partida uuid, p_datos jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if pg_column_size(p_datos) > 2097152 then raise exception 'Partida demasiado grande'; end if;
  update public.horda_partidas set guardado = p_datos where id = p_partida and jugador = public._yo() and not terminada;
end $$;

create or replace function public.horda_no_reanudable(p_partida uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p public.horda_partidas; v_devuelta boolean;
begin
  select * into v_p from public.horda_partidas where id = p_partida and jugador = v_yo for update;
  if not found or v_p.terminada then raise exception 'Esa partida ya terminó'; end if;
  v_devuelta := not exists (select 1 from public.horda_partidas where jugador = v_yo and runa_devuelta > now() - interval '1 day');
  update public.horda_partidas set terminada = true, guardado = null, premio = null, runa_devuelta = case when v_devuelta then now() end where id = p_partida;
  if v_devuelta then update public.inventario set runas_portal = runas_portal + 1 where jugador = v_yo; end if;
  return jsonb_build_object('devuelta', v_devuelta, 'oleada', v_p.oleada);
end $$;

revoke all on function public.horda_entrar(text) from public, anon;
revoke all on function public.horda_oleada(uuid, int) from public, anon;
revoke all on function public.horda_terminar(uuid) from public, anon;
revoke all on function public.horda_guardar(uuid, jsonb) from public, anon;
revoke all on function public.horda_no_reanudable(uuid) from public, anon;
grant execute on function public.horda_entrar(text) to authenticated;
grant execute on function public.horda_oleada(uuid, int) to authenticated;
grant execute on function public.horda_terminar(uuid) to authenticated;
grant execute on function public.horda_guardar(uuid, jsonb) to authenticated;
grant execute on function public.horda_no_reanudable(uuid) to authenticated;

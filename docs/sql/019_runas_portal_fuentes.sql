-- Overstrike 2 · Paso 19: RUNAS DE PORTAL — solo desde misiones diarias y la Arena (2026-10-30).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 011 y 016.
-- · La Tienda ya no vende Runas de Portal (se borra comprar_runa_portal).
-- · Los hitos de primera vez de la Horda ya no dan Runas de Portal: dan oro (oleada 10: 10,000 · 20: 20,000 · 30: 40,000);
--   vales, trofeos, la Épica y la Hazaña de la oleada 30 siguen igual.
-- · Fuentes que quedan: misión diaria "Gana 5 combates de Arena" (1), 3.3% por combate de Arena (016) y la recompensa semanal de liga (010).
--   El regalo inicial de 3 runas de cada cuenta nueva se mantiene.

drop function if exists public.comprar_runa_portal();

create or replace function public.horda_oleada(p_partida uuid, p_oleada int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p public.horda_partidas; v_oro int; v_frag int := 0; v_rel jsonb := null; v_id text; v_rz text;
        v_trof int; v_hito jsonb := null; v_hito_oro int := 0; v_vales int := 0; v_extra int := 0; v_epica jsonb := null;
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
  update public.horda_partidas set oleada = p_oleada, oro = oro + v_oro + v_hito_oro, reliquias = reliquias + (v_rel is not null)::int + (v_epica is not null)::int,
    fragmentos = fragmentos + v_frag, ultima = now() where id = p_partida;
  return jsonb_build_object('oleada', p_oleada, 'oro', v_oro, 'reliquia', v_rel, 'fragmentos', v_frag, 'trofeos', v_trof, 'hito', v_hito);
end $$;

revoke all on function public.horda_oleada(uuid, int) from public, anon;
grant execute on function public.horda_oleada(uuid, int) to authenticated;

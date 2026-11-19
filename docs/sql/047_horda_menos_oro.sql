-- Overstrike 2 · Paso 47: HORDA — 20% menos oro (2026-11-19).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 035.
-- · Oro por oleada: 480 + 72 por oleada (antes 600 + 90), ×3 en mini-jefe y ×5 en jefe. Ejemplo: oleada 60 → 5×(480+72×59) = 23,640 (antes 29,550).
-- · Oro de los premios de primera vez: 8,000 / 16,000 / 32,000 en las oleadas 10 / 20 / 30 (antes 10,000 / 20,000 / 40,000).
-- · Trofeos, vales, reliquias, fragmentos y Polvo Estelar no cambian. Todo lo demás, igual que en 035.

create or replace function public.horda_oleada(p_partida uuid, p_oleada int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p public.horda_partidas; v_oro int; v_frag int := 0; v_rel jsonb := null; v_id text; v_rz text;
        v_trof int; v_hito jsonb := null; v_hito_oro int := 0; v_vales int := 0; v_extra int := 0; v_epica jsonb := null; v_res jsonb; v_estelar int := 0;
begin
  select * into v_p from public.horda_partidas where id = p_partida and jugador = v_yo for update;
  if not found or v_p.terminada then raise exception 'Esa partida ya terminó'; end if;
  if p_oleada = v_p.oleada and v_p.premio is not null then return v_p.premio; end if;   -- ya cobrada: mismo premio, sin pagar otra vez
  if v_p.temporada is distinct from public._arena_temporada() then
    update public.horda_partidas set terminada = true, guardado = null, premio = null where id = p_partida;
    raise exception 'La temporada de la Horda terminó: esta partida se cerró con su botín. ¡Abre un portal para la temporada nueva!';
  end if;
  if p_oleada <> v_p.oleada + 1 then raise exception 'Oleada fuera de orden'; end if;
  if v_p.ultima > now() - interval '10 seconds' then raise exception 'Demasiado rápido'; end if;
  v_oro := (480 + 72 * (p_oleada - 1)) * case when p_oleada % 10 = 0 then 5 when p_oleada % 5 = 0 then 3 else 1 end;
  v_trof := case when p_oleada % 10 = 0 then 5 when p_oleada % 5 = 0 then 3 else 1 end;
  if random() < .30 then
    v_rz := public._rareza_horda(p_oleada);
    select id into v_id from public.reliquias_catalogo where activo and not solo_receta and lote = v_p.horda and rareza = v_rz order by random() limit 1;
    if v_id is not null then v_rel := public._crear_reliquia(v_yo, v_id, 'horda'); end if;
  end if;
  if random() < .02 then v_frag := public._entero(1, 3); end if;
  if p_oleada % 10 = 0 and random() < .30 then                       -- jefe (no mini jefe): Polvo Estelar
    v_estelar := case when p_oleada >= 40 then 15 when p_oleada >= 30 then 12 when p_oleada >= 20 then 8 else 5 end;
  end if;
  -- premio de primera vez
  if p_oleada in (10, 20, 30) then
    insert into public.horda_hitos (jugador, horda, oleada) values (v_yo, v_p.horda, p_oleada) on conflict do nothing;
    if found then
      if p_oleada = 10 then v_hito_oro := 8000; v_vales := 1; v_extra := 25;
      elsif p_oleada = 20 then v_hito_oro := 16000; v_vales := 2; v_extra := 75;
      else
        v_hito_oro := 32000; v_extra := 150;
        select id into v_id from public.reliquias_catalogo where activo and not solo_receta and lote = v_p.horda and rareza = 'Épico' order by random() limit 1;
        if v_id is not null then v_epica := public._crear_reliquia(v_yo, v_id, 'horda_hito'); end if;
      end if;
      v_hito := jsonb_build_object('oleada', p_oleada, 'oro', v_hito_oro, 'vales', v_vales, 'trofeos', v_extra, 'epica', v_epica, 'hazana', p_oleada = 30);
    end if;
  end if;
  update public.inventario set oro = oro + v_oro + v_hito_oro, frag_runa = frag_runa + v_frag, trofeos_orco = trofeos_orco + v_trof + v_extra,
    vales_sobre = vales_sobre + v_vales, frag_otros = frag_otros + v_estelar where jugador = v_yo;
  v_res := jsonb_build_object('oleada', p_oleada, 'oro', v_oro, 'reliquia', v_rel, 'fragmentos', v_frag, 'trofeos', v_trof, 'hito', v_hito, 'polvo_estelar', v_estelar);
  update public.horda_partidas set oleada = p_oleada, oro = oro + v_oro + v_hito_oro, reliquias = reliquias + (v_rel is not null)::int + (v_epica is not null)::int,
    fragmentos = fragmentos + v_frag, ultima = now(), premio = v_res where id = p_partida;
  return v_res;
end $$;

revoke all on function public.horda_oleada(uuid, int) from public, anon;
grant execute on function public.horda_oleada(uuid, int) to authenticated;

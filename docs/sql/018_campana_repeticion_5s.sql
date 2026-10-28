-- Overstrike 2 · Paso 18: CAMPAÑA — repeticiones cada 5 s en vez de 90 s (2026-10-28).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 016.
-- Es la misma campana_completar de 016; solo cambia el tiempo mínimo entre cobros de REPETICIONES (5 s).
-- La primera victoria de cada etapa nunca tuvo espera.

create or replace function public.campana_completar(p_area text, p_dificultad text, p_etapa int, p_estrellas int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := public._yo();
  v_m int := case p_dificultad when 'normal' then 1 when 'dificil' then 2 when 'brutal' then 3 end;
  v_a int := case p_area when 'portal' then 1 when 'abismo' then 2 end;          -- el Abismo paga el doble
  v_prev text := case p_dificultad when 'dificil' then 'normal' when 'brutal' then 'dificil' end;
  v_fila public.campana_progreso; v_primera boolean; v_ultima timestamptz; v_total int;
  v_premios jsonb := '[]'::jsonb; v_oro int := 0; v_frag int := 0; v_runas int := 0; v_vales int := 0; v_portal int := 0; u int;
begin
  if v_a is null or v_m is null or p_etapa not between 1 and 20 or p_estrellas not between 1 and 3 then
    raise exception 'Etapa no válida'; end if;
  -- Área 2 (el Abismo): cada dificultad se abre al completar la etapa 20 del Portal en esa misma dificultad
  if p_area = 'abismo' and not exists (select 1 from public.campana_progreso
      where jugador = v_yo and area = 'portal' and dificultad = p_dificultad and etapa = 20) then
    raise exception 'Completa el Portal en esta dificultad para entrar al Abismo'; end if;
  if v_prev is not null and not exists (select 1 from public.campana_progreso
      where jugador = v_yo and area = p_area and dificultad = v_prev and etapa = 20) then
    raise exception 'Esta dificultad todavía está bloqueada'; end if;
  if p_etapa > 1 and not exists (select 1 from public.campana_progreso
      where jugador = v_yo and area = p_area and dificultad = p_dificultad and etapa = p_etapa - 1) then
    raise exception 'Esta etapa todavía está bloqueada'; end if;

  select * into v_fila from public.campana_progreso where jugador = v_yo and area = p_area and dificultad = p_dificultad and etapa = p_etapa;
  v_primera := not found;
  if not v_primera then
    select max(ultima) into v_ultima from public.campana_progreso where jugador = v_yo;
    if v_ultima > now() - interval '5 seconds' then
      raise exception 'Espera % s para cobrar otra repetición', ceil(extract(epoch from v_ultima + interval '5 seconds' - now()));
    end if;
  end if;

  insert into public.campana_progreso as c (jugador, area, dificultad, etapa, estrellas, victorias)
    values (v_yo, p_area, p_dificultad, p_etapa, p_estrellas, 1)
    on conflict (jugador, area, dificultad, etapa) do update
      set estrellas = greatest(c.estrellas, excluded.estrellas), victorias = c.victorias + 1, ultima = now();

  v_oro := case when v_primera then 5000 else 1000 end * v_m * v_a;
  if v_primera and p_etapa = 10 then v_frag := v_frag + 5 * v_m * v_a; end if;
  if v_primera and p_etapa = 20 then
    v_vales := v_vales + case v_m when 3 then 2 else 1 end * v_a;
    v_runas := v_runas + case v_m when 1 then 0 when 2 then 1 else 2 end * v_a;
  end if;
  -- (2026-10-26) La Campaña ya no da Runas de Portal: las primeras 3 estrellas de la etapa dan 5 Fragmentos (×2 en el Abismo)
  if p_estrellas = 3 and (v_primera or v_fila.estrellas < 3) then v_frag := v_frag + 5 * v_a; end if;
  -- misiones diarias
  perform public._mision_sumar(v_yo, 'campana_victorias', 1);
  if p_estrellas = 3 then perform public._mision_sumar(v_yo, 'campana_3estrellas', 1); end if;

  select coalesce(sum(estrellas), 0) into v_total from public.campana_progreso where jugador = v_yo and area = p_area and dificultad = p_dificultad;
  foreach u in array array[20, 40, 60] loop
    if v_total >= u and not exists (select 1 from public.campana_cofres where jugador = v_yo and area = p_area and dificultad = p_dificultad and umbral = u) then
      insert into public.campana_cofres (jugador, area, dificultad, umbral) values (v_yo, p_area, p_dificultad, u);
      if u = 20 then v_oro := v_oro + 10000 * v_m * v_a;
      elsif u = 40 then v_frag := v_frag + 5 * v_m * v_a;
      else
        if v_m = 1 then v_vales := v_vales + v_a; elsif v_m = 2 then v_runas := v_runas + v_a; else v_runas := v_runas + 4 * v_a; end if;
      end if;
      v_premios := v_premios || jsonb_build_object('tipo', 'cofre', 'cantidad', u);
    end if;
  end loop;

  update public.inventario set oro = oro + v_oro, frag_runa = frag_runa + v_frag, runas = runas + v_runas, vales_sobre = vales_sobre + v_vales,
    runas_portal = runas_portal + v_portal where jugador = v_yo;
  if v_oro > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'oro', 'cantidad', v_oro); end if;
  if v_frag > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'fragmento', 'cantidad', v_frag, 'nombre', 'Fragmentos de Runa'); end if;
  if v_runas > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'runa', 'cantidad', v_runas, 'nombre', 'Runas de Invocación'); end if;
  if v_vales > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'vale', 'cantidad', v_vales, 'nombre', 'Vale de sobre'); end if;
  if v_portal > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'portal', 'cantidad', v_portal, 'nombre', 'Runa de Portal'); end if;
  return jsonb_build_object('primera', v_primera, 'estrellas', p_estrellas, 'total', v_total, 'recompensas', v_premios);
end $$;

revoke all on function public.campana_completar(text, text, int, int) from public, anon;
grant execute on function public.campana_completar(text, text, int, int) to authenticated;

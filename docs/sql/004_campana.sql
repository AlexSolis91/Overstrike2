-- Overstrike 2 · Paso 4: MODO CAMPAÑA (progreso, estrellas, cofres de estrellas, recompensas y vales de sobre).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar.
-- Los jugadores solo LEEN su progreso: las victorias y los premios pasan por campana_completar (el servidor valida y paga).

-- ============================================================ VALES DE SOBRE (premio de jefes y cofres)
alter table public.inventario add column if not exists vales_sobre integer not null default 0 check (vales_sobre >= 0);

-- ============================================================ PROGRESO
create table if not exists public.campana_progreso (
  jugador    uuid not null references public.jugadores (id) on delete cascade,
  area       text not null,
  dificultad text not null check (dificultad in ('normal', 'dificil', 'brutal')),
  etapa      smallint not null check (etapa between 1 and 20),
  estrellas  smallint not null default 0 check (estrellas between 0 and 3),
  victorias  integer not null default 0,
  primera    timestamptz not null default now(),     -- primera victoria
  ultima     timestamptz not null default now(),     -- última victoria (para el tiempo mínimo entre repeticiones)
  primary key (jugador, area, dificultad, etapa)
);
create table if not exists public.campana_cofres (
  jugador    uuid not null references public.jugadores (id) on delete cascade,
  area       text not null,
  dificultad text not null,
  umbral     smallint not null,                       -- 20 / 40 / 60 estrellas
  fecha      timestamptz not null default now(),
  primary key (jugador, area, dificultad, umbral)
);
alter table public.campana_progreso enable row level security;
alter table public.campana_cofres   enable row level security;
drop policy if exists "jugador ve su campana" on public.campana_progreso;
create policy "jugador ve su campana" on public.campana_progreso for select to authenticated using (jugador = auth.uid());
drop policy if exists "jugador ve sus cofres" on public.campana_cofres;
create policy "jugador ve sus cofres" on public.campana_cofres for select to authenticated using (jugador = auth.uid());
revoke all on public.campana_progreso, public.campana_cofres from anon, authenticated;
grant select on public.campana_progreso, public.campana_cofres to authenticated;

-- ============================================================ COMPLETAR UNA ETAPA (se llama solo al ganar)
-- Valida el desbloqueo (etapa anterior y dificultad anterior), aplica un tiempo mínimo entre REPETICIONES (90 s, contra trampas
-- y para que el farmeo respete la economía), guarda las estrellas (la mejor), paga la recompensa y abre los cofres de estrellas.
-- Devuelve: { primera, estrellas, total, recompensas: [{tipo, cantidad, nombre?}] }
create or replace function public.campana_completar(p_area text, p_dificultad text, p_etapa int, p_estrellas int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := public._yo();
  v_m int := case p_dificultad when 'normal' then 1 when 'dificil' then 2 when 'brutal' then 3 end;
  v_prev text := case p_dificultad when 'dificil' then 'normal' when 'brutal' then 'dificil' end;
  v_fila public.campana_progreso; v_primera boolean; v_ultima timestamptz; v_total int;
  v_premios jsonb := '[]'::jsonb; v_oro int := 0; v_frag int := 0; v_runas int := 0; v_vales int := 0; u int;
begin
  if p_area <> 'portal' or v_m is null or p_etapa not between 1 and 20 or p_estrellas not between 1 and 3 then
    raise exception 'Etapa no válida'; end if;
  if v_prev is not null and not exists (select 1 from public.campana_progreso
      where jugador = v_yo and area = p_area and dificultad = v_prev and etapa = 20) then
    raise exception 'Esta dificultad todavía está bloqueada'; end if;
  if p_etapa > 1 and not exists (select 1 from public.campana_progreso
      where jugador = v_yo and area = p_area and dificultad = p_dificultad and etapa = p_etapa - 1) then
    raise exception 'Esta etapa todavía está bloqueada'; end if;

  select * into v_fila from public.campana_progreso where jugador = v_yo and area = p_area and dificultad = p_dificultad and etapa = p_etapa;
  v_primera := not found;
  if not v_primera then                                  -- repetición: tiempo mínimo desde la última victoria de campaña
    select max(ultima) into v_ultima from public.campana_progreso where jugador = v_yo;
    if v_ultima > now() - interval '90 seconds' then
      raise exception 'Espera % s para cobrar otra repetición', ceil(extract(epoch from v_ultima + interval '90 seconds' - now()));
    end if;
  end if;

  insert into public.campana_progreso as c (jugador, area, dificultad, etapa, estrellas, victorias)
    values (v_yo, p_area, p_dificultad, p_etapa, p_estrellas, 1)
    on conflict (jugador, area, dificultad, etapa) do update
      set estrellas = greatest(c.estrellas, excluded.estrellas), victorias = c.victorias + 1, ultima = now();

  -- recompensa de la batalla
  v_oro := case when v_primera then 5000 else 1000 end * v_m;
  if v_primera and p_etapa = 10 then v_frag := v_frag + 5 * v_m; end if;                    -- mini-jefe
  if v_primera and p_etapa = 20 then                                                         -- jefe final
    v_vales := v_vales + case v_m when 3 then 2 else 1 end;
    v_runas := v_runas + case v_m when 1 then 0 when 2 then 1 else 2 end;
  end if;

  -- cofres de estrellas (20 / 40 / 60 por dificultad)
  select coalesce(sum(estrellas), 0) into v_total from public.campana_progreso where jugador = v_yo and area = p_area and dificultad = p_dificultad;
  foreach u in array array[20, 40, 60] loop
    if v_total >= u and not exists (select 1 from public.campana_cofres where jugador = v_yo and area = p_area and dificultad = p_dificultad and umbral = u) then
      insert into public.campana_cofres (jugador, area, dificultad, umbral) values (v_yo, p_area, p_dificultad, u);
      if u = 20 then v_oro := v_oro + 10000 * v_m;
      elsif u = 40 then v_frag := v_frag + 5 * v_m;
      else
        if v_m = 1 then v_vales := v_vales + 1; elsif v_m = 2 then v_runas := v_runas + 1; else v_runas := v_runas + 4; end if;
      end if;
      v_premios := v_premios || jsonb_build_object('tipo', 'cofre', 'cantidad', u);
    end if;
  end loop;

  update public.inventario set oro = oro + v_oro, frag_runa = frag_runa + v_frag, runas = runas + v_runas, vales_sobre = vales_sobre + v_vales
    where jugador = v_yo;
  if v_oro > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'oro', 'cantidad', v_oro); end if;
  if v_frag > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'fragmento', 'cantidad', v_frag, 'nombre', 'Fragmentos de Runa'); end if;
  if v_runas > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'runa', 'cantidad', v_runas, 'nombre', 'Runas de Invocación'); end if;
  if v_vales > 0 then v_premios := v_premios || jsonb_build_object('tipo', 'vale', 'cantidad', v_vales, 'nombre', 'Vale de sobre'); end if;
  return jsonb_build_object('primera', v_primera, 'estrellas', p_estrellas, 'total', v_total, 'recompensas', v_premios);
end $$;

-- ============================================================ ABRIR UN SOBRE CON VALE (mismo reparto que abrir_sobre, sin cobrar oro)
create or replace function public.abrir_sobre_vale(p_sobre text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_cfg public.sobres_config; v_n int := case when random() < .5 then 1 else 2 end;
        v_tematico boolean; v_tema text[]; v_resto text[]; v_todo text[]; c text;
begin
  select * into v_cfg from public.sobres_config where id = p_sobre;
  if not found or not v_cfg.activo then raise exception 'Ese sobre no está disponible'; end if;
  update public.inventario set vales_sobre = vales_sobre - 1 where jugador = v_yo and vales_sobre >= 1;
  if not found then raise exception 'No tienes vales de sobre'; end if;
  v_tematico := exists (select 1 from public.campeones where activo and p_sobre = any (sobres));
  select coalesce(array_agg(id), '{}') into v_tema
    from (select id from public.campeones where activo and p_sobre = any (sobres)
          order by -ln(1 - random()) / public._peso(nivel) limit v_n) t;
  select coalesce(array_agg(id), '{}') into v_resto
    from (select id from public.campeones
          where activo and not (id = any (v_tema))
            and (not solo_su_sobre or not v_tematico or p_sobre = any (sobres))
          order by -ln(1 - random()) / public._peso(nivel) limit 3 - cardinality(v_tema)) t;
  v_todo := v_tema || v_resto;
  foreach c in array v_todo loop perform public._dar_campeon(v_yo, c); end loop;
  insert into public.aperturas (jugador, tipo, origen, campeones) values (v_yo, 'vale', p_sobre, v_todo);
  return v_todo;
end $$;

revoke all on function public.campana_completar(text, text, int, int), public.abrir_sobre_vale(text) from public, anon;
grant execute on function public.campana_completar(text, text, int, int), public.abrir_sobre_vale(text) to authenticated;

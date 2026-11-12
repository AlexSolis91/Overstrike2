-- Overstrike 2 · Paso 40: VALE DEL TUTORIAL y PRIMEROS PASOS.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 038.
-- · tutorial_vale(): 1 Vale de sobre para la primera compra guiada (Unbreakable Force), UNA vez por cuenta.
-- · Primeros pasos: 7 objetivos con premio pequeño (el servidor revisa que se cumplieron) + premio por completarlos todos.

-- ============================================================ tutorial: "premio" y "vale" solo los marca el servidor
create or replace function public.tutorial_marcar(p_clave text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v jsonb;
begin
  if p_clave is null or p_clave !~ '^[a-z_]{1,30}$' or p_clave in ('premio', 'vale') then raise exception 'Parte del tutorial no válida'; end if;
  update public.jugadores set tutorial = tutorial || jsonb_build_object(p_clave, true) where id = v_yo returning tutorial into v;
  return v;
end $$;

create or replace function public.tutorial_vale()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_vales int;
begin
  update public.jugadores set tutorial = tutorial || '{"vale": true}'::jsonb where id = v_yo and not (tutorial ? 'vale');
  if not found then raise exception 'Ya recibiste el vale del tutorial'; end if;
  insert into public.inventario (jugador) values (v_yo) on conflict do nothing;
  update public.inventario set vales_sobre = vales_sobre + 1 where jugador = v_yo returning vales_sobre into v_vales;
  return jsonb_build_object('vales', 1, 'vales_total', v_vales);
end $$;

-- ============================================================ PRIMEROS PASOS
alter table public.jugadores add column if not exists primeros_pasos text[] not null default '{}';   -- premios ya cobrados

-- Premio de cada paso (igual que js/datos/primerosPasos.js; la prueba pruebas/tutorial.test.mjs revisa que coincidan)
create or replace function public._pp_premio(p_clave text)
returns jsonb language sql immutable set search_path = '' as $$
  select case p_clave
    when 'campana3' then '{"oro":10000}'::jsonb
    when 'reliquia' then '{"oro":10000}'::jsonb
    when 'ascender' then '{"oro":15000}'::jsonb
    when 'horda5' then '{"runas_portal":2}'::jsonb
    when 'raid' then '{"oro":10000}'::jsonb
    when 'arena' then '{"oro":15000}'::jsonb
    when 'campana10' then '{"vales":1}'::jsonb
    when 'todos' then '{"oro":20000,"vales":1}'::jsonb
    else null end
$$;

-- ¿Ya lo cumplió? (se revisa con lo que hay guardado en el servidor)
create or replace function public._pp_hecho(p_yo uuid, p_clave text)
returns boolean language sql stable set search_path = '' as $$
  select case p_clave
    when 'campana3' then exists (select 1 from public.campana_progreso where jugador = p_yo and area = 'portal' and dificultad = 'normal' and etapa >= 3)
    when 'reliquia' then exists (select 1 from public.reliquias where jugador = p_yo and campeon is not null)
    when 'ascender' then exists (select 1 from public.coleccion where jugador = p_yo and estrellas >= 1)
    when 'horda5' then exists (select 1 from public.horda_partidas where jugador = p_yo and oleada >= 5)
    when 'raid' then exists (select 1 from public.raid_ataques where jugador = p_yo and estado = 'hecho')
    when 'arena' then exists (select 1 from public.arena_jugadores where jugador = p_yo and victorias >= 1)
    when 'campana10' then exists (select 1 from public.campana_progreso where jugador = p_yo and area = 'portal' and dificultad = 'normal' and etapa >= 10)
    when 'todos' then (select count(*) from public.jugadores j, unnest(j.primeros_pasos) c where j.id = p_yo and c <> 'todos') >= 7
    else false end
$$;

create or replace function public.primeros_pasos_estado()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_cob text[];
begin
  select primeros_pasos into v_cob from public.jugadores where id = v_yo;
  return (select jsonb_agg(jsonb_build_object('clave', k, 'hecho', public._pp_hecho(v_yo, k), 'cobrado', k = any (coalesce(v_cob, '{}'))) order by n)
    from unnest(array['campana3', 'reliquia', 'ascender', 'horda5', 'raid', 'arena', 'campana10', 'todos']) with ordinality as t(k, n));
end $$;

create or replace function public.primeros_pasos_cobrar(p_clave text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_p jsonb := public._pp_premio(p_clave);
begin
  if v_p is null then raise exception 'Ese paso no existe'; end if;
  perform pg_advisory_xact_lock(hashtext('pp:' || v_yo::text));
  if not public._pp_hecho(v_yo, p_clave) then raise exception 'Todavía no completas ese paso'; end if;
  update public.jugadores set primeros_pasos = array_append(primeros_pasos, p_clave) where id = v_yo and not (p_clave = any (primeros_pasos));
  if not found then raise exception 'Ya cobraste ese premio'; end if;
  insert into public.inventario (jugador) values (v_yo) on conflict do nothing;
  update public.inventario set oro = oro + coalesce((v_p ->> 'oro')::int, 0), vales_sobre = vales_sobre + coalesce((v_p ->> 'vales')::int, 0),
    runas_portal = runas_portal + coalesce((v_p ->> 'runas_portal')::int, 0) where jugador = v_yo;
  return jsonb_build_object('premio', v_p);
end $$;

revoke all on function public.tutorial_marcar(text), public.tutorial_vale(), public._pp_premio(text), public._pp_hecho(uuid, text),
  public.primeros_pasos_estado(), public.primeros_pasos_cobrar(text) from public, anon;
grant execute on function public.tutorial_marcar(text), public.tutorial_vale(), public.primeros_pasos_estado(), public.primeros_pasos_cobrar(text) to authenticated;

-- Overstrike 2 · Paso 41: ESTRELLAS PARA EQUIPAR RELIQUIAS (+1 a cada rareza).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 005 y 040.
-- · Común 1★ · Rara 2★ · Especial 3★ · Épica 4★ · Legendaria 5★ (antes 0★ a 4★).
-- · Limpieza única: a cada campeón se le quitan SOLO las reliquias que ya no puede usar (vuelven al inventario). Las demás se quedan.
--   Si se quita un Arco de Arma 1, la Equipación 3 que estaba en Arma 2 también vuelve al inventario.
-- · Primeros pasos: "Asciende a 1★" va ahora antes de "Equipa una reliquia".

-- Estrellas que pide cada rareza (igual que RAREZAS en js/datos/reliquias.js; lo revisa pruebas/reliquias-estrellas.test.mjs)
create or replace function public._estrellas_reliquia(p_rareza text)
returns int language sql immutable set search_path = '' as $$
  select case p_rareza when 'Común' then 1 when 'Raro' then 2 when 'Especial' then 3 when 'Épico' then 4 else 5 end
$$;

-- ============================================================ EQUIPAR (igual que en 005, con la nueva tabla de estrellas)
create or replace function public.equipar_reliquia(p_reliquia uuid, p_campeon text, p_espacio text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_rel public.reliquias; v_cat public.reliquias_catalogo; v_tipo public.reliquia_tipos;
        v_col public.coleccion; v_req int; v_arco_a1 boolean; v_cat_espacio text; v_otro text;
begin
  select * into v_rel from public.reliquias where id = p_reliquia and jugador = v_yo for update;
  if not found then raise exception 'No tienes esa reliquia'; end if;
  select * into v_col from public.coleccion where jugador = v_yo and campeon = p_campeon;
  if not found then raise exception 'No tienes a ese campeón'; end if;
  if p_espacio not in ('arma1', 'equip1', 'acc1', 'arma2', 'equip2', 'acc2') then raise exception 'Espacio desconocido'; end if;
  if p_espacio in ('arma2', 'equip2', 'acc2') and not (p_espacio = any (v_col.espacios_abiertos)) then
    raise exception 'Ese espacio está bloqueado'; end if;
  select * into v_cat from public.reliquias_catalogo where id = v_rel.reliquia;
  select * into v_tipo from public.reliquia_tipos where tipo = v_cat.tipo;
  v_req := public._estrellas_reliquia(v_cat.rareza);
  if v_col.estrellas < v_req then raise exception 'Este campeón necesita %★ para usar reliquias %', v_req, v_cat.rareza; end if;

  -- ¿hay un Arco en Arma 1 (contando la que se va a equipar)?
  if p_espacio = 'arma1' then v_arco_a1 := v_cat.tipo = 'Arco';
  else v_arco_a1 := exists (select 1 from public.reliquias r join public.reliquias_catalogo c on c.id = r.reliquia
      where r.jugador = v_yo and r.campeon = p_campeon and r.espacio = 'arma1' and c.tipo = 'Arco' and r.id <> p_reliquia); end if;
  v_cat_espacio := case when p_espacio like 'arma%' then (case when p_espacio = 'arma2' and v_arco_a1 then 'Equipación' else 'Arma' end)
                        when p_espacio like 'equip%' then 'Equipación' else 'Accesorio' end;
  if v_tipo.categoria <> v_cat_espacio then
    raise exception '%', case when p_espacio = 'arma2' and v_arco_a1 then 'Con un Arco, Arma 2 se vuelve Equipación 3'
                              else 'Ese espacio es de ' || v_cat_espacio end; end if;
  if v_cat.tipo = 'Arco' and p_espacio <> 'arma1' then raise exception 'El Arco solo va en Arma 1'; end if;
  if v_cat.tipo = 'Escudo' and exists (select 1 from public.reliquias r join public.reliquias_catalogo c on c.id = r.reliquia
      where r.jugador = v_yo and r.campeon = p_campeon and r.espacio = (case when p_espacio = 'arma1' then 'arma2' else 'arma1' end)
        and c.tipo = 'Escudo' and r.id <> p_reliquia) then raise exception 'No puede llevar dos Escudos'; end if;
  if v_tipo.categoria = 'Equipación' and exists (select 1 from public.reliquias r join public.reliquias_catalogo c on c.id = r.reliquia
      where r.jugador = v_yo and r.campeon = p_campeon and r.id <> p_reliquia and r.espacio <> p_espacio and c.tipo = v_cat.tipo
        and (r.espacio in ('equip1', 'equip2') or (r.espacio = 'arma2' and v_arco_a1))) then
    raise exception 'Ya lleva otra reliquia de tipo %', v_cat.tipo; end if;

  -- libera el espacio, quita la reliquia de donde estaba y la equipa
  update public.reliquias set campeon = null, espacio = null
    where jugador = v_yo and campeon = p_campeon and espacio = p_espacio and id <> p_reliquia;
  update public.reliquias set campeon = null, espacio = null where id = p_reliquia;
  -- un Arco en Arma 1 manda al inventario el arma que hubiera en Arma 2; quitar el Arco devuelve la Equipación 3
  if p_espacio = 'arma1' then
    select c.categoria into v_otro from public.reliquias r join public.reliquias_catalogo c2 on c2.id = r.reliquia
      join public.reliquia_tipos c on c.tipo = c2.tipo
      where r.jugador = v_yo and r.campeon = p_campeon and r.espacio = 'arma2';
    if v_otro is not null and ((v_arco_a1 and v_otro = 'Arma') or (not v_arco_a1 and v_otro = 'Equipación')) then
      update public.reliquias set campeon = null, espacio = null where jugador = v_yo and campeon = p_campeon and espacio = 'arma2';
    end if;
  end if;
  update public.reliquias set campeon = p_campeon, espacio = p_espacio where id = p_reliquia;
end $$;

-- ============================================================ LIMPIEZA: reliquias que el campeón ya no puede usar
update public.reliquias r set campeon = null, espacio = null
  from public.reliquias_catalogo c, public.coleccion col
  where c.id = r.reliquia and col.jugador = r.jugador and col.campeon = r.campeon
    and r.campeon is not null and col.estrellas < public._estrellas_reliquia(c.rareza);

-- sin Arco en Arma 1, una Equipación en Arma 2 (Equipación 3) vuelve al inventario
update public.reliquias r set campeon = null, espacio = null
  from public.reliquias_catalogo c, public.reliquia_tipos t
  where c.id = r.reliquia and t.tipo = c.tipo and t.categoria = 'Equipación' and r.espacio = 'arma2'
    and not exists (select 1 from public.reliquias a join public.reliquias_catalogo ac on ac.id = a.reliquia
      where a.jugador = r.jugador and a.campeon = r.campeon and a.espacio = 'arma1' and ac.tipo = 'Arco');

-- ============================================================ PRIMEROS PASOS: nuevo orden (ascender antes que reliquia)
create or replace function public.primeros_pasos_estado()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_cob text[];
begin
  select primeros_pasos into v_cob from public.jugadores where id = v_yo;
  return (select jsonb_agg(jsonb_build_object('clave', k, 'hecho', public._pp_hecho(v_yo, k), 'cobrado', k = any (coalesce(v_cob, '{}'))) order by n)
    from unnest(array['campana3', 'ascender', 'reliquia', 'horda5', 'raid', 'arena', 'campana10', 'todos']) with ordinality as t(k, n));
end $$;

revoke all on function public._estrellas_reliquia(text), public.equipar_reliquia(uuid, text, text), public.primeros_pasos_estado() from public, anon;
grant execute on function public.equipar_reliquia(uuid, text, text), public.primeros_pasos_estado() to authenticated;

-- Overstrike 2 · Paso 28: Jefe de Raid. La pantalla ya puede decir si reclamaste el cofre de hoy.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001–027.

create or replace function public.raid_estado()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_c public.raid_config; v_ll public.raid_jugadores; v_hoy date := public._raid_hoy(); v_dif public.raid_dificultades;
        v_d public.raid_dias; v_lista jsonb := '[]'; v_mi bigint; v_rec_hoy boolean; v_ab boolean; v_rec jsonb;
begin
  select * into v_c from public.raid_config where id = 1;
  perform public._raid_tirar_recetas(v_yo);
  v_ll := public._raid_llaves(v_yo);
  for v_dif in select * from public.raid_dificultades order by orden loop
    v_d := public._raid_dia(v_dif.id);
    v_rec_hoy := false;
    select dano, reclamado into v_mi, v_rec_hoy from public.raid_danos where dia = v_hoy and dificultad = v_dif.id and jugador = v_yo;
    v_ab := v_dif.orden = 1 or exists (select 1 from public.raid_desbloqueos u where u.jefe = v_c.jefe and u.dificultad = v_dif.id);
    v_lista := v_lista || jsonb_build_object('id', v_dif.id, 'nombre', v_dif.nombre, 'abierta', v_ab, 'hp_total', v_d.hp_total, 'hp_restante', v_d.hp_restante,
      'derrotado', v_d.derrotado is not null, 'mi_dano', coalesce(v_mi, 0), 'reclamado', coalesce(v_rec_hoy, false), 'cofre', public._raid_cofre(coalesce(v_mi, 0), v_dif, v_c.escala),
      'rangos', jsonb_build_array(round(v_dif.rango1 * v_c.escala), round(v_dif.rango2 * v_c.escala), round(v_dif.rango3 * v_c.escala), round(v_dif.rango4 * v_c.escala)),
      'oro', v_dif.oro, 'polvo', v_dif.polvo, 'runas', v_dif.runas, 'p_rara', v_dif.p_rara, 'p_especial', v_dif.p_especial, 'p_epica', v_dif.p_epica, 'p_receta', v_dif.p_receta,
      'ranking', coalesce((select jsonb_agg(x order by x.dano desc) from (select j.nombre, r.dano from public.raid_danos r join public.jugadores j on j.id = r.jugador
        where r.dia = v_hoy and r.dificultad = v_dif.id order by r.dano desc limit 10) x), '[]'));
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('legendaria', t.legendaria, 'dificultad', t.dificultad, 'dia', t.dia)), '[]') into v_rec
    from public.raid_tiradas t where t.jugador = v_yo and t.gano and not t.visto;
  update public.raid_tiradas set visto = true where jugador = v_yo and gano and not visto;
  return jsonb_build_object('jefe', v_c.jefe, 'legendaria', v_c.legendaria, 'escala', v_c.escala,
    'cierra', ((v_hoy + 1)::timestamp at time zone 'America/Mexico_City'),
    'llaves', v_ll.llaves, 'proxima_llave', case when v_ll.llaves < 2 then v_ll.desde + interval '6 hours' end,
    'dificultades', v_lista, 'recetas', v_rec,
    'cofres', coalesce((select jsonb_agg(jsonb_build_object('dia', r.dia, 'dificultad', r.dificultad, 'nombre', f.nombre, 'dano', r.dano,
        'cofre', public._raid_cofre(r.dano, f, v_c.escala), 'derrotado', d.derrotado is not null,
        'listo', r.dia < v_hoy or d.derrotado is not null) order by r.dia, f.orden)
      from public.raid_danos r join public.raid_dificultades f on f.id = r.dificultad join public.raid_dias d on d.dia = r.dia and d.dificultad = r.dificultad
      where r.jugador = v_yo and not r.reclamado and public._raid_cofre(r.dano, f, v_c.escala) >= 1), '[]'),
    'pendientes', coalesce((select jsonb_agg(a.id) from public.raid_ataques a where a.jugador = v_yo and a.estado = 'pendiente'), '[]'));
end $$;

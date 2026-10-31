-- 020 · Récords de la Horda (2026-10-30)
-- Ranking público de cada Horda: la mejor oleada de cada jugador (empate: quien la alcanzó primero). Top 50 + mi puesto.
-- Lo puede ver cualquiera (también sin sesión); solo expone el nombre del jugador, su oleada y la fecha.

create or replace function public.horda_ranking(p_horda text default 'orcos')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := auth.uid(); v_lista jsonb; v_mio jsonb;
begin
  with mejores as (
    select distinct on (p.jugador) p.jugador, p.oleada, p.ultima
    from public.horda_partidas p
    where p.horda = p_horda and p.oleada > 0
    order by p.jugador, p.oleada desc, p.ultima asc),
  r as (
    select row_number() over (order by m.oleada desc, m.ultima asc) as puesto, j.nombre, m.oleada, m.ultima as fecha,
           (m.jugador is not distinct from v_yo) as yo
    from mejores m join public.jugadores j on j.id = m.jugador)
  select coalesce((select jsonb_agg(to_jsonb(x) order by x.puesto) from r x where x.puesto <= 50), '[]'::jsonb),
         (select to_jsonb(y) from r y where y.yo)
  into v_lista, v_mio;
  return jsonb_build_object('lista', v_lista, 'yo', v_mio);
end $$;

revoke all on function public.horda_ranking(text) from public;
grant execute on function public.horda_ranking(text) to anon, authenticated;

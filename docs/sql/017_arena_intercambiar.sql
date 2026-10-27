-- Overstrike 2 · Paso 17: ARENA — intercambiar los equipos de Ataque y Defensa con un botón (2026-10-26).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 008.
-- Guardarlos uno por uno no sirve: arena_guardar_equipo no deja que un campeón esté en los dos equipos a la vez.
-- Los combates que ya empezaron contra tu Defensa no cambian (cada combate guarda su propia copia del equipo).

create or replace function public.arena_intercambiar_equipos() returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); a public.arena_jugadores;
begin
  a := public._arena_al_dia(v_yo);
  if cardinality(a.ataque) is distinct from 5 or cardinality(a.defensa) is distinct from 5 then
    raise exception 'Necesitas un equipo de Ataque y uno de Defensa de 5 campeones para intercambiarlos'; end if;
  update public.arena_jugadores set ataque = a.defensa, defensa = a.ataque where jugador = v_yo;
end $$;

revoke all on function public.arena_intercambiar_equipos() from public, anon;
grant execute on function public.arena_intercambiar_equipos() to authenticated;

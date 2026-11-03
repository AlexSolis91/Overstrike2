-- Overstrike 2 · Paso 23: 1 Runa de Invocación ahora cuesta 50 Fragmentos (antes 20) (2026-11-03).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 002.
-- No cambia los fragmentos ni las runas que cada jugador ya tiene.

create or replace function public.combinar_runa()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_runas int;
begin
  update public.inventario set frag_runa = frag_runa - 50, runas = runas + 1 where jugador = v_yo and frag_runa >= 50
    returning runas into v_runas;
  if not found then raise exception 'Necesitas 50 Fragmentos de Runa de Invocación'; end if;
  return v_runas;
end $$;

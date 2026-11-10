-- Overstrike 2 · Paso 36: los espacios extra de reliquias solo se abren con oro (2026-11-10).
-- Ya no se aceptan copias del campeón como pago. Costos sin cambio: 100,000 / 500,000 / 1,000,000 de oro.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001–035.

create or replace function public.desbloquear_espacio(p_campeon text, p_con text, p_espacio text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); r public.coleccion; v_oro bigint[] := array[100000, 500000, 1000000];
        v_esp text := p_espacio;
begin
  if p_con is distinct from 'oro' then raise exception 'Los espacios de reliquias solo se abren con oro'; end if;
  select * into r from public.coleccion where jugador = v_yo and campeon = p_campeon for update;
  if not found then raise exception 'No tienes a ese campeón'; end if;
  if r.espacios >= 3 then raise exception 'Ya tiene todos sus espacios desbloqueados'; end if;
  if v_esp is null then
    select e into v_esp from unnest(array['arma2', 'equip2', 'acc2']) e where not (e = any (r.espacios_abiertos)) limit 1;
  end if;
  if v_esp not in ('arma2', 'equip2', 'acc2') then raise exception 'Espacio desconocido'; end if;
  if v_esp = any (r.espacios_abiertos) then raise exception 'Ese espacio ya está abierto'; end if;
  update public.inventario set oro = oro - v_oro[r.espacios + 1] where jugador = v_yo and oro >= v_oro[r.espacios + 1];
  if not found then raise exception 'Necesitas % de oro', v_oro[r.espacios + 1]; end if;
  update public.coleccion set espacios = espacios + 1, espacios_abiertos = espacios_abiertos || v_esp
    where jugador = v_yo and campeon = p_campeon;
  return r.espacios + 1;
end $$;

revoke all on function public.desbloquear_espacio(text, text, text) from public, anon;
grant execute on function public.desbloquear_espacio(text, text, text) to authenticated;

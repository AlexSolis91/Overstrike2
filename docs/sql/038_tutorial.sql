-- Overstrike 2 · Paso 38: TUTORIAL con Thestalos, Guardián del Portal.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001, 002 y 006.
-- · jugadores.tutorial: qué partes del tutorial ya vio cada jugador ({ "intro": true, "horda": true, ... }).
-- · tutorial_marcar(clave): marca una parte como vista (solo letras minúsculas y guion bajo).
-- · tutorial_premio(): regalo por terminar el tutorial, UNA vez por cuenta: 50,000 de oro y 3 Runas de Portal.

alter table public.jugadores add column if not exists tutorial jsonb not null default '{}'::jsonb;

create or replace function public.tutorial_marcar(p_clave text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v jsonb;
begin
  if p_clave is null or p_clave !~ '^[a-z_]{1,30}$' or p_clave = 'premio' then raise exception 'Parte del tutorial no válida'; end if;
  update public.jugadores set tutorial = tutorial || jsonb_build_object(p_clave, true) where id = v_yo returning tutorial into v;
  return v;
end $$;

create or replace function public.tutorial_premio()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_oro bigint; v_runas int;
begin
  update public.jugadores set tutorial = tutorial || '{"premio": true}'::jsonb where id = v_yo and not (tutorial ? 'premio');
  if not found then raise exception 'Ya recibiste el regalo del tutorial'; end if;
  insert into public.inventario (jugador) values (v_yo) on conflict do nothing;
  update public.inventario set oro = oro + 50000, runas_portal = runas_portal + 3 where jugador = v_yo
    returning oro, runas_portal into v_oro, v_runas;
  return jsonb_build_object('oro', 50000, 'runas_portal', 3, 'oro_total', v_oro, 'runas_total', v_runas);
end $$;

revoke all on function public.tutorial_marcar(text), public.tutorial_premio() from public, anon;
grant execute on function public.tutorial_marcar(text), public.tutorial_premio() to authenticated;

-- Overstrike 2 · Paso 14: REINICIO PARA LA BETA (todos empiezan desde cero).
-- ⚠️ IRREVERSIBLE: borra el progreso de TODOS los jugadores (incluida la cuenta de administrador).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Ejecútalo justo antes de abrir la beta.
--
-- SE CONSERVA: las cuentas (correo, contraseña, nombre de jugador y rol de administrador) y la configuración del juego
--   (catálogo de campeones y reliquias, sobres y precios, recetas, configuración de la Arena).
-- SE BORRA: campeones, copias, estrellas y espacios · reliquias · oro, fragmentos, runas, vales, Polvo Arcano, Trofeos y
--   contadores de sobres · historial de aperturas · progreso y cofres de la Campaña (Portal y Abismo) · partidas, récords
--   y premios de primera vez de la Horda · Arena (puntos, equipos, combates, historial, títulos, cola y partidas en vivo).
-- DESPUÉS: cada jugador vuelve a abrir su Starter Pack por primera vez y recibe de nuevo el regalo inicial
--   (3 Runas de Portal). La temporada 1 de la Arena sigue contando desde el lunes 2026-10-19.

begin;

-- Arena
delete from public.arena_vivo;
delete from public.arena_cola;
delete from public.arena_combates;
delete from public.arena_historial;
delete from public.arena_titulos;
delete from public.arena_jugadores;

-- Horda
delete from public.horda_hitos;
delete from public.horda_partidas;

-- Campaña
delete from public.campana_cofres;
delete from public.campana_progreso;

-- Reliquias, colección e historial de aperturas
delete from public.reliquias;
delete from public.coleccion;
delete from public.aperturas;

-- Inventario: se vuelve a crear con los valores iniciales de cada columna (oro 0, 3 Runas de Portal de regalo, etc.)
delete from public.inventario;
insert into public.inventario (jugador) select id from public.jugadores on conflict do nothing;

-- Starter Pack disponible otra vez para todos
update public.jugadores set starter_elegido = null;

commit;

-- Comprobación: todo debe salir en 0 salvo "jugadores" e "inventarios" (uno por jugador) y "runas_portal_regalo".
select
  (select count(*) from public.jugadores)                         as jugadores,
  (select count(*) from public.inventario)                        as inventarios,
  (select coalesce(sum(runas_portal), 0) from public.inventario)  as runas_portal_regalo,
  (select count(*) from public.coleccion)                         as campeones,
  (select count(*) from public.reliquias)                         as reliquias,
  (select count(*) from public.campana_progreso)                  as etapas_campana,
  (select count(*) from public.horda_partidas)                    as partidas_horda,
  (select count(*) from public.arena_jugadores)                   as jugadores_arena,
  (select count(*) from public.jugadores where starter_elegido is not null) as starters_abiertos;

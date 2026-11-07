-- 033 · Sobre Legendary Warriors (2026-11-07)
-- Ejecutar en el SQL Editor de Supabase y DESPUÉS docs/sql/catalogo.sql (reacomoda los sobres de cada campeón:
-- Phantom of Chaos pasa de 35 a 17, Lords of the Flames suma 6 de Quemadura y nace Legendary Warriors con 14 héroes).
-- Se puede ejecutar más de una vez. Empieza activo y con el precio de Bloodline Awakening (se cambia en el panel de Administrador).
insert into public.sobres_config (id, activo, precio)
values ('warriors', true, coalesce((select precio from public.sobres_config where id = 'bloodline'), 0))
on conflict (id) do nothing;

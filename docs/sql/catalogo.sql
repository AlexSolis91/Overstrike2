-- Catálogo de campeones para el servidor (GENERADO por herramientas/generar_catalogo.mjs, no editar a mano).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run. Se puede ejecutar las veces que haga falta.
insert into public.campeones (id, nombre, starter, sobres, activo) values
  ('madara-uchiha', 'Madara Uchiha', null, array['bloodline', 'phantom']::text[], true),
  ('rengoku', 'Rengoku', 'blazing', array[]::text[], true),
  ('alexstrasza', 'Alexstrasza', 'blazing', array['sacred']::text[], true),
  ('sun-jin-woo', 'Sun Jin Woo', null, array['phantom']::text[], true),
  ('shaka', 'Shaka', null, array['sacred']::text[], true),
  ('goku', 'Goku', null, array['bloodline']::text[], true),
  ('daenerys-targaryen', 'Daenerys Targaryen', 'blazing', array[]::text[], true),
  ('batman', 'Batman', null, array['phantom']::text[], true),
  ('the-joker', 'The Joker', 'noxious', array['phantom']::text[], true),
  ('reptile', 'Reptile', 'noxious', array['phantom']::text[], true),
  ('sub-zero', 'Sub-Zero', 'frostborn', array[]::text[], true),
  ('scorpion', 'Scorpion', 'blazing', array['bloodline', 'phantom']::text[], true),
  ('aldebaran', 'Aldebarán', null, array['sacred']::text[], true),
  ('rhaenys-targaryen', 'Rhaenys Targaryen', 'blazing', array[]::text[], true),
  ('thor', 'Thor', null, array['sacred']::text[], true),
  ('loki', 'Loki', 'noxious', array['phantom', 'sacred']::text[], true)
on conflict (id) do update set nombre = excluded.nombre, starter = excluded.starter, sobres = excluded.sobres, activo = excluded.activo;
-- 16 campeones

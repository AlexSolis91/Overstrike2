-- Overstrike 2 · Paso 39: TIENDA DE LA HORDA — las Raras cuestan 100 Trofeos de Orco (antes 80).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 037.
-- Precios: Rara 100 · Especial 400 · Épica 1,500. Las Comunes siguen sin venderse.

create or replace function public._precio_trofeos(p_rareza text)
returns integer language sql immutable set search_path = '' as $$
  select case p_rareza when 'Raro' then 100 when 'Especial' then 400 when 'Épico' then 1500 else null end
$$;

revoke all on function public._precio_trofeos(text) from public, anon;

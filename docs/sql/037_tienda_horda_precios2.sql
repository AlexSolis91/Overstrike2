-- Overstrike 2 · Paso 37: TIENDA DE LA HORDA — precios nuevos y sin reliquias Comunes.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 015.
-- Precios en Trofeos de Orco: Rara 80 · Especial 400 · Épica 1,500 (antes Común 15 · Rara 60 · Especial 300).
-- Las Comunes ya no se venden: _precio_trofeos devuelve null y tienda_horda_comprar las rechaza.

create or replace function public._precio_trofeos(p_rareza text)
returns integer language sql immutable set search_path = '' as $$
  select case p_rareza when 'Raro' then 80 when 'Especial' then 400 when 'Épico' then 1500 else null end
$$;

revoke all on function public._precio_trofeos(text) from public, anon;

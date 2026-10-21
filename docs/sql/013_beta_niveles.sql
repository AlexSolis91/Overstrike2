-- Overstrike 2 · Paso 13: NIVEL DE APARICIÓN NORMAL PARA TODOS (balance de la beta, 2026-10-21).
-- Todos los campeones quedaron cerca del 50% de victorias, así que ninguno necesita salir menos en los sobres.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar.
-- Lo mismo se puede hacer a mano en el panel de Administrador (Probabilidades). "Solo su sobre" no se toca.
update public.campeones set nivel = 'normal' where nivel <> 'normal';

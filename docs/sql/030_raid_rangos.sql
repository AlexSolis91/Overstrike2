-- Overstrike 2 · Paso 30: nuevos rangos de daño de los cofres del Jefe de Raid.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 001–029.
-- Calibrados con una cuenta avanzada (5 campeones con 5 estrellas y 6 espacios de reliquias): unos 110,000 de daño por llave en Fácil
-- y 80,000 en Normal, que con 3 llaves debe quedar en el cofre 2 de Difícil. El daño pedido sube con la dificultad.
-- El porcentaje de admin los sigue multiplicando: estos son los valores al 100%.
update public.raid_dificultades set rango1 =  15000, rango2 =  75000, rango3 = 150000, rango4 =  250000 where id = 'facil';
update public.raid_dificultades set rango1 =  30000, rango2 = 110000, rango3 = 225000, rango4 =  375000 where id = 'normal';
update public.raid_dificultades set rango1 =  60000, rango2 = 150000, rango3 = 300000, rango4 =  500000 where id = 'dificil';
update public.raid_dificultades set rango1 =  90000, rango2 = 225000, rango3 = 450000, rango4 =  750000 where id = 'brutal';
update public.raid_dificultades set rango1 = 120000, rango2 = 300000, rango3 = 600000, rango4 = 1000000 where id = 'pesadilla';

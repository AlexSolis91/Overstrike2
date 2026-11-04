// Edge Function "verificar-raid" (Supabase → Edge Functions → Deploy a new function → Via Editor → nombre: verificar-raid).
// Supabase no acepta imports desde github.io: el motor llega por jsDelivr, fijado a un commit. Al volver a publicarla, poner el commit nuevo en las 2 URLs.
// Repite un ataque al Jefe de Raid con el MISMO motor del juego y cuenta el daño que sale de esa repetición.
// Si el ataque se jugó con otra versión del juego (fichas distintas), acepta el daño reportado, igual que la Arena.
// Las llaves SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY las pone Supabase solo: no hay que escribir ninguna.
// Después de publicarla (y cada vez que cambien las fichas, volver a publicarla), encender en el SQL Editor:
//   update public.raid_config set verificar = true;
import { createClient } from 'npm:@supabase/supabase-js@2';
import { repetirRaid } from 'https://cdn.jsdelivr.net/gh/AlexSolis91/Overstrike2@86c3f5fffd43cbd170ee2a4e89fbc13ee443b168/prototipo/js/motor/verificar.js';
import { VERSION } from 'https://cdn.jsdelivr.net/gh/AlexSolis91/Overstrike2@86c3f5fffd43cbd170ee2a4e89fbc13ee443b168/prototipo/js/datos/cuenta.js';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { ataque } = await req.json();
    const url = Deno.env.get('SUPABASE_URL')!;
    const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user } } = await usuario.auth.getUser();
    if (!user) return json({ error: 'Inicia sesión primero' }, 401);
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: a } = await admin.from('raid_ataques').select('*').eq('id', ataque).single();
    if (!a || a.jugador !== user.id) return json({ error: 'No existe ese ataque' }, 404);
    if (a.estado !== 'pendiente') return json({ error: 'Ese ataque no espera verificación' }, 400);
    const r = a.version === VERSION ? repetirRaid(a) : { ok: true, dano: a.dano };
    const { data, error } = await admin.rpc('raid_resultado_verificado', { p_ataque: ataque, p_dano: r.ok ? r.dano : 0 });
    if (error) return json({ error: error.message }, 400);
    return json({ ...data, verificado: r.ok, motivo: r.motivo || '' });
  } catch (e) { return json({ error: String((e as Error)?.message || e) }, 500); }
});

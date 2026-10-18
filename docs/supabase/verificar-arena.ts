// Edge Function "verificar-arena" (Supabase → Edge Functions → Deploy a new function → Via Editor → nombre: verificar-arena).
// Repite una batalla de Arena contra una Defensa con el MISMO motor del juego (importado de GitHub Pages) y solo entonces paga.
// Si la batalla se jugó con otra versión del juego (fichas distintas), acepta el resultado tal cual.
// Las llaves SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY las pone Supabase solo: no hay que escribir ninguna.
// Después de publicarla (y cada vez que cambien las fichas de los campeones, volver a publicarla), encender en el SQL Editor:
//   update public.arena_config set verificar = true;
import { createClient } from 'npm:@supabase/supabase-js@2';
import { repetirCombate } from 'https://alexsolis91.github.io/Overstrike2/prototipo/js/motor/verificar.js';
import { VERSION } from 'https://alexsolis91.github.io/Overstrike2/prototipo/js/datos/cuenta.js';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { combate } = await req.json();
    const url = Deno.env.get('SUPABASE_URL')!;
    const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user } } = await usuario.auth.getUser();
    if (!user) return json({ error: 'Inicia sesión primero' }, 401);
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: c } = await admin.from('arena_combates').select('*').eq('id', combate).single();
    if (!c || c.atacante !== user.id) return json({ error: 'No existe ese combate' }, 404);
    if (c.terminado || c.verificado !== 'pendiente') return json({ error: 'Ese combate no espera verificación' }, 400);
    const r = c.version === VERSION ? repetirCombate(c) : { ok: true, motivo: 'otra versión' };
    const { data, error } = await admin.rpc('arena_resultado_verificado', { p_combate: combate, p_ok: r.ok });
    if (error) return json({ error: error.message }, 400);
    return json({ ...data, motivo: r.motivo || '' });
  } catch (e) { return json({ error: String((e as Error)?.message || e) }, 500); }
});

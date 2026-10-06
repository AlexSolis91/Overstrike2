// Conexión con el servidor (Supabase): cuentas y base de datos.
// La llave "publishable" es PÚBLICA a propósito (va en la página); la seguridad la dan los permisos de la base de datos.
// Nunca poner aquí la llave secreta ni la contraseña de la base de datos.
export const SUPABASE_URL = 'https://udjvwyzixqdghahinxqr.supabase.co';
export const SUPABASE_LLAVE = 'sb_publishable_5Czdnzcl7pF90Y9cfZmAuA_36y4-0ml';

// La librería se carga solo cuando hace falta: si no hay internet, el juego sigue funcionando sin cuentas.
let cliente = null;
export async function supabase() {
  if (!cliente) {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    cliente = createClient(SUPABASE_URL, SUPABASE_LLAVE, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return cliente;
}

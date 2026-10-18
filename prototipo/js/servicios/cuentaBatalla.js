// Lleva a la batalla lo que el jugador tiene en su cuenta: estrellas de cada campeón y reliquias equipadas.
// Sin sesión (o sin servidor) los campeones pelean con el equipo de su ficha, como antes.
import * as D from './datos.js';
import { perfilActual } from '../ui/cuenta.js';
import { instancia } from '../datos/reliquias.js';

// Lee la cuenta una vez por batalla (siempre al día con lo que se equipó en Colección)
export async function cargarCuenta() {
  if (!perfilActual()) return null;                 // sin sesión: equipo de la ficha
  try {
    const [col, filas] = await Promise.all([D.miColeccion(), D.misReliquias().catch(() => null)]);
    const equipo = {};
    for (const f of filas || []) if (f.campeon && f.espacio) (equipo[f.campeon] ||= {})[f.espacio] = instancia(f);
    return { col: new Map((col || []).map(r => [r.campeon, r])), equipo, reliquias: !!filas };
  } catch { return null; }
}

// Lo puro (sin DOM) vive en datos/cuenta.js para que el servidor lo pueda usar al verificar batallas
export { cuentaDesdeServidor, conCuenta } from '../datos/cuenta.js';

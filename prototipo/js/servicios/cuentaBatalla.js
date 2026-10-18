// Lleva a la batalla lo que el jugador tiene en su cuenta: estrellas de cada campeón y reliquias equipadas.
// Sin sesión (o sin servidor) los campeones pelean con el equipo de su ficha, como antes.
import * as D from './datos.js';
import { perfilActual } from '../ui/cuenta.js';
import { instancia, espaciosDeCuenta } from '../datos/reliquias.js';

const abiertosDe = r => r?.espacios_abiertos?.length || !r?.espacios ? (r?.espacios_abiertos || []) : ['arma2', 'equip2', 'acc2'].slice(0, r.espacios);

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

// Ficha lista para la batalla: estrellas y reliquias de la cuenta (un campeón que no tienes pelea con 0★ y sin reliquias)
export function conCuenta(def, cuenta) {
  if (!cuenta) return def;
  const r = cuenta.col.get(def.id);
  const out = { ...def, estrellas: r?.estrellas || 0 };
  if (cuenta.reliquias) out.slots = espaciosDeCuenta(cuenta.equipo[def.id] || {}, abiertosDe(r));
  return out;
}

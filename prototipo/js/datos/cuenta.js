// Armar fichas de batalla con datos de una cuenta (estrellas y reliquias equipadas). Sin DOM: lo usan el juego y el servidor
// (la verificación de batallas de la Arena repite la batalla con estas mismas funciones).
import { instancia, espaciosDeCuenta, RELIQUIAS } from './reliquias.js';
import { OFICIALES } from './personajes/index.js';

export const abiertosDe = r => r?.espacios_abiertos?.length || !r?.espacios ? (r?.espacios_abiertos || []) : ['arma2', 'equip2', 'acc2'].slice(0, r.espacios);

// Datos de batalla de un equipo que manda el servidor: { col: [{campeon, estrellas, espacios, espacios_abiertos}], reliquias: [filas] }
export function cuentaDesdeServidor(j) {
  const equipo = {};
  for (const f of j?.reliquias || []) if (f.campeon && f.espacio) (equipo[f.campeon] ||= {})[f.espacio] = instancia(f);
  return { col: new Map((j?.col || []).map(r => [r.campeon, r])), equipo, reliquias: true };
}

// Ficha lista para la batalla: estrellas y reliquias de la cuenta (un campeón que no tienes pelea con 0★ y sin reliquias)
export function conCuenta(def, cuenta) {
  if (!cuenta) return def;
  const r = cuenta.col.get(def.id);
  const out = { ...def, estrellas: r?.estrellas || 0 };
  if (cuenta.reliquias) out.slots = espaciosDeCuenta(cuenta.equipo[def.id] || {}, abiertosDe(r));
  return out;
}

// Versión del juego (huella de las fichas y reliquias): en vivo solo se emparejan jugadores con la misma, y el servidor
// solo verifica batallas jugadas con la versión que conoce
export const VERSION = (() => {
  const t = JSON.stringify([OFICIALES.map(p => [p.id, p.base, p.extra, p.movimientos, p.pasiva, p.lider]), Object.keys(RELIQUIAS)]);
  let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return String(h >>> 0);
})();

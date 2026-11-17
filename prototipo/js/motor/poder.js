// Poder de un equipo (Arena: perfil, búsqueda y placas en batalla). Sin DOM: también lo usará el servidor.
// Se calcula con las estadísticas FINALES de cada campeón (base de su ficha + estrellas + reliquias equipadas), sin buffs ni
// habilidad de líder, para que solo suba con lo que el jugador mejora:
//   Poder = HP × 0.5 + Daño × 4 + Velocidad × 2 + 400 × (lo que sus estadísticas secundarias pasan de la base común)
// Ejemplo: 10% de Crítico extra suma 40. El poder del equipo es la suma de sus 5 campeones.
import { crearCombate } from './combate.js';
import { BASE_COMUN } from './reglas.js';
import { porId } from '../datos/personajes/index.js';
import { cuentaDesdeServidor, conCuenta } from '../datos/cuenta.js';

export const PESOS_PODER = { hp: .5, dmg: 4, spd: 2, secundaria: 400 };

export function poderDeStats(s) {
  let sec = 0;
  for (const [k, v] of Object.entries(s)) {
    if (k === 'hp' || k === 'dmg' || k === 'spd' || typeof v !== 'number') continue;
    sec += Math.max(0, v - (BASE_COMUN[k] || 0));
  }
  return s.hp * PESOS_PODER.hp + s.dmg * PESOS_PODER.dmg + s.spd * PESOS_PODER.spd + sec * PESOS_PODER.secundaria;
}

// ids: campeones del equipo · equipo: datos de batalla del servidor ({ col, reliquias }) o una cuenta ya armada; null = 0★ sin reliquias
export function poderEquipo(ids, equipo = null) {
  const defs = (ids || []).map(porId).filter(Boolean);
  if (!defs.length) return 0;
  const cuenta = !equipo ? null : equipo.col instanceof Map ? equipo : cuentaDesdeServidor(equipo);
  const fichas = defs.map(d => conCuenta({ ...d, lider: null }, cuenta));      // sin líder: el Poder no depende del orden
  const c = crearCombate({ equipoJugador: fichas, equipoRival: [defs[0]], semilla: 1 });
  const capas = { estrellas: true, reliquias: true };
  return Math.round(c.personajes.filter(p => p.lado === 'jugador').reduce((t, p) => t + poderDeStats(c.stats(p, capas)), 0));
}

export const formatoPoder = n => `⚡ ${Number(n || 0).toLocaleString('es-MX')}`;

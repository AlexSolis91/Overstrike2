// Auto-batalla de Arena en el servidor (sin DOM): juega un combate registrado con la IA en los dos lados, con la misma
// semilla y los mismos datos de cuenta que una batalla normal. La Defensa decide con el azar de semilla de siempre
// (semillaIA), así que el resultado se puede verificar y repetir como cualquier otro (repetirCombate).
import { crearCombate } from './combate.js';
import { elegirIA } from './ia.js';
import { crearRng } from './rng.js';
import { semillaIA } from './verificar.js';
import { porId } from '../datos/personajes/index.js';
import { cuentaDesdeServidor, conCuenta } from '../datos/cuenta.js';

export const semillaAtaqueIA = semilla => (semilla ^ 0x2f6b1c3d) >>> 0;

// c: fila de arena_combates (ataque, defensa, semilla, equipo_atk, equipo_def). Devuelve { gano, decisiones, rondas } o null
// si algún campeón no existe en esta versión del juego.
export function jugarCombateIA(c, maxTurnos = 3000) {
  const atk = c.ataque.map(porId), def = c.defensa.map(porId);
  if (atk.some(x => !x) || def.some(x => !x)) return null;
  const cuentaA = cuentaDesdeServidor(c.equipo_atk), cuentaD = c.equipo_def ? cuentaDesdeServidor(c.equipo_def) : null;
  const combate = crearCombate({ equipoJugador: atk.map(d => conCuenta(d, cuentaA)), equipoRival: cuentaD ? def.map(d => conCuenta(d, cuentaD)) : def, semilla: c.semilla });
  const rndA = crearRng(semillaAtaqueIA(c.semilla)), rndD = crearRng(semillaIA(c.semilla));
  const decisiones = [];
  let r = combate.iniciar(), q = 0;
  while (!r.fin && r.esperando && q++ < maxTurnos) {
    const actor = combate.personajes.find(p => p.uid === r.esperando.id);
    const d = elegirIA(combate, actor.lado === 'rival' ? rndD : rndA);
    decisiones.push({ c: d.categoria, o: d.objetivo || null });
    r = combate.actuar(d);
  }
  return { gano: r.fin?.ganador === 'jugador' && !r.fin?.limite, decisiones, rondas: combate.ronda };
}

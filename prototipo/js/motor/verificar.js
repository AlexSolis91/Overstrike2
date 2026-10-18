// Verificación de batallas de la Arena (sin DOM): repite la batalla con la misma semilla y las decisiones del jugador.
// La Defensa la juega la IA con un azar con semilla (semillaIA), así que sus decisiones también se comprueban: deben ser
// exactamente las que la IA habría tomado. Lo usa la Edge Function "verificar-arena" (docs/supabase/verificar-arena.ts).
import { crearCombate } from './combate.js';
import { elegirIA } from './ia.js';
import { crearRng } from './rng.js';
import { porId } from '../datos/personajes/index.js';
import { cuentaDesdeServidor, conCuenta } from '../datos/cuenta.js';

export const semillaIA = semilla => (semilla ^ 0x5bd1e995) >>> 0;

// combate: fila de arena_combates (ataque, defensa, semilla, equipo_atk, equipo_def, decisiones, gano)
// Devuelve { ok, ganador, motivo }
export function repetirCombate(c) {
  try {
    const atk = c.ataque.map(porId), def = c.defensa.map(porId);
    if (atk.some(x => !x) || def.some(x => !x)) return { ok: false, motivo: 'Campeón desconocido' };
    const cuentaA = cuentaDesdeServidor(c.equipo_atk), cuentaD = c.equipo_def ? cuentaDesdeServidor(c.equipo_def) : null;
    const combate = crearCombate({ equipoJugador: atk.map(d => conCuenta(d, cuentaA)), equipoRival: cuentaD ? def.map(d => conCuenta(d, cuentaD)) : def, semilla: c.semilla });
    const rnd = crearRng(semillaIA(c.semilla));
    let r = combate.iniciar(), i = 0;
    const lista = c.decisiones || [];
    while (!r.fin && r.esperando) {
      const d = lista[i++];
      if (!d) return { ok: false, motivo: 'Faltan decisiones' };
      const actor = combate.personajes.find(p => p.uid === r.esperando.id);
      if (actor.lado === 'rival') {                       // la Defensa (IA): debe coincidir con lo que la IA decide
        const ia = elegirIA(combate, rnd);
        if (ia.categoria !== d.c || (ia.objetivo || null) !== (d.o || null)) return { ok: false, motivo: `Decisión de la Defensa alterada (turno ${i})` };
      }
      r = combate.actuar({ categoria: d.c, objetivo: d.o || null });
    }
    const gano = r.fin?.ganador === 'jugador' && !r.fin?.limite;
    return { ok: gano === !!c.gano, ganador: r.fin?.ganador, limite: !!r.fin?.limite, motivo: gano === !!c.gano ? '' : 'El resultado no coincide' };
  } catch (e) { return { ok: false, motivo: String(e?.message || e) }; }
}

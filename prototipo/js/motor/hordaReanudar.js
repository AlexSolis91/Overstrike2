// Continuar una partida de Horda (sin DOM): misma semilla + mismas oleadas + mismas decisiones = mismo combate, turno por turno.
// Guardado: { partida, horda, semilla, equipo: [ids], cuenta: { col, reliquias }, olas: [[ids]], dec: [[[categoría, objetivo]]],
// marcas: { oleada: huella }, botin, botinHasta }
import { crearCombate } from './combate.js';
import { porId } from '../datos/personajes/index.js';
import { cuentaDesdeServidor, conCuenta } from '../datos/cuenta.js';
import { HORDAS, oleada, defsOleada } from '../datos/horda/horda.js';

// Huella del combate al terminar una oleada: si al repetirla no coincide, el juego cambió y la partida ya no se puede reconstruir
export function huellaCombate(c) {
  const t = JSON.stringify(c.personajes.map(p => [p.uid, Math.round(p.hp), !!p.muerto]));
  let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return h >>> 0;
}

// La oleada n tal como salió en esta partida (el azar solo decide los enemigos, que están guardados)
export function oleadaGuardada(g, n) {
  return { ...oleada(n, HORDAS[g.horda]), enemigos: g.olas[n - 1] };
}
export const defsGuardadas = (g, n) => defsOleada(oleadaGuardada(g, n), HORDAS[g.horda]);

export const totalDecisiones = g => (g?.dec || []).reduce((s, d) => s + d.length, 0);

// Reconstruye el combate sin animaciones. Lanza un error si la partida ya no coincide con el juego actual.
export function repetirHorda(g) {
  const cuenta = cuentaDesdeServidor(g.cuenta);
  const equipo = g.equipo.map(id => { const d = porId(id); if (!d) throw new Error(`Campeón desconocido: ${id}`); return conCuenta(d, cuenta); });
  const combate = crearCombate({ equipoJugador: equipo, equipoRival: defsGuardadas(g, 1), rival: oleadaGuardada(g, 1).opciones, semilla: g.semilla });
  let r = combate.iniciar(), orden = null, ronda = null;
  const leer = () => { for (const e of r.eventos) { if (e.orden) orden = e.orden; if (e.t === 'ronda') ronda = e.n; } };
  leer();
  g.olas.forEach((_, i) => {
    if (i) {
      if (r.fin?.ganador !== 'jugador') throw new Error(`La oleada ${i} no terminó igual`);
      r = combate.siguienteOleada(defsGuardadas(g, i + 1), oleadaGuardada(g, i + 1).opciones); leer();
    }
    for (const [categoria, objetivo] of g.dec[i] || []) {
      if (r.fin || !r.esperando) throw new Error(`La oleada ${i + 1} no terminó igual`);
      r = combate.actuar({ categoria, objetivo }); leer();
    }
    const marca = g.marcas?.[i + 1];
    if (marca != null && huellaCombate(combate) !== marca) throw new Error(`La oleada ${i + 1} no terminó igual`);
  });
  return { combate, r, orden, ronda };
}

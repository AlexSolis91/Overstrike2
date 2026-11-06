// Ayudas para las pruebas del motor (node --test prototipo/pruebas/)
import { crearCombate } from '../js/motor/combate.js';
import { elegirIA } from '../js/motor/ia.js';
import { porId } from '../js/datos/personajes/index.js';

export { crearCombate, elegirIA, porId };

// Azar con semilla (el mismo que usan las simulaciones)
export function azar(semilla = 1) {
  let s = semilla;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

// Combate ya iniciado. jugador/rival: ids o fichas
export function combate(jugador, rival, opciones = {}) {
  const ficha = x => typeof x === 'string' ? porId(x) : x;
  const c = crearCombate({ equipoJugador: jugador.map(ficha), equipoRival: rival.map(ficha), semilla: opciones.semilla ?? 3, ...opciones });
  c.iniciar();
  return c;
}

export const rivalDe = c => c.personajes.find(p => p.lado === 'rival');
export const estado = (p, id) => p.estados.find(e => e.id === id);

// Juega con la IA hasta que se cumpla `hasta(c, r)` o termine la partida
export function jugar(c, hasta = () => false, semilla = 1, max = 5000) {
  const rnd = azar(semilla);
  let r = { esperando: true }, q = 0;
  while (!r.fin && q++ < max) {
    r = c.actuar(elegirIA(c, rnd));
    if (hasta(c, r)) break;
  }
  return r;
}

export const EQUIPO = ['naruto', 'shaka', 'thor', 'kratos', 'batman'];

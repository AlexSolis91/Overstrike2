import { espacios } from '../reliquias.js';

// Ficha oficial #18 (revisada el 2026-10-07). Daño de hielo: no congela por sí misma; castiga a los enemigos que sus
// aliados congelan, acumulando crítico, y su Over protege al equipo con Aura Gélida.
export default {
  id: 'jaina-proudmoore',
  nombre: 'Jaina Proudmoore',
  rol: 'Daño',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🧙‍♀️', color: '#818cf8', imagen: 'assets/personajes/jaina-proudmoore.webp',
  base: { hp: 600, dmg: 90, spd: 80 },
  extra: {},
  slots: espacios('argonita', 'yelmo', 'anilloCobre'),

  pasiva: {
    nombre: 'Archimaga del Kirin Tor',
    desc: 'Cada vez que Jaina golpea a un enemigo con Congelación gana +5% de Prob. Crítico y +5% de Daño Crítico (+10% si es Mega Congelación) durante toda la partida, hasta +50% cada uno. Cuenta aunque el hielo ya esté roto.',
    acumulaCriticoContra: { efecto: 'freeze', valor: .05, valorMega: .10, tope: .50 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Descarga de Escarcha', objetivo: 'enemigo', estilo: 'ranged', color: 0xa5b4fc, elemento: 'hielo',
      pct: 1.10, escala: 'dano', cd: 0,
      desc: 'Causa 110%. 20% de probabilidad de golpear también (110%) a otro enemigo con Congelación.',
      golpeExtraContra: { efecto: 'freeze', prob: .20 },
    },
    {
      categoria: 'especial', nombre: 'Anillo de Hielo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x7dd3fc, elemento: 'hielo',
      pct: .90, escala: 'dano', cd: 3,
      desc: 'Causa 90% a todos los enemigos. Si rompe al menos una capa de Mega Congelación, lanza 2 Descargas de Escarcha a 2 enemigos al azar (una vez por uso).',
      efectos: [{ cuando: 'final', condicion: { rompioMega: true }, accion: { tipo: 'usarMovimiento', categoria: 'basico', despues: true, a: { distintos: 2 } } }],
    },
    {
      categoria: 'over', nombre: 'Invierno sin Remordimientos', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0e7ff, elemento: 'hielo',
      pct: 1.50, escala: 'dano', cd: 4,
      desc: 'Causa 150% a todos los enemigos. Si golpea a alguno con Congelación, 3 aliados al azar ganan Aura Gélida (2 rondas): −20% de daño de golpes y 50% de Congelar a quien los golpee.',
      efectos: [{ cuando: 'final', condicion: { algunGolpeadoTenia: 'freeze' }, accion: { tipo: 'efecto', id: 'frostAura', dur: 2, a: { aliadosDistintos: 3 } } }],
    },
  ],
};

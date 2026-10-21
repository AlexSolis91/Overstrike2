import { espacios } from '../reliquias.js';

// Ficha oficial #56 (2026-10-19, diseño "a tu criterio"). Rakan, el Monarca de los Colmillos y Rey de las Bestias
// (Solo Leveling): el depredador más veloz entre los Monarcas. Desgarra con garras y colmillos (Sangrado) y cada presa que
// sangra le entrega su velocidad. Su aullido desata a la manada. Habilidad de líder: es el rey de las bestias.
export default {
  id: 'rakan',
  franquicia: 'Solo Leveling', grupos: ['monarcas'],   // campaña: Los Monarcas
  nombre: 'Rakan',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🐺', color: '#b91c1c', imagen: 'assets/personajes/rakan.webp',
  base: { hp: 650, dmg: 60, spd: 89 },
  extra: { critRate: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de las Bestias',
    desc: 'Todos los aliados tienen +8% de Velocidad y +8% de Prob. Crítico.',
    bonoStat: { spdPct: .08, critRate: .08 },
  },
  pasiva: {
    nombre: 'Monarca de los Colmillos',
    desc: 'Depredador: cada vez que golpea a un enemigo con Sangrado (1 vez por movimiento) le roba 4% de Velocidad para siempre (tope total 40%). Hace +10% de daño a enemigos con Sangrado.',
    gatillo: 'alGolpear', filtro: { objetivoTiene: 'bleed' }, unaVezPorMovimiento: true,
    accion: { tipo: 'robarVelocidad', pct: .04, tope: .40, a: 'objetivo' },
    bonoContra: { efecto: 'bleed', pct: .10 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Colmillos del Rey Bestia', objetivo: 'enemigo', estilo: 'melee', color: 0xdc2626,
      pct: .45, escala: 'dano', cd: 0, golpes: 2,
      desc: '2 mordidas de 45%, cada una con 30% de probabilidad de Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Aullido de la Manada', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf59e0b,
      pct: .55, escala: 'dano', cd: 3,
      desc: 'Su aullido convoca a la manada: 55% a todos los enemigos con 45% de probabilidad de Sangrado. Todos los aliados ganan Furia (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'bleed', prob: .45 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Garras del Monarca de los Colmillos', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: .35, escala: 'dano', cd: 5, golpes: 5,
      desc: 'Una ráfaga de zarpazos a velocidad imposible: 5 golpes de 35% al mismo enemigo, cada uno con 40% de probabilidad de Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .40 } }],
    },
  ],
};

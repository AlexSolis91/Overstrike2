import { espacios } from '../reliquias.js';

// Ficha oficial #47 (2026-10-18, diseño "a tu criterio"). Gohan: el guerrero que pelea por proteger. Escuda y libera a su
// equipo y aturde a los enemigos. Cada vez que protege acumula Potencial; si cae un aliado, su poder oculto estalla
// (como con Piccolo en Super Hero) y despierta para siempre como Gohan Bestia. Sin habilidad de líder.

const gohanBestia = {
  nombre: 'Gohan Bestia',
  emoji: '🐺', color: '#c4b5fd', imagen: 'assets/transformaciones/gohan-bestia.webp',
  base: { hp: 670, dmg: 63, spd: 96 },
  extra: { acc: .20 },
  pasiva: {
    nombre: 'Instinto de Bestia',
    desc: 'Cada vez que cae un aliado, todos los aliados se curan 10% de su HP máx. y ganan Furia (2 rondas).',
    gatillo: 'alMorirAliado',
    accion: { tipo: 'multiple', a: 'todosAliados', acciones: [{ tipo: 'curar', pct: .10, base: 'hpMaxObjetivo' }, { tipo: 'efecto', id: 'dmgUp', dur: 2 }] },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño Bestial', objetivo: 'enemigo', estilo: 'melee', color: 0xc4b5fd,
      pct: .65, escala: 'dano', cd: 0, golpes: 2,
      desc: '2 golpes de 65%, cada uno con 30% de probabilidad de Aturdir.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Furia Protectora', objetivo: 'todosAliados', estilo: 'support', color: 0xa78bfa, cd: 3,
      desc: 'Todos los aliados ganan un Escudo del 50% del HP máx. de Gohan (2 rondas) y Furia (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Cañón Especial Bestia', objetivo: 'enemigo', estilo: 'ranged', color: 0xe9d5ff,
      pct: 2.00, escala: 'dano', cd: 5,
      desc: 'Un rayo que lo atraviesa todo: 200% con 40% de probabilidad de Mega Aturdimiento.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .40 } }],
    },
  ],
};

export default {
  id: 'gohan',
  franquicia: 'Dragon Ball', grupos: ['sayajin', 'guerreros-z'],   // campaña: Guerreros Sayajin
  nombre: 'Gohan',
  rol: 'Support', rolSecundario: 'Control',
  sobres: [],  // como Goku, Vegeta y Broly: solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '🥋', color: '#7c3aed', imagen: 'assets/personajes/gohan.webp',
  base: { hp: 620, dmg: 55, spd: 98 },
  extra: { acc: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Poder Oculto',
    desc: 'Cada vez que protege a su equipo gana 1 de Potencial 🔥 (máx. 3). Si cae un aliado, su poder estalla: gana 3. Con 3 despierta para siempre como Gohan Bestia.',
    gatillo: 'alMorirAliado',
    accion: { tipo: 'ganarCargas', cantidad: 3, max: 3, efecto: 'potencialGohan', a: 'propio' },
    transformarConCargas: { efecto: 'potencialGohan', cargas: 3 },
  },
  transformacion: gohanBestia,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Masenko', objetivo: 'enemigo', estilo: 'ranged', color: 0xfacc15,
      pct: .95, escala: 'dano', cd: 0,
      desc: 'Causa 95% con 25% de probabilidad de Aturdir.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Escudo del Maestro', objetivo: 'todosAliados', estilo: 'support', color: 0x8b5cf6, cd: 3,
      desc: 'Todos los aliados ganan un Escudo del 50% del HP máx. de Gohan (2 rondas) y se les quita el Control. Gana 1 de Potencial.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'limpiar', etiqueta: 'Control', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 1, max: 3, efecto: 'potencialGohan', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Kamehameha Padre e Hijo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x60a5fa,
      pct: 1.35, escala: 'dano', cd: 5,
      desc: 'Causa 135% a todos los enemigos con 35% de probabilidad de Aturdir. Gana 1 de Potencial.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'stun', prob: .35 } },
        { cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 1, max: 3, efecto: 'potencialGohan', a: 'propio' } },
      ],
    },
  ],
};

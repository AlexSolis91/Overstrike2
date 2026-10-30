import { espacios } from '../reliquias.js';

// Ficha oficial #48 (2026-10-18, diseño "a tu criterio"). Trunks del Futuro: el espadachín que viajó en el tiempo para
// cambiar un futuro sin esperanza. No aplica DoTs: castiga a los enemigos que ya los tienen (todo su equipo hace más daño
// contra ellos) y cada Daño en el tiempo de sus aliados le da Esperanza. También se alimenta de las transformaciones de su
// equipo. Con 5 de Esperanza se transforma para siempre en Super Saiyajin. Sin habilidad de líder.
const DOTS = ['burn', 'poison', 'bleed', 'hemo'];

const trunksSuperSaiyajin = {
  nombre: 'Trunks Super Saiyajin',
  emoji: '⚔️', color: '#facc15', imagen: 'assets/transformaciones/trunks-super-sayajin.webp',
  base: { hp: 740, dmg: 76, spd: 118 },
  extra: { critRate: .10 },
  pasiva: {
    nombre: 'Esperanza del Futuro',
    desc: 'Todo su equipo hace +40% de daño a enemigos con Quemadura, Veneno, Sangrado o Hemorragia, y los DoT de su equipo hacen +30% de daño. Cuando un aliado se transforma, ese aliado gana Furia y Celeridad (2 rondas).',
    auraContra: { efecto: DOTS, pct: .40 },
    auraDoT: .30,
    alTransformarseAliado: { tipo: 'multiple', a: 'objetivo', acciones: [{ tipo: 'efecto', id: 'dmgUp', dur: 2 }, { tipo: 'efecto', id: 'haste', dur: 2 }] },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Espada del Futuro', objetivo: 'enemigo', estilo: 'melee', color: 0xfde047,
      pct: .65, escala: 'dano', cd: 0, golpes: 2, bonoPorDebuffs: { pct: .15 },
      desc: '2 cortes de 65%, +15% por cada tipo distinto de debuff del objetivo.',
    },
    {
      categoria: 'especial', nombre: 'Masenko Ha', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: 1.10, escala: 'dano', cd: 3, bonoPorDebuffs: { pct: .20 },
      desc: '110% a todos los enemigos, +20% contra cada uno por tipo distinto de debuff. Todos los aliados ganan Furia (2 rondas).',
      efectos: [{ cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } }],
    },
    {
      categoria: 'over', nombre: 'Shining Sword Attack', objetivo: 'enemigo', estilo: 'melee', color: 0xfef08a,
      pct: 2.40, escala: 'dano', cd: 5, bonoPorDebuffs: { pct: .25 },
      desc: 'Lo corta en pedazos y lo remata con una ráfaga: 240%, +25% por cada tipo distinto de debuff del objetivo.',
    },
  ],
};

export default {
  id: 'trunks',
  franquicia: 'Dragon Ball', grupos: ['sayajin', 'guerreros-z'],   // campaña: Guerreros Sayajin
  nombre: 'Trunks',
  rol: 'Daño', rolSecundario: 'Support',
  sobres: [],  // como los demás Sayajin: solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '🗡️', color: '#8b5cf6', imagen: 'assets/personajes/trunks.webp',
  base: { hp: 680, dmg: 68, spd: 112 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Guerrero del Futuro',
    desc: 'Todo su equipo hace +30% de daño a enemigos con Quemadura, Veneno, Sangrado o Hemorragia, y los DoT de su equipo hacen +15% de daño. Cada vez que un DoT hace daño a un enemigo gana 1 de Esperanza ✨ (máx. 2 por ronda); cuando un aliado se transforma gana 2 y ese aliado gana Furia y Celeridad (2 rondas). Con 5 se transforma para siempre en Super Saiyajin.',
    auraContra: { efecto: DOTS, pct: .30 },
    auraDoT: .15,
    gatillo: 'alDanoDoT', filtro: { en: 'enemigos' }, maxPorRonda: 2,
    accion: { tipo: 'ganarCargas', cantidad: 1, max: 5, efecto: 'esperanzaTrunks', a: 'propio' },
    alTransformarseAliado: [{ tipo: 'ganarCargas', cantidad: 2, max: 5, efecto: 'esperanzaTrunks', a: 'propio' },
      { tipo: 'multiple', a: 'objetivo', acciones: [{ tipo: 'efecto', id: 'dmgUp', dur: 2 }, { tipo: 'efecto', id: 'haste', dur: 2 }] }],
    transformarConCargas: { efecto: 'esperanzaTrunks', cargas: 5 },
  },
  transformacion: trunksSuperSaiyajin,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Corte del Futuro', objetivo: 'enemigo', estilo: 'melee', color: 0xa78bfa,
      pct: 1.10, escala: 'dano', cd: 0, bonoPorDebuffs: { pct: .15 },
      desc: 'Causa 110%, +15% por cada tipo distinto de debuff del objetivo.',
    },
    {
      categoria: 'especial', nombre: 'Burning Attack', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: .90, escala: 'dano', cd: 3, bonoPorDebuffs: { pct: .15 },
      desc: '90% a todos los enemigos, +15% contra cada uno por tipo distinto de debuff. Gana 1 de Esperanza.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 1, max: 5, efecto: 'esperanzaTrunks', a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Heat Dome Attack', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde68a,
      pct: 2.00, escala: 'dano', cd: 5, bonoPorDebuffs: { pct: .20 },
      desc: '200%, +20% por cada tipo distinto de debuff del objetivo. Gana 2 de Esperanza.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ganarCargas', cantidad: 2, max: 5, efecto: 'esperanzaTrunks', a: 'propio' } }],
    },
  ],
};

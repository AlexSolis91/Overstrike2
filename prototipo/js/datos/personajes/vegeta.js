import { espacios } from '../reliquias.js';

// Ficha oficial #21 (2026-10-07, ajustada tras la simulación: ~50% de victorias, como Goku).
// Daño que se buffea a sí mismo, sin turnos extra. Mecánica única: Rivalidad
// (marca a un Rival —Goku si está— y le hace más daño) y Orgullo Sayajin (cargas que lo transforman en Super Sayajin
// y alimentan Final Flash). Una sola transformación permanente, automática (no usa el Over).

const vegetaSuperSayajin = {
  nombre: 'Vegeta Super Sayajin',
  emoji: '⚡', color: '#facc15', imagen: 'assets/transformaciones/vegeta-super-sayajin.webp',
  base: { hp: 680, dmg: 100, spd: 96 },
  extra: { critRate: .10, armor: .10 },
  pasiva: {
    nombre: 'Orgullo del Super Sayajin',
    desc: 'Rivalidad: +40% de daño a su Rival 👑. Gana 1 Orgullo cuando su Rival usa un movimiento, cuando Vegeta hace un crítico y cuando recibe un golpe crítico (máx. 5). Si su Rival muere, +10% de Daño permanente y elige un nuevo Rival.',
    rival: { bono: .40, max: 5, orgulloAlCritico: true, orgulloAlRecibirCritico: true, alMorirRival: .10 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Big Bang Attack', objetivo: 'enemigo', estilo: 'ranged', color: 0x93c5fd,
      pct: 1.10, escala: 'dano', cd: 0,
      desc: 'Causa 110%.',
    },
    {
      categoria: 'especial', nombre: 'Poder Majin', objetivo: 'enemigo', estilo: 'melee', color: 0xfacc15,
      pct: 1.80, escala: 'dano', cd: 3,
      desc: 'Causa 180% y Vegeta gana Furia (+50% de daño) y Letalidad (+30% de Daño Crítico) por 2 rondas.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'bloodlust', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Final Flash', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde047,
      pct: 2.80, escala: 'dano', cd: 4,
      desc: 'Causa 280% y consume todo su Orgullo: +15% de daño por cada uno (hasta +75%).',
      consumeCargas: { pct: .15, efecto: 'orgullo' },
    },
  ],
};

export default {
  id: 'vegeta',
  nombre: 'Vegeta',
  rol: 'Daño', rolSecundario: '',
  sobres: [],  // solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '👑', color: '#2563eb', imagen: 'assets/personajes/vegeta.webp',
  base: { hp: 640, dmg: 88, spd: 94 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Príncipe de los Sayajin',
    desc: 'Rivalidad: al empezar marca como Rival 👑 a Goku (si está en el equipo enemigo) o al enemigo con más Daño, y le hace +30% de daño. Gana 1 Orgullo cuando su Rival usa un movimiento y cuando hace un crítico (máx. 5). Con 3 Orgullo, o con menos de 50% de HP, se transforma en Vegeta Super Sayajin y gana Furia y Frenesí (2 rondas). Si su Rival muere, +10% de Daño permanente y elige un nuevo Rival.',
    rival: { bono: .30, max: 5, orgulloAlCritico: true, alMorirRival: .10, transformar: { cargas: 3, hp: .50 } },
    gatillo: 'alTransformarse',                 // al transformarse: Furia + Frenesí (sin turno extra, a diferencia de Goku)
    accion: { tipo: 'multiple', a: 'propio', acciones: [{ tipo: 'efecto', id: 'dmgUp', dur: 2 }, { tipo: 'efecto', id: 'frenzy', dur: 2 }] },
  },
  transformacion: vegetaSuperSayajin,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Galick Gun', objetivo: 'enemigo', estilo: 'ranged', color: 0xa855f7,
      pct: 1.00, escala: 'dano', cd: 0,
      desc: 'Causa 100%.',
    },
    {
      categoria: 'especial', nombre: 'Big Bang Attack', objetivo: 'enemigo', estilo: 'ranged', color: 0x93c5fd,
      pct: 1.60, escala: 'dano', cd: 2,
      desc: 'Causa 160% y Vegeta gana Frenesí (+50% de Prob. Crítico) por 2 rondas.',
      efectos: [{ cuando: 'final', accion: { tipo: 'efecto', id: 'frenzy', dur: 2, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Final Flash', objetivo: 'enemigo', estilo: 'ranged', color: 0xfde047,
      pct: 2.40, escala: 'dano', cd: 5,
      desc: 'Causa 240% y consume todo su Orgullo: +15% de daño por cada uno (hasta +75%).',
      consumeCargas: { pct: .15, efecto: 'orgullo' },
    },
  ],
};

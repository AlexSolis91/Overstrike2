import { espacios } from '../reliquias.js';

// Ficha oficial #26 (2026-10-08, ajustada tras la simulación: ~63% de victorias, objetivo 60–65%).
// Tanque protector: recibe en su lugar parte del daño de los golpes a sus aliados,
// acumula Poder de Grayskull y lo descarga en su Over. Líder: Defensores de Grayskull.
export default {
  id: 'he-man',
  nombre: 'He-Man',
  rol: 'Tanque', rolSecundario: 'Daño',
  sobres: [],  // solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '⚔️', color: '#f59e0b', imagen: 'assets/personajes/he-man.webp',
  base: { hp: 850, dmg: 70, spd: 82 },
  extra: { armor: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Defensores de Grayskull',
    desc: 'Todos los aliados tienen +15% de HP máx. y +15% de Resistencia.',
    bonoStat: { hpPct: .15, res: .15 },
  },
  pasiva: {
    nombre: 'Protector de Eternia',
    desc: 'Mientras no tenga un Control que le quite el turno, He-Man recibe en su lugar el 25% del daño de cada golpe a sus aliados (con su propia Armadura). Cada vez que protege gana 1 de Poder de Grayskull ⚡ (máx. 5).',
    protector: { pct: .25, cargas: { efecto: 'grayskull', max: 5 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Espada del Poder', objetivo: 'enemigo', estilo: 'melee', color: 0x93c5fd,
      pct: 1.00, escala: 'dano', cd: 0,
      desc: 'Causa 100% y He-Man gana 1 de Poder de Grayskull.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ganarCargas', efecto: 'grayskull', max: 5, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: '¡Por el Poder de Grayskull!', objetivo: 'enemigo', estilo: 'melee', color: 0xfacc15, cd: 3,
      pct: 1.20, escala: 'dano',
      desc: 'Causa 120%. He-Man gana Furia (+50% de daño) y Protección (+30% de Resistencia) por 2 rondas, y todos sus aliados ganan un Escudo del 20% del HP máx. de He-Man.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'protect', dur: 2, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: .20, escala: 'hpMax', a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Golpe de Grayskull', objetivo: 'enemigo', estilo: 'melee', color: 0xfde047,
      pct: 2.20, escala: 'dano', cd: 4,
      consumeCargas: { pct: .15, efecto: 'grayskull' },
      desc: 'Causa 220% y consume todo su Poder de Grayskull: +15% de daño por cada uno (hasta +75%).',
    },
  ],
};

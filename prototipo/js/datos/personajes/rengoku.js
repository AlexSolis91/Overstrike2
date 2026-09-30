import { espacios } from '../reliquias.js';

// Ficha oficial #2 (revisada el 2026-10-01).
export default {
  id: 'rengoku',
  nombre: 'Rengoku',
  rol: 'Tanque', rolSecundario: 'DoTer',
  emoji: '🔥', color: '#f97316', imagen: 'assets/personajes/rengoku.webp',
  base: { hp: 750, dmg: 50, spd: 72 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Respiración de la Llama',
    desc: 'Cada vez que su equipo acierta una Quemadura sobre un enemigo, un aliado al azar gana +3% de Armadura permanente (no se puede disipar).',
    alAplicar: { efecto: 'burn', stat: 'armor', valor: .03 },
  },
  pasiva: {
    nombre: 'Pilar de la Llama',
    desc: 'Cada vez que una Quemadura hace daño a un enemigo, Rengoku se cura 2% de su HP máx. (máximo 3 veces por ronda).',
    gatillo: 'alDanoDoT', filtro: { tipo: 'burn', en: 'enemigos' }, maxPorRonda: 3,
    accion: { tipo: 'curar', pct: .02, escala: 'hpMax', a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Sol Ascendente', objetivo: 'enemigo', estilo: 'melee', color: 0xff7a2a,
      pct: .90, escala: 'hp', cd: 0,
      desc: 'Causa 90% (escala por HP). Aplica Quemadura 5% (2 rondas). Rengoku gana Provocación (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Tigre de Fuego', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xff5a1a,
      pct: .70, escala: 'hp', cd: 2,
      desc: 'Causa 70% (escala por HP) a todos los enemigos. Si golpea al menos a un enemigo con Quemadura, Rengoku gana un Escudo igual al 60% del daño total causado.',
      efectos: [{ cuando: 'final', condicion: { algunGolpeadoTenia: 'burn' }, accion: { tipo: 'escudo', base: 'danoCausado', pct: .60, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Purgatorio', objetivo: 'enemigo', estilo: 'melee', color: 0xffb347,
      pct: 2.50, escala: 'hp', cd: 5,
      desc: 'Causa 250% (escala por HP). Propaga la Quemadura del objetivo (mismo valor y duración) a los demás enemigos, aunque el objetivo muera.',
      efectos: [{ cuando: 'final', accion: { tipo: 'propagar', efecto: 'burn', a: 'otrosEnemigos' } }],
    },
  ],
};

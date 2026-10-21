import { espacios } from '../reliquias.js';

// Ficha oficial #2 (revisada el 2026-10-01).
export default {
  id: 'rengoku',
  franquicia: 'Demon Slayer', grupos: ['cazadores-de-demonios', 'fuego'],   // campaña: temas de las etapas
  nombre: 'Rengoku',
  rol: 'Tanque', rolSecundario: 'DoTer',
  sobres: [],  // sin sobre temático todavía: sale en Unbreakable Force (y en los aleatorios)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🔥', color: '#f97316', imagen: 'assets/personajes/rengoku.webp',
  base: { hp: 850, dmg: 55, spd: 97 },
  extra: { armor: .20, res: .10 },
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
      pct: 1.70, escala: 'hp', cd: 0,
      desc: 'Causa 170% (escala por HP). 30% de probabilidad de aplicar Quemadura 5% (2 rondas). Rengoku gana Provocación (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2, prob: .30 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Tigre de Fuego', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xff5a1a,
      pct: 1.30, escala: 'hp', cd: 2,
      desc: 'Causa 130% (escala por HP) a todos los enemigos. Si golpea al menos a un enemigo con Quemadura, Rengoku gana un Escudo igual al 112% del daño total causado.',
      efectos: [{ cuando: 'final', condicion: { algunGolpeadoTenia: 'burn' }, accion: { tipo: 'escudo', base: 'danoCausado', pct: 1.12, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Purgatorio', objetivo: 'enemigo', estilo: 'melee', color: 0xffb347,
      pct: 4.65, escala: 'hp', cd: 5,
      desc: 'Causa 465% (escala por HP). Propaga la Quemadura del objetivo (mismo valor y duración) a los demás enemigos, aunque el objetivo muera.',
      efectos: [{ cuando: 'final', accion: { tipo: 'propagar', efecto: 'burn', a: 'otrosEnemigos' } }],
    },
  ],
};

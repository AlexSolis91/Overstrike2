import { espacios } from '../reliquias.js';

// Ficha oficial #30 (2026-10-09, ajustada tras la simulación: ~71% de victorias, objetivo 65–75%).
// Control de velocidad: cada golpe le roba Velocidad al enemigo (permanente), pega más mientras más rápido sea, gana un
// turno extra si es el más rápido del campo, y sus controles siempre entran contra los más lentos.
// Miedo (Genjutsu de Cuervos), Mega Aturdimiento (Tsukuyomi) y la Espada de Totsuka que sella el Over enemigo.
// Sin Habilidad de Líder.
export default {
  id: 'itachi-uchiha',
  nombre: 'Itachi Uchiha',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['phantom'],
  emoji: '🐦‍⬛', color: '#b91c1c', imagen: 'assets/personajes/itachi-uchiha.webp',
  base: { hp: 680, dmg: 88, spd: 105 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Sharingan Mangekyō',
    desc: 'Cada golpe de Itachi le roba 5% de Velocidad al enemigo y se la suma (toda la partida, hasta +25% en total). Hace +1% de daño por cada punto de Velocidad que le saque al objetivo (hasta +50%). Si es el personaje más rápido de todo el campo, gana un turno extra (una vez por ronda). Sus debuffs siempre entran (sin tirada de Puntería) contra enemigos más lentos que él.',
    gatillo: 'alGolpear', filtro: { en: 'enemigos' },
    accion: { tipo: 'robarVelocidad', pct: .05, tope: .25, a: 'objetivo' },
    danoPorVelocidad: { pct: .01, max: .50 },
    turnoExtraSiMasRapido: true,
    seguroVsLentos: true,
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Genjutsu de Cuervos', objetivo: 'enemigo', golpes: 2, estilo: 'ranged', color: 0x7f1d1d,
      pct: .50, escala: 'dano', cd: 0,
      desc: '2 golpes de 50% con 30% de probabilidad de Miedo (actúa al final de la ronda y hace −25% de daño).',
      efectos: [{ accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Tsukuyomi', objetivo: 'enemigo', estilo: 'ranged', color: 0xdc2626,
      pct: 1.20, escala: 'dano', cd: 3,
      desc: 'Causa 120% y con 70% de probabilidad atrapa al enemigo en el Tsukuyomi: Mega Aturdimiento (pierde 2 turnos).',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .70 } }],
    },
    {
      categoria: 'over', nombre: 'Susanoo: Espada de Totsuka', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: 2.40, escala: 'dano', cd: 5, criticoSiMasRapido: true,
      desc: 'Causa 240% (crítico seguro si Itachi es más rápido que el objetivo) y sella su Over: lo pone en su cooldown completo. El Espejo de Yata le da a Itachi un Escudo del 20% de su HP máx.',
      efectos: [
        { accion: { tipo: 'activarCooldown', categoria: 'over' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: .20, escala: 'hpMax', a: 'propio' } },
      ],
    },
  ],
};

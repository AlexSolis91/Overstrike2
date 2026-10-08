import { espacios } from '../reliquias.js';

// Ficha oficial #22 (2026-10-08). Inspirado en el Sun Wukong de Raid: Shadow Legends, adaptado: Aturdir (más si el
// enemigo tiene buffs), golpe que ignora Armadura y pasa el daño sobrante, robo de todos los buffs enemigos con
// Bloquear Buffs, y revive una vez por partida. Líder: Gran Sabio Igual al Cielo (el aura de Velocidad de Raid).
export default {
  id: 'wukong',
  nombre: 'Wukong',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: ['sacred'],
  emoji: '🐒', color: '#f59e0b', imagen: 'assets/personajes/wukong.webp',
  base: { hp: 640, dmg: 90, spd: 96 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Gran Sabio Igual al Cielo',
    desc: 'Todos los aliados tienen +15% de Velocidad.',
    bonoStat: { spdPct: .15 },
  },
  pasiva: {
    nombre: 'Wukong Invencible',
    desc: 'Cuando muere, revive 3 turnos después (cuentan los turnos de cualquiera) con el 100% de su HP. Una vez por partida.',
    revivir: { turnos: 3, hp: 1 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: '¡Te tengo!', objetivo: 'enemigo', estilo: 'melee', color: 0xfbbf24,
      pct: 1.00, escala: 'dano', cd: 0,
      desc: 'Causa 100% con 25% de probabilidad de Aturdir (50% si el enemigo tiene algún buff).',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .25, probSiConBuff: .50 } }],
    },
    {
      categoria: 'especial', nombre: 'Bastón Prodigioso', objetivo: 'enemigo', estilo: 'melee', color: 0xf59e0b,
      pct: 1.60, escala: 'dano', cd: 3, ignoraArmadura: .50, sinCritico: true, sobrante: true,
      desc: 'Causa 160%, ignora 50 puntos de Armadura y no puede ser crítico. Si el objetivo muere, el daño sobrante pasa a otro enemigo. Si sobrevive y tiene algún buff, recibe Mega Aturdimiento (siempre entra).',
      efectos: [{ condicion: { objetivoConBuff: true }, accion: { tipo: 'efecto', id: 'stun', mega: true, irresistible: true } }],
    },
    {
      categoria: 'over', nombre: 'Ahora Nos Ves', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfde68a,
      pct: 1.30, escala: 'dano', cd: 4,
      desc: 'Antes de atacar, le roba todos los buffs a todos los enemigos. Causa 130% a todos y les aplica Bloquear Buffs (2 rondas).',
      efectos: [
        { cuando: 'antes', accion: { tipo: 'robarBuffs', cantidad: 99 } },
        { accion: { tipo: 'efecto', id: 'blockBuffs', dur: 2 } },
      ],
    },
  ],
};

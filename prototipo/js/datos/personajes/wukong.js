import { espacios } from '../reliquias.js';

// Ficha oficial #22 (2026-10-08). Inspirado en el Sun Wukong de Raid: Shadow Legends, adaptado: Aturdir (más si el
// enemigo tiene buffs), golpe que ignora Armadura y pasa el daño sobrante, robo de todos los buffs enemigos con
// Bloquear Buffs, y revive al final de la ronda siguiente (sin límite). Líder: Gran Sabio Igual al Cielo (el aura de Velocidad de Raid).
// 2026-11-11 (kit del usuario): cada vez que revive (por cualquier medio) tiene 30% de transformarse en Dark Wukong: mismo kit,
// pasiva y líder, pero causa daño triple con sus golpes (no con DoT) y al transformarse da Mega Aturdimiento (siempre entra)
// a hasta 3 enemigos al azar sin Mega Aturdimiento. Si Dark Wukong cae, vuelve a ser Wukong y al revivir se tira de nuevo.
// Sim 2026-11-11: 54.4% → 56.3% vs azar (líder 60.3% → 61.8%). El usuario aceptó el resultado de antemano.
const MOVIMIENTOS = [
  {
    categoria: 'basico', nombre: '¡Te tengo!', objetivo: 'enemigo', estilo: 'melee', color: 0xfbbf24,
    pct: .7, escala: 'dano', cd: 0,
    desc: 'Causa 70% con 25% de probabilidad de Aturdir (50% si el enemigo tiene algún buff).',
    efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .25, probSiConBuff: .50 } }],
  },
  {
    categoria: 'especial', nombre: 'Bastón Prodigioso', objetivo: 'enemigo', estilo: 'melee', color: 0xf59e0b,
    pct: 1.05, escala: 'dano', cd: 3, ignoraArmadura: .50, sinCritico: true, sobrante: true,
    desc: 'Causa 105%, ignora 50 puntos de Armadura y no puede ser crítico. Si el objetivo muere, el daño sobrante pasa a otro enemigo. Si sobrevive y tiene algún buff, recibe Mega Aturdimiento (siempre entra).',
    efectos: [{ condicion: { objetivoConBuff: true }, accion: { tipo: 'efecto', id: 'stun', mega: true, irresistible: true } }],
  },
  {
    categoria: 'over', nombre: 'Ahora Nos Ves', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfde68a,
    pct: .85, escala: 'dano', cd: 4,
    desc: 'Antes de atacar, le roba todos los buffs a todos los enemigos. Causa 85% a todos y les aplica Bloquear Buffs (2 rondas).',
    efectos: [
      { cuando: 'antes', accion: { tipo: 'robarBuffs', cantidad: 99 } },
      { accion: { tipo: 'efecto', id: 'blockBuffs', dur: 2 } },
    ],
  },
];

const PASIVA = {
  nombre: 'Wukong Invencible',
  desc: 'Cuando muere, revive al final de la ronda siguiente con el 100% de su HP. Sin límite de veces por partida. Cada vez que revive (por cualquier medio) tiene 30% de probabilidad de transformarse en Dark Wukong y dar Mega Aturdimiento a hasta 3 enemigos al azar que no lo tengan.',
  revivir: { rondaSiguiente: true, ilimitado: true, hp: 1 },
  alRevivir: { prob: .30, accion: [
    { tipo: 'transformar', a: 'propio' },
    { tipo: 'efecto', id: 'stun', mega: true, irresistible: true, a: { enemigoAzarSinMega: 'stun', cantidad: 3 } },
  ] },
};

// Dark Wukong (Transformación Sombría): mismo kit, pasiva y líder; daño triple. Dura hasta que caiga: al caer vuelve a ser Wukong.
const darkWukong = {
  nombre: 'Dark Wukong',
  rol: 'Daño', rolSecundario: 'Control',
  emoji: '🔥', color: '#dc2626', imagen: 'assets/transformaciones/dark-wukong.webp',
  hastaMorir: true,
  base: { hp: 580, dmg: 85, spd: 125 },
  extra: {},
  pasiva: {
    ...PASIVA,
    nombre: 'Transformación Sombría',
    desc: 'Causa daño triple con todos sus movimientos (no con DoT). Cuando muere vuelve a ser Wukong y revive al final de la ronda siguiente con el 100% de su HP; al revivir vuelve a tirar el 30% de transformarse en Dark Wukong.',
    multiplicaDano: 3,
  },
  movimientos: MOVIMIENTOS,
};

export default {
  id: 'wukong',
  franquicia: 'Black Myth: Wukong', grupos: ['dioses', 'guerreros'],   // campaña: temas de las etapas
  nombre: 'Wukong',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: ['sacred'],
  emoji: '🐒', color: '#f59e0b', imagen: 'assets/personajes/wukong.webp',
  base: { hp: 580, dmg: 85, spd: 125 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Gran Sabio Igual al Cielo',
    desc: 'Todos los aliados tienen +15% de Velocidad.',
    bonoStat: { spdPct: .15 },
  },
  pasiva: PASIVA,
  movimientos: MOVIMIENTOS,
  transformacion: darkWukong,
};

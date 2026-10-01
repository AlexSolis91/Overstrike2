import { espacios } from '../reliquias.js';

// Personajes DE PRUEBA (no oficiales): sirven de compañeros y rivales mientras llegan las fichas reales.
// Números ajustados a las reglas: HP 500–800, Daño 40–90, Velocidad 60–100.
export const morrigan = {
  id: 'morrigan', nombre: 'Morrigan', rol: 'DoT', emoji: '🔥', color: '#ff6a00', prueba: true,
  base: { hp: 600, dmg: 55, spd: 85 }, extra: {},
  slots: espacios('lanzaFuego', 'yelmo', 'amuletoPantano'),
  movimientos: [
    { categoria: 'basico', nombre: 'Bola de Fuego', objetivo: 'enemigo', estilo: 'ranged', color: 0xff6a00, pct: .90, escala: 'dano', cd: 0,
      desc: 'Causa 90% del Daño y aplica Quemadura 10% (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .10, dur: 2 } }] },
    { categoria: 'especial', nombre: 'Disipar Magia', objetivo: 'enemigo', estilo: 'ranged', color: 0xb57bff, pct: 1.30, escala: 'dano', cd: 2,
      desc: 'Causa 130% del Daño y disipa los buffs del objetivo.',
      efectos: [{ accion: { tipo: 'disipar' } }] },
    { categoria: 'over', nombre: 'Infierno', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xff4400, pct: 1.30, escala: 'dano', cd: 4,
      desc: 'Causa 130% del Daño a todos los enemigos y aplica Quemadura 8% (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', valor: .08, dur: 2 } }] },
  ],
};

export const thorne = {
  id: 'thorne', nombre: 'Thorne', rol: 'Tanque', emoji: '🛡️', color: '#5aa9ff', prueba: true,
  base: { hp: 800, dmg: 45, spd: 65 }, extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloLuz', { relic: null, locked: false }),
  movimientos: [
    { categoria: 'basico', nombre: 'Golpe de Escudo', objetivo: 'enemigo', estilo: 'melee', color: 0x9fd0ff, pct: 1.0, escala: 'hp', cd: 0,
      desc: 'Causa 100% de daño escalado por HP (HP ÷ 15).' },
    { categoria: 'especial', nombre: 'Baluarte', objetivo: 'aliado', estilo: 'support', color: 0x67e8f9, cd: 2,
      desc: 'Otorga a un aliado un Escudo de 300% (escala por HP).',
      efectos: [{ accion: { tipo: 'escudo', pct: 3.0, escala: 'hp' } }] },
    { categoria: 'over', nombre: 'Muralla', objetivo: 'todosAliados', estilo: 'support', color: 0x67e8f9, cd: 4,
      desc: 'Otorga a todos los aliados un Escudo de 150% (escala por HP).',
      efectos: [{ accion: { tipo: 'escudo', pct: 1.5, escala: 'hp' } }] },
  ],
};

export const liora = {
  id: 'liora', nombre: 'Liora', rol: 'Soporte', emoji: '✨', color: '#ffe27a', prueba: true,
  base: { hp: 580, dmg: 45, spd: 80 }, extra: {},
  slots: espacios('argonita', 'yelmo', 'anilloCobre', { label: 'Equipación 3', relic: null, bow: true }),
  movimientos: [
    { categoria: 'basico', nombre: 'Rayo de Luz', objetivo: 'enemigo', estilo: 'ranged', color: 0xfff1a8, pct: .90, escala: 'dano', cd: 0,
      desc: 'Causa 90% del Daño a un enemigo.' },
    { categoria: 'especial', nombre: 'Purificar', objetivo: 'aliado', estilo: 'support', color: 0xe0f7ff, cd: 2,
      desc: 'Limpia todos los debuffs de un aliado y lo cura 200% del Daño.',
      efectos: [{ accion: { tipo: 'limpiar' } }, { accion: { tipo: 'curar', pct: 2.0, escala: 'dano' } }] },
    { categoria: 'over', nombre: 'Bendición', objetivo: 'todosAliados', estilo: 'support', color: 0xffe27a, cd: 4,
      desc: 'Cura a todos los aliados 100% del Daño y les otorga Furia (+20% Daño, 2 rondas).',
      efectos: [{ accion: { tipo: 'curar', pct: 1.0, escala: 'dano' } }, { accion: { tipo: 'efecto', id: 'dmgUp', valor: .20, dur: 2 } }] },
  ],
};

export const vex = {
  id: 'vex', nombre: 'Vex', rol: 'Asesino', emoji: '🗡️', color: '#ff4d6d', prueba: true,
  base: { hp: 560, dmg: 80, spd: 95 }, extra: {},
  slots: espacios('nichirin', 'botas', 'amuletoPantano'),
  movimientos: [
    { categoria: 'basico', nombre: 'Estocada', objetivo: 'enemigo', estilo: 'melee', color: 0xffb0c0, pct: 1.0, escala: 'dano', cd: 0,
      desc: 'Causa 100% del Daño a un enemigo.' },
    { categoria: 'especial', nombre: 'Tres Cortes', objetivo: 'enemigo', estilo: 'melee', color: 0xff4d6d, pct: .45, golpes: 3, escala: 'dano', cd: 2,
      desc: 'Golpea 3 veces (45% cada una) y aplica Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed' } }] },
    { categoria: 'over', nombre: 'Desgarro Mortal', objetivo: 'enemigo', estilo: 'melee', color: 0xff3355, pct: 2.60, escala: 'dano', cd: 4,
      desc: 'Causa 260% del Daño y aplica Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed' } }] },
  ],
};

export const ysera = {
  id: 'ysera', nombre: 'Ysera', rol: 'Invocadora', emoji: '👑', color: '#f97316', prueba: true,
  base: { hp: 650, dmg: 60, spd: 82 }, extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),
  movimientos: [
    { categoria: 'basico', nombre: 'Látigo de Brasas', objetivo: 'enemigo', estilo: 'melee', color: 0xffb070, pct: 1.0, escala: 'dano', cd: 0,
      desc: 'Causa 100% del Daño a un enemigo.' },
    { categoria: 'especial', nombre: 'Llamar Dragón', objetivo: 'propio', estilo: 'support', color: 0xf97316, cd: 2, invocar: 'dragon',
      desc: 'Invoca un Dragón (3 rondas, máximo 3): escupe fuego a un enemigo al azar (30% + Quemadura 5%).' },
    { categoria: 'over', nombre: 'Dracarys', objetivo: 'todosEnemigos', estilo: 'support', color: 0xff4400, cd: 4, desatar: 'dragon', pctInvocacion: .40,
      desc: 'Todos sus Dragones atacan a todos los enemigos (40% cada uno) y después se retiran.' },
  ],
};

export const sable = {
  id: 'sable', nombre: 'Sable', rol: 'Asesino', emoji: '🌙', color: '#a78bfa', prueba: true,
  base: { hp: 520, dmg: 70, spd: 100 }, extra: {},
  slots: espacios('lanzaFuego', 'botas', 'anilloCobre'),
  movimientos: [
    { categoria: 'basico', nombre: 'Puñalada Veloz', objetivo: 'enemigo', estilo: 'melee', color: 0xd6c8ff, pct: 1.0, escala: 'vel', cd: 0,
      desc: 'Causa 100% de daño escalado por Velocidad (Velocidad × 0.75).' },
    { categoria: 'especial', nombre: 'Hoja Envenenada', objetivo: 'enemigo', estilo: 'melee', color: 0x7ee36b, pct: 1.40, escala: 'vel', cd: 2,
      desc: 'Causa 140% (escala por Velocidad) y aplica 2 acumulaciones de Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', veces: 2 } }] },
    { categoria: 'over', nombre: 'Ejecución', objetivo: 'enemigo', estilo: 'melee', color: 0xa78bfa, pct: 2.80, escala: 'vel', cd: 5,
      desc: 'Causa 280% (escala por Velocidad).' },
  ],
};

export const rook = {
  id: 'rook', nombre: 'Rook', rol: 'DoT', emoji: '💣', color: '#ffb03b', prueba: true,
  base: { hp: 600, dmg: 55, spd: 75 }, extra: {},
  slots: espacios('lanzaFuego', 'pechera', 'amuletoPantano'),
  movimientos: [
    { categoria: 'basico', nombre: 'Bomba de Relojería', objetivo: 'enemigo', estilo: 'ranged', color: 0xffb03b, pct: .80, escala: 'dano', cd: 0,
      desc: 'Causa 80% del Daño y coloca una Bomba (explota en 2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb' } }] },
    { categoria: 'especial', nombre: 'Detonador', objetivo: 'enemigo', estilo: 'ranged', color: 0xffd36b, pct: 1.40, escala: 'dano', cd: 3,
      desc: 'Causa 140% del Daño y detona al instante todas las Bombas del objetivo.',
      efectos: [{ accion: { tipo: 'detonar' } }] },
    { categoria: 'over', nombre: 'Lluvia de Bombas', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xffc27a, pct: 1.20, escala: 'dano', cd: 5,
      desc: 'Causa 120% del Daño a todos los enemigos y coloca una Bomba en cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bomb' } }] },
  ],
};

export const isolde = {
  id: 'isolde', nombre: 'Isolde', rol: 'Soporte', emoji: '🌿', color: '#34d399', prueba: true,
  base: { hp: 620, dmg: 45, spd: 78 }, extra: {},
  slots: espacios('argonita', 'yelmo', 'anilloLuz', { label: 'Equipación 3', relic: null, bow: true, locked: true }),
  movimientos: [
    { categoria: 'basico', nombre: 'Espinas', objetivo: 'enemigo', estilo: 'ranged', color: 0x86efac, pct: .90, escala: 'dano', cd: 0,
      desc: 'Causa 90% del Daño a un enemigo.' },
    { categoria: 'especial', nombre: 'Purificación', objetivo: 'aliado', estilo: 'support', color: 0xe0f7ff, cd: 2,
      desc: 'Limpia todos los debuffs de un aliado y lo cura 200% del Daño.',
      efectos: [{ accion: { tipo: 'limpiar' } }, { accion: { tipo: 'curar', pct: 2.0, escala: 'dano' } }] },
    { categoria: 'over', nombre: 'Corteza', objetivo: 'todosAliados', estilo: 'support', color: 0x67e8f9, cd: 4,
      desc: 'Otorga a todos los aliados un Escudo de 150% del Daño y los cura 80%.',
      efectos: [{ accion: { tipo: 'escudo', pct: 1.5, escala: 'dano' } }, { accion: { tipo: 'curar', pct: .8, escala: 'dano' } }] },
  ],
};

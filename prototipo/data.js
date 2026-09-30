// Overstrike 2 — datos del prototipo (TODOS los valores son provisionales, solo para la demo visual)

const RARITY = {
  'Común':      { color: '#a3acb9' },
  'Raro':       { color: '#4ade80' },
  'Especial':   { color: '#60a5fa' },
  'Épico':      { color: '#c084fc' },
  'Legendario': { color: '#fbbf24' },
};

const STAT_META = {
  hp:       { label: 'HP',            icon: '❤️' },
  spd:      { label: 'Velocidad',     icon: '⚡' },
  dmg:      { label: 'Daño',          icon: '⚔️' },
  critRate: { label: 'Prob. Crítico', icon: '✴️' },
  critDmg:  { label: 'Daño Crítico',  icon: '💥' },
  armor:    { label: 'Armadura',      icon: '🛡️' },
  acc:      { label: 'Puntería',      icon: '🎯' },
  res:      { label: 'Resistencia',   icon: '🧿' },
  block:    { label: 'Bloqueo',       icon: '✋' },
  dot:      { label: 'Daño DoT',      icon: '☠️' },
  pen:      { label: 'Perforación',   icon: '🗡️' },
  hpPct:    { label: 'HP',            icon: '❤️' },
  dmgPct:   { label: 'Daño',          icon: '⚔️' },
  spdPct:   { label: 'Velocidad',     icon: '⚡' },
};

// [stat, valor, mín, máx]
const RELICS = {
  obsidiana: { name: 'Espada de Obsidiana', rarity: 'Raro', category: 'Arma', type: 'Espada',
    flat: ['dmg', 9, 6, 10], rolls: [['critDmg', 0.08, 0.05, 0.08]] },
  argonita: { name: 'Arco de Argonita', rarity: 'Raro', category: 'Arma', type: 'Arco',
    flat: ['dmg', 9, 6, 10], rolls: [['acc', 0.08, 0.05, 0.09]] },
  lanzaFuego: { name: 'Lanza de Fuego', rarity: 'Especial', category: 'Arma', type: 'Lanza',
    flat: ['spd', 13, 10, 15], rolls: [['critDmg', 0.11, 0.07, 0.12], ['critRate', 0.12, 0.07, 0.12]] },
  nichirin: { name: 'Espada Nichirin', rarity: 'Especial', category: 'Arma', type: 'Espada',
    flat: ['dmg', 14, 12, 16], rolls: [['critDmg', 0.08, 0.06, 0.11], ['critDmg', 0.11, 0.06, 0.11]] },
  anilloLuz: { name: 'Anillo de la Luz', rarity: 'Épico', category: 'Accesorio', type: 'Anillo',
    flat: ['dmg', 19, 15, 22], rolls: [['block', 0.03, 0.02, 0.05], ['armor', 0.17, 0.12, 0.18], ['hpPct', 0.21, 0.15, 0.22]] },
  amuletoPantano: { name: 'Amuleto del Pantano', rarity: 'Épico', category: 'Accesorio', type: 'Amuleto',
    flat: ['dmg', 17, 15, 22], rolls: [['dot', 0.12, 0.11, 0.14], ['dot', 0.14, 0.11, 0.14], ['dot', 0.13, 0.11, 0.14]] },
  frostmourne: { name: 'Frostmourne', rarity: 'Legendario', category: 'Arma', type: 'Espada',
    flat: ['dmg', 35, 30, 35], rolls: [['critRate', 0.19, 0.15, 0.20], ['dmgPct', 0.23, 0.18, 0.25], ['critDmg', 0.27, 0.20, 0.27]],
    passive: 'Si el portador elimina a uno o más enemigos con un ataque, revive a uno de ellos al azar como aliado durante 2 rondas.' },
  anilloCobre: { name: 'Anillo de Cobre', rarity: 'Común', category: 'Accesorio', type: 'Anillo',
    flat: ['spd', 4, 2, 5], rolls: [] },
  yelmo: { name: 'Yelmo del Centinela', rarity: 'Raro', category: 'Equipación', type: 'Yelmo',
    flat: ['hp', 60, 45, 65], rolls: [['res', 0.06, 0.04, 0.07]] },
  pechera: { name: 'Pechera de Escamas', rarity: 'Especial', category: 'Equipación', type: 'Pechera',
    flat: ['hp', 110, 90, 120], rolls: [['armor', 0.08, 0.06, 0.10], ['block', 0.02, 0.02, 0.04]] },
  botas: { name: 'Botas del Viento', rarity: 'Especial', category: 'Equipación', type: 'Botas',
    flat: ['spd', 11, 8, 12], rolls: [['spdPct', 0.05, 0.03, 0.06], ['res', 0.07, 0.05, 0.09]] },
};

// Espacios: Arma 1, Equipación 1, Accesorio 1 (libres) · Arma 2, Equipación 2, Accesorio 2 (se desbloquean con Oro)
function slots(a1, e1, c1, a2 = { locked: true }, e2 = { locked: true }, c2 = { locked: true }) {
  return [
    { label: 'Arma 1', relic: a1 }, { label: 'Equipación 1', relic: e1 }, { label: 'Accesorio 1', relic: c1 },
    { label: 'Arma 2', ...a2 }, { label: 'Equipación 2', ...e2 }, { label: 'Accesorio 2', ...c2 },
  ];
}

// target: enemy | ally | allEnemies | allAllies   ·   style: melee | ranged | support
const ALLIES = [
  { name: 'Kael', role: 'Espadachín ígneo', emoji: '⚔️', color: '#ff7a3d',
    base: { hp: 1300, spd: 112, dmg: 190, critRate: .20, critDmg: .50, armor: .18, acc: .95, res: .20, block: .04, dot: .10, pen: .25 },
    slots: slots('frostmourne', 'yelmo', 'anilloCobre'),
    moves: [
      { name: 'Corte Veloz', target: 'enemy', style: 'melee', mult: 1.0, color: 0xffd0a0, desc: 'Causa 100% de Daño a un enemigo.' },
      { name: 'Tajo Ígneo', target: 'enemy', style: 'melee', mult: .9, burn: .10, burnDur: 2, color: 0xff7a2a, desc: 'Causa 90% de Daño y aplica Quemadura 10% (2 rondas).' },
      { name: 'Llamarada', target: 'allEnemies', style: 'ranged', mult: .5, burn: .06, burnDur: 2, color: 0xff5a1a, desc: 'Causa 50% de Daño a todos los enemigos y aplica Quemadura 6%.' },
    ] },
  { name: 'Nyra', role: 'Alquimista', emoji: '🐍', color: '#7ee36b',
    base: { hp: 1150, spd: 120, dmg: 170, critRate: .12, critDmg: .50, armor: .10, acc: 1.3, res: .25, block: .03, dot: .25, pen: .40 },
    slots: slots('argonita', 'botas', 'amuletoPantano', { label: 'Equipación 3', relic: null, bow: true }),
    moves: [
      { name: 'Dardo Tóxico', target: 'enemy', style: 'ranged', mult: .8, poison: 1, color: 0x7ee36b, desc: 'Causa 80% de Daño y aplica 1 acumulación de Veneno.' },
      { name: 'Nube Tóxica', target: 'allEnemies', style: 'ranged', mult: .35, poison: 1, color: 0x9bf07f, desc: 'Causa 35% de Daño a todos y aplica 1 acumulación de Veneno.' },
      { name: 'Frasco Corrosivo', target: 'enemy', style: 'ranged', mult: 1.1, poison: 2, color: 0x5fd14a, desc: 'Causa 110% de Daño y aplica 2 acumulaciones de Veneno.' },
    ] },
  { name: 'Thorne', role: 'Guardián', emoji: '🛡️', color: '#5aa9ff',
    base: { hp: 1900, spd: 88, dmg: 150, critRate: .08, critDmg: .50, armor: .45, acc: .90, res: .45, block: .12, dot: 0, pen: .10 },
    slots: slots('obsidiana', 'pechera', 'anilloLuz', { relic: null, locked: false }),
    moves: [
      { name: 'Golpe de Escudo', target: 'enemy', style: 'melee', mult: .9, color: 0x9fd0ff, desc: 'Causa 90% de Daño a un enemigo.' },
      { name: 'Baluarte', target: 'ally', style: 'support', shield: 2.2, color: 0x67e8f9, desc: 'Otorga a un aliado un Escudo igual a 220% de su Daño.' },
      { name: 'Muralla', target: 'allAllies', style: 'support', shield: 1.0, color: 0x67e8f9, desc: 'Otorga a todos los aliados un Escudo igual a 100% de su Daño.' },
    ] },
  { name: 'Liora', role: 'Sacerdotisa', emoji: '✨', color: '#ffe27a',
    base: { hp: 1200, spd: 100, dmg: 140, critRate: .10, critDmg: .50, armor: .15, acc: 1.0, res: .35, block: .05, dot: 0, pen: .20 },
    slots: slots('nichirin', 'yelmo', 'anilloCobre'),
    moves: [
      { name: 'Luz Sanadora', target: 'ally', style: 'support', heal: 2.0, color: 0x6dff9e, desc: 'Cura a un aliado 200% de su Daño.' },
      { name: 'Purificar', target: 'ally', style: 'support', cleanse: true, heal: .8, color: 0xe0f7ff, desc: 'Limpia todos los debuffs de un aliado y lo cura 80% de su Daño.' },
      { name: 'Bendición', target: 'allAllies', style: 'support', buff: { value: .25, dur: 2 }, color: 0xffe27a, desc: 'Otorga +25% de Daño a todos los aliados (2 rondas).' },
    ] },
  { name: 'Rook', role: 'Artificiero', emoji: '💣', color: '#ffb03b',
    base: { hp: 1250, spd: 95, dmg: 175, critRate: .15, critDmg: .60, armor: .20, acc: 1.1, res: .20, block: .05, dot: .35, pen: .30 },
    slots: slots('lanzaFuego', 'pechera', 'amuletoPantano'),
    moves: [
      { name: 'Bomba de Relojería', target: 'enemy', style: 'ranged', mult: .4, bomb: true, color: 0xffb03b, desc: 'Causa 40% de Daño y coloca una Bomba (explota en 2 rondas).' },
      { name: 'Detonador', target: 'enemy', style: 'ranged', mult: .5, detonate: true, color: 0xffd36b, desc: 'Causa 50% de Daño y detona al instante todas las Bombas del objetivo.' },
      { name: 'Metralla', target: 'allEnemies', style: 'ranged', mult: .45, color: 0xffc27a, desc: 'Causa 45% de Daño a todos los enemigos.' },
    ] },
];

const ENEMIES = [
  { name: 'Vex', role: 'Cazadora', emoji: '🗡️', color: '#ff4d6d',
    base: { hp: 1250, spd: 118, dmg: 180, critRate: .25, critDmg: .60, armor: .15, acc: 1.1, res: .20, block: .06, dot: .30, pen: .35 },
    slots: slots('nichirin', 'botas', 'amuletoPantano'),
    moves: [
      { name: 'Tres Cortes', target: 'enemy', style: 'melee', mult: .4, hits: 3, bleed: true, color: 0xff4d6d, desc: 'Golpea 3 veces (40% cada una) y aplica Sangrado.' },
      { name: 'Desgarrar', target: 'enemy', style: 'melee', mult: 1.0, bleed: true, color: 0xff3355, desc: 'Causa 100% de Daño y aplica Sangrado.' },
      { name: 'Estocada', target: 'enemy', style: 'melee', mult: 1.2, color: 0xffb0c0, desc: 'Causa 120% de Daño a un enemigo.' },
    ] },
  { name: 'Morrigan', role: 'Bruja de ceniza', emoji: '🔥', color: '#ff6a00',
    base: { hp: 1150, spd: 108, dmg: 185, critRate: .12, critDmg: .50, armor: .10, acc: 1.2, res: .30, block: .03, dot: .30, pen: .30 },
    slots: slots('lanzaFuego', 'yelmo', 'anilloLuz'),
    moves: [
      { name: 'Bola de Fuego', target: 'enemy', style: 'ranged', mult: 1.0, burn: .12, burnDur: 2, color: 0xff6a00, desc: 'Causa 100% de Daño y aplica Quemadura 12% (2 rondas).' },
      { name: 'Infierno', target: 'allEnemies', style: 'ranged', mult: .45, burn: .07, burnDur: 2, color: 0xff4400, desc: 'Causa 45% de Daño a todos y aplica Quemadura 7%.' },
      { name: 'Disipar Magia', target: 'enemy', style: 'ranged', mult: .5, dispel: true, color: 0xb57bff, desc: 'Causa 50% de Daño y disipa los buffs del objetivo.' },
    ] },
  { name: 'Grom', role: 'Berserker', emoji: '🪓', color: '#c08457',
    base: { hp: 1800, spd: 90, dmg: 210, critRate: .18, critDmg: .70, armor: .35, acc: .80, res: .30, block: .10, dot: 0, pen: .20 },
    slots: slots('obsidiana', 'pechera', 'anilloCobre'),
    moves: [
      { name: 'Hachazo', target: 'enemy', style: 'melee', mult: 1.3, color: 0xffc9a0, desc: 'Causa 130% de Daño a un enemigo.' },
      { name: 'Grito de Guerra', target: 'allAllies', style: 'support', buff: { value: .20, dur: 2 }, color: 0xffd36b, desc: 'Otorga +20% de Daño a todos los aliados (2 rondas).' },
      { name: 'Terremoto', target: 'allEnemies', style: 'ranged', mult: .55, color: 0xc08457, desc: 'Causa 55% de Daño a todos los enemigos.' },
    ] },
  { name: 'Sable', role: 'Asesino', emoji: '🌙', color: '#a78bfa',
    base: { hp: 1100, spd: 125, dmg: 200, critRate: .45, critDmg: .90, armor: .10, acc: 1.0, res: .20, block: .08, dot: .20, pen: .50 },
    slots: slots('frostmourne', 'botas', 'anilloCobre'),
    moves: [
      { name: 'Puñalada', target: 'enemy', style: 'melee', mult: 1.1, color: 0xd6c8ff, desc: 'Causa 110% de Daño a un enemigo.' },
      { name: 'Hoja Envenenada', target: 'enemy', style: 'melee', mult: .8, poison: 2, color: 0x7ee36b, desc: 'Causa 80% de Daño y aplica 2 acumulaciones de Veneno.' },
      { name: 'Ejecución', target: 'enemy', style: 'melee', mult: 1.6, color: 0xa78bfa, desc: 'Causa 160% de Daño a un enemigo.' },
    ] },
  { name: 'Isolde', role: 'Druida', emoji: '🌿', color: '#34d399',
    base: { hp: 1300, spd: 98, dmg: 150, critRate: .10, critDmg: .50, armor: .20, acc: 1.0, res: .40, block: .06, dot: .10, pen: .20 },
    slots: slots('argonita', 'yelmo', 'anilloLuz', { label: 'Equipación 3', relic: null, bow: true, locked: true }),
    moves: [
      { name: 'Savia Vital', target: 'ally', style: 'support', heal: 2.0, color: 0x6dff9e, desc: 'Cura a un aliado 200% de su Daño.' },
      { name: 'Purificación', target: 'ally', style: 'support', cleanse: true, heal: .6, color: 0xe0f7ff, desc: 'Limpia todos los debuffs de un aliado y lo cura 60% de su Daño.' },
      { name: 'Corteza', target: 'ally', style: 'support', shield: 1.8, color: 0x67e8f9, desc: 'Otorga a un aliado un Escudo igual a 180% de su Daño.' },
    ] },
];

// Debuffs y buffs (con etiquetas internas)
const EFFECTS = {
  burn:   { name: 'Quemadura',  icon: '🔥', color: 0xff7a2a, kind: 'debuff', tags: ['DoT', 'Fuego'] },
  poison: { name: 'Veneno',     icon: '🧪', color: 0x7ee36b, kind: 'debuff', tags: ['DoT', 'Veneno'] },
  bleed:  { name: 'Sangrado',   icon: '🩸', color: 0xff3355, kind: 'debuff', tags: ['DoT', 'Sangrado'] },
  hemo:   { name: 'Hemorragia', icon: '🩸', color: 0x9b0020, kind: 'debuff', tags: ['DoT', 'Sangrado'] },
  bomb:   { name: 'Bomba',      icon: '💣', color: 0xffb03b, kind: 'debuff', tags: ['DoT', 'Explosivo'] },
  dmgUp:  { name: 'Furia',      icon: '⚔️', color: 0x4ade80, kind: 'buff',   tags: ['Estadística'] },
};

const SLOT_COSTS = ['100,000', '500,000', '1,000,000'];

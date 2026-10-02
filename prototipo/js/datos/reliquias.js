// Reliquias de ejemplo (valores provisionales hasta que llegue la lista oficial). [stat, valor, mín, máx]
export const RAREZAS = {
  'Común':      { color: '#a3acb9' },
  'Raro':       { color: '#4ade80' },
  'Especial':   { color: '#60a5fa' },
  'Épico':      { color: '#c084fc' },
  'Legendario': { color: '#fbbf24' },
};

export const STAT_META = {
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
  pen:      { label: 'Penetración de escudo', icon: '🗡️' },
  hpPct:    { label: 'HP',            icon: '❤️' },
  dmgPct:   { label: 'Daño',          icon: '⚔️' },
  spdPct:   { label: 'Velocidad',     icon: '⚡' },
};

export const RELIQUIAS = {
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

export const COSTOS_ESPACIO = ['100,000', '500,000', '1,000,000'];

// Espacios: Arma 1, Equipación 1, Accesorio 1 (libres) · Arma 2, Equipación 2, Accesorio 2 (se desbloquean con Oro)
export function espacios(a1, e1, c1, a2 = { locked: true }, e2 = { locked: true }, c2 = { locked: true }) {
  return [
    { label: 'Arma 1', relic: a1 }, { label: 'Equipación 1', relic: e1 }, { label: 'Accesorio 1', relic: c1 },
    { label: 'Arma 2', ...a2 }, { label: 'Equipación 2', ...e2 }, { label: 'Accesorio 2', ...c2 },
  ];
}

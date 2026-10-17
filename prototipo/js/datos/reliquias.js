// RELIQUIAS. Tres capas:
//   1) TIPOS: los 22 tipos (categoría, estadística plana posible y estadísticas porcentuales permitidas).
//   2) RANGOS: mínimo y máximo de cada estadística según la rareza (las porcentuales en puntos enteros: 8 = 8%).
//   3) RELIQUIAS: el catálogo con nombre (rareza fija por nombre). Cada copia que entra a una cuenta (sobre, recompensa,
//      receta…) sortea SUS valores dentro de los rangos en el servidor; dos copias del mismo nombre pueden ser distintas.
// Calidad = qué tan cerca del máximo quedó cada línea (promedio); ⭐ en cada tirada que salió al máximo.
// imagen: arte montado en el marco de su rareza (herramientas/marcos_reliquias.py, desde assets/originales/reliquias/).
// legado: valores fijos del equipo de ejemplo de las fichas (partida rápida, simulaciones y rivales); no se usan al sortear.

export const RAREZAS = {
  'Común':      { color: '#a3acb9', orden: 0, estrellas: 0, tiradas: 0, plural: 'Comunes' },
  'Raro':       { color: '#4ade80', orden: 1, estrellas: 1, tiradas: 1, plural: 'Raras' },
  'Especial':   { color: '#60a5fa', orden: 2, estrellas: 2, tiradas: 2, plural: 'Especiales' },
  'Épico':      { color: '#c084fc', orden: 3, estrellas: 3, tiradas: 3, plural: 'Épicas' },
  'Legendario': { color: '#fbbf24', orden: 4, estrellas: 4, tiradas: 3, plural: 'Legendarias' },
};
export const MAX_REPETIDAS = 2;        // máximo de tiradas que pueden caer en la misma estadística

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
export const PLANAS = ['dmg', 'hp', 'spd'];
export const PORCENTUALES = ['critRate', 'critDmg', 'dot', 'pen', 'acc', 'res', 'armor', 'block', 'hpPct', 'dmgPct', 'spdPct'];

// ---------------------------------------------------------------- 1) tipos (tabla del diseñador, 2026-10-16)
// plana: si hay dos, se sortea una (Anillo, Collar). pct: porcentuales permitidas.
const T = (categoria, plana, pct) => ({ categoria, plana, pct });
export const TIPOS = {
  Espada:     T('Arma', ['dmg'], ['critDmg', 'dot', 'hpPct', 'res']),
  Hacha:      T('Arma', ['dmg'], ['critRate', 'pen', 'critDmg', 'res']),
  Arco:       T('Arma', ['dmg'], ['pen', 'acc', 'critRate', 'spdPct']),
  Daga:       T('Arma', ['dmg'], ['dot', 'critRate', 'dmgPct']),
  Martillo:   T('Arma', ['hp'], ['dmgPct', 'armor', 'hpPct']),
  Mosquete:   T('Arma', ['spd'], ['critDmg', 'dmgPct', 'dot']),
  Maza:       T('Arma', ['dmg'], ['hpPct', 'dmgPct', 'block']),
  Lanza:      T('Arma', ['spd'], ['pen', 'acc', 'critDmg', 'critRate']),
  Escudo:     T('Arma', ['hp'], ['block', 'res', 'acc', 'dmgPct']),
  Pechera:    T('Equipación', ['hp'], ['armor', 'hpPct', 'res', 'block']),
  'Cinturón': T('Equipación', ['hp'], ['armor', 'block', 'critRate', 'acc']),
  Guantes:    T('Equipación', ['dmg'], ['critDmg', 'pen', 'critRate']),
  Hombreras:  T('Equipación', ['hp'], ['res', 'armor', 'critDmg']),
  Capa:       T('Equipación', ['spd'], ['dot', 'block', 'acc', 'critRate']),
  Botas:      T('Equipación', ['spd'], ['armor', 'spdPct', 'res', 'hpPct']),
  Grebas:     T('Equipación', ['hp'], ['res', 'armor', 'spdPct']),
  Yelmo:      T('Equipación', ['hp'], ['armor', 'critRate', 'acc', 'hpPct']),
  Corona:     T('Equipación', ['dmg'], ['dot', 'armor', 'acc']),
  'Máscara':  T('Equipación', ['spd'], ['dmgPct', 'hpPct', 'res']),
  Anillo:     T('Accesorio', ['dmg', 'hp'], PORCENTUALES),
  Collar:     T('Accesorio', ['dmg', 'hp'], ['spdPct', 'armor', 'acc', 'hpPct']),
  Amuleto:    T('Accesorio', ['spd'], ['res', 'critRate', 'acc', 'block']),
};

// ---------------------------------------------------------------- 2) rangos por rareza (aprobados 2026-10-16)
// [mínimo, máximo] en pasos enteros. La Común no tiene porcentuales.
const R = (c, r, e, ep, l) => ({ 'Común': c, 'Raro': r, 'Especial': e, 'Épico': ep, 'Legendario': l });
export const RANGOS = {
  dmg:      R([3, 5], [6, 10], [11, 16], [17, 24], [25, 35]),
  hp:       R([30, 50], [60, 100], [110, 160], [170, 240], [250, 350]),
  spd:      R([2, 4], [5, 8], [9, 12], [13, 17], [18, 24]),
  critRate: R(null, [3, 5], [6, 9], [10, 13], [14, 18]),
  critDmg:  R(null, [5, 8], [9, 13], [14, 19], [20, 27]),
  dot:      R(null, [4, 6], [7, 10], [11, 14], [15, 20]),
  pen:      R(null, [5, 8], [9, 13], [14, 19], [20, 27]),
  acc:      R(null, [4, 7], [8, 12], [13, 17], [18, 24]),
  res:      R(null, [4, 7], [8, 12], [13, 17], [18, 24]),
  armor:    R(null, [2, 4], [5, 7], [8, 10], [11, 14]),
  block:    R(null, [1, 2], [2, 3], [3, 5], [5, 7]),
  hpPct:    R(null, [3, 5], [6, 8], [9, 12], [13, 17]),
  dmgPct:   R(null, [3, 5], [6, 8], [9, 12], [13, 17]),
  spdPct:   R(null, [2, 3], [3, 5], [5, 7], [7, 9]),
};

// ---------------------------------------------------------------- 3) catálogo
// enSobre: sale en el sobre de reliquias (por defecto sí, salvo Legendarias). soloReceta: solo se consigue crafteando.
export const RELIQUIAS = {
  obsidiana: { name: 'Espada de Obsidiana', rarity: 'Raro', type: 'Espada', imagen: 'assets/reliquias/obsidiana.webp',
    legado: { flat: ['dmg', 9, 6, 10], rolls: [['critDmg', 0.08, 0.05, 0.08]] } },
  argonita: { name: 'Arco de Argonita', rarity: 'Raro', type: 'Arco', imagen: 'assets/reliquias/argonita.webp',
    legado: { flat: ['dmg', 9, 6, 10], rolls: [['acc', 0.08, 0.05, 0.09]] } },
  lanzaFuego: { name: 'Lanza de Fuego', rarity: 'Especial', type: 'Lanza', imagen: 'assets/reliquias/lanzaFuego.webp',
    legado: { flat: ['spd', 13, 10, 15], rolls: [['critDmg', 0.11, 0.07, 0.12], ['critRate', 0.12, 0.07, 0.12]] } },
  katanaCarmesi: { name: 'Katana Carmesí', rarity: 'Especial', type: 'Espada', imagen: 'assets/reliquias/katanaCarmesi.webp',
    legado: { flat: ['dmg', 14, 12, 16], rolls: [['critDmg', 0.08, 0.06, 0.11], ['critDmg', 0.11, 0.06, 0.11]] } },
  anilloLuz: { name: 'Anillo de la Luz', rarity: 'Épico', type: 'Anillo', imagen: 'assets/reliquias/anilloLuz.webp',
    legado: { flat: ['dmg', 19, 15, 22], rolls: [['block', 0.03, 0.02, 0.05], ['armor', 0.17, 0.12, 0.18], ['hpPct', 0.21, 0.15, 0.22]] } },
  amuletoPantano: { name: 'Amuleto del Pantano', rarity: 'Épico', type: 'Amuleto', imagen: 'assets/reliquias/amuletoPantano.webp',
    legado: { flat: ['dmg', 17, 15, 22], rolls: [['dot', 0.12, 0.11, 0.14], ['dot', 0.14, 0.11, 0.14], ['dot', 0.13, 0.11, 0.14]] } },
  frostmourne: { name: 'Frostmourne', rarity: 'Legendario', type: 'Espada', imagen: 'assets/reliquias/frostmourne.webp', soloReceta: true,
    passive: 'Si el portador elimina a uno o más enemigos con un ataque, revive a uno de ellos al azar como aliado durante 2 rondas.',
    legado: { flat: ['dmg', 35, 30, 35], rolls: [['critRate', 0.19, 0.15, 0.20], ['dmgPct', 0.23, 0.18, 0.25], ['critDmg', 0.27, 0.20, 0.27]] } },
  anilloCobre: { name: 'Anillo de Cobre', rarity: 'Común', type: 'Anillo', imagen: 'assets/reliquias/anilloCobre.webp',
    legado: { flat: ['spd', 4, 2, 5], rolls: [] } },
  yelmo: { name: 'Yelmo del Centinela', rarity: 'Raro', type: 'Yelmo', imagen: 'assets/reliquias/yelmo.webp',
    legado: { flat: ['hp', 60, 45, 65], rolls: [['res', 0.06, 0.04, 0.07]] } },
  pechera: { name: 'Pechera de Escamas', rarity: 'Especial', type: 'Pechera', imagen: 'assets/reliquias/pechera.webp',
    legado: { flat: ['hp', 110, 90, 120], rolls: [['armor', 0.08, 0.06, 0.10], ['block', 0.02, 0.02, 0.04]] } },
  botas: { name: 'Botas del Viento', rarity: 'Especial', type: 'Botas', imagen: 'assets/reliquias/botas.webp',
    legado: { flat: ['spd', 11, 8, 12], rolls: [['spdPct', 0.05, 0.03, 0.06], ['res', 0.07, 0.05, 0.09]] } },
  // ---------------------------------------------------------------- reliquias nuevas (fichas del diseñador; sin "legado": no van en fichas de campeones)
  furiaEscarlata: { name: 'Furia Escarlata', rarity: 'Común', type: 'Espada', imagen: 'assets/reliquias/furiaEscarlata.webp' },
  collarNiebla: { name: 'Collar de la Niebla', rarity: 'Común', type: 'Collar', imagen: 'assets/reliquias/collarNiebla.webp' },
  anilloCobalto: { name: 'Anillo de Cobalto', rarity: 'Común', type: 'Anillo', imagen: 'assets/reliquias/anilloCobalto.webp' },
  hachaGigante: { name: 'Hacha Gigante', rarity: 'Común', type: 'Hacha', imagen: 'assets/reliquias/hachaGigante.webp' },
  arcoDorado: { name: 'Arco del Dorado', rarity: 'Raro', type: 'Arco', imagen: 'assets/reliquias/arcoDorado.webp' },
  escudoMagma: { name: 'Escudo de Magma', rarity: 'Común', type: 'Escudo', imagen: 'assets/reliquias/escudoMagma.webp' },
  coronaBestias: { name: 'Corona del Rey de las Bestias', rarity: 'Común', type: 'Corona', imagen: 'assets/reliquias/coronaBestias.webp' },
  punoCastigo: { name: 'Puño del Castigo', rarity: 'Común', type: 'Guantes', imagen: 'assets/reliquias/punoCastigo.webp' },
  nichirin: { name: 'Nichirin', rarity: 'Épico', type: 'Espada', imagen: 'assets/reliquias/nichirin.webp' },
  amuletoOlvido: { name: 'Amuleto del Olvido', rarity: 'Común', type: 'Amuleto', imagen: 'assets/reliquias/amuletoOlvido.webp' },
  arcantos: { name: 'Arcantos', rarity: 'Especial', type: 'Martillo', imagen: 'assets/reliquias/arcantos.webp' },
};
for (const [id, r] of Object.entries(RELIQUIAS)) {
  if (!TIPOS[r.type]) throw new Error(`Reliquia ${id}: tipo desconocido ${r.type}`);
  r.id = id; r.category = TIPOS[r.type].categoria;
  r.enSobre ??= r.rarity !== 'Legendario' && !r.soloReceta;
}

// ---------------------------------------------------------------- copias (instancias)
const esPct = s => PORCENTUALES.includes(s);
const rango = (stat, rareza) => RANGOS[stat]?.[rareza] || [0, 0];
// Una copia lista para el motor y la carta: datos del catálogo + flat [stat, valor, mín, máx] + rolls [[stat, valor, mín, máx]…]
// (las porcentuales en fracción: 0.08 = 8%). fila: lo que guarda el servidor { id, reliquia, plana_stat, plana_valor, tiradas, campeon, espacio }
export function instancia(fila) {
  const cat = RELIQUIAS[fila.reliquia];
  if (!cat) return null;
  const linea = (stat, v) => { const [mn, mx] = rango(stat, cat.rarity); return esPct(stat) ? [stat, v / 100, mn / 100, mx / 100] : [stat, v, mn, mx]; };
  return { ...cat, uid: fila.id, campeon: fila.campeon || null, espacio: fila.espacio || null, obtenida: fila.obtenida,
    flat: linea(fila.plana_stat, fila.plana_valor), rolls: (fila.tiradas || []).map(([s, v]) => linea(s, v)) };
}
// Copia de ejemplo de las fichas (valores fijos de "legado")
export function instanciaLegado(id) {
  const cat = RELIQUIAS[id];
  return cat ? { ...cat, uid: `legado-${id}`, flat: cat.legado.flat, rolls: cat.legado.rolls } : null;
}
// Sorteo (el oficial lo hace el servidor con las mismas reglas; este sirve para pruebas): devuelve una fila como la del servidor
export function sortear(id, rng = Math.random) {
  const cat = RELIQUIAS[id], tipo = TIPOS[cat.type];
  const entero = ([mn, mx]) => mn + Math.floor(rng() * (mx - mn + 1));
  const plana = tipo.plana[Math.floor(rng() * tipo.plana.length)];
  const tiradas = [];
  for (let i = 0; i < RAREZAS[cat.rarity].tiradas; i++) {
    const libres = tipo.pct.filter(s => tiradas.filter(t => t[0] === s).length < MAX_REPETIDAS);
    const s = libres[Math.floor(rng() * libres.length)];
    tiradas.push([s, entero(rango(s, cat.rarity))]);
  }
  return { reliquia: id, plana_stat: plana, plana_valor: entero(rango(plana, cat.rarity)), tiradas };
}
// Calidad 0–100: promedio de qué tan cerca del máximo quedó cada línea (plana y cada tirada)
export function calidad(rel) {
  const q = [rel.flat, ...rel.rolls].map(([, v, mn, mx]) => mx === mn ? 1 : Math.max(0, Math.min(1, (v - mn) / (mx - mn))));
  return Math.round(q.reduce((a, b) => a + b, 0) / q.length * 100);
}

// ---------------------------------------------------------------- espacios de un campeón
// Arma 1, Equipación 1, Accesorio 1 (libres) · Arma 2, Equipación 2, Accesorio 2 (se desbloquean con copias u oro, en el orden
// que elija el jugador). Con un Arco en Arma 1, el espacio Arma 2 se vuelve Equipación 3.
export const ESPACIOS = [
  { id: 'arma1', label: 'Arma 1', categoria: 'Arma' }, { id: 'equip1', label: 'Equipación 1', categoria: 'Equipación' },
  { id: 'acc1', label: 'Accesorio 1', categoria: 'Accesorio' }, { id: 'arma2', label: 'Arma 2', categoria: 'Arma', extra: true },
  { id: 'equip2', label: 'Equipación 2', categoria: 'Equipación', extra: true }, { id: 'acc2', label: 'Accesorio 2', categoria: 'Accesorio', extra: true },
];
export const COSTOS_ESPACIO = ['100,000', '500,000', '1,000,000'];
const deFicha = r => typeof r === 'string' ? instanciaLegado(r) : r || null;
// Equipo de ejemplo de una ficha: ids del catálogo (se usan sus valores de "legado")
export function espacios(a1, e1, c1, a2 = { locked: true }, e2 = { locked: true }, c2 = { locked: true }) {
  return [
    { label: 'Arma 1', relic: deFicha(a1) }, { label: 'Equipación 1', relic: deFicha(e1) }, { label: 'Accesorio 1', relic: deFicha(c1) },
    { label: 'Arma 2', ...a2, relic: deFicha(a2.relic) }, { label: 'Equipación 2', ...e2, relic: deFicha(e2.relic) },
    { label: 'Accesorio 2', ...c2, relic: deFicha(c2.relic) },
  ];
}

// Reglas para equipar (las mismas que valida el servidor). equipo: { arma1: copia|null, … } del campeón; abiertos: ['arma2', …]
// Devuelve el motivo si NO se puede, o null si se puede.
export function motivoNoEquipar(rel, espacio, { equipo = {}, abiertos = [], estrellas = 0 } = {}) {
  const e = ESPACIOS.find(x => x.id === espacio);
  if (!e) return 'Espacio desconocido';
  if (e.extra && !abiertos.includes(espacio)) return `${e.label} está bloqueado`;
  const otro = id => equipo[id] && equipo[id].uid !== rel.uid ? equipo[id] : null;
  const arcoEnArma1 = espacio === 'arma1' ? rel.type === 'Arco' : otro('arma1')?.type === 'Arco';
  const cat = espacio === 'arma2' && arcoEnArma1 ? 'Equipación' : e.categoria;
  if (rel.category !== cat) return espacio === 'arma2' && arcoEnArma1 ? 'Con un Arco, Arma 2 se vuelve Equipación 3' : `Este espacio es de ${e.categoria}`;
  if (rel.type === 'Arco' && espacio !== 'arma1') return 'El Arco solo va en Arma 1';
  if (rel.type === 'Escudo' && otro(espacio === 'arma1' ? 'arma2' : 'arma1')?.type === 'Escudo') return 'No puede llevar dos Escudos';
  if (rel.category === 'Equipación') {
    const ids = ['equip1', 'equip2', ...(arcoEnArma1 ? ['arma2'] : [])].filter(id => id !== espacio);
    if (ids.some(id => otro(id)?.type === rel.type)) return `Ya lleva otra reliquia de tipo ${rel.type}`;
  }
  const req = RAREZAS[rel.rarity].estrellas;
  if (estrellas < req) return `Necesita ${req}★ para usar reliquias ${RAREZAS[rel.rarity].plural}`;
  return null;
}

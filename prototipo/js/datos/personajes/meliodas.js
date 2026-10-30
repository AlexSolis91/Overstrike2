import { espacios } from '../reliquias.js';

// Ficha oficial (2026-10-27; Phantom of Chaos; sim: 51.1% contra equipos al azar, 57.2% como líder). Meliodas, el Dragón del Pecado de la Ira (Nanatsu no Taizai), capitán de los Siete Pecados
// Capitales: contraataca cuando golpean a sus aliados, devuelve los debuffs (Full Counter), acumula el daño recibido en la
// Marca del Demonio y lo libera, y crece con cada curación enemiga. Su Over "cura" a los enemigos: con Quemadura Solar,
// esa curación se vuelve daño.
export default {
  id: 'meliodas',
  franquicia: 'Nanatsu no Taizai', grupos: [],   // campaña: aún sin tema propio
  nombre: 'Meliodas',
  rol: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🐉', color: '#7c3aed', imagen: 'assets/personajes/meliodas.webp',
  base: { hp: 730, dmg: 75, spd: 112 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Fullcounter Attack',
    desc: 'Cuando un enemigo le aplica un debuff a un aliado, 30% de probabilidad de que Meliodas aplique una copia (misma intensidad y duración) a un enemigo al azar, con su Tirada de Puntería. Las copias no se vuelven a copiar.',
    copiarDebuffAliado: { prob: .30 }, texto: '⚔️ ¡Full Counter!',
  },
  pasiva: {
    nombre: 'Dragón de la Ira',
    desc: 'Cuando un enemigo golpea a un aliado (o a él) con un ataque de un objetivo, 50% de probabilidad de contraatacarlo con uno de sus movimientos disponibles al azar, que entra en cooldown (máx. 1 por ronda; no con Control). Cada curación que recibe un enemigo (también la que la Quemadura Solar vuelve daño) le da +1% de Daño permanente (máx. +50%).',
    gatillo: 'alGolpeAliado', prob: .50, maxPorRonda: 1,
    accion: { tipo: 'usarMovimiento', categoria: 'disponible', gastaCooldown: true, contraataque: true, a: 'atacante' },
    bonoPorCuracionEnemiga: { stat: 'dmgPct', pct: .01, tope: .50 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Llamas del Purgatorio', objetivo: 'enemigo', estilo: 'melee', color: 0x7c3aed,
      pct: .85, cd: 0,
      desc: 'Causa 85% con 60% de probabilidad de aplicar Quemadura Solar (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'solarBurn', dur: 2, prob: .60 } }],
    },
    {
      categoria: 'especial', nombre: 'Contra Venganza', objetivo: 'enemigo', estilo: 'melee', color: 0xa855f7,
      pct: 1.60, cd: 2,
      desc: 'Causa 160%. Libera todo el daño acumulado en su Marca del Demonio sobre un enemigo al azar (ignora Armadura) y gana una Marca del Demonio nueva, que acumula todo el daño que reciba.',
      efectos: [{ cuando: 'final', accion: { tipo: 'liberarAcumulado', marca: 'marcaDemonio', sinArmadura: true, texto: '😈 ¡Contra Venganza!', a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Mil Cortes Divinos', objetivo: 'azar', golpes: 10, estilo: 'melee', color: 0xc084fc,
      pct: .30, cd: 5,
      desc: '10 golpes de 30% a enemigos al azar. Cada golpe cura a todo el equipo enemigo un 5% del HP máx. del golpeado (con Quemadura Solar, esa curación les hace daño). La IA solo lo usa si al menos 2 enemigos tienen Quemadura Solar.',
      iaMinEnemigosCon: { efecto: 'solarBurn', min: 2 },
      efectos: [{ accion: { tipo: 'curar', base: 'hpMaxGolpeado', pct: .05, a: 'todosEnemigos' } }],
    },
  ],
};

import { espacios } from '../reliquias.js';

// Ficha oficial #28 (2026-10-09). Control de Congelación: congela, encierra en el Ataúd de Hielo y remata con la
// Ejecución de Aurora. Su pasiva hace que TODO su equipo castigue a los congelados: brilla en equipos de congelación.
export default {
  id: 'camus',
  franquicia: 'Saint Seiya', grupos: ['santos-de-oro', 'hielo'],   // campaña: temas de las etapas
  nombre: 'Camus',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🧊', color: '#22d3ee', imagen: 'assets/personajes/camus.webp',
  base: { hp: 650, dmg: 60, spd: 106 },
  extra: { acc: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Cero Absoluto',
    desc: 'Todo su equipo (incluido Camus) hace +25% de daño a enemigos con Congelación o Mega Congelación.',
    auraContra: { efecto: 'freeze', pct: .25 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Polvo de Diamante', objetivo: 'enemigo', estilo: 'ranged', color: 0xa5f3fc,
      pct: 1.05, escala: 'dano', cd: 0,
      desc: 'Causa 105% con 35% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Ataúd de Hielo', objetivo: 'enemigo', estilo: 'ranged', color: 0x67e8f9,
      pct: 1.25, escala: 'dano', cd: 3,
      desc: 'Causa 125% y con 70% de probabilidad encierra al enemigo en Mega Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', mega: true, prob: .70 } }],
    },
    {
      categoria: 'over', nombre: 'Ejecución de Aurora', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0f2fe,
      pct: 1.70, escala: 'dano', cd: 5,
      bonoContra: { efecto: 'freeze', pct: .50 },
      desc: 'Causa 170% a todos los enemigos (+50% contra los que ya tengan Congelación) con 60% de probabilidad de Congelación a cada uno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .60 } }],
    },
  ],
};

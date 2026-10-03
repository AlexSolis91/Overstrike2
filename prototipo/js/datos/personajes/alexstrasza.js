import { espacios } from '../reliquias.js';

// Ficha oficial #3 (revisada el 2026-10-01). Incluye su transformación "Dragón de la Vida".
const dragonDeLaVida = {
  nombre: 'Dragón de la Vida',
  emoji: '🐉', color: '#dc2626', imagen: 'assets/transformaciones/dragon-de-la-vida.webp',
  base: { hp: 600, dmg: 40, spd: 82 },
  extra: { armor: .25, res: .25 },                 // parte fija de "Aspecto Carmesí"
  pasiva: {
    nombre: 'Aspecto Carmesí',
    desc: '+25% de Armadura y Resistencia. Cada vez que un aliado recibe una curación, tiene 50% de probabilidad de aplicar Quemadura 5% (2 rondas) a un enemigo al azar.',
    gatillo: 'alCurarAliado',
    accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2, prob: .50, a: { azar: 1 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Aliento de Dragón', objetivo: 'todosAliados', estilo: 'support', color: 0xff6a3d, cd: 0,
      desc: 'Cura a todos los aliados 5% de su HP máx. y les aplica Aura de Fuego (2 rondas).',
      efectos: [
        { accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .05 } },
        { accion: { tipo: 'efecto', id: 'fireAura', dur: 2 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Vuelo del Aspecto Rojo', objetivo: 'todosAliados', estilo: 'support', color: 0xe0f7ff, cd: 3,
      desc: 'Limpia 1 debuff de cada aliado.',
      efectos: [{ accion: { tipo: 'limpiar', cantidad: 1 } }],
    },
    {
      categoria: 'over', nombre: 'Furia de Alexstrasza', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xff3d00, cd: 2,
      desc: 'Activa al instante el daño de las Quemaduras de todos los enemigos (cuenta como daño DoT) y les suma +1 ronda de duración.',
      efectos: [
        { accion: { tipo: 'activarDoT', efecto: 'burn' } },
        { accion: { tipo: 'extenderDuracion', efecto: 'burn', rondas: 1 } },
      ],
    },
  ],
};

export default {
  id: 'alexstrasza',
  nombre: 'Alexstrasza',
  rol: 'Support', rolSecundario: 'DoTer',
  emoji: '🌹', color: '#e11d48', imagen: 'assets/personajes/alexstrasza.webp',
  base: { hp: 600, dmg: 40, spd: 82 },
  extra: {},
  slots: espacios('argonita', 'yelmo', 'anilloCobre', { label: 'Equipación 3', relic: null, bow: true }),

  pasiva: {
    nombre: 'Aspecto de la Vida',
    desc: 'Cada vez que un aliado (que no sea ella) recibe una curación, Alexstrasza se cura el 50% de esa curación.',
    gatillo: 'alCurarAliado',
    accion: { tipo: 'curar', base: 'curacion', pct: .50, a: 'propio' },
  },
  transformacion: dragonDeLaVida,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Fuego Vital', objetivo: 'aliado', estilo: 'support', color: 0xff8a5c, cd: 0,
      desc: 'Cura al aliado 10% de su HP máx. y le aplica Aura de Fuego (2 rondas): quien lo golpee recibe Quemadura 5% (1 turno).',
      efectos: [
        { accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .10 } },
        { accion: { tipo: 'efecto', id: 'fireAura', dur: 2 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Llama Preservadora', objetivo: 'todosAliados', estilo: 'support', color: 0xfb923c, cd: 3,
      desc: 'Los aliados ganan +5% de HP máx. permanente por cada enemigo con Quemadura (el HP actual sube lo mismo).',
      efectos: [{ cuando: 'final', accion: { tipo: 'bonoPermanente', stat: 'hpPct', pct: .05, por: 'quemadurasEnemigas', a: 'todosAliados' } }],
    },
    {
      categoria: 'over', nombre: 'Dragón de la Vida', objetivo: 'propio', estilo: 'support', color: 0xdc2626, cd: 5,
      desc: 'Se transforma en el Dragón de la Vida (3 turnos). 80% de probabilidad de aplicar Quemadura 10% (3 rondas) a cada enemigo y cura a todos los aliados 10% de su HP máx.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'transformar', turnos: 3, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'burn', valor: .10, dur: 3, prob: .80, a: 'todosEnemigos' } },
        { cuando: 'final', accion: { tipo: 'curar', base: 'hpMaxObjetivo', pct: .10, a: 'todosAliados' } },
      ],
    },
  ],
};

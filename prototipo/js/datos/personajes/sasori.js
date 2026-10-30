import { espacios } from '../reliquias.js';

// Ficha oficial #43 (2026-10-16). Sasori de la Arena Roja, el Maestro Marionetista (Naruto, Akatsuki). Su cuerpo es una
// marioneta: inmune a Veneno y Sangrado. Pelea con marionetas cargadas del veneno más letal de la Arena: la cola de Hiruko,
// la Marioneta del Tercer Kazekage (invocación con Arena de Hierro) y el Ejército de las Cien Marionetas, que hace estallar
// al instante todos los Venenos de los enemigos. Sus golpes pegan más cuantas más acumulaciones de Veneno tenga el objetivo
// (sinergia con equipos de Veneno). Sin habilidad de líder.
export default {
  id: 'sasori',
  franquicia: 'Naruto', grupos: ['akatsuki', 'renegados', 'arena', 'marionetistas'],   // campaña: temas de las etapas
  nombre: 'Sasori',
  rol: 'Invoker', rolSecundario: 'DoTer',
  sobres: ['phantom'],
  starter: 'noxious',
  emoji: '🎭', color: '#b91c1c', imagen: 'assets/personajes/sasori.webp',
  base: { hp: 650, dmg: 62, spd: 92 },
  extra: {},
  slots: espacios('argonita', 'pechera', 'amuletoPantano'),

  pasiva: {
    nombre: 'Cuerpo de Marioneta',
    desc: 'Su cuerpo es una marioneta: es inmune a Veneno y Sangrado. Veneno de la Arena Roja: sus movimientos de ataque hacen +15% de daño por cada acumulación de Veneno del objetivo (máx. 5).',
    inmuneA: ['poison', 'bleed', 'hemo'],
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Cola de Hiruko', objetivo: 'enemigo', estilo: 'melee', color: 0x7c2d12,
      pct: 1.05, escala: 'dano', cd: 0, bonoPorAcumulacion: { efecto: 'poison', pct: .15, max: 5 },
      desc: 'Causa 105% (+15% por cada Veneno del objetivo, máx. 5) con 50% de probabilidad de Veneno.',
      efectos: [{ accion: { tipo: 'efecto', id: 'poison', prob: .50 } }],
    },
    {
      categoria: 'especial', nombre: 'Marioneta del Tercer Kazekage', objetivo: 'enemigo', estilo: 'ranged', color: 0x57534e,
      pct: .95, escala: 'dano', cd: 3, bonoPorAcumulacion: { efecto: 'poison', pct: .15, max: 5 },
      desc: 'Causa 95% (+15% por cada Veneno del objetivo) con 50% de probabilidad de Veneno e invoca a la Marioneta del Tercer Kazekage (3 turnos): cada turno, Arena de Hierro a todos los enemigos (60%) con 60% de probabilidad de Veneno a cada uno.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .50 } },
        { cuando: 'final', accion: { tipo: 'invocar', key: 'tercerKazekage', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Ejército de las Cien Marionetas', objetivo: 'azar', golpes: 8, estilo: 'ranged', color: 0xb91c1c,
      pct: .32, escala: 'dano', cd: 4, bonoPorAcumulacion: { efecto: 'poison', pct: .15, max: 5 },
      desc: '8 golpes de 32% a enemigos al azar (+15% por cada Veneno del objetivo), cada uno con 30% de probabilidad de Veneno. Al final, todos los Venenos de todos los enemigos hacen su daño al instante (todas sus acumulaciones, sin gastarse).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .30 } },
        { cuando: 'final', accion: { tipo: 'activarDoT', efecto: 'poison', a: 'todosEnemigos' } },
      ],
    },
  ],
};

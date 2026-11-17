import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-16, kit del usuario). Garou, el Cazador de Héroes (One Punch Man): caza al héroe más fuerte (Saitama si
// está), aprende de cada golpe que recibe y de cada técnica que ve (Despertar) hasta convertirse para siempre en Garou Cósmico,
// que copió el poder de Saitama: inmune a Control, se potencia al azar cada turno y copia los Over enemigos (+150% de Daño esa ronda).
// Sin habilidad de líder (lobo solitario).
const BUFFS_COSMICOS = ['dmgUp', 'frenzy', 'bloodlust'];

const garouCosmico = {
  nombre: 'Garou Cósmico',
  emoji: '🌌', color: '#7c3aed', imagen: 'assets/transformaciones/garou-cosmico.webp',
  base: { hp: 760, dmg: 95, spd: 125 },
  extra: {},
  pasiva: {
    nombre: 'Modo Miedo Cósmico',
    desc: 'Inmune a Control. Rivalidad: +40% de daño a su Rival 👑. Al inicio de cada uno de sus turnos tiene 50% de probabilidad de ganar Furia, 50% de Frenesí y 50% de Letalidad (cada uno por separado, 1 ronda). Copia de Técnicas: cada vez que un enemigo usa su Over, gana +150% de Daño hasta el final de esa ronda (se acumula).',
    inmuneA: ['Control'],
    rival: { id: 'saitama', bono: .40, sinOrgullo: true },
    gatillo: 'alIniciarTurno',
    accion: { tipo: 'multiple', a: 'propio', acciones: BUFFS_COSMICOS.map(id => ({ tipo: 'efecto', id, dur: 1, prob: .50 })) },
    tambien: [
      { gatillo: 'alUsarMovimientoEnemigo', filtro: { categorias: ['over'] }, accion: { tipo: 'bonoRonda', stat: 'dmgPct', pct: 1.50, a: 'propio' } },
    ],
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño Cósmico de Flujo', objetivo: 'enemigo', estilo: 'melee', color: 0x8b5cf6,
      pct: 2.00, escala: 'dano', cd: 0,
      desc: 'Causa 200% y le roba 1 buff al objetivo.',
      efectos: [{ cuando: 'final', accion: { tipo: 'robarBuffs', cantidad: 1 } }],
    },
    {
      categoria: 'especial', nombre: 'Estallido de Rayos Gamma', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xa855f7, cd: 3,
      pct: 1.40, escala: 'dano',
      desc: 'Causa 140% a todos los enemigos con 40% de probabilidad de Debilitar (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'weaken', dur: 2, prob: .40 } }],
    },
    {
      categoria: 'over', nombre: 'Fisión Nuclear Cósmica', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x6d28d9, cd: 6,
      pct: 3.50, escala: 'dano',
      desc: 'Causa 350% a todos los enemigos y aplica Miedo (2 rondas) y Sangrado a cada enemigo golpeado.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'fear', dur: 2 } },
        { accion: { tipo: 'efecto', id: 'bleed' } },
      ],
    },
  ],
};

const DESPERTAR = n => ({ tipo: 'ganarCargas', cantidad: n, max: 5, efecto: 'despertarGarou', a: 'propio' });

export default {
  id: 'garou',
  franquicia: 'One Punch Man', grupos: ['villanos'],   // campaña: temas de las etapas
  nombre: 'Garou',
  rol: 'Daño',
  sobres: ['warriors'],  // sobres de la tienda (ver js/datos/sobres.js); Unbreakable Force incluye a todos
  emoji: '🐺', color: '#dc2626', imagen: 'assets/personajes/garou.webp',
  base: { hp: 700, dmg: 75, spd: 118 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Cazador de Héroes',
    desc: 'Rivalidad: al empezar marca como Rival 👑 a Saitama (si está en el equipo enemigo) o al enemigo con más Daño, y le hace +30% de daño; si su Rival muere, elige otro. Gana 1 de Despertar 🐺 con cada golpe que recibe y cada vez que un enemigo usa su Over (máx. 5). Con 5 se transforma para siempre en Garou Cósmico. La primera vez que caería, queda con 30% de HP y se transforma. Al transformarse gana Furia, Frenesí y Letalidad (1 ronda) y un turno extra.',
    rival: { id: 'saitama', bono: .30, sinOrgullo: true },
    transformarConCargas: { efecto: 'despertarGarou', cargas: 5 },
    ultimoAliento: { hp: .30, transformar: true },
    gatillo: 'alTransformarse',
    accion: { tipo: 'multiple', a: 'propio', acciones: [...BUFFS_COSMICOS.map(id => ({ tipo: 'efecto', id, dur: 1 })), { tipo: 'turnoExtra' }] },
    tambien: [
      { gatillo: 'alRecibirGolpe', accion: DESPERTAR(1) },
      { gatillo: 'alUsarMovimientoEnemigo', filtro: { categorias: ['over'] }, accion: DESPERTAR(1) },
    ],
  },
  transformacion: garouCosmico,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño de Flujo del Agua que Rompe Rocas', objetivo: 'enemigo', estilo: 'melee', color: 0x38bdf8,
      pct: 2.20, escala: 'dano', cd: 0,
      desc: 'Causa 220% con 50% de probabilidad de ganar Contraataque (1 ronda).',
      efectos: [{ cuando: 'final', accion: { tipo: 'efecto', id: 'counter', dur: 1, prob: .50, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Arte Marcial Mixta', objetivo: 'enemigo', estilo: 'melee', color: 0xf97316,
      pct: .40, golpes: 5, escala: 'dano', cd: 3,
      desc: '5 golpes de 40% al mismo objetivo. Cada golpe tiene 50% de probabilidad de aplicar un debuff al azar: Debilitar, Desgaste o Expuesto (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', idAzar: ['weaken', 'wear', 'expuesto'], dur: 2, prob: .50 } }],
    },
    {
      categoria: 'over', nombre: 'Modo Monstruo Humano', objetivo: 'enemigo', estilo: 'melee', color: 0xdc2626,
      pct: 2.50, escala: 'dano', cd: 5, bonoRival: .50,
      desc: 'Causa 250% (+50% si el objetivo es su Rival) con 50% de probabilidad de Miedo (2 rondas). Gana 2 de Despertar.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'fear', dur: 2, prob: .50 } },
        { cuando: 'final', accion: DESPERTAR(2) },
      ],
    },
  ],
};

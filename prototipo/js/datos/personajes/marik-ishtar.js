import { espacios } from '../reliquias.js';

// Ficha oficial (2026-10-28; Phantom of Chaos; sim: 54.3% contra equipos al azar, 59.2% como líder). Marik Ishtar (Yu-Gi-Oh!), líder de los Cazadores Raros: invoca monstruos al azar cada turno,
// sacrifica el Huevo del Sol (o 3 monstruos) para traer al Dragón Alado de Ra y, herido con Ra en el campo, se funde con él
// en Ra Modo Fénix (permanente): inmune a debuffs, combina Quemadura y Quemadura Solar, y cambia su habilidad de líder.

const raModoFenix = {
  nombre: 'Ra Modo Fénix',
  emoji: '🔥', color: '#f59e0b', imagen: 'assets/transformaciones/ra-modo-fenix.webp',
  base: { hp: 670, dmg: 68, spd: 88 },
  extra: {},
  lider: {
    nombre: 'Dios Definitivo del Sol',
    desc: 'Cuando la Quemadura Solar le hace daño a un enemigo, ese daño se reparte como curación entre los aliados vivos.',
    curaPorQuemaduraSolar: true,
  },
  pasiva: {
    nombre: 'Fénix Invencible',
    desc: 'Inmune a debuffs. Cada golpe a un enemigo con algún debuff le da +5% de Daño Crítico permanente (máx. +100%). Cuando una Quemadura daña a un enemigo con Quemadura Solar, ese enemigo recibe una "curación" igual a ese daño (la Quemadura Solar la vuelve daño).',
    inmuneA: ['debuff'],
    acumulaCriticoContra: { efecto: 'debuff', valor: .05, tope: 1, stats: ['critDmg'] },
    gatillo: 'alDanoDoT', filtro: { tipo: 'burn', en: 'enemigos', objetivoTiene: 'solarBurn' },
    accion: { tipo: 'curar', base: 'dano', pct: 1, a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Fuego Negro', objetivo: 'enemigo', estilo: 'ranged', color: 0xf59e0b,
      pct: 1.75, cd: 0,
      desc: 'Causa 175%. Si el objetivo tenía Quemadura Solar, le aplica Quemadura 10% (2 rondas); si tenía Quemadura, le aplica Quemadura Solar (2 rondas).',
      efectos: [
        { condicion: { objetivoTeniaAntes: 'solarBurn' }, accion: { tipo: 'efecto', id: 'burn', valor: .10, dur: 2 } },
        { condicion: { objetivoTeniaAntes: 'burn' }, accion: { tipo: 'efecto', id: 'solarBurn', dur: 2 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Cañón de las Llamas del Sol', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfbbf24,
      pct: 1.75, cd: 2,
      desc: 'Causa 175% a todos los enemigos y les baja 3% de HP máx. por cada debuff que tenían (para toda la partida; máx. −30% en total).',
      efectos: [{ accion: { tipo: 'reducirHpMax', pct: .03, porDebuffs: true, tope: .30 } }],
    },
    {
      categoria: 'over', nombre: 'Incineración de Fénix Divino', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xef4444,
      pct: 2.9, cd: 4,
      desc: 'Causa 290% a todos los enemigos y activa al instante el daño de sus Quemaduras. Si alguno tenía Quemadura Solar, después lanza un Fuego Negro a un enemigo al azar.',
      efectos: [
        { accion: { tipo: 'activarDoT', efecto: 'burn' } },
        { cuando: 'final', condicion: { algunGolpeadoTenia: 'solarBurn' }, accion: { tipo: 'usarMovimiento', categoria: 'basico', despues: true, a: { azar: 1 } } },
      ],
    },
  ],
};

export default {
  id: 'marik-ishtar',
  franquicia: 'Yu-Gi-Oh!', grupos: [],   // campaña: aún sin tema propio
  nombre: 'Marik Ishtar',
  rol: 'Invocador', rolSecundario: 'Control',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '👁️', color: '#a855f7', imagen: 'assets/personajes/marik-ishtar.webp',
  base: { hp: 620, dmg: 58, spd: 90 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'El Reino de las Sombras',
    desc: 'Cuando un aliado golpea a un enemigo con un movimiento de un objetivo o de varios golpes (no de área), 50% de probabilidad de sumarle 1 turno de cooldown a su Especial u Over (una tirada por movimiento y enemigo).',
    cooldownAlGolpear: { prob: .50, cantidad: 1, categorias: ['especial', 'over'] },
  },
  pasiva: {
    nombre: 'Duelista Retorcido',
    desc: 'Al inicio de cada uno de sus turnos invoca un monstruo al azar (máx. 3; si está lleno, reemplaza al de menor duración, nunca al Dragón Alado de Ra). Si su HP queda en 50% o menos con el Dragón Alado de Ra en el campo, se funde con él y renace con toda su vida como Ra Modo Fénix (para siempre).',
    gatillo: 'alIniciarTurno',
    accion: { tipo: 'invocarAzar', tabla: 'monstruosMarik', a: 'propio' },
    transformarSi: { hpMenor: .50, invocacion: 'raAlado', consumir: true, hp: 1 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe de las Sombras', objetivo: 'enemigo', estilo: 'melee', color: 0xa855f7,
      pct: 1.6, cd: 0,
      desc: 'Causa 160% e invoca un monstruo al azar.',
      efectos: [{ cuando: 'final', accion: { tipo: 'invocarAzar', tabla: 'monstruosMarik', a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Ataque Directo', objetivo: 'enemigo', estilo: 'melee', color: 0x7c3aed,
      pct: 2.55, cd: 2,
      desc: 'Causa 255%. Todas sus invocaciones repiten su efecto al aparecer y atacan de inmediato.',
      efectos: [{ cuando: 'final', accion: { tipo: 'potenciarInvocaciones', conAparecer: true, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Canto del Dios del Sol', objetivo: 'propio', estilo: 'support', color: 0xfacc15,
      cd: 1, requiereInvocaciones: { key: 'huevoSol', o: 3 },
      desc: 'Se cura 8% de su HP máx. Sacrifica el Huevo del Sol (o, si no lo tiene, 3 invocaciones) e invoca al Dragón Alado de Ra. Requiere el Huevo del Sol o 3 invocaciones.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', pct: .08, escala: 'hpMax', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'sacrificarInvocar', sacrificio: 'huevoSol', o: 3, key: 'raAlado', a: 'propio' } },
      ],
    },
  ],
  transformacion: raModoFenix,
};

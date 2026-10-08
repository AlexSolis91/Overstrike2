import { espacios } from '../reliquias.js';

// Ficha oficial #23 (2026-10-08, ajustada tras la simulación: ~53% de victorias, objetivo 50–60%). Tres formas: Naruto (Clones de Sombra y "Nunca me rindo") → Modo Rikudo
// (permanente: reparte chakra y disipa con las Esferas Buscadoras de la Verdad) → Modo Barión (4 turnos, una vez por
// partida: quema su vida y la fuerza vital del enemigo; al terminar, Kurama se despide y vuelve al Modo Rikudo).

const narutoModoBarion = {
  nombre: 'Naruto Modo Barión',
  emoji: '🦊', color: '#ea580c', imagen: 'assets/transformaciones/naruto-modo-barion.webp',
  base: { hp: 760, dmg: 120, spd: 115 },
  extra: { res: .10 },
  pasiva: {
    nombre: 'Fusión con Kurama',
    desc: 'Cada golpe de Naruto reduce 5% el HP máx. del objetivo para el resto de la partida (hasta −30%). Al final de cada turno de Naruto, pierde 3% de su propio HP máx. (nunca baja de 1 HP).',
    gatillo: 'alGolpear', filtro: { en: 'enemigos' },
    accion: { tipo: 'reducirHpMax', pct: .05, tope: .30, a: 'objetivo' },
    drenajePropio: .03,
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe Barión', objetivo: 'enemigo', estilo: 'melee', color: 0xf97316,
      pct: 1.40, escala: 'dano', cd: 0,
      desc: 'Causa 140%.',
    },
    {
      categoria: 'especial', nombre: 'Rasengan Barión', objetivo: 'enemigo', estilo: 'melee', color: 0xfb923c,
      pct: 2.20, escala: 'dano', cd: 2,
      desc: 'Causa 220%.',
    },
    {
      categoria: 'over', nombre: 'Último Golpe de Kurama', objetivo: 'enemigo', estilo: 'melee', color: 0xea580c,
      pct: 2.60, escala: 'dano', cd: 2,
      desc: 'Causa 260%.',
    },
  ],
};

const narutoModoRikudo = {
  nombre: 'Naruto Modo Rikudo',
  emoji: '☯️', color: '#facc15', imagen: 'assets/transformaciones/naruto-modo-rikudo.webp',
  base: { hp: 700, dmg: 96, spd: 98 },
  extra: { res: .10 },
  pasiva: {
    nombre: 'Chakra de los Seis Caminos',
    desc: 'Al inicio de cada ronda, el aliado más herido recibe un Escudo del 8% del HP máx. de Naruto.',
    gatillo: 'alIniciarRonda',
    accion: { tipo: 'escudo', pct: .08, escala: 'hpMax', a: 'aliadoMasHerido' },
  },
  transformacion: narutoModoBarion,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Rasenshuriken', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x93c5fd,
      pct: .70, escala: 'dano', cd: 0,
      desc: 'Causa 70% a todos los enemigos.',
    },
    {
      categoria: 'especial', nombre: 'Esferas Buscadoras de la Verdad', objetivo: 'azar', golpes: 3, estilo: 'ranged', color: 0x1f2937,
      pct: 1.50, escala: 'dano', cd: 2,
      desc: '3 golpes de 150% a enemigos al azar (pueden repetirse). Cada golpe disipa 1 buff del enemigo.',
      efectos: [{ accion: { tipo: 'disipar', cantidad: 1 } }],
    },
    {
      categoria: 'over', nombre: 'Modo Barión', objetivo: 'propio', estilo: 'support', color: 0xea580c, cd: 4, unaVez: true,
      desc: 'Se transforma en Naruto Modo Barión durante 4 turnos propios y ataca de inmediato con Golpe Barión a un enemigo al azar. Solo una vez por partida: al terminar, Kurama se despide y Naruto vuelve al Modo Rikudo.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'transformar', turnos: 4, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'usarMovimiento', categoria: 'basico', despues: true, a: { distintos: 1 } } },
      ],
    },
  ],
};

export default {
  id: 'naruto',
  nombre: 'Naruto',
  rol: 'Daño', rolSecundario: 'Invocador',
  sobres: [],  // solo en Unbreakable Force (marcar «Solo su sobre» en el panel de Administrador)
  emoji: '🍥', color: '#f97316', imagen: 'assets/personajes/naruto.webp',
  base: { hp: 650, dmg: 86, spd: 92 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Nunca Me Rindo',
    desc: 'La primera vez que recibiría un golpe mortal, queda con 1 HP y se transforma en el acto en Naruto Modo Rikudo.',
    ultimoAliento: { transformar: true },
  },
  transformacion: narutoModoRikudo,
  movimientos: [
    {
      categoria: 'basico', nombre: 'Rasengan', objetivo: 'enemigo', estilo: 'melee', color: 0x60a5fa,
      pct: 1.10, escala: 'dano', cd: 0,
      desc: 'Causa 110% con 50% de probabilidad de invocar 1 Clon de Sombra.',
      efectos: [{ cuando: 'final', accion: { tipo: 'invocar', key: 'clonSombra', prob: .50, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Jutsu Clones de Sombra Múltiples', objetivo: 'propio', estilo: 'support', color: 0xf97316, cd: 3,
      desc: 'Invoca 2 Clones de Sombra (golpean 60% a un enemigo al azar después de cada turno de Naruto; duran 2 turnos; máx. 3).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'invocar', key: 'clonSombra', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'invocar', key: 'clonSombra', a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Modo Sabio de los Seis Caminos', objetivo: 'propio', estilo: 'support', color: 0xfacc15, cd: 2,
      desc: 'Transformación permanente en Naruto Modo Rikudo y ataca de inmediato con Rasenshuriken (70% a todos los enemigos).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'transformar', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'usarMovimiento', categoria: 'basico', despues: true, a: { distintos: 1 } } },
      ],
    },
  ],
};

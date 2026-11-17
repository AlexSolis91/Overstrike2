import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-17, kit del usuario). Blast, Clase S Rango 1 (One Punch Man): el héroe más fuerte, casi nunca visto,
// "héroe por hobby" que aparece cuando las cosas están perdidas (salvó a una Tatsumaki niña). Busca los Cubos de Dios y domina
// la teletransportación con portales dimensionales y la gravedad (desvió con un portal los ataques de Garou Cósmico).
// Sin habilidad de líder (trabaja solo).
const CUBO = { tipo: 'ganarCargas', cantidad: 1, max: 5, efecto: 'cubosDios', a: 'propio' };

export default {
  id: 'blast',
  franquicia: 'One Punch Man', grupos: ['justicieros'],   // campaña: temas de las etapas
  nombre: 'Blast',
  rol: 'Daño', rolSecundario: 'Control',
  sobres: ['warriors'],  // sobres de la tienda (ver js/datos/sobres.js); Unbreakable Force incluye a todos
  emoji: '🌌', color: '#93c5fd', imagen: 'assets/personajes/blast.webp',
  base: { hp: 730, dmg: 75, spd: 114 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Héroe por Hobby',
    desc: 'Al rescate: la primera vez que cada aliado queda con 30% de HP o menos, Blast se teletransporta a su lado: le da un Escudo del 50% del HP máx. de Blast (2 rondas) y gana 1 Cubo de Dios 🧊. Cada vez que un enemigo usa su Especial o su Over, Blast gana 1 turno extra (máx. 3 por ronda). Gana 1 Cubo al inicio de cada ronda (máx. 5). Agujero Dimensional: una vez por ronda, cuando un enemigo usa su Over contra un solo aliado, 50% de probabilidad de abrir un portal y que el Over completo caiga sobre otro enemigo al azar.',
    redirigirOver: { prob: .50, maxPorRonda: 1, texto: '🌀 Agujero Dimensional' },
    gatillo: 'alUsarMovimientoEnemigo', filtro: { categorias: ['especial', 'over'] },
    accion: { tipo: 'turnoExtra', a: 'propio', maxPorRonda: 3, clave: 'blast' },
    tambien: [
      { gatillo: 'alAliadoHpBajo', hp: .30, accion: { tipo: 'escudo', pct: .50, dur: 2, a: 'objetivo' } },
      { gatillo: 'alAliadoHpBajo', hp: .30, accion: CUBO },
      { gatillo: 'alIniciarRonda', accion: CUBO },
    ],
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Golpe Gravitatorio', objetivo: 'enemigo', estilo: 'melee', color: 0x93c5fd,
      pct: 1.10, escala: 'dano', cd: 0,
      desc: 'Causa 110% con 30% de probabilidad de dejarlo Expuesto (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'expuesto', dur: 2, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Portal Dimensional', objetivo: 'enemigo', estilo: 'melee', color: 0x60a5fa, cd: 3,
      pct: 1.70, escala: 'dano', ignoraProvocacion: true,
      desc: 'Aparece por un portal a la espalda de cualquier enemigo (ignora Provocación y Sigilo): causa 170%, gana Esquivar (1 ronda) y 1 Cubo de Dios.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'esquivar', dur: 1, a: 'propio' } },
        { cuando: 'final', accion: CUBO },
      ],
    },
    {
      categoria: 'over', nombre: 'Colapso Gravitacional', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x1e3a8a, cd: 5,
      pct: 1.40, escala: 'dano', consumeCargas: { pct: .35, efecto: 'cubosDios' },
      desc: 'Un pequeño agujero negro aplasta a todos los enemigos: 140% (+35% por cada Cubo de Dios, que consume) con 60% de Aturdimiento y Desgaste a cada enemigo golpeado.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'stun', prob: .60 } },
        { accion: { tipo: 'efecto', id: 'wear' } },
      ],
    },
  ],
};

import { espacios } from '../reliquias.js';

// Ficha oficial #42 (2026-10-16). Gaara del Desierto, Quinto Kazekage (Naruto). Defensa Absoluta: su arena se mueve sola, le
// regenera un Escudo cada ronda y se interpone en los golpes a sus aliados (protector). Ataúd de Arena aturde, Escudo de Arena
// protege a todo el equipo y el Funeral de la Cascada de Arena castiga con la arena acumulada en los Escudos de su equipo.
// Sinergia: protege a atacantes frágiles (equipos de rol Daño). Líder: Quinto Kazekage.
export default {
  id: 'gaara',
  franquicia: 'Naruto', grupos: ['kages', 'jinchuriki', 'arena'],   // campaña: temas de las etapas
  nombre: 'Gaara',
  rol: 'Tanque', rolSecundario: 'Support',
  sobres: ['sacred'],
  emoji: '⏳', color: '#c2410c', imagen: 'assets/personajes/gaara.webp',
  base: { hp: 820, dmg: 48, spd: 70 },
  extra: { armor: .15 },                      // Armadura de Arena
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Quinto Kazekage',
    desc: 'Protege a su aldea: al inicio de cada ronda, el aliado más herido recibe un Escudo del 6% del HP máx. de Gaara.',
    alIniciarRonda: { tipo: 'escudo', pct: .06, escala: 'hpMax', a: 'aliadoMasHerido' },
  },
  pasiva: {
    nombre: 'Defensa Absoluta',
    desc: 'La arena lo protege sola: al inicio de cada ronda gana un Escudo del 8% de su HP máx. y recibe en lugar de sus aliados el 20% de cada golpe que les den (con su propia Armadura).',
    gatillo: 'alIniciarRonda',
    accion: { tipo: 'escudo', pct: .08, escala: 'hpMax', a: 'propio' },
    protector: { pct: .20 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Ataúd de Arena', objetivo: 'enemigo', estilo: 'ranged', color: 0xd97706,
      pct: .90, escala: 'hp', cd: 0,
      desc: 'Causa 90% (escala por HP) con 25% de probabilidad de Aturdimiento.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Escudo de Arena', objetivo: 'todosAliados', estilo: 'support', color: 0xf59e0b,
      cd: 3,
      desc: 'Todos los aliados reciben un Escudo del 12% del HP máx. de Gaara y él gana Provocación (1 ronda).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'escudo', pct: .12, escala: 'hpMax', a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 1, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Funeral de la Cascada de Arena', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xb45309,
      pct: .90, escala: 'hp', cd: 4,
      desc: 'Causa 90% a todos los enemigos (escala por HP) con 30% de probabilidad de Aturdimiento. Luego la arena reparte al azar entre los enemigos daño igual al 50% de la suma de los Escudos de su equipo.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'stun', prob: .30 } },
        { cuando: 'final', accion: { tipo: 'danoRepartido', base: 'escudosEquipo', pct: .50, paquetes: 10, a: 'propio' } },
      ],
    },
  ],
};

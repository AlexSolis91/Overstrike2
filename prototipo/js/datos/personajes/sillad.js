import { espacios } from '../reliquias.js';

// Ficha oficial #55 (2026-10-19, Control de Congelación / Support; el resto "a tu criterio"). Sillad, el Monarca de la
// Escarcha (Solo Leveling): rey de los Elfos de Hielo y uno de los Monarcas que combatieron a los Gobernantes. Su frío no
// lo afecta, bendice a los suyos que dominan el hielo y su Over levanta su reino de escarcha eterna, que congela al enemigo
// ronda tras ronda. Habilidad de líder: es un rey que comanda su ejército de elfos de hielo.
export default {
  id: 'sillad',
  franquicia: 'Solo Leveling', grupos: ['monarcas', 'hielo'],   // campaña: Los Monarcas y Frío Eterno
  nombre: 'Sillad',
  rol: 'Control', rolSecundario: 'Support',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🧊', color: '#38bdf8', imagen: 'assets/personajes/sillad.webp',
  base: { hp: 680, dmg: 60, spd: 98 },
  extra: { acc: .15 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de los Elfos de Hielo',
    desc: 'Todos los aliados tienen +10% de HP máx. y +10% de Puntería.',
    bonoStat: { hpPct: .10, acc: .10 },
  },
  pasiva: {
    nombre: 'Monarca de la Escarcha',
    desc: 'Inmune a Congelación. Bendición de la Escarcha: cada aliado (incluido él) cuyos movimientos aplican Congelación gana +10% de Daño y +6% de Velocidad todo el combate.',
    inmuneA: ['freeze'],
    marcaAliadosQueAplican: { efecto: 'freeze', marca: 'escarchaSillad', bono: { dmgPct: .10, spdPct: .06 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Lanza de la Escarcha', objetivo: 'enemigo', estilo: 'ranged', color: 0x7dd3fc,
      pct: .57, escala: 'dano', cd: 0,
      desc: 'Causa 57% con 35% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Ventisca del Monarca', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xbae6fd, cd: 3,
      pct: .45, escala: 'dano',
      desc: 'Una ventisca helada: 45% a todos los enemigos con 40% de probabilidad de Congelación. Todos los aliados ganan un Escudo del 50% del HP máx. de Sillad (1 ronda).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .40 } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Reino de la Escarcha Eterna', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0f2fe,
      pct: .53, escala: 'dano', cd: 5,
      desc: 'Congela el campo de batalla: 53% a todos los enemigos con 50% de probabilidad de Congelación, y levanta su reino (3 rondas): su equipo tiene +10% de Resistencia, y al inicio de cada ronda cada enemigo tiene 15% de probabilidad de Congelarse.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .50 } },
        { cuando: 'final', accion: { tipo: 'zona', dur: 3, a: 'propio', zona: {
          nombre: 'Reino de la Escarcha Eterna', icono: '🏔️',
          desc: 'su equipo +10% Resistencia; al inicio de cada ronda, 15% de Congelación a cada enemigo',
          bono: { res: .10 },
          alIniciarRonda: { tipo: 'efecto', id: 'freeze', prob: .15, a: 'todosEnemigos' },
        } } },
      ],
    },
  ],
};

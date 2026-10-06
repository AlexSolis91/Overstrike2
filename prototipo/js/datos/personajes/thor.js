import { espacios } from '../reliquias.js';

// Ficha oficial #15 (revisada el 2026-10-06). Thor, Rey de Asgard: debilita en área, potencia a todo su equipo con
// Mjölnir y remata con una explosión que crece con cada tipo de debuff del enemigo. Su Over llega antes cuando el
// rival usa los suyos.
export default {
  id: 'thor',
  nombre: 'Thor',
  rol: 'Daño', rolSecundario: 'Support',
  sobres: ['sacred'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '⚡', color: '#3b82f6', imagen: 'assets/personajes/thor.webp',
  base: { hp: 690, dmg: 86, spd: 91 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Rey de Asgard',
    desc: 'Todos los aliados ganan +15% de Armadura.',
    bonoStat: { armor: .15 },
  },
  pasiva: {
    nombre: 'Voluntad de Asgard',
    desc: 'Cada vez que un enemigo usa su Over, los cooldowns de todos los movimientos de Thor bajan 1.',
    gatillo: 'alUsarMovimientoEnemigo', filtro: { categorias: ['over'] },
    accion: { tipo: 'reducirCooldown', cantidad: 1, a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Tormenta Creciente', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x60a5fa,
      pct: .50, escala: 'dano', cd: 0,
      desc: 'Causa 50% a todos los enemigos. Cada uno tiene 30% de probabilidad de recibir Debilitar (2 rondas).',
      efectos: [{ accion: { tipo: 'efecto', id: 'weaken', dur: 2, prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Impacto de Mjölnir', objetivo: 'enemigo', estilo: 'melee', color: 0x93c5fd,
      pct: 1.70, escala: 'dano', cd: 3,
      desc: 'Causa 170%. Todos los aliados ganan Celeridad y Furia (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'haste', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Explosión Divina', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xbfdbfe,
      pct: 1.50, escala: 'dano', cd: 6,
      desc: 'Causa 150% a todos los enemigos, +30% contra cada uno por cada tipo distinto de debuff que tenga. Thor se cura 20% de su HP máx. por cada enemigo eliminado.',
      bonoPorDebuffs: { pct: .30 },
      efectos: [{ cuando: 'final', accion: { tipo: 'curar', pct: .20, escala: 'hpMax', porCada: 'eliminados', a: 'propio' } }],
    },
  ],
};

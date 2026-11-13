import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-13, kit del usuario; estadísticas a criterio). Padmé Amidala, Reina de Naboo y senadora (Star Wars).
// Soporte · Control: no ataca. Cura y limpia a sus aliados, y lo que limpia se lo devuelve a un enemigo; castiga los buffs
// enemigos con Confusión y los disipa para curar a su equipo. Su Over adelanta los turnos de su equipo y atrasa los del rival.
// Líder (Reina de Naboo): los ataques de su equipo pueden confundir.
export default {
  id: 'padme-amidala',
  franquicia: 'Star Wars', grupos: ['jedi'],   // campaña: temas de las etapas
  nombre: 'Padmé Amidala',
  rol: 'Support', rolSecundario: 'Control',
  sobres: ['warriors'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '👑', color: '#f59e0b', imagen: 'assets/personajes/padme-amidala.webp',
  base: { hp: 600, dmg: 45, spd: 98 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Reina de Naboo',
    desc: 'Cada ataque de un aliado tiene 10% de probabilidad de aplicar Confusión a cada enemigo que golpea.',
    efectoAlGolpear: { id: 'confuse', prob: .10 },
  },
  pasiva: {
    nombre: 'Negociaciones Hostiles',
    desc: 'Cada debuff que Padmé limpia de un aliado se lo aplica a un enemigo al azar (misma intensidad y duración). Cada vez que un enemigo recibe un buff, 50% de probabilidad de aplicarle Confusión.',
    devolverLimpiados: true, textoDevolver: '↩️ ¡Negociaciones Hostiles!',
    gatillo: 'alEnemigoRecibeEfecto', filtro: { tipoEfecto: 'buff' }, prob: .50,
    accion: { tipo: 'efecto', id: 'confuse', a: 'objetivo' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Solución Diplomática', objetivo: 'aliado', estilo: 'support', color: 0xfde68a, cd: 0,
      desc: 'Cura a un aliado el 10% del HP máx. de Padmé y le limpia 1 debuff.',
      efectos: [
        { accion: { tipo: 'curar', pct: .10, escala: 'hpMax' } },
        { accion: { tipo: 'limpiar', cantidad: 1 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Orden de Fuego', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf59e0b, cd: 2,
      desc: 'Disipa 1 buff de cada enemigo. Por cada buff disipado, todos los aliados se curan el 5% del HP máx. de Padmé.',
      efectos: [
        { accion: { tipo: 'disipar', cantidad: 1 } },
        { cuando: 'final', accion: { tipo: 'curar', pct: .05, escala: 'hpMax', porCada: 'disipados', a: 'todosAliados' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Voz de la República', objetivo: 'propio', estilo: 'support', color: 0xfef3c7, cd: 4,
      desc: 'Baja 2 turnos el cooldown de todos los movimientos de sus aliados (no el de su propio Over), sube 2 turnos el del Especial y el Over de todos los enemigos y da a su equipo un Escudo del 20% del HP máx. de Padmé (2 rondas).',
      efectos: [
        { accion: { tipo: 'reducirCooldown', cantidad: 2, a: 'otrosAliados' } },
        { accion: { tipo: 'reducirCooldown', cantidad: 2, categorias: ['basico', 'especial'], a: 'propio' } },
        { accion: { tipo: 'sumarCooldown', cantidad: 2, todas: true, categorias: ['especial', 'over'], a: 'todosEnemigos' } },
        { accion: { tipo: 'escudo', pct: .20, dur: 2, a: 'todosAliados' } },
      ],
    },
  ],
};

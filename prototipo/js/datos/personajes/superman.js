import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-05, kit del usuario). Daño + Tanque: protege a sus aliados de los críticos y se endurece al pelear.
// Como líder absorbe la Quemadura Solar del campo y guarda Energía Solar para su Over (solo siendo líder).
export default {
  id: 'superman',
  franquicia: 'DC', grupos: ['justicieros'],   // campaña: temas de las etapas
  nombre: 'Superman',
  rol: 'Daño', rolSecundario: 'Tanque',
  sobres: ['unbreakable'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🦸', color: '#2563eb', imagen: 'assets/personajes/superman.webp',
  base: { hp: 750, dmg: 72, spd: 115 },
  extra: { armor: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Símbolo de Esperanza',
    desc: 'Los aliados ganan +25% de Armadura. Al final de cada ronda quita todas las Quemaduras Solares activas de aliados y enemigos, y por cada una Superman gana 1 de Energía Solar.',
    bonoStat: { armor: .25 },
    alFinalRonda: { tipo: 'absorberEfecto', efecto: 'solarBurn', carga: 'energiaSolar', a: 'propio' },
  },
  pasiva: {
    nombre: 'Hijo de Krypton',
    desc: 'Cada vez que recibe daño, baja 1 turno el cooldown de una de sus habilidades. Si un aliado va a recibir un golpe crítico, Superman recibe el 100% de ese daño en su lugar (con su propia Armadura) y gana +2% de Daño y +2% de HP máx. permanentes.',
    gatillo: 'alRecibirDano',
    accion: { tipo: 'reducirCooldown', cantidad: 1, azar: true, a: 'propio' },
    absorbeCriticos: { bono: { dmgPct: .02, hpPct: .02 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puños de Acero', objetivo: 'enemigo', estilo: 'melee', color: 0x3b82f6,
      pct: 1.40, cd: 0,
      desc: 'Causa 140% a un enemigo. Superman gana +2% de Armadura permanente (máx. +25%).',
      efectos: [{ cuando: 'final', accion: { tipo: 'bonoPermanente', stat: 'armor', pct: .02, tope: .25, a: 'propio' } }],
    },
    {
      categoria: 'especial', nombre: 'Visión de Calor', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xef4444,
      pct: 1.10, cd: 4, ignoraArmadura: .25,
      desc: 'Causa 110% a todos los enemigos e ignora 25 puntos de su Armadura. 60% de probabilidad de aplicar Quemadura (5%, 2 rondas) y 60% de aplicar Quemadura Solar (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2, prob: .60 } },
        { accion: { tipo: 'efecto', id: 'solarBurn', dur: 2, prob: .60 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Superflare', objetivo: 'enemigo', estilo: 'melee', color: 0xfacc15,
      pct: 3.40, cd: 6, criticoSiMasRapido: true, consumeCargas: { efecto: 'energiaSolar', pct: .25 },
      desc: 'Gasta toda su Energía Solar: +25% de daño por cada una. Causa 340% a un enemigo, con crítico seguro si Superman es más rápido que el objetivo, y se cura el 50% del daño causado.',
      efectos: [{ cuando: 'final', accion: { tipo: 'curar', base: 'danoCausado', pct: .50, a: 'propio' } }],
    },
  ],
};

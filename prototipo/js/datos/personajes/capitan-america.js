import { espacios } from '../reliquias.js';

// Ficha oficial (2026-11-02). Capitán América, el centinela de la libertad (Marvel). Tanque que se endurece mientras más
// heridas lleva, protege con su escudo y hace que todo el equipo ataque a su señal. Lideró a los Vengadores: tiene habilidad de líder.
// Sim 2026-11-02: 58.9% vs azar; 64.5% como líder.
export default {
  id: 'capitan-america',
  franquicia: 'Marvel', grupos: ['vengadores'],   // campaña: temas de las etapas
  nombre: 'Capitán América',
  rol: 'Tanque', rolSecundario: 'Support',
  sobres: ['warriors'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🛡️', color: '#2563eb', imagen: 'assets/personajes/capitan-america.webp',
  base: { hp: 800, dmg: 50, spd: 90 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  lider: {
    nombre: 'Líder de los Vengadores',
    desc: 'Todos los aliados ganan +20% de Daño y +20% de Daño Crítico.',
    bonoStat: { dmgPct: .20, critDmg: .20 },
  },
  pasiva: {
    nombre: 'Puedo Hacer Esto Todo el Día',
    desc: 'Por cada 10% de HP que le falte, gana +5% de Armadura, +5% de Resistencia y +2% de Bloqueo.',
    porHpPerdido: { cada: .10, bono: { armor: .05, res: .05, block: .02 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Lanzamiento de Escudo', objetivo: 'enemigo', estilo: 'ranged', color: 0x3b82f6,
      pct: 1.25, escala: 'hp', cd: 0,
      desc: 'Causa 125% (escala por HP). Además, cada uno con 50% de probabilidad y por 1 ronda: gana Provocación, gana Espejismo y gana un Escudo del 50% de su HP máx.',
      efectos: [
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 1, prob: .50, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'mirror', dur: 1, prob: .50, a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: .50, escala: 'hpMax', dur: 1, prob: .50, a: 'propio' } },
      ],
    },
    {
      categoria: 'especial', nombre: '¡Avengers, Unidos!', objetivo: 'enemigo', estilo: 'support', color: 0xef4444,
      cd: 4,
      desc: 'El Capitán y todos sus aliados usan su Básico. Los de un objetivo atacan al enemigo elegido (si cae, a otro al azar); los de área, a sí mismo o a un aliado funcionan normal.',
      efectos: [{ cuando: 'final', accion: { tipo: 'ordenarBasico', todos: true, alObjetivo: true, texto: '🛡️ ¡Avengers, Unidos!', a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'Baluarte de la Libertad', objetivo: 'todosAliados', estilo: 'support', color: 0x93c5fd,
      cd: 5,
      desc: 'El Capitán se cura 50% de su HP máx. y todos los aliados ganan un Escudo del 100% del HP máx. del Capitán (2 rondas).',
      efectos: [
        { cuando: 'final', accion: { tipo: 'curar', pct: .50, escala: 'hpMax', a: 'propio' } },
        { cuando: 'final', accion: { tipo: 'escudo', pct: 1.00, escala: 'hpMax', dur: 2, a: 'todosAliados' } },
      ],
    },
  ],
};

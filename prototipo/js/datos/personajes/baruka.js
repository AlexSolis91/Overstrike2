import { espacios } from '../reliquias.js';

// Ficha oficial #62 (2026-10-20, Congelación y Mega Congelación; el resto "a tu criterio"). Baruka (Solo Leveling): el
// jefe de los Elfos de Hielo de la Puerta Roja, al servicio del Monarca de la Escarcha. Su arma, las Dagas de Baruka, y
// una velocidad que dejó atrás a casi todos los cazadores: si es el más rápido del campo actúa dos veces por ronda, y sus
// tormentas de hielo congelan y ralentizan al enemigo (le roban Velocidad) para que nadie lo alcance. Sin habilidad de líder.
export default {
  id: 'baruka',
  franquicia: 'Solo Leveling', grupos: ['hielo'],   // campaña: Frío Eterno
  nombre: 'Baruka',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🗡️', color: '#3b82f6', imagen: 'assets/personajes/baruka.webp',
  base: { hp: 640, dmg: 62, spd: 108 },
  extra: { critRate: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Jefe de los Elfos de Hielo',
    desc: 'El más veloz de la Puerta Roja: si es el personaje más rápido de todo el campo, gana un turno extra (una vez por ronda).',
    turnoExtraSiMasRapido: true,
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Dagas de Baruka', objetivo: 'enemigo', estilo: 'melee', color: 0x60a5fa,
      pct: .50, escala: 'dano', cd: 0, golpes: 2,
      desc: '2 cortes de 50% con sus dagas heladas, cada uno con 25% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Tormenta de Hielo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x93c5fd,
      pct: .70, escala: 'dano', cd: 3,
      desc: 'Una ventisca de los Elfos de Hielo: 70% a todos los enemigos con 40% de probabilidad de Congelación. A cada enemigo congelado le roba 5% de Velocidad para siempre (tope total 30%).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .40 } },
        { condicion: { objetivoTiene: 'freeze' }, accion: { tipo: 'robarVelocidad', pct: .05, tope: .30 } },
      ],
    },
    {
      categoria: 'over', nombre: 'Danza de las Dagas Heladas', objetivo: 'enemigo', estilo: 'melee', color: 0xbfdbfe,
      pct: .55, escala: 'dano', cd: 5, golpes: 4, criticoSiObjetivoTiene: 'freeze',
      desc: 'Desaparece y reaparece a su espalda: 4 cortes de 55%, crítico seguro si el objetivo está Congelado, cada uno con 30% de probabilidad de Congelación (Mega si ya lo estaba).',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .30 } }],
    },
  ],
};

import { espacios } from '../reliquias.js';

// Ficha oficial #65 (2026-10-21, Tanque; el resto "a tu criterio", fiel al lore). Doomsday (DC): el monstruo creado en
// Krypton a base de morir y renacer, el que mató a Superman. Evolución reactiva: cada golpe que recibe lo endurece (más
// Armadura y Daño permanentes) y, si cae, vuelve a levantarse conservando todo lo que se adaptó. Espolones de hueso que
// desgarran (Sangrado). Sin habilidad de líder: es una fuerza de destrucción, no un líder.
export default {
  id: 'doomsday',
  franquicia: 'DC', grupos: ['villanos'],   // campaña: Ciudad Gótica (DC) y Señores del Caos
  nombre: 'Doomsday',
  rol: 'Tanque', rolSecundario: 'Daño',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🦴', color: '#64748b', imagen: 'assets/personajes/doomsday.webp',
  base: { hp: 820, dmg: 52, spd: 84 },
  extra: { armor: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Evolución Reactiva',
    desc: 'Hasta 3 veces por ronda: cada golpe que recibe lo adapta y gana +2% de Armadura y +2% de Daño permanentes (máx. +30% cada uno). La primera vez que cae, se levanta 2 turnos después con 50% de HP y conserva todo lo que se adaptó.',
    gatillo: 'alRecibirGolpe', maxPorRonda: 3,
    accion: { tipo: 'multiple', a: 'propio', acciones: [
      { tipo: 'bonoPermanente', stat: 'armor', pct: .02, tope: .30 },
      { tipo: 'bonoPermanente', stat: 'dmgPct', pct: .02, tope: .30 },
    ] },
    revivir: { turnos: 2, hp: .50 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puños de Hueso', objetivo: 'enemigo', estilo: 'melee', color: 0x94a3b8,
      pct: 1.00, escala: 'dano', cd: 0,
      desc: 'Golpea con sus espolones de hueso: 100% con 30% de probabilidad de Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: 'Embestida Imparable', objetivo: 'todosEnemigos', estilo: 'melee', color: 0x64748b,
      pct: .80, escala: 'dano', cd: 3,
      desc: 'Arrasa todo a su paso: 80% a todos los enemigos y gana Provocación (2 rondas): quiere que lo golpeen para seguir adaptándose.',
      efectos: [{ cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } }],
    },
    {
      categoria: 'over', nombre: 'El Día del Juicio', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: 2.40, escala: 'dano', cd: 5,
      desc: 'El golpe que derribó a Superman: 240% con 40% de probabilidad de Mega Aturdimiento.',
      efectos: [{ accion: { tipo: 'efecto', id: 'stun', mega: true, prob: .40 } }],
    },
  ],
};

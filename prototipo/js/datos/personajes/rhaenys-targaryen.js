import { espacios } from '../reliquias.js';

// Ficha oficial #14 (revisada el 2026-10-05). Rhaenys Targaryen, "la Reina que Nunca Fue", jinete de Meleys:
// enciende y aviva las Quemaduras, encadena turnos contra enemigos quemados y aturde a los que arden.
// Sin habilidad de líder: nunca llegó a gobernar.
export default {
  id: 'rhaenys-targaryen',
  nombre: 'Rhaenys Targaryen',
  rol: 'Daño', rolSecundario: 'Control',
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🐉', color: '#dc2626', imagen: 'assets/personajes/rhaenys-targaryen.webp',
  base: { hp: 620, dmg: 85, spd: 82 },
  extra: {},
  slots: espacios('argonita', 'yelmo', 'anilloCobre'),

  pasiva: {
    nombre: 'La Reina que Nunca Fue',
    desc: 'Una vez por ronda: cuando golpea a un enemigo con Quemadura, tiene 50% de probabilidad de ganar un turno adicional (un solo intento por movimiento).',
    gatillo: 'alGolpear', filtro: { objetivoTiene: 'burn' }, maxPorRonda: 1, unaVezPorMovimiento: true, prob: .50,
    accion: { tipo: 'turnoExtra', a: 'propio' },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Llamarada de Meleys', objetivo: 'enemigo', estilo: 'ranged', color: 0xef4444,
      pct: .95, escala: 'dano', cd: 0,
      desc: 'Causa 95%. Si el objetivo tiene Quemadura, la alarga 1 ronda y, si le quedan 4 rondas o más, tiene 15% de probabilidad de Aturdirlo. Además tiene 30% de probabilidad de aplicar Quemadura 5% (2 rondas).',
      efectos: [
        { condicion: { objetivoTiene: 'burn' }, accion: { tipo: 'extenderDuracion', efecto: 'burn', rondas: 1 } },
        { condicion: { objetivoEfectoDurMin: { efecto: 'burn', dur: 4 } }, accion: { tipo: 'efecto', id: 'stun', prob: .15 } },
        { accion: { tipo: 'efecto', id: 'burn', valor: .05, dur: 2, prob: .30 } },
      ],
    },
    {
      categoria: 'especial', nombre: 'Vuelo Infernal', objetivo: 'enemigo', golpes: 2, estilo: 'ranged', color: 0xf97316,
      pct: .70, escala: 'dano', cd: 3,
      desc: '2 golpes de 70% a un enemigo. Si golpea a un enemigo con Quemadura, Rhaenys gana Frenesí y Letalidad (2 rondas).',
      efectos: [
        { cuando: 'final', condicion: { algunGolpeadoTenia: 'burn' }, accion: { tipo: 'efecto', id: 'frenzy', dur: 2, a: 'propio' } },
        { cuando: 'final', condicion: { algunGolpeadoTenia: 'burn' }, accion: { tipo: 'efecto', id: 'bloodlust', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Erupción del Pozo Dragón', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xb91c1c,
      pct: 1.40, escala: 'dano', cd: 5,
      desc: 'Causa 140% a todos los enemigos. Cada enemigo con Quemadura tiene 40% de probabilidad de quedar Aturdido.',
      efectos: [{ condicion: { objetivoTiene: 'burn' }, accion: { tipo: 'efecto', id: 'stun', prob: .40 } }],
    },
  ],
};

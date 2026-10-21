import { espacios } from '../reliquias.js';

// Ficha oficial #52 (2026-10-19, rol DoTer de Quemadura; el resto "a tu criterio"). Natsu Dragneel, el Dragon Slayer de
// Fuego de Fairy Tail, criado por el dragón Igneel. El fuego no lo quema: se lo come. Cada Quemadura que arde en los enemigos
// (suya o de sus aliados) lo alimenta con Llamas del Dragón (+daño), y su Over las libera en el Modo Dragón de Fuego y Rayo.
// Sin habilidad de líder.
export default {
  id: 'natsu-dragneel',
  franquicia: 'Fairy Tail', grupos: ['dragones', 'fuego'],   // campaña: Jinetes de Dragones (Dragon Slayer) y Legión de Fuego
  nombre: 'Natsu Dragneel',
  rol: 'DoTer', rolSecundario: 'Daño',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'blazing',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🐲', color: '#ef4444', imagen: 'assets/personajes/natsu-dragneel.webp',
  base: { hp: 550, dmg: 45, spd: 80 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Dragon Slayer de Fuego',
    desc: 'Inmune a Quemadura. Se come las llamas: cada vez que una Quemadura hace daño a un enemigo gana 1 Llama del Dragón 🔥 (máx. 2 por ronda, tope 5). Cada Llama le da +5% de daño. Su Over las consume. Emblema de Fairy Tail: cada aliado (incluido él) cuyos movimientos aplican Quemadura gana +25% de Daño y +15% de HP máx. todo el combate.',
    inmuneA: ['burn'],
    gatillo: 'alDanoDoT', filtro: { tipo: 'burn', en: 'enemigos' }, maxPorRonda: 2,
    accion: { tipo: 'ganarCargas', cantidad: 1, max: 5, efecto: 'llamaNatsu', a: 'propio' },
    danoPorCargas: { efecto: 'llamaNatsu', pct: .05 },
    marcaAliadosQueAplican: { efecto: 'burn', marca: 'emblemaFairyTail', bono: { dmgPct: .25, hpPct: .15 } },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Puño de Hierro del Dragón de Fuego', objetivo: 'enemigo', estilo: 'melee', color: 0xef4444,
      pct: .70, escala: 'dano', cd: 0,
      desc: 'Causa 70% con 35% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Rugido del Dragón de Fuego', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf97316,
      pct: .60, escala: 'dano', cd: 3,
      desc: 'Un torrente de fuego desde su boca: 60% a todos los enemigos con 50% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .50 } }],
    },
    {
      categoria: 'over', nombre: 'Rugido del Dragón de Fuego y Rayo', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xf0abfc,
      pct: .85, escala: 'dano', cd: 5, consumeCargas: { pct: .10, efecto: 'llamaNatsu' },
      desc: 'Modo Dragón de Fuego y Rayo: 85% a todos los enemigos con 50% de probabilidad de Quemadura y 25% de Aturdir. Consume sus Llamas del Dragón: +10% de daño por cada una.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'burn', prob: .50 } },
        { accion: { tipo: 'efecto', id: 'stun', prob: .25 } },
      ],
    },
  ],
};

import { espacios } from '../reliquias.js';

// Ficha oficial #61 (2026-10-20, diseño "a tu criterio"). Mr. Freeze (Victor Fries, DC): el criobiólogo que solo
// sobrevive dentro de su traje criogénico (Aura Gélida permanente: resiste los golpes y congela a quien lo toca), con su
// pistola congelante y su obsesión por salvar a Nora. El calor es su punto débil (recibe más daño de Quemadura). Tanque
// que provoca al enemigo para que choque contra su traje. Sin habilidad de líder.
export default {
  id: 'mr-freeze',
  franquicia: 'DC', grupos: ['villanos-de-gotham', 'hielo'],   // campaña: Ciudad Gótica, Señores del Caos y Frío Eterno
  nombre: 'Mr. Freeze',
  rol: 'Tanque', rolSecundario: 'Control',
  sobres: ['phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🥶', color: '#67e8f9', imagen: 'assets/personajes/mr-freeze.webp',
  base: { hp: 750, dmg: 40, spd: 80 },
  extra: { armor: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Traje Criogénico',
    desc: 'Tiene Aura Gélida permanente: recibe −20% de daño de los golpes y quien lo golpee tiene 50% de probabilidad de recibir Congelación. Sin el frío no sobrevive: recibe +30% de daño de Quemadura.',
    efectosPermanentes: ['frostAura'],
    debilidadA: { efecto: 'burn', pct: .30 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Pistola Congelante', objetivo: 'enemigo', estilo: 'ranged', color: 0x67e8f9,
      pct: .55, escala: 'dano', cd: 0,
      desc: 'Un rayo criogénico: 55% con 35% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .35 } }],
    },
    {
      categoria: 'especial', nombre: 'Ráfaga Criogénica', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xa5f3fc,
      pct: .35, escala: 'dano', cd: 3,
      desc: 'Barre el campo con su pistola: 35% a todos los enemigos con 40% de probabilidad de Congelación. Gana Provocación (2 rondas): los enemigos tienen que atacar su traje.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'freeze', prob: .40 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'taunt', dur: 2, a: 'propio' } },
      ],
    },
    {
      categoria: 'over', nombre: 'Cero Absoluto', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0f2fe,
      pct: .70, escala: 'dano', cd: 5,
      desc: 'Lleva el campo de batalla al cero absoluto: 70% a todos los enemigos con 60% de probabilidad de Congelación (Mega Congelación si ya estaban congelados).',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .60 } }],
    },
  ],
};

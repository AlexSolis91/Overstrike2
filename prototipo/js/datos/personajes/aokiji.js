import { espacios } from '../reliquias.js';

// Ficha oficial #64 (2026-10-20, Frostborn; el resto "a tu criterio"). Kuzan "Aokiji" (One Piece): ex Almirante de la
// Marina y usuario de la Hie Hie no Mi, una fruta Logia: su cuerpo es hielo, los golpes lo atraviesan y su propio frío no
// lo afecta. Ice Block: Partisan lanza picas de hielo, Ice Time congela todo lo que toca y Ice Age congela el campo de
// batalla entero (como el mar en Marineford y en Punk Hazard). Su "Justicia Holgazana": pelea sin prisa (lento) pero
// cuando actúa, congela. Sin habilidad de líder.
export default {
  id: 'aokiji',
  franquicia: 'One Piece', grupos: ['hielo'],   // campaña: Frío Eterno
  nombre: 'Aokiji',
  rol: 'Control', rolSecundario: 'Daño',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  starter: 'frostborn',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🧊', color: '#0ea5e9', imagen: 'assets/personajes/aokiji.webp',
  base: { hp: 900, dmg: 96, spd: 96 },
  extra: { acc: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Hie Hie no Mi (Logia)',
    desc: 'Su cuerpo es hielo: recibe −20% de daño de los golpes (lo atraviesan) y es inmune a Congelación.',
    reduccionPropia: { categoria: 'golpe', pct: .20 },
    inmuneA: ['freeze'],
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Ice Block: Partisan', objetivo: 'enemigo', estilo: 'ranged', color: 0x7dd3fc,
      pct: .50, escala: 'dano', cd: 0, golpes: 2,
      desc: 'Lanza picas de hielo: 2 impactos de 50%, cada uno con 25% de probabilidad de Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Ice Time', objetivo: 'enemigo', estilo: 'melee', color: 0xbae6fd,
      pct: 1.50, escala: 'dano', cd: 3,
      desc: 'Lo toca y lo congela de pies a cabeza: 150% con 55% de probabilidad de Mega Congelación.',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', mega: true, prob: .55 } }],
    },
    {
      categoria: 'over', nombre: 'Ice Age', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xe0f2fe,
      pct: 1.40, escala: 'dano', cd: 5,
      desc: 'Congela todo el campo de batalla: 140% a todos los enemigos con 60% de probabilidad de Congelación (Mega si ya estaban congelados).',
      efectos: [{ accion: { tipo: 'efecto', id: 'freeze', prob: .60 } }],
    },
  ],
};

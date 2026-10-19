import { espacios } from '../reliquias.js';

// Ficha oficial #53 (2026-10-19, rol DoTer de Quemadura; el resto "a tu criterio"). Kyo Kusanagi, heredero del clan
// Kusanagi y campeón de The King of Fighters: sus llamas sagradas sellaron a Orochi. Su distintivo frente a los demás
// DoTers de Quemadura es el ritmo de combo: cada Quemadura que arde en los enemigos le recarga antes su Desperation Move
// (Orochinagi), así que con un equipo de fuego lo lanza mucho más seguido y arrastra a todo su equipo con Furia y Celeridad. Sin habilidad de líder.
export default {
  id: 'kyo-kusanagi',
  franquicia: 'The King of Fighters', grupos: ['guerreros', 'fuego'],   // campaña: Guerreros Legendarios y Legión de Fuego
  nombre: 'Kyo Kusanagi',
  rol: 'DoTer', rolSecundario: 'Daño',
  sobres: [],  // sin sobre temático: sale en Unbreakable Force (y en los aleatorios)
  emoji: '🔥', color: '#ea580c', imagen: 'assets/personajes/kyo-kusanagi.webp',
  base: { hp: 640, dmg: 62, spd: 96 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Llamas del Clan Kusanagi',
    desc: 'Ritmo de combo: cada vez que una Quemadura (suya o de sus aliados) hace daño a un enemigo, el cooldown de su Over baja 1 ronda (máx. 3 por ronda). Hace +20% de daño a enemigos con Quemadura.',
    gatillo: 'alDanoDoT', filtro: { tipo: 'burn', en: 'enemigos' }, maxPorRonda: 3,
    accion: { tipo: 'reducirCooldown', categorias: ['over'], cantidad: 1, a: 'propio' },
    bonoContra: { efecto: 'burn', pct: .20 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: '100 Shiki: Oniyaki', objetivo: 'enemigo', estilo: 'melee', color: 0xf97316,
      pct: .60, escala: 'dano', cd: 0, golpes: 2,
      desc: 'Un gancho ascendente envuelto en llamas: 2 golpes de 60%, cada uno con 25% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .25 } }],
    },
    {
      categoria: 'especial', nombre: 'Combo Aragami · Konokizu · Yanosabi', objetivo: 'enemigo', estilo: 'melee', color: 0xfb923c,
      pct: .55, escala: 'dano', cd: 3, golpes: 3,
      desc: 'Su cadena de combo clásica: 3 golpes de 55% al mismo enemigo, cada uno con 40% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .40 } }],
    },
    {
      categoria: 'over', nombre: 'Ura 108 Shiki: Orochinagi', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0xfacc15,
      pct: 1.40, escala: 'dano', cd: 5,
      desc: 'Carga las llamas sagradas y las desata en una ola: 140% a todos los enemigos con 60% de probabilidad de Quemadura. Todos los aliados ganan Furia y Celeridad (2 rondas).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'burn', prob: .60 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'dmgUp', dur: 2, a: 'todosAliados' } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'haste', dur: 2, a: 'todosAliados' } },
      ],
    },
  ],
};

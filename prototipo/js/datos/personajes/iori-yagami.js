import { espacios } from '../reliquias.js';

// Ficha oficial #54 (2026-10-19, diseño "a tu criterio" con pasiva de contraataque). Iori Yagami, heredero del clan Yagami
// y rival eterno de Kyo Kusanagi: llamas púrpura (Quemadura) y zarpazos de su sangre de Orochi (Sangrado). Contraataca a
// cualquiera que lo ataque, y castiga a los que sangran. Sin habilidad de líder.
export default {
  id: 'iori-yagami',
  franquicia: 'The King of Fighters', grupos: ['guerreros', 'fuego'],   // campaña: Guerreros Legendarios y Legión de Fuego
  nombre: 'Iori Yagami',
  rol: 'Daño', rolSecundario: 'DoTer',
  sobres: ['bloodline', 'phantom'],  // sobres de la tienda (ver js/datos/sobres.js)
  emoji: '🌙', color: '#7e22ce', imagen: 'assets/personajes/iori-yagami.webp',
  base: { hp: 650, dmg: 61, spd: 91 },
  extra: {},
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Sangre de Orochi',
    desc: 'Hasta 2 veces por ronda: cuando un enemigo lo ataca, Iori contraataca con su Básico (un contraataque no provoca otro). Todo su equipo hace +20% de daño a enemigos con Sangrado. Rival eterno de Kyo Kusanagi: le hace +20% de daño.',
    gatillo: 'alSerAtacado', maxPorRonda: 2,
    accion: { tipo: 'usarMovimiento', categoria: 'basico', contraataque: true, a: 'atacante' },
    auraContra: { efecto: 'bleed', pct: .20 },
    enemigoJurado: { id: 'kyo-kusanagi', bono: .20 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: '108 Shiki: Yami Barai', objetivo: 'enemigo', estilo: 'ranged', color: 0xa855f7,
      pct: .90, escala: 'dano', cd: 0,
      desc: 'Una llama púrpura que corre por el suelo: 90% con 30% de probabilidad de Quemadura.',
      efectos: [{ accion: { tipo: 'efecto', id: 'burn', prob: .30 } }],
    },
    {
      categoria: 'especial', nombre: '127 Shiki: Aoi Hana', objetivo: 'enemigo', estilo: 'melee', color: 0x9333ea,
      pct: .55, escala: 'dano', cd: 3, golpes: 3,
      desc: 'Tres zarpazos encadenados: 3 golpes de 55%, cada uno con 40% de probabilidad de Sangrado.',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .40 } }],
    },
    {
      categoria: 'over', nombre: 'Kin 1211 Shiki: Ya Otome', objetivo: 'enemigo', estilo: 'melee', color: 0xc084fc,
      pct: .35, escala: 'dano', cd: 5, golpes: 8,
      desc: 'Las Ocho Doncellas: 8 zarpazos de 35% al mismo enemigo, cada uno con 25% de probabilidad de Sangrado, y lo remata en una explosión de llamas púrpura (Quemadura).',
      efectos: [
        { accion: { tipo: 'efecto', id: 'bleed', prob: .25 } },
        { cuando: 'final', accion: { tipo: 'efecto', id: 'burn', a: 'objetivo' } },
      ],
    },
  ],
};

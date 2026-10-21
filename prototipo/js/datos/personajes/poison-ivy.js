import { espacios } from '../reliquias.js';

// Ficha oficial #58 (2026-10-19, envenenadora y aplicadora de Sangrado que brilla con Hemorragias; el resto "a tu
// criterio"). Poison Ivy (Pamela Isley), la reina de las plantas de Gótica: espinas que desgarran (Sangrado), toxinas
// vegetales (Veneno) y feromonas que doblegan la voluntad (Posesión). Sus enredaderas beben de las Hemorragias abiertas:
// cada una que sangra a un enemigo le inyecta más toxina, y todo su equipo castiga a los que tienen Hemorragia.
export default {
  id: 'poison-ivy',
  franquicia: 'DC', grupos: ['villanos-de-gotham'],   // campaña: Ciudad Gótica y Señores del Caos
  nombre: 'Poison Ivy',
  rol: 'DoTer', rolSecundario: 'Control',
  sobres: ['phantom', 'bloodline'],  // sobres de la tienda (ver js/datos/sobres.js)
  starter: 'noxious',                       // Starter Pack exclusivo (ver js/datos/starters.js)
  emoji: '🌿', color: '#16a34a', imagen: 'assets/personajes/poison-ivy.webp',
  base: { hp: 610, dmg: 56, spd: 111 },
  extra: { acc: .10 },
  slots: espacios('obsidiana', 'pechera', 'anilloCobre'),

  pasiva: {
    nombre: 'Reina de las Plantas',
    desc: 'Enredaderas sedientas: hasta 3 veces por ronda, cuando una Hemorragia hace daño a un enemigo, le inyecta 1 Veneno sin tirada. Todo su equipo hace +30% de daño a enemigos con Hemorragia.',
    gatillo: 'alDanoDoT', filtro: { tipo: 'hemo', en: 'enemigos' }, maxPorRonda: 3,
    accion: { tipo: 'efecto', id: 'poison', irresistible: true, a: 'objetivo' },
    auraContra: { efecto: 'hemo', pct: .30 },
  },
  movimientos: [
    {
      categoria: 'basico', nombre: 'Látigo de Espinas', objetivo: 'enemigo', estilo: 'ranged', color: 0x15803d,
      pct: .90, escala: 'dano', cd: 0, golpes: 2,
      desc: '2 latigazos de 90%, cada uno con 40% de probabilidad de Sangrado (si ya sangra, puede abrirse en Hemorragia).',
      efectos: [{ accion: { tipo: 'efecto', id: 'bleed', prob: .40 } }],
    },
    {
      categoria: 'especial', nombre: 'Jardín Venenoso', objetivo: 'todosEnemigos', estilo: 'ranged', color: 0x22c55e,
      pct: 1.45, escala: 'dano', cd: 3,
      desc: 'Esporas tóxicas cubren el campo: 145% a todos los enemigos con 55% de probabilidad de Veneno. Las espinas abren las heridas: el Sangrado de cada enemigo se convierte en Hemorragia (sin tirada), y los que tienen Hemorragia reciben además 1 Veneno sin tirada.',
      efectos: [
        { accion: { tipo: 'efecto', id: 'poison', prob: .55 } },
        { condicion: { objetivoTiene: 'bleed' }, accion: { tipo: 'hemorragia' } },
        { condicion: { objetivoTiene: 'hemo' }, accion: { tipo: 'efecto', id: 'poison', irresistible: true } },
      ],
    },
    {
      categoria: 'over', nombre: 'Beso de la Hiedra', objetivo: 'enemigo', estilo: 'ranged', color: 0x4ade80,
      pct: 3.50, escala: 'dano', cd: 5,
      desc: 'Las enredaderas lo atrapan y le abren las heridas: 350%, su Sangrado se convierte en Hemorragia (sin tirada) y tiene 40% de probabilidad de Posesión por el beso venenoso.',
      efectos: [
        { accion: { tipo: 'hemorragia' } },
        { accion: { tipo: 'efecto', id: 'possess', prob: .40 } },
      ],
    },
  ],
};
